"""Add detail-mode columns to media library config

Revision ID: 004_media_library_detail
Revises: 003_add_api_media_library
Create Date: 2026-04-08
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "004_media_library_detail"
down_revision: Union[str, None] = "003_add_api_media_library"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "plg_movie_request_media_library_configs",
        sa.Column("name_column", sa.String(100), nullable=True),
    )
    op.add_column(
        "plg_movie_request_media_library_configs",
        sa.Column("is_dir_column", sa.String(100), nullable=True),
    )
    op.add_column(
        "plg_movie_request_media_library_configs",
        sa.Column("trashed_column", sa.String(100), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("plg_movie_request_media_library_configs", "trashed_column")
    op.drop_column("plg_movie_request_media_library_configs", "is_dir_column")
    op.drop_column("plg_movie_request_media_library_configs", "name_column")
