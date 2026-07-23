"""Encrypt bot tokens and add token_hash for dedup

Revision ID: 006_encrypt_bot_tokens
Revises: 005_fix_model_issues
Create Date: 2026-04-12
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision: str = '006_encrypt_bot_tokens'
down_revision: Union[str, None] = '005_fix_model_issues'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add token_hash column (nullable first for migration)
    op.add_column(
        'bots',
        sa.Column('token_hash', sa.String(64), nullable=True),
    )

    # 2. Generate SHA-256 hash for existing plaintext tokens
    #    Using pgcrypto or a simple approach — since tokens are plaintext at this point,
    #    we compute hash in SQL. PostgreSQL doesn't have SHA-256 natively, so we use
    #    a workaround with encode(digest(...), 'hex') if pgcrypto is available,
    #    otherwise we just set a placeholder and the app will handle it.
    #    For safety, we use the encode/decode with digest function.
    try:
        op.execute(
            "UPDATE bots SET token_hash = encode(digest(token, 'sha256'), 'hex')"
        )
    except Exception:
        # If pgcrypto is not available, use a Python-side migration
        # The app will populate hashes on next bot restart
        op.execute(
            "UPDATE bots SET token_hash = 'pending_migration' WHERE token_hash IS NULL"
        )

    # 3. Make token_hash NOT NULL and unique
    op.alter_column(
        'bots', 'token_hash',
        nullable=False,
    )
    op.create_unique_constraint('uq_bots_token_hash', 'bots', ['token_hash'])

    # 4. Widen token column for Fernet-encrypted values (Fernet output is longer)
    op.alter_column(
        'bots', 'token',
        type_=sa.String(512),
        existing_type=sa.String(255),
    )


def downgrade() -> None:
    op.alter_column(
        'bots', 'token',
        type_=sa.String(255),
        existing_type=sa.String(512),
    )
    op.drop_constraint('uq_bots_token_hash', 'bots', type_='unique')
    op.drop_column('bots', 'token_hash')
