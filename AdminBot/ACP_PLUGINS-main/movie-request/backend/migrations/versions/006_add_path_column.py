"""Add path_column to media library config for path-based fallback query

Revision ID: 006_add_path_column
Revises: 005_add_requested_resolution
Create Date: 2026-04-08
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "006_add_path_column"
down_revision: Union[str, None] = "005_add_requested_resolution"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "plg_movie_request_media_library_configs",
        sa.Column("path_column", sa.String(100), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("plg_movie_request_media_library_configs", "path_column")
