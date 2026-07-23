from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class License(Base, TimestampMixin):
    __tablename__ = "licenses"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    license_key: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False, index=True
    )
    plugin_id_fk: Mapped[int] = mapped_column(
        ForeignKey("plugins.id"), nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("market_users.id"), nullable=False
    )
    license_type: Mapped[str] = mapped_column(
        String(30), nullable=False
    )  # one_time, subscription_monthly, subscription_yearly
    status: Mapped[str] = mapped_column(
        String(20), server_default="active", nullable=False
    )
    # active, expired, revoked
    stripe_subscription_id: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )
    stripe_payment_intent_id: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )


class Purchase(Base, TimestampMixin):
    __tablename__ = "purchases"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("market_users.id"), nullable=False
    )
    plugin_id_fk: Mapped[int] = mapped_column(
        ForeignKey("plugins.id"), nullable=False
    )
    license_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("licenses.id"), nullable=True
    )
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), server_default="usd")
    platform_fee_cents: Mapped[int] = mapped_column(
        Integer, server_default="0"
    )
    developer_payout_cents: Mapped[int] = mapped_column(
        Integer, server_default="0"
    )
    stripe_session_id: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )
    status: Mapped[str] = mapped_column(String(20), server_default="pending")
    # pending, completed, refunded


class ApiKey(Base, TimestampMixin):
    __tablename__ = "api_keys"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("market_users.id"), nullable=False
    )
    key_hash: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=False
    )
    key_prefix: Mapped[str] = mapped_column(
        String(10), nullable=False
    )  # First 8 chars for identification
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    scopes: Mapped[list] = mapped_column(
        JSONB, server_default='["registry:read","billing:read"]'
    )
    last_used_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true")
