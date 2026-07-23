# ACP Plugin SDK

SDK and CLI tools for building [ADMINCHAT Panel](https://github.com/fxxkrlab/acp-panel) plugins.

## Installation

```bash
# SDK only (for type hints in your plugin)
pip install acp-plugin-sdk

# SDK + CLI tools
pip install acp-plugin-sdk[cli]
```

## Quick Start

```bash
# Create a new plugin project
acp-cli init my-plugin

# Validate manifest
cd my-plugin
acp-cli validate

# Build plugin bundle
acp-cli build

# Login to ACP Market
acp-cli login

# Publish to Market
acp-cli publish
```

## SDK Usage

The SDK provides type stubs for IDE autocomplete when developing plugins:

```python
from acp_plugin_sdk import PluginContext, ManifestSchema

async def setup(context: PluginContext):
    # Full autocomplete for context.sdk, context.secrets, etc.
    user = await context.sdk.users.get_by_id(123)
    context.logger.info(f"Plugin activated: {context.plugin_id}")
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `acp-cli init [name]` | Create a new plugin project from template |
| `acp-cli validate` | Validate manifest.json against schema |
| `acp-cli build` | Build plugin zip bundle |
| `acp-cli login` | Authenticate with ACP Market |
| `acp-cli publish` | Publish plugin to ACP Market |

## Documentation

See the [docs/](docs/) directory for detailed documentation:

- [Getting Started](docs/GETTING_STARTED.md)
- [Plugin Manifest Spec](docs/PLUGIN_MANIFEST_SPEC.md)
- [Plugin Backend API](docs/PLUGIN_BACKEND_API.md)
- [Plugin Frontend API](docs/PLUGIN_FRONTEND_API.md)
- [CLI Reference](docs/CLI_REFERENCE.md)

## License

MIT - see [LICENSE](LICENSE)
