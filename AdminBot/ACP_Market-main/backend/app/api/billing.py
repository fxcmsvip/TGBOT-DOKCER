from __future__ import annotations

import logging
from typing import Annotated, Optional

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.config import settings
from app.models.billing import License, Purchase
from app.models.plugin import Plugin, PluginVersion
from app.models.user import MarketUser
from app.schemas.common import APIResponse
from app.utils.security import generate_license_key

logger = logging.getLogger("acp_market.api.billing")

router = APIRouter(prefix="/billing", tags=["billing"])

stripe.api_key = settings.STRIPE_SECRET_KEY


class CheckoutBody(BaseModel):
    plugin_id: str
    version: str


@router.post("/checkout", response_model=APIResponse, status_code=201)
async def create_checkout(
    body: CheckoutBody,
    current_user: Annotated[MarketUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Create Stripe Checkout Session."""
    plugin_id = body.plugin_id
    version = body.version

    # Find plugin
    result = await db.execute(
        select(Plugin).where(Plugin.plugin_id == plugin_id)
    )
    plugin = result.scalar_one_or_none()

    if plugin is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plugin not found",
        )

    if plugin.pricing_model == "free":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot checkout a free plugin",
        )

    # Check for existing active license (with pessimistic locking to prevent race condition)
    existing = await db.execute(
        select(License).where(
            License.plugin_id_fk == plugin.id,
            License.user_id == current_user.id,
            License.status == "active",
        ).with_for_update()
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Active license already exists for this plugin",
        )

    # Determine checkout mode
    mode = "payment" if plugin.pricing_model == "one_time" else "subscription"

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": plugin.currency,
                    "product_data": {"name": plugin.name},
                    "unit_amount": plugin.price_cents,
                },
                "quantity": 1,
            }],
            mode=mode,
            success_url=f"https://{settings.MARKET_DOMAIN}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"https://{settings.MARKET_DOMAIN}/checkout/cancel",
            metadata={
                "plugin_id": plugin.plugin_id,
                "version": version,
                "user_id": str(current_user.id),
            },
        )
    except stripe.error.StripeError as e:
        logger.error("Stripe error creating checkout session: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Payment provider error",
        )

    return APIResponse(
        code=201,
        message="Checkout session created",
        data={
            "checkout_url": session.url,
            "session_id": session.id,
        },
    )


@router.get("/licenses", response_model=APIResponse)
async def list_licenses(
    current_user: Annotated[MarketUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    plugin_id: Optional[str] = None,
):
    """List user's licenses."""
    query = select(License).where(License.user_id == current_user.id)

    if plugin_id:
        # Join to filter by plugin_id string
        query = query.join(Plugin, Plugin.id == License.plugin_id_fk).where(
            Plugin.plugin_id == plugin_id
        )

    query = query.order_by(License.created_at.desc())
    result = await db.execute(query)
    licenses = result.scalars().all()

    items = [
        {
            "id": lic.id,
            "license_key": lic.license_key,
            "license_type": lic.license_type,
            "status": lic.status,
            "expires_at": lic.expires_at.isoformat() if lic.expires_at else None,
            "created_at": lic.created_at.isoformat() if lic.created_at else None,
        }
        for lic in licenses
    ]

    return APIResponse(data=items)


@router.get("/purchases", response_model=APIResponse)
async def list_purchases(
    current_user: Annotated[MarketUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = 1,
    page_size: int = 20,
):
    """List purchases for plugins authored by the current user."""
    page_size = min(page_size, 100)
    offset = (page - 1) * page_size

    from sqlalchemy import func
    from sqlalchemy.orm import selectinload

    # Count total
    count_q = (
        select(func.count())
        .select_from(Purchase)
        .join(Plugin, Plugin.id == Purchase.plugin_id_fk)
        .where(Plugin.author_id == current_user.id)
    )
    total_result = await db.execute(count_q)
    total = total_result.scalar() or 0

    # Fetch purchases where the current user is the plugin author
    query = (
        select(Purchase, Plugin.plugin_id, Plugin.name.label("plugin_name"))
        .join(Plugin, Plugin.id == Purchase.plugin_id_fk)
        .where(Plugin.author_id == current_user.id)
        .order_by(Purchase.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    result = await db.execute(query)
    rows = result.all()

    items = [
        {
            "id": purchase.id,
            "plugin_id": plugin_id_str,
            "plugin_name": plugin_name,
            "buyer_id": purchase.user_id,
            "amount_cents": purchase.amount_cents,
            "currency": purchase.currency,
            "platform_fee_cents": purchase.platform_fee_cents,
            "developer_payout_cents": purchase.developer_payout_cents,
            "status": purchase.status,
            "created_at": purchase.created_at.isoformat() if purchase.created_at else None,
        }
        for purchase, plugin_id_str, plugin_name in rows
    ]

    return APIResponse(data={
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    })


@router.get("/licenses/{license_key}/validate", response_model=APIResponse)
async def validate_license(
    license_key: str,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Validate a license key. Returns validity, plugin_id, expiry, type."""
    result = await db.execute(
        select(License)
        .where(License.license_key == license_key)
        .join(Plugin, Plugin.id == License.plugin_id_fk)
    )
    # Need plugin_id too
    result2 = await db.execute(
        select(License, Plugin.plugin_id)
        .join(Plugin, Plugin.id == License.plugin_id_fk)
        .where(License.license_key == license_key)
    )
    row = result2.first()

    if row is None:
        return APIResponse(data={
            "valid": False,
            "plugin_id": None,
            "expires_at": None,
            "type": None,
        })

    lic, plugin_id_str = row

    from datetime import datetime

    is_valid = lic.status == "active"
    if lic.expires_at and lic.expires_at < datetime.utcnow():
        is_valid = False

    return APIResponse(data={
        "valid": is_valid,
        "plugin_id": plugin_id_str,
        "expires_at": lic.expires_at.isoformat() if lic.expires_at else None,
        "type": lic.license_type,
    })


@router.post("/webhooks/stripe")
async def stripe_webhook(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Handle Stripe webhooks."""
    payload = await request.body()
    sig = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig, settings.STRIPE_WEBHOOK_SECRET
        )
    except (ValueError, stripe.error.SignatureVerificationError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid webhook",
        )

    if event.type == "checkout.session.completed":
        session_data = event.data.object
        metadata = session_data.get("metadata", {})
        if not metadata:
            logger.warning("Webhook missing metadata, event_id=%s", event.id)
            return {"status": "ignored", "reason": "no_metadata"}

        try:
            user_id = int(metadata.get("user_id", ""))
            plugin_id_str = metadata.get("plugin_id", "")
            version_str = metadata.get("version", "")
        except (ValueError, TypeError):
            logger.error("Invalid metadata in webhook: %s", metadata)
            return {"status": "error", "reason": "invalid_metadata"}

        if not plugin_id_str or not version_str:
            logger.error("Missing plugin_id or version in webhook metadata")
            return {"status": "error", "reason": "incomplete_metadata"}

        # Idempotency check: skip if this Stripe session was already processed
        stripe_session_id = session_data.get("id")
        if stripe_session_id:
            existing_purchase = await db.execute(
                select(Purchase).where(Purchase.stripe_session_id == stripe_session_id)
            )
            if existing_purchase.scalar_one_or_none() is not None:
                logger.info("Webhook already processed for session %s", stripe_session_id)
                return {"status": "already_processed"}

        # Lookup plugin
        result = await db.execute(
            select(Plugin).where(Plugin.plugin_id == plugin_id_str)
        )
        plugin = result.scalar_one_or_none()

        if plugin is None:
            logger.error("Webhook: plugin %s not found", plugin_id_str)
            return {"status": "error", "message": "Plugin not found"}

        # Create license
        from datetime import datetime, timedelta

        license_key = generate_license_key(plugin_id_str)

        expires_at = None
        if plugin.pricing_model == "subscription_monthly":
            expires_at = datetime.utcnow() + timedelta(days=30)
        elif plugin.pricing_model == "subscription_yearly":
            expires_at = datetime.utcnow() + timedelta(days=365)

        license_record = License(
            license_key=license_key,
            plugin_id_fk=plugin.id,
            user_id=user_id,
            license_type=plugin.pricing_model,
            status="active",
            stripe_payment_intent_id=session_data.get("payment_intent"),
            stripe_subscription_id=session_data.get("subscription"),
            expires_at=expires_at,
        )
        db.add(license_record)
        await db.flush()

        # Create purchase record
        amount_cents = session_data.get("amount_total", 0)
        platform_fee = int(amount_cents * settings.STRIPE_PLATFORM_FEE_PERCENT / 100)
        developer_payout = amount_cents - platform_fee

        purchase = Purchase(
            user_id=user_id,
            plugin_id_fk=plugin.id,
            license_id=license_record.id,
            amount_cents=amount_cents,
            currency=plugin.currency,
            platform_fee_cents=platform_fee,
            developer_payout_cents=developer_payout,
            stripe_session_id=stripe_session_id,
            status="completed",
        )
        db.add(purchase)
        await db.commit()

        logger.info(
            "License created: %s for plugin %s, user %s",
            license_key, plugin_id_str, user_id,
        )

    return {"status": "ok"}
