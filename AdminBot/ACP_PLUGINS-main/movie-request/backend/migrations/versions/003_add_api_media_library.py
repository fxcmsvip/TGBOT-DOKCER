"""Add API-mode columns to media library config

Revision ID: 003_add_api_media_library
Revises: 002_widen_api_key
Create Date: 2026-04-08
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "003_add_api_media_library"
down_revision: Union[str, None] = "002_widen_api_key"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "plg_movie_request_media_library_configs",
        sa.Column("api_url", sa.String(500), nullable=True),
    )
    op.add_column(
        "plg_movie_request_media_library_configs",
        sa.Column("api_auth_header", sa.String(500), nullable=True),
    )
    op.add_column(
        "plg_movie_request_media_library_configs",
        sa.Column("api_response_path", sa.String(100), nullable=True),
    )
    # Make DB-specific fields nullable for API mode
    op.alter_column(
        "plg_movie_request_media_library_configs",
        "host", existing_type=sa.String(200), nullable=True,
    )
    op.alter_column(
        "plg_movie_request_media_library_configs",
        "database", existing_type=sa.String(100), nullable=True,
    )
    op.alter_column(
        "plg_movie_request_media_library_configs",
        "username", existing_type=sa.String(100), nullable=True,
    )
    op.alter_column(
        "plg_movie_request_media_library_configs",
        "password", existing_type=sa.String(200), nullable=True,
    )
    op.alter_column(
        "plg_movie_request_media_library_configs",
        "table_name", existing_type=sa.String(100), nullable=True,
    )
    op.alter_column(
        "plg_movie_request_media_library_configs",
        "tmdb_id_column", existing_type=sa.String(100), nullable=True,
    )


def downgrade() -> None:
    op.drop_column("plg_movie_request_media_library_configs", "api_response_path")
    op.drop_column("plg_movie_request_media_library_configs", "api_auth_header")
    op.drop_column("plg_movie_request_media_library_configs", "api_url")
