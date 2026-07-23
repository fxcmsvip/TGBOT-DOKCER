from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class ReviewSubmission(Base, TimestampMixin):
    __tablename__ = "review_submissions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    plugin_version_id: Mapped[int] = mapped_column(
        ForeignKey("plugin_versions.id", ondelete="CASCADE")
    )
    submitted_by: Mapped[int] = mapped_column(
        ForeignKey("market_users.id")
    )
    status: Mapped[str] = mapped_column(
        String(20), server_default="pending"
    )
    # pending, in_review, approved, rejected, changes_requested
    auto_check_passed: Mapped[bool] = mapped_column(
        Boolean, server_default="false"
    )
    auto_check_report: Mapped[Optional[dict]] = mapped_column(
        JSONB, nullable=True
    )
    reviewer_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("market_users.id"), nullable=True
    )
    review_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )
