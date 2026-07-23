from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Plugin(Base, TimestampMixin):
    __tablename__ = "plugins"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    plugin_id: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    long_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    icon: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    color: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)
    categories: Mapped[list] = mapped_column(JSONB, server_default="[]")
    tags: Mapped[list] = mapped_column(JSONB, server_default="[]")
    author_id: Mapped[int] = mapped_column(
        ForeignKey("market_users.id"), nullable=False
    )
    pricing_model: Mapped[str] = mapped_column(
        String(30), server_default="free", nullable=False
    )
    # free, one_time, subscription_monthly, subscription_yearly
    price_cents: Mapped[int] = mapped_column(
        Integer, server_default="0", nullable=False
    )
    # Price in cents (e.g., 999 = $9.99)
    currency: Mapped[str] = mapped_column(
        String(3), server_default="usd", nullable=False
    )
    is_published: Mapped[bool] = mapped_column(
        Boolean, server_default="false", nullable=False
    )
    is_featured: Mapped[bool] = mapped_column(
        Boolean, server_default="false", nullable=False
    )
    download_count: Mapped[int] = mapped_column(
        Integer, server_default="0", nullable=False
    )

    # Relationships
    versions: Mapped[list[PluginVersion]] = relationship(
        back_populates="plugin", cascade="all, delete-orphan"
    )
    author: Mapped["MarketUser"] = relationship(lazy="joined")


class PluginVersion(Base, TimestampMixin):
    __tablename__ = "plugin_versions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    plugin_id_fk: Mapped[int] = mapped_column(
        ForeignKey("plugins.id", ondelete="CASCADE"), nullable=False
    )
    version: Mapped[str] = mapped_column(String(20), nullable=False)
    changelog: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    manifest: Mapped[dict] = mapped_column(JSONB, nullable=False)
    min_panel_version: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True
    )
    bundle_path: Mapped[str] = mapped_column(String(500), nullable=False)
    bundle_hash: Mapped[str] = mapped_column(
        String(64), nullable=False
    )  # SHA-256
    bundle_size: Mapped[int] = mapped_column(Integer, nullable=False)  # bytes
    signature: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )  # Ed25519 sig base64
    review_status: Mapped[str] = mapped_column(
        String(20), server_default="pending", nullable=False
    )
    # pending, approved, rejected, changes_requested
    review_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reviewed_by: Mapped[Optional[int]] = mapped_column(
        ForeignKey("market_users.id"), nullable=True
    )
    published_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )

    # Unique version per plugin
    __table_args__ = (
        UniqueConstraint("plugin_id_fk", "version", name="uq_plugin_version"),
    )

    plugin: Mapped[Plugin] = relationship(back_populates="versions")
