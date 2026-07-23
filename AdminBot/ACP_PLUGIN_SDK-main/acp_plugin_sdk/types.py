"""Type stubs for ADMINCHAT Panel plugin runtime objects.

These are Protocol classes for IDE autocomplete — no runtime dependency on Panel.
At runtime, plugins receive Panel's actual implementations of these interfaces.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Callable, Coroutine, Protocol, runtime_checkable


# --------------------------------------------------------------------------- #
#  Core SDK sub-API protocols
# --------------------------------------------------------------------------- #


class UsersAPI(Protocol):
    """Read-only access to panel users. Scope: users:read"""

    async def get_by_id(self, user_id: int) -> dict[str, Any] | None: ...
    async def get_by_tg_uid(self, tg_uid: int) -> dict[str, Any] | None: ...


class BotsAPI(Protocol):
    """Read-only access to panel bots. Scope: bots:read"""

    async def get_active(self) -> list[dict[str, Any]]: ...
    async def get_by_id(self, bot_id: int) -> dict[str, Any] | None: ...


class MessagesAPI(Protocol):
    """Read-only access to messages. Scope: messages:read"""

    async def get_by_id(self, message_id: int) -> dict[str, Any]: ...


class GroupsAPI(Protocol):
    """Read-only access to groups. Scope: groups:read"""

    async def list_groups(self) -> list[dict[str, Any]]: ...


class FAQAPI(Protocol):
    """Read-only access to FAQ system. Scope: faq:read"""

    async def search(self, query: str) -> list[dict[str, Any]]: ...


class SettingsAPI(Protocol):
    """Read-only access to panel settings. Scope: settings:read"""

    async def get(self, key: str) -> Any: ...


class CoreSDKBridge(Protocol):
    """Scoped API bridge — only exposes APIs the plugin has permission for."""

    @property
    def users(self) -> UsersAPI: ...

    @property
    def bots(self) -> BotsAPI: ...

    @property
    def messages(self) -> MessagesAPI: ...

    @property
    def groups(self) -> GroupsAPI: ...

    @property
    def faq(self) -> FAQAPI: ...

    @property
    def settings(self) -> SettingsAPI: ...


# --------------------------------------------------------------------------- #
#  Secret store
# --------------------------------------------------------------------------- #


class PluginSecretStore(Protocol):
    """Encrypted key-value store for plugin secrets."""

    async def get(self, key: str) -> str | None: ...
    async def set(self, key: str, value: str) -> None: ...
    async def delete(self, key: str) -> bool: ...
    async def list_keys(self) -> list[str]: ...
    async def delete_all(self) -> None: ...


# --------------------------------------------------------------------------- #
#  Config store
# --------------------------------------------------------------------------- #


class PluginConfigStore(Protocol):
    """Plugin configuration storage with caching."""

    async def get(self, key: str, default: Any = None) -> Any: ...
    async def set(self, key: str, value: Any) -> None: ...
    async def get_all(self) -> dict[str, Any]: ...
    async def set_all(self, config: dict[str, Any]) -> None: ...
    def invalidate_cache(self) -> None: ...


# --------------------------------------------------------------------------- #
#  Event bus
# --------------------------------------------------------------------------- #

HandlerType = Callable[..., Coroutine[Any, Any, Any]]


class PluginEventBus(Protocol):
    """Pub/sub event system for inter-plugin communication."""

    def subscribe(self, plugin_id: str, event: str, handler: HandlerType) -> None: ...
    def unsubscribe_all(self, plugin_id: str) -> None: ...
    async def emit(self, event: str, data: Any = None) -> None: ...


# --------------------------------------------------------------------------- #
#  Plugin context (the main object passed to setup())
# --------------------------------------------------------------------------- #


@runtime_checkable
class PluginContext(Protocol):
    """Context object passed to a plugin's ``setup()`` function.

    Provides access to all Panel services the plugin is permitted to use.
    """

    plugin_id: str
    version: str
    manifest: dict[str, Any]
    plugin_path: Path
    sdk: CoreSDKBridge
    secrets: PluginSecretStore
    config: PluginConfigStore
    event_bus: PluginEventBus
    logger: logging.Logger
