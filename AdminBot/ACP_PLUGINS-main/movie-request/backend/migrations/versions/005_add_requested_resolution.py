"""Add requested_resolution to movie requests for supplement-request feature

Revision ID: 005_add_requested_resolution
Revises: 004_media_library_detail
Create Date: 2026-04-08
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "005_add_requested_resolution"
down_revision: Union[str, None] = "004_media_library_detail"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "plg_movie_request_requests",
        sa.Column("requested_resolution", sa.String(20), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("plg_movie_request_requests", "requested_resolution")
