"""Manifest schema for ADMINCHAT Panel plugins.

Validates manifest.json files against the official plugin manifest specification.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

# --------------------------------------------------------------------------- #
#  Regex patterns
# --------------------------------------------------------------------------- #

PLUGIN_ID_RE = re.compile(r"^[a-z][a-z0-9-]{2,49}$")
SEMVER_RE = re.compile(
    r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)"
    r"(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)"
    r"(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?"
    r"(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$"
)

VALID_SCOPES = {
    "users:read",
    "bots:read",
    "messages:read",
    "groups:read",
    "faq:read",
    "settings:read",
}

VALID_BOT_EVENTS = {
    "message",
    "callback_query",
    "inline_query",
    "edited_message",
    "channel_post",
}

# Known top-level manifest keys (for typo detection)
_KNOWN_KEYS = {
    "id", "name", "version", "description", "author", "license", "repository",
    "icon", "color", "categories", "tags", "entry_point", "bot_handler_priority",
    "compatibility", "min_panel_version", "capabilities", "permissions",
    "frontend", "scheduled_tasks", "config_schema", "uninstall", "i18n",
}


# --------------------------------------------------------------------------- #
#  Sub-models
# --------------------------------------------------------------------------- #


class AuthorSchema(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: str | None = None


class CompatibilitySchema(BaseModel):
    min_panel_version: str = Field(..., pattern=r"^\d+\.\d+\.\d+$")


class CapabilitiesSchema(BaseModel):
    database: bool = False
    bot_handler: bool = False
    api_routes: bool = False
    frontend_pages: bool = False
    settings_tab: bool = False


class PermissionsSchema(BaseModel):
    core_api_scopes: list[str] = Field(default_factory=list)
    bot_events: list[str] = Field(default_factory=list)

    @field_validator("core_api_scopes", mode="before")
    @classmethod
    def validate_scopes(cls, v: list[str]) -> list[str]:
        for scope in v:
            if scope not in VALID_SCOPES:
                raise ValueError(f"Unknown scope: {scope!r}. Valid: {sorted(VALID_SCOPES)}")
        return v

    @field_validator("bot_events", mode="before")
    @classmethod
    def validate_events(cls, v: list[str]) -> list[str]:
        for event in v:
            if event not in VALID_BOT_EVENTS:
                raise ValueError(
                    f"Unknown bot event: {event!r}. Valid: {sorted(VALID_BOT_EVENTS)}"
                )
        return v


class SidebarItemSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    path: str
    label: str
    icon: str | None = None
    min_role: str | None = Field(None, alias="minRole")
    position: int | str = 100  # int or "after:section_name"

    @field_validator("position", mode="before")
    @classmethod
    def validate_position(cls, v: int | str) -> int | str:
        if isinstance(v, str) and not re.match(r"^(before|after):\w+$", v):
            raise ValueError(
                f"String position must match 'before:<name>' or 'after:<name>', got: {v!r}"
            )
        return v


class SettingsTabSchema(BaseModel):
    key: str
    label: str
    module: str


class FrontendSchema(BaseModel):
    remote_entry: str = Field(default="frontend/dist/remoteEntry.js")
    sidebar: list[SidebarItemSchema] = Field(default_factory=list)
    settings_tabs: list[SettingsTabSchema] = Field(default_factory=list)


class UninstallSchema(BaseModel):
    confirm_message: str | None = None
    keep_data: bool = False
    drop_tables: list[str] = Field(default_factory=list)


class ScheduledTaskSchema(BaseModel):
    name: str
    cron: str
    handler: str

    @field_validator("cron")
    @classmethod
    def validate_cron(cls, v: str) -> str:
        parts = v.strip().split()
        if len(parts) != 5:
            raise ValueError(
                f"Cron expression must have exactly 5 fields (minute hour dom month dow), got {len(parts)}: {v!r}"
            )
        return v


# --------------------------------------------------------------------------- #
#  Main manifest model
# --------------------------------------------------------------------------- #


class ManifestSchema(BaseModel):
    """Pydantic model matching the ADMINCHAT Panel plugin manifest spec v1."""

    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    # Identity
    id: str = Field(..., min_length=3, max_length=50)
    name: str = Field(..., min_length=1, max_length=100)
    version: str
    description: str = Field("", max_length=500)
    author: AuthorSchema | None = None
    license: str | None = None
    repository: str | None = None
    icon: str | None = None
    color: str | None = None
    categories: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)

    # Entry point
    entry_point: str = Field(default="backend/plugin.py")
    bot_handler_priority: int = Field(default=50, ge=0, le=100)

    # Compatibility & capabilities
    compatibility: CompatibilitySchema | None = None
    min_panel_version: str | None = None  # shorthand (top-level)
    capabilities: CapabilitiesSchema = Field(default_factory=CapabilitiesSchema)
    permissions: PermissionsSchema = Field(default_factory=PermissionsSchema)

    # Frontend
    frontend: FrontendSchema | None = None

    # Scheduled tasks
    scheduled_tasks: list[ScheduledTaskSchema] = Field(default_factory=list)

    # Config & uninstall
    config_schema: dict[str, Any] | None = None
    uninstall: UninstallSchema | None = None

    # i18n
    i18n: dict[str, Any] | None = None

    @field_validator("id")
    @classmethod
    def validate_id(cls, v: str) -> str:
        if not PLUGIN_ID_RE.match(v):
            raise ValueError(
                f"Plugin id must be kebab-case, 3-50 chars, start with letter: {v!r}"
            )
        return v

    @field_validator("version")
    @classmethod
    def validate_version(cls, v: str) -> str:
        if not SEMVER_RE.match(v):
            raise ValueError(f"Version must be valid semver: {v!r}")
        return v

    @model_validator(mode="after")
    def normalize_compatibility(self) -> "ManifestSchema":
        """Allow either top-level min_panel_version or nested compatibility."""
        if self.min_panel_version and not self.compatibility:
            self.compatibility = CompatibilitySchema(
                min_panel_version=self.min_panel_version
            )
        return self


# --------------------------------------------------------------------------- #
#  Validation helper
# --------------------------------------------------------------------------- #


def validate_manifest(manifest_path: str | Path) -> tuple[ManifestSchema | None, list[str]]:
    """Validate a manifest.json file.

    Returns (schema, errors). If errors is non-empty, schema may be None.
    """
    path = Path(manifest_path)
    errors: list[str] = []

    if not path.exists():
        return None, [f"Manifest not found: {path}"]

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        return None, [f"Invalid JSON: {e}"]

    # Warn about unknown top-level keys before strict validation
    unknown_keys = set(data.keys()) - _KNOWN_KEYS
    if unknown_keys:
        errors.append(f"Unknown manifest keys (possible typo): {sorted(unknown_keys)}")

    try:
        schema = ManifestSchema.model_validate(data)
    except Exception as e:
        return None, errors + [str(e)]

    # Check entry_point file exists relative to manifest directory
    plugin_dir = path.parent
    entry_path = plugin_dir / schema.entry_point
    if not entry_path.exists():
        errors.append(
            f"Entry point not found: {schema.entry_point} (expected at {entry_path})"
        )

    # Check frontend structure if frontend_pages declared
    if schema.capabilities.frontend_pages:
        frontend_dir = plugin_dir / "frontend"
        if not frontend_dir.exists():
            errors.append(
                "frontend_pages capability declared but no frontend/ directory found"
            )
        if schema.frontend and schema.frontend.sidebar:
            for item in schema.frontend.sidebar:
                if not item.path or not item.label:
                    errors.append(f"Sidebar item missing path or label: {item}")

    return schema, errors
