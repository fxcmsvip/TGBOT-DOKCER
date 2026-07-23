"""Configuration file management for ACP CLI.

Stores auth tokens and Market URL in ~/.acp/config.json.
"""

from __future__ import annotations

import json
import os
import stat
from pathlib import Path
from typing import Any

DEFAULT_MARKET_URL = "https://acpmarket.novahelix.org/api/v1"
CONFIG_DIR = Path.home() / ".acp"
CONFIG_FILE = CONFIG_DIR / "config.json"


def _ensure_dir() -> None:
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    # Restrict directory to owner only (0700)
    CONFIG_DIR.chmod(stat.S_IRWXU)


def load_config() -> dict[str, Any]:
    """Load config from ~/.acp/config.json. Returns empty dict if not found."""
    if not CONFIG_FILE.exists():
        return {}
    try:
        return json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}


def save_config(config: dict[str, Any]) -> None:
    """Save config to ~/.acp/config.json with restricted permissions (0600)."""
    _ensure_dir()
    content = json.dumps(config, indent=2, ensure_ascii=False) + "\n"
    # Write with restricted permissions: owner read/write only
    fd = os.open(
        str(CONFIG_FILE),
        os.O_WRONLY | os.O_CREAT | os.O_TRUNC,
        0o600,
    )
    try:
        os.write(fd, content.encode("utf-8"))
    finally:
        os.close(fd)
    # Ensure permissions even if file already existed with wider perms
    CONFIG_FILE.chmod(stat.S_IRUSR | stat.S_IWUSR)


def get_market_url() -> str:
    """Get the configured Market API URL."""
    cfg = load_config()
    return cfg.get("market_url", DEFAULT_MARKET_URL)


def get_access_token() -> str | None:
    """Get the stored access token."""
    return load_config().get("access_token")


def get_refresh_token() -> str | None:
    """Get the stored refresh token."""
    return load_config().get("refresh_token")


def save_auth(
    access_token: str,
    refresh_token: str | None = None,
    market_url: str | None = None,
) -> None:
    """Save authentication tokens to config.

    When refresh_token is not provided, any existing refresh_token is cleared
    to prevent stale tokens (e.g. switching from password to API key auth).
    """
    cfg = load_config()
    cfg["access_token"] = access_token
    if refresh_token:
        cfg["refresh_token"] = refresh_token
    else:
        cfg.pop("refresh_token", None)
    if market_url:
        cfg["market_url"] = market_url
    save_config(cfg)


def clear_auth() -> None:
    """Remove auth tokens from config."""
    cfg = load_config()
    cfg.pop("access_token", None)
    cfg.pop("refresh_token", None)
    save_config(cfg)


def is_logged_in() -> bool:
    """Check if an access token is stored."""
    return bool(get_access_token())
