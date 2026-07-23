"""
Models for TMDB movie/TV request system.
Plugin table prefix: plg_movie_request_
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class TmdbApiKey(Base, TimestampMixin):
    """TMDB API key for multi-key rotation."""

    __tablename__ = "plg_movie_request_tmdb_keys"
    __table_args__ = {"extend_existing": True}

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    api_key: Mapped[str] = mapped_column(String(500), nullable=False)
    access_token: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true", nullable=False)
    is_rate_limited: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)
    rate_limited_until: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    request_count: Mapped[int] = mapped_column(Integer, server_default="0", nullable=False)


class MovieRequest(Base, TimestampMixin):
    """A movie/TV request submitted via Telegram."""

    __tablename__ = "plg_movie_request_requests"
    __table_args__ = {"extend_existing": True}

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    tmdb_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    media_type: Mapped[str] = mapped_column(String(10), nullable=False)  # movie | tv
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    original_title: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    poster_path: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    backdrop_path: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    release_date: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    overview: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    vote_average: Mapped[Optional[float]] = mapped_column(Numeric(3, 1), nullable=True)
    genres: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tmdb_raw: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    status: Mapped[str] = mapped_column(
        String(20), server_default="pending", nullable=False
    )  # pending | fulfilled | rejected
    admin_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    request_count: Mapped[int] = mapped_column(Integer, server_default="1", nullable=False)
    in_library: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)
    # If set, this is a "supplement" request asking for a specific version
    # (e.g. user has 1080p in library but wants the 4K version too).
    # NULL means a generic full request.
    requested_resolution: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Relationships
    request_users: Mapped[list["MovieRequestUser"]] = relationship(
        "MovieRequestUser", back_populates="movie_request", cascade="all, delete-orphan"
    )


class MovieRequestUser(Base):
    """Junction: which TG user requested which movie."""

    __tablename__ = "plg_movie_request_users"
    __table_args__ = (
        UniqueConstraint("movie_request_id", "tg_user_id", name="uq_plg_movie_request_user"),
        {"extend_existing": True},
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    movie_request_id: Mapped[int] = mapped_column(
        ForeignKey("plg_movie_request_requests.id", ondelete="CASCADE"), nullable=False
    )
    tg_user_id: Mapped[int] = mapped_column(
        ForeignKey("tg_users.id", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), nullable=False
    )

    # Relationships
    movie_request: Mapped["MovieRequest"] = relationship(
        "MovieRequest", back_populates="request_users"
    )
    tg_user = relationship("TgUser", lazy="joined")


class MediaLibraryConfig(Base, TimestampMixin):
    """Configuration for connecting to an external media library database."""

    __tablename__ = "plg_movie_request_media_library_configs"
    __table_args__ = {"extend_existing": True}

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    db_type: Mapped[str] = mapped_column(String(20), nullable=False)  # postgresql | mysql | api
    host: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    port: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    database: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    username: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    password: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    table_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    tmdb_id_column: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    media_type_column: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    # Optional columns for "library detail" mode (returns version/season info
    # instead of just exists/not). When ``name_column`` is set, the plugin
    # fetches all matching filenames and parses them for resolution / HDR /
    # season-episode info to display in the bot reply.
    name_column: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    path_column: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_dir_column: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    trashed_column: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    # API-mode fields (used when db_type="api")
    api_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    api_auth_header: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    api_response_path: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true", nullable=False)
