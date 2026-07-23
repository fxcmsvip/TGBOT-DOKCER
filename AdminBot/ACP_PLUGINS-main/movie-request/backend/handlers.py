"""
Bot handler for TMDB movie/TV request URLs.

Trigger rules:
  Private chat:
    /req <TMDB_URL>   -> recognised
    req <TMDB_URL>    -> recognised
    bare TMDB URL     -> ignored
  Group chat:
    @bot req <TMDB_URL>  -> recognised (mention + req)
    /req <TMDB_URL>      -> ignored (avoids duplicate triggers from bot pool)
    bare TMDB URL        -> ignored

Flow (v1.0.13+):
  1. User sends /req URL
  2. Bot replies with rich movie card + inline buttons (Confirm / Cancel)
  3. User clicks Confirm -> request saved to DB, card edited to "submitted"
  4. User clicks Cancel  -> card edited to "cancelled", nothing saved
"""
from __future__ import annotations

import logging
import re
import time
from datetime import datetime
from typing import Any

from aiogram import F, Router
from aiogram.filters import Filter
from aiogram.types import (
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message as TgMessage,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory
from app.models.conversation import Conversation
from app.models.message import Message as PanelMessage
from app.models.user import TgUser

from backend.models import MovieRequest, MovieRequestUser
from backend.services.tmdb import get_tmdb_client, parse_tmdb_url, TMDB_IMAGE_BASE
from backend.services.media_library import (
    check_in_library,
    detect_incomplete_seasons,
    format_library_detail_lines,
)

logger = logging.getLogger(__name__)

router = Router(name="movie_request")

# Pending-request cache: keyed by "{media_type}:{tmdb_id}:{user_tg_uid}".
# Stores tmdb_data + metadata so the callback handler can complete the
# request without re-fetching from TMDB (with a 10-min TTL fallback).
_pending: dict[str, dict[str, Any]] = {}
_PENDING_TTL = 600  # seconds


def _safe_raw_data(msg: TgMessage) -> dict:
    """Extract a JSON-safe subset of the raw Telegram message."""
    try:
        return msg.model_dump(
            exclude={"bot", "from_user"},
            exclude_none=True,
            mode="json",
        )
    except Exception:
        return {}


def _evict_stale_pending() -> None:
    """Lazy eviction of expired pending-request cache entries."""
    now = time.monotonic()
    stale = [k for k, v in _pending.items() if now - v.get("ts", 0) > _PENDING_TTL]
    for k in stale:
        _pending.pop(k, None)


def _confirm_keyboard(
    media_type: str, tmdb_id: int, user_tg_uid: int
) -> InlineKeyboardMarkup:
    """Build the ✅ / ❌ inline keyboard for confirmation."""
    suffix = f"{media_type}:{tmdb_id}:{user_tg_uid}"
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(
            text="\u2705 \u786e\u8ba4\u6c42\u7247",  # ✅ 确认求片
            callback_data=f"mr:c:{suffix}",
        ),
        InlineKeyboardButton(
            text="\u274c \u53d6\u6d88",  # ❌ 取消
            callback_data=f"mr:x:{suffix}",
        ),
    ]])


def _missing_main_resolutions(library_info: dict) -> list[str]:
    """Return the standard resolutions (1080p / 4K) NOT present in the library.

    Only used for movies — TV shows track per-season episode counts instead.
    Returns an ordered list, e.g. ``["4K"]`` or ``["1080p", "4K"]``.
    """
    versions = library_info.get("movie_versions") or []
    have = {v.get("resolution") for v in versions}
    missing: list[str] = []
    for res in ("1080p", "4K"):
        if res not in have:
            missing.append(res)
    return missing


def _supplement_keyboard(
    media_type: str,
    tmdb_id: int,
    user_tg_uid: int,
    missing: list[str],
) -> InlineKeyboardMarkup:
    """Inline keyboard for "supplement-request" — buttons for the missing
    1080p/4K version(s) plus a generic Cancel button.
    """
    suffix = f"{media_type}:{tmdb_id}:{user_tg_uid}"
    rows: list[list[InlineKeyboardButton]] = []

    sup_row: list[InlineKeyboardButton] = []
    for res in missing:
        # Encode "1080p" as "1080p" and "4K" as "4k" — keep callback_data short
        code = res.lower()
        sup_row.append(InlineKeyboardButton(
            text=f"\u2705 \u8865\u7247 {res}",  # ✅ 补片 1080p
            callback_data=f"mr:s:{suffix}:{code}",
        ))
    if sup_row:
        rows.append(sup_row)

    rows.append([InlineKeyboardButton(
        text="\u274c \u53d6\u6d88",  # ❌ 取消
        callback_data=f"mr:x:{suffix}",
    )])

    return InlineKeyboardMarkup(inline_keyboard=rows)


def _tv_supplement_keyboard(
    media_type: str,
    tmdb_id: int,
    user_tg_uid: int,
    incomplete: list[dict],
    max_buttons: int = 3,
) -> InlineKeyboardMarkup:
    """Inline keyboard for TV season supplement. Shows up to ``max_buttons``
    buttons for the most-incomplete seasons plus a Cancel button.
    """
    suffix = f"{media_type}:{tmdb_id}:{user_tg_uid}"
    rows: list[list[InlineKeyboardButton]] = []

    top = incomplete[:max_buttons]
    btn_row: list[InlineKeyboardButton] = []
    for gap in top:
        sn = gap["season"]
        missing = gap["missing"]
        btn_row.append(InlineKeyboardButton(
            text=f"\u2705 \u8865S{sn:02d}(\u7f3a{missing}\u96c6)",  # ✅ 补S21(缺11集)
            callback_data=f"mr:ts:{suffix}:s{sn}",
        ))
        if len(btn_row) == 2:
            rows.append(btn_row)
            btn_row = []
    if btn_row:
        rows.append(btn_row)

    rows.append([InlineKeyboardButton(
        text="\u274c \u53d6\u6d88",  # ❌ 取消
        callback_data=f"mr:x:{suffix}",
    )])

    return InlineKeyboardMarkup(inline_keyboard=rows)


# ──────────────────────────────────────────────
#  Custom filters
# ──────────────────────────────────────────────

class TVSupplementReplyFilter(Filter):
    """Returns True when a user replies to a library-check card with a
    ``SxxExx`` or ``Sxx`` pattern (for precise episode/season supplement).
    """

    async def __call__(self, message: TgMessage, **_kwargs: Any) -> bool:
        if not message.reply_to_message:
            return False
        reply = message.reply_to_message
        # Must be replying to a message with a TMDB link in caption_entities
        for entity in reply.caption_entities or []:
            if entity.type == "text_link" and "themoviedb.org/tv/" in (entity.url or ""):
                break
        else:
            return False
        # Reply text must match SxxExx or Sxx pattern
        text = (message.text or "").strip()
        return bool(re.match(r'^[Ss]\d{1,4}(?:[Ee]\d{1,4})?$', text))


class MovieRequestTrigger(Filter):
    """
    Returns True only when the message is a valid movie request.

    Private:  /req URL  or  req URL
    Group:    @bot_username req URL
    """

    async def __call__(
        self,
        message: TgMessage,
        bot_username: str = "",
    ) -> bool:
        text = message.text or ""
        if not text:
            return False

        # Must contain a TMDB URL
        if not re.search(r"themoviedb\.org/(movie|tv)/(\d+)", text):
            return False

        chat_type = message.chat.type

        if chat_type == "private":
            # /req URL  or  req URL  (case-insensitive)
            return bool(re.match(r"^/?req\s", text, re.IGNORECASE))

        if chat_type in ("group", "supergroup"):
            # @bot_username req URL  (case-insensitive)
            if not bot_username:
                return False
            pattern = rf"@{re.escape(bot_username)}\s+req\b"
            return bool(re.search(pattern, text, re.IGNORECASE))

        return False


# ──────────────────────────────────────────────
#  Panel logging helpers
# ──────────────────────────────────────────────

async def _upsert_panel_conversation(
    session: AsyncSession,
    tg_user_db_id: int,
    bot_db_id: int,
    chat_type: str,
) -> Conversation:
    """Find or create the panel-side Conversation.

    For group chats, finds ANY existing conversation for this user
    (regardless of which bot created it) so messages from different bots
    in the same group all land in one conversation window. Without this,
    the same user's messages get split across separate conversation tabs
    when interacting with different bots from the same bot pool.
    """
    source_type = "private" if chat_type == "private" else "group"

    if source_type == "group":
        # Group: match by user + source_type only — not by bot_id
        result = await session.execute(
            select(Conversation).where(
                Conversation.tg_user_id == tg_user_db_id,
                Conversation.source_type == "group",
            ).order_by(Conversation.id.asc()).limit(1)
        )
    else:
        # Private: match by user + source_type + bot_id
        result = await session.execute(
            select(Conversation).where(
                Conversation.tg_user_id == tg_user_db_id,
                Conversation.source_type == source_type,
                Conversation.primary_bot_id == bot_db_id,
            )
        )

    conv = result.scalar_one_or_none()
    if conv is None:
        conv = Conversation(
            tg_user_id=tg_user_db_id,
            source_type=source_type,
            primary_bot_id=bot_db_id,
        )
        session.add(conv)
        await session.flush()
    return conv


async def _log_inbound(
    session: AsyncSession,
    conversation_id: int,
    bot_db_id: int,
    message: TgMessage,
) -> PanelMessage:
    """Mirror the user's incoming message into the panel's messages table."""
    msg_time = (
        message.date.replace(tzinfo=None) if message.date else datetime.utcnow()
    )
    db_msg = PanelMessage(
        conversation_id=conversation_id,
        tg_message_id=message.message_id,
        direction="inbound",
        sender_type="user",
        via_bot_id=bot_db_id,
        content_type="text",
        text_content=message.text or "",
        media_file_id=None,
        reply_to_message_id=(
            message.reply_to_message.message_id if message.reply_to_message else None
        ),
        raw_data=_safe_raw_data(message),
        created_at=msg_time,
    )
    session.add(db_msg)
    await session.flush()
    return db_msg


def _strip_html(html: str) -> str:
    """Strip HTML tags from a string, keeping the plain text content.

    The plugin's ``_render_caption`` outputs Telegram HTML (``<b>``, ``<i>``,
    ``<a>``), but the web chat panel renders message text via ReactMarkdown
    which expects Markdown, not HTML. Storing raw HTML in ``text_content``
    causes visual overlap/broken rendering in the chat window.
    """
    return re.sub(r"<[^>]+>", "", html)


async def _log_outbound(
    session: AsyncSession,
    conversation_id: int,
    bot_db_id: int,
    text: str,
    tg_message_id: int | None = None,
    reply_to_message_id: int | None = None,
) -> None:
    """Mirror an outgoing bot reply into the panel's messages table."""
    db_msg = PanelMessage(
        conversation_id=conversation_id,
        tg_message_id=tg_message_id,
        direction="outbound",
        sender_type="bot",
        via_bot_id=bot_db_id,
        content_type="text",
        text_content=_strip_html(text),
        media_file_id=None,
        reply_to_message_id=reply_to_message_id,
        raw_data={"source": "plugin:movie-request"},
        created_at=datetime.utcnow(),
    )
    session.add(db_msg)
    await session.flush()


# ──────────────────────────────────────────────
#  MovieRequest helper: build in-memory object
# ──────────────────────────────────────────────

def _build_movie_request(
    tmdb_data: dict, media_type: str, tmdb_id: int, in_library: bool
) -> MovieRequest:
    """Create an in-memory MovieRequest from TMDB API data (NOT saved to DB)."""
    title = tmdb_data.get("title") or tmdb_data.get("name") or "Unknown"
    original_title = tmdb_data.get("original_title") or tmdb_data.get("original_name")
    release_date = tmdb_data.get("release_date") or tmdb_data.get("first_air_date")
    genres_list = tmdb_data.get("genres", [])
    genres_str = ", ".join(g["name"] for g in genres_list) if genres_list else None

    return MovieRequest(
        tmdb_id=tmdb_id,
        media_type=media_type,
        title=title,
        original_title=original_title,
        poster_path=tmdb_data.get("poster_path"),
        backdrop_path=tmdb_data.get("backdrop_path"),
        release_date=release_date,
        overview=tmdb_data.get("overview"),
        vote_average=tmdb_data.get("vote_average"),
        genres=genres_str,
        tmdb_raw=tmdb_data,
        in_library=in_library,
        request_count=1,
    )


async def _save_request(
    session: AsyncSession,
    tmdb_data: dict,
    media_type: str,
    tmdb_id: int,
    in_library: bool,
    tg_user_db_id: int,
    requested_resolution: str | None = None,
) -> MovieRequest:
    """Persist a MovieRequest + MovieRequestUser to the database.

    Dedup is by (tmdb_id, media_type, requested_resolution) — a generic
    request and a "supplement 4K" request for the same movie are tracked
    as TWO separate rows so both can be fulfilled / rejected independently.
    """
    result = await session.execute(
        select(MovieRequest).where(
            MovieRequest.tmdb_id == tmdb_id,
            MovieRequest.media_type == media_type,
            MovieRequest.requested_resolution == requested_resolution,
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.request_count += 1
        # If a new user requests a previously rejected/fulfilled movie,
        # reopen it as pending so it reappears in the admin's queue.
        # This way popular requests that were rejected still surface
        # when demand accumulates from other users.
        if existing.status in ("rejected", "fulfilled"):
            existing.status = "pending"
        user_result = await session.execute(
            select(MovieRequestUser).where(
                MovieRequestUser.movie_request_id == existing.id,
                MovieRequestUser.tg_user_id == tg_user_db_id,
            )
        )
        if not user_result.scalar_one_or_none():
            session.add(MovieRequestUser(
                movie_request_id=existing.id,
                tg_user_id=tg_user_db_id,
            ))
        return existing

    req = _build_movie_request(tmdb_data, media_type, tmdb_id, in_library)
    req.requested_resolution = requested_resolution
    session.add(req)
    await session.flush()
    session.add(MovieRequestUser(
        movie_request_id=req.id,
        tg_user_id=tg_user_db_id,
    ))
    return req


# ──────────────────────────────────────────────
#  Message handler (Phase 1: preview + confirm)
# ──────────────────────────────────────────────

@router.message(MovieRequestTrigger())
async def handle_movie_request(message: TgMessage, bot_db_id: int) -> None:
    """Show a rich preview card with confirm/cancel buttons (no DB write yet)."""
    tg_user = message.from_user
    if tg_user is None or tg_user.is_bot:
        return

    text = message.text or ""
    parsed = parse_tmdb_url(text)
    if not parsed:
        return

    media_type, tmdb_id = parsed

    async with async_session_factory() as session:
        try:
            # ---- 1. Upsert TgUser ----
            result = await session.execute(
                select(TgUser).where(TgUser.tg_uid == tg_user.id)
            )
            db_user = result.scalar_one_or_none()
            if db_user is None:
                db_user = TgUser(
                    tg_uid=tg_user.id,
                    username=tg_user.username,
                    first_name=tg_user.first_name,
                    last_name=tg_user.last_name,
                    language_code=tg_user.language_code,
                    is_premium=tg_user.is_premium or False,
                    is_bot=tg_user.is_bot,
                )
                session.add(db_user)
                await session.flush()

            # ---- 2. Mirror conversation + inbound message ----
            conv = await _upsert_panel_conversation(
                session, db_user.id, bot_db_id, message.chat.type
            )
            await _log_inbound(session, conv.id, bot_db_id, message)

            # ---- 3. Same-user duplicate check ----
            result = await session.execute(
                select(MovieRequest).where(
                    MovieRequest.tmdb_id == tmdb_id,
                    MovieRequest.media_type == media_type,
                )
            )
            existing = result.scalar_one_or_none()

            if existing:
                user_result = await session.execute(
                    select(MovieRequestUser).where(
                        MovieRequestUser.movie_request_id == existing.id,
                        MovieRequestUser.tg_user_id == db_user.id,
                    )
                )
                if user_result.scalar_one_or_none():
                    # Same user already requested — no buttons, informational only
                    await session.commit()
                    sent = await _send_reply_card(
                        message, existing,
                        status_override="\U0001f504 <b>\u4f60\u5df2\u7ecf\u6c42\u8fc7\u8fd9\u90e8\u4e86</b>",
                    )
                    async with async_session_factory() as outsess:
                        await _log_outbound(
                            outsess, conv.id, bot_db_id,
                            text=_render_caption(existing, status_override="\U0001f504 你已经求过这部了"),
                            tg_message_id=getattr(sent, "message_id", None),
                            reply_to_message_id=message.message_id,
                        )
                        await outsess.commit()
                    return

            # ---- 4. Fetch TMDB data for preview ----
            client = get_tmdb_client()
            tmdb_data = await client.get_media(session, media_type, tmdb_id)

            if not tmdb_data:
                err = "\u26a0\ufe0f TMDB API error, please try again later."
                sent = await message.reply(err, parse_mode="HTML")
                await _log_outbound(
                    session, conv.id, bot_db_id,
                    text=err,
                    tg_message_id=getattr(sent, "message_id", None),
                    reply_to_message_id=message.message_id,
                )
                await session.commit()
                return

            library_info = await check_in_library(session, tmdb_id, media_type)
            in_library = library_info.get("exists", False)
            await session.commit()

            # ---- 5. Already in library? Supplement logic ----
            if in_library:
                preview = _build_movie_request(tmdb_data, media_type, tmdb_id, True)
                detail_lines = format_library_detail_lines(
                    library_info, media_type, tmdb_raw=tmdb_data,
                )

                # 5a. Movies: check for missing 1080p/4K
                # 5b. TV: check for incomplete seasons
                keyboard: InlineKeyboardMarkup | None = None
                is_supplement = False
                extra_lines = list(detail_lines)

                if media_type == "movie":
                    missing = _missing_main_resolutions(library_info)
                    if missing:
                        extra_lines.append(
                            f"\n\U0001f4a1 \u5e93\u5185\u7f3a\u5c11 "
                            f"{' / '.join(missing)} \u7248\u672c\uff0c\u662f\u5426\u8865\u7247\uff1f"
                        )
                        keyboard = _supplement_keyboard(media_type, tmdb_id, tg_user.id, missing)
                        is_supplement = True

                elif media_type == "tv":
                    incomplete = detect_incomplete_seasons(library_info, tmdb_data)
                    if incomplete:
                        extra_lines.append(
                            f"\n\U0001f4a1 \u56de\u590d\u672c\u6d88\u606f\u8f93\u5165 "
                            f"S21E15 \u53ef\u7cbe\u786e\u8865\u5355\u96c6"
                        )
                        keyboard = _tv_supplement_keyboard(
                            media_type, tmdb_id, tg_user.id, incomplete,
                        )
                        is_supplement = True

                if is_supplement and keyboard:
                    sent = await _send_reply_card(
                        message, preview,
                        status_override="\u2705 <b>\u5df2\u5728\u5a92\u4f53\u5e93\u4e2d</b>",
                        extra_lines=extra_lines,
                        reply_markup=keyboard,
                    )

                    _evict_stale_pending()
                    cache_key = f"{media_type}:{tmdb_id}:{tg_user.id}"
                    _pending[cache_key] = {
                        "tmdb_data": tmdb_data,
                        "in_library": in_library,
                        "library_info": library_info,
                        "is_supplement": True,
                        "bot_db_id": bot_db_id,
                        "conv_id": conv.id,
                        "chat_id": message.chat.id,
                        "msg_id": getattr(sent, "message_id", None),
                        "user_msg_id": message.message_id,
                        "ts": time.monotonic(),
                    }

                    async with async_session_factory() as outsess:
                        await _log_outbound(
                            outsess, conv.id, bot_db_id,
                            text=_render_caption(
                                preview,
                                status_override="\u2705 \u5df2\u5728\u5a92\u4f53\u5e93\u4e2d",
                                extra_lines=extra_lines,
                            ),
                            tg_message_id=getattr(sent, "message_id", None),
                            reply_to_message_id=message.message_id,
                        )
                        await outsess.commit()
                    return

                # 5c. Fully complete — no buttons
                sent = await _send_reply_card(
                    message, preview,
                    status_override="\u2705 <b>\u5df2\u5728\u5a92\u4f53\u5e93\u4e2d</b>",
                    extra_lines=detail_lines,
                )
                async with async_session_factory() as outsess:
                    await _log_outbound(
                        outsess, conv.id, bot_db_id,
                        text=_render_caption(
                            preview,
                            status_override="✅ 已在媒体库中",
                            extra_lines=detail_lines,
                        ),
                        tg_message_id=getattr(sent, "message_id", None),
                        reply_to_message_id=message.message_id,
                    )
                    await outsess.commit()
                return

            # ---- 6. Show preview with confirmation buttons ----
            preview = _build_movie_request(tmdb_data, media_type, tmdb_id, False)
            keyboard = _confirm_keyboard(media_type, tmdb_id, tg_user.id)
            sent = await _send_reply_card(
                message, preview,
                status_override="\u2753 <b>\u662f\u5426\u786e\u8ba4\u6c42\u7247\uff1f</b>",
                reply_markup=keyboard,
            )

            # Cache for the callback handler
            _evict_stale_pending()
            cache_key = f"{media_type}:{tmdb_id}:{tg_user.id}"
            _pending[cache_key] = {
                "tmdb_data": tmdb_data,
                "in_library": in_library,
                "library_info": library_info,
                "bot_db_id": bot_db_id,
                "conv_id": conv.id,
                "chat_id": message.chat.id,
                "msg_id": getattr(sent, "message_id", None),
                "user_msg_id": message.message_id,
                "ts": time.monotonic(),
            }

            # Log outbound (the preview, not the final submission)
            async with async_session_factory() as outsess:
                await _log_outbound(
                    outsess, conv.id, bot_db_id,
                    text=_render_caption(preview, status_override="❓ 是否确认求片？"),
                    tg_message_id=getattr(sent, "message_id", None),
                    reply_to_message_id=message.message_id,
                )
                await outsess.commit()

        except Exception:
            await session.rollback()
            logger.exception("Error handling movie request from tg_uid=%s", tg_user.id)
            try:
                await message.reply("An error occurred processing your request.")
            except Exception:
                pass


# ──────────────────────────────────────────────
#  Callback handler (Phase 2: confirm / cancel)
# ──────────────────────────────────────────────

@router.callback_query(F.data.startswith("mr:"))
async def handle_request_callback(
    callback: CallbackQuery,
    bot_db_id: int | None = None,
) -> None:
    """Handle inline-button press for confirm / cancel.

    ``bot_db_id`` is injected by the panel's bot context middleware. It is
    declared optional here so that older Panel versions (< 1.1.5) which only
    register the middleware on the message observer don't crash this
    handler with ``TypeError: missing 1 required positional argument``.
    """
    logger.info("[mr-callback] received data=%s from tg_uid=%s", callback.data, callback.from_user.id if callback.from_user else None)
    data = (callback.data or "").split(":")
    # Format: mr:<action>:<media_type>:<tmdb_id>:<user_tg_uid>[:<extra>]
    # Supplement (action="s") includes a 6th segment with the resolution code.
    if len(data) not in (5, 6):
        await callback.answer("\u274c Invalid callback", show_alert=True)
        return

    _, action, media_type, tmdb_id_str, user_tg_uid_str = data[:5]
    extra = data[5] if len(data) == 6 else None
    try:
        tmdb_id = int(tmdb_id_str)
        user_tg_uid = int(user_tg_uid_str)
    except ValueError:
        await callback.answer("\u274c Invalid data", show_alert=True)
        return

    # Only the original requester can click
    if callback.from_user.id != user_tg_uid:
        await callback.answer(
            "\u274c \u53ea\u6709\u6c42\u7247\u4eba\u624d\u80fd\u64cd\u4f5c",  # 只有求片人才能操作
            show_alert=True,
        )
        return

    cache_key = f"{media_type}:{tmdb_id}:{user_tg_uid}"
    cached = _pending.pop(cache_key, None)

    try:
        if action == "c":  # ── Confirm ──
            # Get or refetch TMDB data
            if cached:
                tmdb_data = cached["tmdb_data"]
                in_library = cached["in_library"]
                conv_id = cached["conv_id"]
            else:
                # Cache miss (multi-worker or TTL expired) — refetch
                async with async_session_factory() as sess:
                    client = get_tmdb_client()
                    tmdb_data = await client.get_media(sess, media_type, tmdb_id)
                    library_info_fresh = await check_in_library(sess, tmdb_id, media_type)
                    in_library = library_info_fresh.get("exists", False)
                    await sess.commit()
                conv_id = None  # will skip outbound log if unknown

            if not tmdb_data:
                await callback.answer(
                    "\u26a0\ufe0f TMDB data unavailable, please try again",
                    show_alert=True,
                )
                return

            # Persist to DB
            async with async_session_factory() as sess:
                result = await sess.execute(
                    select(TgUser).where(TgUser.tg_uid == user_tg_uid)
                )
                db_user = result.scalar_one_or_none()
                if db_user is None:
                    await callback.answer("\u274c User not found", show_alert=True)
                    return

                req = await _save_request(
                    sess, tmdb_data, media_type, tmdb_id, in_library, db_user.id
                )
                await sess.commit()

                # Refresh so we have the latest request_count
                await sess.refresh(req)

            # Edit the card: replace status + remove buttons
            confirmed_caption = _render_caption(
                req, status_override="\u2705 <b>\u6c42\u7247\u5df2\u63d0\u4ea4</b>"
            )
            try:
                if callback.message and callback.message.photo:
                    await callback.message.edit_caption(
                        caption=confirmed_caption,
                        parse_mode="HTML",
                        reply_markup=None,
                    )
                elif callback.message:
                    await callback.message.edit_text(
                        text=confirmed_caption,
                        parse_mode="HTML",
                        reply_markup=None,
                    )
            except Exception:
                logger.warning("Failed to edit message after confirm", exc_info=True)

            await callback.answer("\u2705 \u6c42\u7247\u5df2\u63d0\u4ea4")  # ✅ 求片已提交

            # Log outbound (confirmed) — skip if we have no conv_id or bot_db_id
            if conv_id and bot_db_id is not None:
                try:
                    async with async_session_factory() as outsess:
                        await _log_outbound(
                            outsess, conv_id, bot_db_id,
                            text="[确认求片] " + (req.title or ""),
                            tg_message_id=getattr(callback.message, "message_id", None),
                        )
                        await outsess.commit()
                except Exception:
                    logger.debug("Failed to log outbound for confirm", exc_info=True)

        elif action == "s":  # ── Supplement (求 1080p / 4K 版本) ──
            if not extra:
                await callback.answer("\u274c Missing resolution", show_alert=True)
                return
            requested_resolution = "1080p" if extra.lower() == "1080p" else "4K"

            # Get TMDB data + library info from cache or refetch
            if cached:
                tmdb_data = cached["tmdb_data"]
                library_info_local = cached.get("library_info") or {}
                conv_id = cached.get("conv_id")
            else:
                async with async_session_factory() as sess:
                    client = get_tmdb_client()
                    tmdb_data = await client.get_media(sess, media_type, tmdb_id)
                    library_info_local = await check_in_library(sess, tmdb_id, media_type)
                    await sess.commit()
                conv_id = None

            if not tmdb_data:
                await callback.answer(
                    "\u26a0\ufe0f TMDB data unavailable, please try again",
                    show_alert=True,
                )
                return

            # Persist the supplement request
            async with async_session_factory() as sess:
                result = await sess.execute(
                    select(TgUser).where(TgUser.tg_uid == user_tg_uid)
                )
                db_user = result.scalar_one_or_none()
                if db_user is None:
                    await callback.answer("\u274c User not found", show_alert=True)
                    return

                req = await _save_request(
                    sess, tmdb_data, media_type, tmdb_id,
                    in_library=True,  # by definition, supplement implies in_library
                    tg_user_db_id=db_user.id,
                    requested_resolution=requested_resolution,
                )
                await sess.commit()
                await sess.refresh(req)

            # Edit the card: replace status + remove buttons (preserve detail lines)
            detail_lines = format_library_detail_lines(library_info_local, media_type)
            confirmed_caption = _render_caption(
                req,
                status_override=(
                    f"\u2705 <b>\u8865\u7247 {requested_resolution} \u5df2\u63d0\u4ea4</b>"
                ),
                extra_lines=detail_lines,
            )
            try:
                if callback.message and callback.message.photo:
                    await callback.message.edit_caption(
                        caption=confirmed_caption,
                        parse_mode="HTML",
                        reply_markup=None,
                    )
                elif callback.message:
                    await callback.message.edit_text(
                        text=confirmed_caption,
                        parse_mode="HTML",
                        reply_markup=None,
                    )
            except Exception:
                logger.warning("Failed to edit message after supplement", exc_info=True)

            await callback.answer(f"\u2705 \u8865\u7247 {requested_resolution} \u5df2\u63d0\u4ea4")

            # Log outbound
            if conv_id and bot_db_id is not None:
                try:
                    async with async_session_factory() as outsess:
                        await _log_outbound(
                            outsess, conv_id, bot_db_id,
                            text=f"[补片 {requested_resolution}] " + (req.title or ""),
                            tg_message_id=getattr(callback.message, "message_id", None),
                        )
                        await outsess.commit()
                except Exception:
                    logger.debug("Failed to log outbound for supplement", exc_info=True)

        elif action == "ts":  # ── TV Season Supplement (补 S21) ──
            if not extra or not extra.startswith("s"):
                await callback.answer("\u274c Invalid season", show_alert=True)
                return
            try:
                season_num = int(extra[1:])
            except ValueError:
                await callback.answer("\u274c Invalid season number", show_alert=True)
                return
            requested_resolution = f"S{season_num:02d}"

            if cached:
                tmdb_data = cached["tmdb_data"]
                library_info_local = cached.get("library_info") or {}
                conv_id = cached.get("conv_id")
            else:
                async with async_session_factory() as sess:
                    client = get_tmdb_client()
                    tmdb_data = await client.get_media(sess, media_type, tmdb_id)
                    library_info_local = await check_in_library(sess, tmdb_id, media_type)
                    await sess.commit()
                conv_id = None

            if not tmdb_data:
                await callback.answer(
                    "\u26a0\ufe0f TMDB data unavailable", show_alert=True
                )
                return

            async with async_session_factory() as sess:
                result = await sess.execute(
                    select(TgUser).where(TgUser.tg_uid == user_tg_uid)
                )
                db_user = result.scalar_one_or_none()
                if db_user is None:
                    await callback.answer("\u274c User not found", show_alert=True)
                    return

                req = await _save_request(
                    sess, tmdb_data, media_type, tmdb_id,
                    in_library=True,
                    tg_user_db_id=db_user.id,
                    requested_resolution=requested_resolution,
                )
                await sess.commit()
                await sess.refresh(req)

            detail_lines = format_library_detail_lines(
                library_info_local, media_type, tmdb_raw=tmdb_data,
            )
            confirmed_caption = _render_caption(
                req,
                status_override=f"\u2705 <b>\u8865 {requested_resolution} \u5df2\u63d0\u4ea4</b>",
                extra_lines=detail_lines,
            )
            try:
                if callback.message and callback.message.photo:
                    await callback.message.edit_caption(
                        caption=confirmed_caption,
                        parse_mode="HTML",
                        reply_markup=None,
                    )
                elif callback.message:
                    await callback.message.edit_text(
                        text=confirmed_caption,
                        parse_mode="HTML",
                        reply_markup=None,
                    )
            except Exception:
                logger.warning("Failed to edit message after TV supplement", exc_info=True)

            await callback.answer(f"\u2705 \u8865 {requested_resolution} \u5df2\u63d0\u4ea4")

            if conv_id and bot_db_id is not None:
                try:
                    async with async_session_factory() as outsess:
                        await _log_outbound(
                            outsess, conv_id, bot_db_id,
                            text=f"[补集 {requested_resolution}] " + (req.title or ""),
                            tg_message_id=getattr(callback.message, "message_id", None),
                        )
                        await outsess.commit()
                except Exception:
                    logger.debug("Failed to log outbound for TV supplement", exc_info=True)

        elif action == "x":  # ── Cancel ──
            # Build a preview req for re-rendering the caption
            is_supplement = bool(cached and cached.get("is_supplement"))
            library_info_local: dict = {}
            if cached:
                tmdb_data = cached["tmdb_data"]
                in_library = cached.get("in_library", False)
                library_info_local = cached.get("library_info") or {}
            else:
                # No cache — we need tmdb_data to re-render. Light refetch.
                async with async_session_factory() as sess:
                    client = get_tmdb_client()
                    tmdb_data = await client.get_media(sess, media_type, tmdb_id)
                    in_library = False
                    await sess.commit()

            if tmdb_data:
                preview = _build_movie_request(tmdb_data, media_type, tmdb_id, in_library)
                # Pick a context-appropriate cancelled status string
                if is_supplement:
                    status_str = "\u274c <b>\u5df2\u53d6\u6d88\u8865\u7247</b>"  # ❌ 已取消补片
                    extra_for_cancel = format_library_detail_lines(library_info_local, media_type)
                else:
                    status_str = "\u274c <b>\u6c42\u7247\u5df2\u53d6\u6d88</b>"  # ❌ 求片已取消
                    extra_for_cancel = None
                cancelled_caption = _render_caption(
                    preview, status_override=status_str, extra_lines=extra_for_cancel,
                )
                try:
                    if callback.message and callback.message.photo:
                        await callback.message.edit_caption(
                            caption=cancelled_caption,
                            parse_mode="HTML",
                            reply_markup=None,
                        )
                    elif callback.message:
                        await callback.message.edit_text(
                            text=cancelled_caption,
                            parse_mode="HTML",
                            reply_markup=None,
                        )
                except Exception:
                    logger.warning("Failed to edit message after cancel", exc_info=True)

            await callback.answer("\u274c \u5df2\u53d6\u6d88")  # ❌ 已取消

        else:
            await callback.answer("\u274c Unknown action", show_alert=True)

    except Exception:
        logger.exception("Error in request callback handler")
        await callback.answer(
            "\u26a0\ufe0f An error occurred", show_alert=True
        )


# ──────────────────────────────────────────────
#  Reply handler: precise SxxExx supplement
# ──────────────────────────────────────────────

@router.message(TVSupplementReplyFilter())
async def handle_tv_supplement_reply(
    message: TgMessage,
    bot_db_id: int | None = None,
) -> None:
    """Handle a reply to a library-check card with ``S21E15`` or ``S21``
    text — submits a precise supplement request for that season/episode.
    """
    tg_user = message.from_user
    if tg_user is None or tg_user.is_bot:
        return

    text = (message.text or "").strip().upper()
    m = re.match(r'^S(\d{1,4})(?:E(\d{1,4}))?$', text)
    if not m:
        return

    season = int(m.group(1))
    episode = int(m.group(2)) if m.group(2) else None
    requested_resolution = f"S{season:02d}" if episode is None else f"S{season:02d}E{episode:02d}"

    # Extract tmdb_id from the replied-to message's caption entities
    reply = message.reply_to_message
    tmdb_id: int | None = None
    media_type = "tv"
    for entity in reply.caption_entities or []:
        if entity.type == "text_link" and "themoviedb.org/" in (entity.url or ""):
            tm = re.search(r'(movie|tv)/(\d+)', entity.url or "")
            if tm:
                media_type = tm.group(1)
                tmdb_id = int(tm.group(2))
                break

    if tmdb_id is None:
        await message.reply(
            "\u274c \u65e0\u6cd5\u8bc6\u522b TMDB ID\uff0c\u8bf7\u786e\u8ba4\u56de\u590d\u7684\u662f\u5a92\u4f53\u5e93\u67e5\u8be2\u5361\u7247",
            parse_mode="HTML",
        )
        return

    async with async_session_factory() as session:
        try:
            # Upsert TgUser
            result = await session.execute(
                select(TgUser).where(TgUser.tg_uid == tg_user.id)
            )
            db_user = result.scalar_one_or_none()
            if db_user is None:
                db_user = TgUser(
                    tg_uid=tg_user.id,
                    username=tg_user.username,
                    first_name=tg_user.first_name,
                    last_name=tg_user.last_name,
                    language_code=tg_user.language_code,
                    is_premium=tg_user.is_premium or False,
                    is_bot=tg_user.is_bot,
                )
                session.add(db_user)
                await session.flush()

            # Fetch TMDB data for the title
            client = get_tmdb_client()
            tmdb_data = await client.get_media(session, media_type, tmdb_id)
            if not tmdb_data:
                await message.reply(
                    "\u26a0\ufe0f TMDB API error", parse_mode="HTML"
                )
                await session.commit()
                return

            # Save the supplement request
            req = await _save_request(
                session, tmdb_data, media_type, tmdb_id,
                in_library=True,
                tg_user_db_id=db_user.id,
                requested_resolution=requested_resolution,
            )
            await session.commit()

            title = tmdb_data.get("title") or tmdb_data.get("name") or "Unknown"
            await message.reply(
                f"\u2705 <b>\u8865\u96c6\u8bf7\u6c42\u5df2\u63d0\u4ea4</b>\n"
                f"{_html_escape(title)} \u2014 {requested_resolution}",
                parse_mode="HTML",
            )

            # Log to panel
            if bot_db_id is not None:
                conv = await _upsert_panel_conversation(
                    session, db_user.id, bot_db_id, message.chat.type,
                )
                async with async_session_factory() as outsess:
                    await _log_inbound(outsess, conv.id, bot_db_id, message)
                    await _log_outbound(
                        outsess, conv.id, bot_db_id,
                        text=f"[补集 {requested_resolution}] {title}",
                    )
                    await outsess.commit()

        except Exception:
            await session.rollback()
            logger.exception("Error handling TV supplement reply from tg_uid=%s", tg_user.id)
            try:
                await message.reply("An error occurred processing your supplement request.")
            except Exception:
                pass


# ──────────────────────────────────────────────
#  Reply card rendering
# ──────────────────────────────────────────────

def _html_escape(s: str) -> str:
    """Minimal HTML escaping for Telegram parse_mode='HTML'."""
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def _truncate(text: str, limit: int) -> str:
    """Cut a string to ``limit`` chars, adding an ellipsis if it had to shrink."""
    text = text.strip()
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "\u2026"


def _render_caption(
    req: MovieRequest,
    is_duplicate: bool = False,
    status_override: str | None = None,
    extra_lines: list[str] | None = None,
) -> str:
    """Render the rich poster-caption for a MovieRequest.

    Args:
        req: The MovieRequest (may be an unsaved in-memory object for previews).
        is_duplicate: Whether this is a duplicate request (multiple users).
        status_override: If set, replaces the auto-computed status line.
            Accepts raw HTML (e.g. ``"❓ <b>是否确认求片？</b>"``).
        extra_lines: Optional list of plain-text lines appended *below* the
            status line. Used for media-library detail rendering, e.g.
            ``["📀 1080p × 1", "📀 4K DoVi+HDR10 × 1"]``.
    """
    raw = req.tmdb_raw or {}
    is_tv = req.media_type == "tv"
    media_label = "\U0001f4fa TV" if is_tv else "\U0001f3ac Movie"
    year = req.release_date[:4] if req.release_date else "\u2014"

    # Header
    title_html = f"<b>{_html_escape(req.title)}</b>"
    if req.original_title and req.original_title != req.title:
        title_html += f" <i>{_html_escape(req.original_title)}</i>"

    # Tagline
    tagline = (raw.get("tagline") or "").strip()
    tagline_line = f"<i>\u201c{_html_escape(tagline)}\u201d</i>\n" if tagline else ""

    # Rating
    if req.vote_average is not None:
        votes = raw.get("vote_count") or 0
        rating = f"\u2b50 {float(req.vote_average):.1f}/10"
        if votes:
            rating += f" ({votes:,} votes)"
    else:
        rating = "\u2b50 N/A"

    # Runtime
    runtime_min = raw.get("runtime")
    if not runtime_min and is_tv:
        ep_runtimes = raw.get("episode_run_time") or []
        if ep_runtimes:
            runtime_min = ep_runtimes[0]
    runtime_str = ""
    if runtime_min:
        h, m = divmod(int(runtime_min), 60)
        runtime_str = f" \u23f1 {h}h {m}m" if h else f" \u23f1 {m}m"

    # Country
    countries = raw.get("production_countries") or []
    country_str = ""
    if countries:
        country_str = " \U0001f30d " + "/".join(c.get("iso_3166_1", "") for c in countries[:2])

    # Genres
    genres_line = f"\U0001f3ad {_html_escape(req.genres)}\n" if req.genres else ""

    # Credits
    credits = raw.get("credits") or {}
    crew = credits.get("crew") or []
    cast = credits.get("cast") or []
    director_line = ""
    if not is_tv:
        directors = [c["name"] for c in crew if c.get("job") == "Director"]
        if directors:
            director_line = f"\U0001f3ac {_html_escape(', '.join(directors[:2]))}\n"
    else:
        creators = raw.get("created_by") or []
        if creators:
            director_line = f"\U0001f3ac {_html_escape(', '.join(c['name'] for c in creators[:2]))}\n"
    cast_line = ""
    if cast:
        top_cast = ", ".join(c["name"] for c in cast[:3])
        cast_line = f"\U0001f465 {_html_escape(top_cast)}\n"

    # Synopsis
    overview = (req.overview or "").strip()
    overview_block = ""
    if overview:
        overview_block = "\n\U0001f4dd " + _html_escape(_truncate(overview, 300))

    # Status
    if status_override:
        status_line = status_override
    elif req.in_library:
        status_line = "\u2705 <b>已在媒体库中</b>"
    elif is_duplicate:
        status_line = f"\U0001f504 <b>{req.request_count} 人已求过此片</b>"
    else:
        status_line = "\u23f3 <b>求片已提交</b>"

    # Links
    tmdb_link = f"https://www.themoviedb.org/{'tv' if is_tv else 'movie'}/{req.tmdb_id}"
    links = [f'<a href="{tmdb_link}">TMDB</a>']
    imdb_id = (raw.get("external_ids") or {}).get("imdb_id") or raw.get("imdb_id")
    if imdb_id:
        links.append(f'<a href="https://www.imdb.com/title/{imdb_id}/">IMDB</a>')
    links_line = " \u00b7 ".join(links)

    # Library detail block (e.g. "📀 1080p × 1" / "📺 S01: E01-E26 1080p")
    extra_block = ""
    if extra_lines:
        extra_block = "\n" + "\n".join(_html_escape(line) for line in extra_lines)

    # Layout: links go just above the status/action line so the status
    # (e.g. "❓ 是否确认求片？") sits at the very bottom, right next to
    # the inline keyboard buttons it refers to.
    caption = (
        f"\U0001f4fd {title_html}\n"
        f"{tagline_line}"
        f"{media_label} \u00b7 {year}{country_str}{runtime_str}\n"
        f"{rating}\n"
        f"{genres_line}"
        f"{director_line}"
        f"{cast_line}"
        f"{overview_block}\n\n"
        f"{links_line}\n\n"
        f"{status_line}"
        f"{extra_block}"
    )

    # Telegram photo caption hard-cap is 1024 chars.
    if len(caption) > 1024:
        caption = caption.replace(overview_block, "")
        if len(caption) > 1024:
            caption = caption[:1020] + "\u2026"

    return caption


async def _send_reply_card(
    message: TgMessage,
    req: MovieRequest,
    is_duplicate: bool = False,
    status_override: str | None = None,
    reply_markup: InlineKeyboardMarkup | None = None,
    extra_lines: list[str] | None = None,
):
    """Send a rich poster-card reply. Returns the sent Message or None."""
    caption = _render_caption(
        req, is_duplicate=is_duplicate,
        status_override=status_override, extra_lines=extra_lines,
    )
    poster_url = f"{TMDB_IMAGE_BASE}/w780{req.poster_path}" if req.poster_path else None

    try:
        if poster_url:
            return await message.answer_photo(
                photo=poster_url,
                caption=caption,
                parse_mode="HTML",
                reply_markup=reply_markup,
            )
        return await message.reply(
            caption, parse_mode="HTML",
            disable_web_page_preview=False,
            reply_markup=reply_markup,
        )
    except Exception:
        logger.warning("Failed to send poster photo, falling back to text")
        try:
            return await message.reply(
                caption, parse_mode="HTML", reply_markup=reply_markup,
            )
        except Exception:
            logger.exception("Even text-only reply failed")
            return None
