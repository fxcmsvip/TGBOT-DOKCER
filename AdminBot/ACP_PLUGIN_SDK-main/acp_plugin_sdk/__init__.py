"""ACP Plugin SDK — type stubs and manifest validation for ADMINCHAT Panel plugins."""

from acp_plugin_sdk.manifest import ManifestSchema, validate_manifest
from acp_plugin_sdk.types import (
    BotsAPI,
    CoreSDKBridge,
    FAQAPI,
    GroupsAPI,
    HandlerType,
    MessagesAPI,
    PluginConfigStore,
    PluginContext,
    PluginEventBus,
    PluginSecretStore,
    SettingsAPI,
    UsersAPI,
)
from acp_plugin_sdk.version import __version__

__all__ = [
    "__version__",
    "ManifestSchema",
    "validate_manifest",
    "PluginContext",
    "CoreSDKBridge",
    "UsersAPI",
    "BotsAPI",
    "MessagesAPI",
    "GroupsAPI",
    "FAQAPI",
    "SettingsAPI",
    "PluginSecretStore",
    "PluginConfigStore",
    "PluginEventBus",
    "HandlerType",
]
