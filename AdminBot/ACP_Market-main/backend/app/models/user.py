from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class MarketUser(Base, TimestampMixin):
    __tablename__ = "market_users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    role: Mapped[str] = mapped_column(
        String(20), server_default="developer", nullable=False
    )
    # roles: super_admin, admin, reviewer, developer, user
    is_active: Mapped[bool] = mapped_column(
        Boolean, server_default="true", nullable=False
    )
    is_verified: Mapped[bool] = mapped_column(
        Boolean, server_default="false", nullable=False
    )
    github_url: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    stripe_account_id: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )
    # Stripe Connect account ID for payouts

    # Password reset
    password_reset_token: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )
    password_reset_expires: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )
