"""Create plugin tables for movie-request plugin

Revision ID: 001_initial
Revises: None
Create Date: 2026-03-24
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # TMDB API keys
    op.create_table(
        "plg_movie_request_tmdb_keys",
        sa.Column("id", sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("api_key", sa.String(200), nullable=False),
        sa.Column("access_token", sa.String(500), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("is_rate_limited", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("rate_limited_until", sa.DateTime(), nullable=True),
        sa.Column("request_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )

    # Movie requests
    op.create_table(
        "plg_movie_request_requests",
        sa.Column("id", sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column("tmdb_id", sa.Integer(), nullable=False, index=True),
        sa.Column("media_type", sa.String(10), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("original_title", sa.String(500), nullable=True),
        sa.Column("poster_path", sa.String(200), nullable=True),
        sa.Column("backdrop_path", sa.String(200), nullable=True),
        sa.Column("release_date", sa.String(20), nullable=True),
        sa.Column("overview", sa.Text(), nullable=True),
        sa.Column("vote_average", sa.Numeric(3, 1), nullable=True),
        sa.Column("genres", sa.Text(), nullable=True),
        sa.Column("tmdb_raw", JSONB(), nullable=True),
        sa.Column("status", sa.String(20), server_default="pending", nullable=False),
        sa.Column("admin_note", sa.Text(), nullable=True),
        sa.Column("request_count", sa.Integer(), server_default="1", nullable=False),
        sa.Column("in_library", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )

    # Media library config
    op.create_table(
        "plg_movie_request_media_library_configs",
        sa.Column("id", sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("db_type", sa.String(20), nullable=False),
        sa.Column("host", sa.String(200), nullable=False),
        sa.Column("port", sa.Integer(), nullable=True),
        sa.Column("database", sa.String(100), nullable=False),
        sa.Column("username", sa.String(100), nullable=False),
        sa.Column("password", sa.String(200), nullable=False),
        sa.Column("table_name", sa.String(100), nullable=False),
        sa.Column("tmdb_id_column", sa.String(100), nullable=False),
        sa.Column("media_type_column", sa.String(100), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )

    # Movie request users (junction)
    op.create_table(
        "plg_movie_request_users",
        sa.Column("id", sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column(
            "movie_request_id",
            sa.Integer(),
            sa.ForeignKey("plg_movie_request_requests.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "tg_user_id",
            sa.Integer(),
            sa.ForeignKey("tg_users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("movie_request_id", "tg_user_id", name="uq_plg_movie_request_user"),
    )


def downgrade() -> None:
    op.drop_table("plg_movie_request_users")
    op.drop_table("plg_movie_request_media_library_configs")
    op.drop_table("plg_movie_request_requests")
    op.drop_table("plg_movie_request_tmdb_keys")
