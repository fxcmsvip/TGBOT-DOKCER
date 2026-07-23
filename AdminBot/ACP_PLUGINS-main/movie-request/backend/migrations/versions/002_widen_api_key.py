"""Widen api_key column to 500 chars to accept TMDB JWT tokens

Revision ID: 002_widen_api_key
Revises: 001_initial
Create Date: 2026-04-07
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "002_widen_api_key"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "plg_movie_request_tmdb_keys",
        "api_key",
        type_=sa.String(500),
        existing_type=sa.String(200),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "plg_movie_request_tmdb_keys",
        "api_key",
        type_=sa.String(200),
        existing_type=sa.String(500),
        existing_nullable=False,
    )
