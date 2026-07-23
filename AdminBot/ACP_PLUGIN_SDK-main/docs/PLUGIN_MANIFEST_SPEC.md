# Plugin Manifest Specification

**Version:** 1.0.0
**Status:** Authoritative
**Last Updated:** 2026-03-24

This document is the single source of truth for the ADMINCHAT Panel plugin `manifest.json` file format. Every plugin submitted to the Market or side-loaded into a Panel instance MUST include a valid `manifest.json` at the root of its bundle.

---

## Table of Contents

1. [Overview](#overview)
2. [JSON Schema](#json-schema)
3. [Field Reference](#field-reference)
   - [Identity Fields](#identity-fields)
   - [Compatibility](#compatibility)
   - [Capabilities](#capabilities)
   - [Permissions](#permissions)
   - [Backend Configuration](#backend-configuration)
   - [Frontend Configuration](#frontend-configuration)
   - [Scheduled Tasks](#scheduled-tasks)
   - [Config Schema](#config-schema)
   - [Uninstall](#uninstall)
   - [i18n](#i18n)
4. [Complete Example](#complete-example)
5. [Validation Rules](#validation-rules)

---

## Overview

The `manifest.json` file declares a plugin's identity, capabilities, permissions, and integration points. The Panel reads this file at install time to determine what resources to allocate, what routes to register, and what permissions to enforce at runtime.

### Design Principles

- **Declarative over imperative:** The manifest describes _what_ a plugin needs, not _how_ it gets it.
- **Least privilege:** Plugins must declare every capability and permission upfront. Undeclared access is denied at runtime.
- **Immutable identity:** The `id` field cannot change once a plugin is published to the Market.

---

## JSON Schema

The following is the complete JSON Schema for `manifest.json`. The Panel validates incoming manifests against this schema at install time.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://adminchat.dev/schemas/plugin-manifest/v1.json",
  "title": "ADMINCHAT Panel Plugin Manifest",
  "description": "Declarative manifest for an ADMINCHAT Panel plugin bundle.",
  "type": "object",
  "required": [
    "id",
    "name",
    "version",
    "description",
    "min_panel_version",
    "capabilities",
    "permissions"
  ],
  "additionalProperties": false,
  "properties": {
    "id": {
      "type": "string",
      "pattern": "^[a-z][a-z0-9-]{2,49}$",
      "description": "Globally unique, kebab-case identifier. Immutable once published."
    },
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100,
      "description": "Human-readable display name."
    },
    "version": {
      "type": "string",
      "pattern": "^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-((?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\\+([0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?$",
      "description": "Semantic version (MAJOR.MINOR.PATCH with optional pre-release/build)."
    },
    "description": {
      "type": "string",
      "minLength": 10,
      "maxLength": 200,
      "description": "One-line description displayed in Market listings."
    },
    "long_description_file": {
      "type": "string",
      "pattern": "^[a-zA-Z0-9_./-]+\\.md$",
      "description": "Relative path to a Markdown file for the Market detail page."
    },
    "author": {
      "type": "object",
      "required": ["name"],
      "additionalProperties": false,
      "properties": {
        "name": {
          "type": "string",
          "minLength": 1,
          "maxLength": 100,
          "description": "Author or organization name."
        },
        "email": {
          "type": "string",
          "format": "email",
          "description": "Contact email."
        },
        "url": {
          "type": "string",
          "format": "uri",
          "description": "Author website or profile URL."
        }
      }
    },
    "license": {
      "type": "string",
      "description": "SPDX license identifier (e.g. MIT, Apache-2.0, GPL-3.0-only)."
    },
    "repository": {
      "type": "string",
      "format": "uri",
      "description": "Git repository URL."
    },
    "icon": {
      "type": "string",
      "pattern": "^[a-z][a-z0-9-]*$",
      "description": "Icon name from the lucide-react icon set (kebab-case)."
    },
    "color": {
      "type": "string",
      "pattern": "^#[0-9a-fA-F]{6}$",
      "description": "Hex color used for the Market card accent and sidebar icon tint."
    },
    "screenshots": {
      "type": "array",
      "items": {
        "type": "string",
        "pattern": "^[a-zA-Z0-9_./-]+\\.(png|jpg|jpeg|webp)$"
      },
      "maxItems": 8,
      "description": "Relative paths to screenshot images (max 8). First image is the hero."
    },
    "categories": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": [
          "media",
          "automation",
          "analytics",
          "communication",
          "security",
          "utilities",
          "integration",
          "content"
        ]
      },
      "minItems": 1,
      "maxItems": 3,
      "uniqueItems": true,
      "description": "Predefined categories for Market discovery (1-3)."
    },
    "tags": {
      "type": "array",
      "items": {
        "type": "string",
        "pattern": "^[a-z0-9-]{2,30}$",
        "maxLength": 30
      },
      "maxItems": 10,
      "uniqueItems": true,
      "description": "Free-form tags for search (max 10, kebab-case)."
    },
    "min_panel_version": {
      "type": "string",
      "pattern": "^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$",
      "description": "Minimum Panel version required (semver, no pre-release)."
    },
    "max_panel_version": {
      "type": ["string", "null"],
      "pattern": "^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$",
      "description": "Maximum Panel version supported. Null means no upper bound."
    },
    "required_plugins": {
      "type": "array",
      "items": {
        "type": "string",
        "pattern": "^[a-z][a-z0-9-]{2,49}@[\\^~]?(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$"
      },
      "uniqueItems": true,
      "description": "Plugin dependencies with semver range (e.g. 'other-plugin@^1.0.0')."
    },
    "conflicts_with": {
      "type": "array",
      "items": {
        "type": "string",
        "pattern": "^[a-z][a-z0-9-]{2,49}$"
      },
      "uniqueItems": true,
      "description": "Plugin IDs that are known to conflict with this plugin."
    },
    "capabilities": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "database": {
          "type": "boolean",
          "default": false,
          "description": "Plugin needs database tables (auto-prefixed plg_{id}_)."
        },
        "bot_handler": {
          "type": "boolean",
          "default": false,
          "description": "Plugin registers Telegram bot message/callback handlers."
        },
        "api_routes": {
          "type": "boolean",
          "default": false,
          "description": "Plugin registers REST API endpoints."
        },
        "frontend_pages": {
          "type": "boolean",
          "default": false,
          "description": "Plugin ships React pages loaded via Module Federation."
        },
        "settings_tab": {
          "type": "boolean",
          "default": false,
          "description": "Plugin adds one or more tabs to the Settings page."
        },
        "scheduled_tasks": {
          "type": "boolean",
          "default": false,
          "description": "Plugin needs APScheduler cron or interval jobs."
        },
        "websocket_events": {
          "type": "boolean",
          "default": false,
          "description": "Plugin publishes custom events over the Panel WebSocket."
        },
        "media_storage": {
          "type": "boolean",
          "default": false,
          "description": "Plugin needs read/write access to file storage."
        }
      }
    },
    "permissions": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "core_api_scopes": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": [
              "users:read",
              "users:write",
              "bots:read",
              "conversations:read",
              "conversations:write",
              "messages:read",
              "messages:write",
              "faq:read",
              "settings:read"
            ]
          },
          "uniqueItems": true,
          "description": "Core SDK API scopes the plugin may call at runtime."
        },
        "bot_events": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": [
              "message.received",
              "message.sent",
              "user.created",
              "user.blocked",
              "user.unblocked",
              "conversation.created",
              "conversation.resolved",
              "bot.started",
              "bot.stopped",
              "faq.matched"
            ]
          },
          "uniqueItems": true,
          "description": "Core lifecycle events the plugin's handlers may subscribe to."
        }
      }
    },
    "backend": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "entry_point": {
          "type": "string",
          "pattern": "^[a-zA-Z_][a-zA-Z0-9_.]*$",
          "description": "Python module path containing a setup(sdk) async function."
        },
        "router_prefix": {
          "type": "string",
          "pattern": "^[a-z][a-z0-9-/]*$",
          "description": "URL prefix mounted at /api/v1/p/{plugin_id}/{prefix}."
        },
        "bot_handler_priority": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100,
          "default": 50,
          "description": "Handler dispatch priority. Lower number = higher priority."
        },
        "migrations_dir": {
          "type": "string",
          "pattern": "^[a-zA-Z0-9_./-]+$",
          "default": "migrations",
          "description": "Relative path to Alembic migration scripts directory."
        },
        "python_dependencies": {
          "type": "array",
          "items": {
            "type": "string",
            "pattern": "^[a-zA-Z0-9_-]+(\\[.+\\])?(==|>=|<=|~=|!=|<|>)?[a-zA-Z0-9_.]*$"
          },
          "uniqueItems": true,
          "description": "Additional pip packages to install in the plugin venv."
        }
      }
    },
    "frontend": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "remote_entry": {
          "type": "string",
          "pattern": "^[a-zA-Z0-9_./-]+\\.js$",
          "default": "dist/remoteEntry.js",
          "description": "Relative path to the Webpack Module Federation remote entry file."
        },
        "exposed_modules": {
          "type": "object",
          "additionalProperties": {
            "type": "string"
          },
          "description": "Module Federation exposes map. Keys are expose aliases, values are source paths."
        },
        "sidebar": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["path", "label", "icon"],
            "additionalProperties": false,
            "properties": {
              "path": {
                "type": "string",
                "pattern": "^/p/[a-z][a-z0-9-]{2,49}/",
                "description": "Route path. MUST start with /p/{plugin_id}/."
              },
              "label": {
                "type": "string",
                "minLength": 1,
                "maxLength": 40,
                "description": "Sidebar menu item label."
              },
              "icon": {
                "type": "string",
                "pattern": "^[a-z][a-z0-9-]*$",
                "description": "lucide-react icon name."
              },
              "minRole": {
                "type": "string",
                "enum": ["agent", "admin", "super_admin"],
                "default": "agent",
                "description": "Minimum role required to see this menu item."
              },
              "position": {
                "type": ["string", "integer"],
                "description": "Placement: 'after:{menu_id}', 'before:{menu_id}', or numeric index."
              },
              "badge_api": {
                "type": "string",
                "pattern": "^/api/v1/p/[a-z][a-z0-9-]{2,49}/",
                "description": "API endpoint returning { count: number } for a notification badge."
              }
            }
          },
          "description": "Sidebar navigation entries injected into the Panel shell."
        },
        "settings_tabs": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["key", "label", "module"],
            "additionalProperties": false,
            "properties": {
              "key": {
                "type": "string",
                "pattern": "^[a-z][a-z0-9-]*$",
                "description": "Unique tab key within the Settings page."
              },
              "label": {
                "type": "string",
                "minLength": 1,
                "maxLength": 40,
                "description": "Tab label text."
              },
              "module": {
                "type": "string",
                "description": "Module Federation expose key (must exist in exposed_modules)."
              }
            }
          },
          "description": "Tabs injected into the Panel Settings page."
        },
        "routes": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["path", "module"],
            "additionalProperties": false,
            "properties": {
              "path": {
                "type": "string",
                "pattern": "^/p/[a-z][a-z0-9-]{2,49}/",
                "description": "Route path. MUST start with /p/{plugin_id}/."
              },
              "module": {
                "type": "string",
                "description": "Module Federation expose key."
              },
              "exact": {
                "type": "boolean",
                "default": false,
                "description": "Whether the route requires an exact path match."
              }
            }
          },
          "description": "React Router routes registered in the Panel shell."
        }
      }
    },
    "scheduled_tasks": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "cron", "handler"],
        "additionalProperties": false,
        "properties": {
          "name": {
            "type": "string",
            "pattern": "^[a-z][a-z0-9_-]*$",
            "maxLength": 50,
            "description": "Unique task name within this plugin."
          },
          "cron": {
            "type": "string",
            "pattern": "^(\\S+\\s+){4}\\S+$",
            "description": "Standard 5-field cron expression (minute hour dom month dow)."
          },
          "handler": {
            "type": "string",
            "pattern": "^[a-zA-Z_][a-zA-Z0-9_.]*:[a-zA-Z_][a-zA-Z0-9_]*$",
            "description": "Python callable in module:function format."
          }
        }
      },
      "description": "Cron jobs registered with APScheduler on plugin activation."
    },
    "config_schema": {
      "type": "object",
      "description": "JSON Schema object defining plugin-specific settings. The Panel auto-generates a settings form from this schema. Supports string, number, integer, boolean, array, and enum types. Each property may include 'title', 'description', 'default', and 'x-ui-widget' for rendering hints.",
      "properties": {
        "type": {
          "type": "string",
          "const": "object"
        },
        "properties": {
          "type": "object"
        },
        "required": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    },
    "uninstall": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "confirm_message": {
          "type": "string",
          "maxLength": 500,
          "description": "Warning message shown to admin before uninstall proceeds."
        },
        "options": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "keep_data": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "label": {
                  "type": "string",
                  "description": "Checkbox label for the keep-data option."
                },
                "default": {
                  "type": "boolean",
                  "description": "Whether keep-data is checked by default."
                }
              }
            },
            "drop_tables": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "label": {
                  "type": "string",
                  "description": "Checkbox label for the drop-tables option."
                },
                "default": {
                  "type": "boolean",
                  "description": "Whether drop-tables is checked by default."
                }
              }
            }
          }
        }
      }
    },
    "i18n": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "supported_locales": {
          "type": "array",
          "items": {
            "type": "string",
            "pattern": "^[a-z]{2}(-[A-Z]{2})?$"
          },
          "uniqueItems": true,
          "description": "BCP 47 locale codes this plugin ships translations for."
        },
        "default_locale": {
          "type": "string",
          "pattern": "^[a-z]{2}(-[A-Z]{2})?$",
          "description": "Fallback locale when the user's locale is not supported."
        }
      }
    }
  },
  "allOf": [
    {
      "if": {
        "properties": {
          "capabilities": {
            "properties": { "api_routes": { "const": true } }
          }
        }
      },
      "then": {
        "properties": {
          "backend": {
            "required": ["entry_point"]
          }
        },
        "required": ["backend"]
      }
    },
    {
      "if": {
        "properties": {
          "capabilities": {
            "properties": { "bot_handler": { "const": true } }
          }
        }
      },
      "then": {
        "properties": {
          "backend": {
            "required": ["entry_point"]
          }
        },
        "required": ["backend"]
      }
    },
    {
      "if": {
        "properties": {
          "capabilities": {
            "properties": { "frontend_pages": { "const": true } }
          }
        }
      },
      "then": {
        "required": ["frontend"]
      }
    },
    {
      "if": {
        "properties": {
          "capabilities": {
            "properties": { "settings_tab": { "const": true } }
          }
        }
      },
      "then": {
        "required": ["frontend"],
        "properties": {
          "frontend": {
            "required": ["settings_tabs"]
          }
        }
      }
    },
    {
      "if": {
        "properties": {
          "capabilities": {
            "properties": { "scheduled_tasks": { "const": true } }
          }
        }
      },
      "then": {
        "required": ["scheduled_tasks"]
      }
    },
    {
      "if": {
        "properties": {
          "capabilities": {
            "properties": { "database": { "const": true } }
          }
        }
      },
      "then": {
        "required": ["backend"],
        "properties": {
          "backend": {
            "required": ["entry_point", "migrations_dir"]
          }
        }
      }
    }
  ]
}
```

---

## Field Reference

### Identity Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | string | Yes | - | Globally unique plugin identifier. Must be kebab-case, 3-50 characters, start with a lowercase letter. **Immutable once published to the Market.** Regex: `^[a-z][a-z0-9-]{2,49}$` |
| `name` | string | Yes | - | Human-readable display name shown in the Market card, sidebar, and Settings page. Max 100 characters. |
| `version` | string | Yes | - | Semantic version following the [semver 2.0.0](https://semver.org/) specification. Pre-release and build metadata are allowed (e.g. `1.0.0-beta.1+build.42`). |
| `description` | string | Yes | - | One-line description for Market listings and tooltips. 10-200 characters. |
| `long_description_file` | string | No | - | Relative path (from bundle root) to a Markdown file rendered on the Market detail page. Supports standard Markdown plus embedded images from the `screenshots` list. |
| `author` | object | No | - | Author metadata. Contains `name` (required), `email` (optional), and `url` (optional). |
| `license` | string | No | - | SPDX license identifier. See [SPDX License List](https://spdx.org/licenses/). |
| `repository` | string | No | - | Git repository URL for source code links. |
| `icon` | string | No | `"puzzle"` | Icon name from the [lucide-react](https://lucide.dev/) icon set, kebab-case. Rendered in the sidebar and Market card. |
| `color` | string | No | `"#00D9FF"` | 6-digit hex color used as the Market card accent color and sidebar icon tint. |
| `screenshots` | array | No | `[]` | Up to 8 relative paths to PNG/JPG/WEBP images bundled with the plugin. The first image is used as the hero image in Market listings. |
| `categories` | array | No | - | 1-3 categories from the predefined list for Market filtering and discovery. |
| `tags` | array | No | `[]` | Up to 10 free-form kebab-case tags (2-30 chars each) for Market search. |

#### Predefined Categories

| Category | Description |
|----------|-------------|
| `media` | Image, video, audio processing and management |
| `automation` | Workflow automation, auto-replies, triggers |
| `analytics` | Reporting, dashboards, metrics |
| `communication` | Messaging integrations, notifications |
| `security` | Access control, monitoring, compliance |
| `utilities` | General-purpose tools and helpers |
| `integration` | Third-party service connectors (CRM, helpdesk, etc.) |
| `content` | Content management, templates, FAQ extensions |

---

### Compatibility

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `min_panel_version` | string | Yes | - | Minimum ADMINCHAT Panel version required. The Panel rejects installation if its version is below this value. Compared using semver semantics. |
| `max_panel_version` | string\|null | No | `null` | Maximum Panel version supported. `null` means no upper bound. Set this if the plugin uses internal APIs that may break in future Panel versions. |
| `required_plugins` | array | No | `[]` | Other plugins this plugin depends on. Format: `"plugin-id@^1.0.0"`. The Panel resolves dependencies before activation and blocks activation if any dependency is missing or incompatible. Supported range operators: `^` (compatible), `~` (patch-level), exact. |
| `conflicts_with` | array | No | `[]` | Plugin IDs known to conflict. The Panel prevents simultaneous activation of conflicting plugins and displays a warning at install time. |

---

### Capabilities

All capability flags are boolean and default to `false`. A plugin MUST declare every capability it uses. Undeclared capabilities are not provisioned at runtime.

| Flag | When `true`, the Panel will... |
|------|-------------------------------|
| `database` | Create a namespaced schema and run Alembic migrations from `backend.migrations_dir`. All tables MUST use the `plg_{id}_` prefix. |
| `bot_handler` | Register the plugin's message handlers in the HotSwappableRouter with the declared `bot_handler_priority`. |
| `api_routes` | Mount the plugin's FastAPI router at `/api/v1/p/{id}/{router_prefix}`. |
| `frontend_pages` | Load the Module Federation remote entry and register React routes declared in `frontend.routes`. |
| `settings_tab` | Inject the declared tabs into the Panel Settings page. |
| `scheduled_tasks` | Register APScheduler jobs from the `scheduled_tasks` array. |
| `websocket_events` | Allow the plugin to publish custom events on the Panel WebSocket. Events are automatically namespaced as `plugin:{id}:{event_name}`. |
| `media_storage` | Provision a sandboxed storage directory at `/data/plugins/{id}/media/` and grant the plugin read/write access via the SDK. |

**Capability-dependent required fields:**

| Capability | Additionally requires |
|------------|----------------------|
| `database` | `backend.entry_point`, `backend.migrations_dir` |
| `bot_handler` | `backend.entry_point` |
| `api_routes` | `backend.entry_point` |
| `frontend_pages` | `frontend` object |
| `settings_tab` | `frontend.settings_tabs` |
| `scheduled_tasks` | `scheduled_tasks` array |

---

### Permissions

Permissions control what core Panel data and events a plugin may access at runtime. The `CoreSDKBridge` enforces these permissions on every SDK call.

#### `core_api_scopes`

| Scope | Grants access to |
|-------|------------------|
| `users:read` | List and retrieve Telegram users, search users, get user profile |
| `users:write` | Block/unblock users, update user metadata |
| `bots:read` | List configured bots, get bot status and statistics |
| `conversations:read` | List and retrieve conversations, get conversation history |
| `conversations:write` | Assign conversations, change conversation status, add internal notes |
| `messages:read` | Retrieve message history, search messages |
| `messages:write` | Send messages to users via bot, edit/delete messages |
| `faq:read` | List FAQ entries, search FAQ database |
| `settings:read` | Read Panel configuration values (non-sensitive only) |

**Scope inheritance:** `write` scopes implicitly include their corresponding `read` scope. Declaring `users:write` grants both `users:read` and `users:write`.

#### `bot_events`

| Event | Fired when |
|-------|------------|
| `message.received` | A Telegram user sends a message to a managed bot |
| `message.sent` | An agent sends a reply through the Panel |
| `user.created` | A new Telegram user is seen for the first time |
| `user.blocked` | An agent blocks a user |
| `user.unblocked` | An agent unblocks a user |
| `conversation.created` | A new conversation thread is opened |
| `conversation.resolved` | A conversation is marked as resolved |
| `bot.started` | A managed bot connects and starts polling/webhook |
| `bot.stopped` | A managed bot disconnects |
| `faq.matched` | The FAQ engine matches an incoming message to an FAQ entry |

Plugins receive only the events they declare. Event payloads are documented in the SDK Event Reference.

---

### Backend Configuration

These fields configure the plugin's Python backend. The entire `backend` object is optional if the plugin is frontend-only.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `entry_point` | string | Conditional | - | Python dotted module path to the module containing the `async def setup(sdk: PluginSDK) -> None` function. Example: `"plugin.main"`. Required if `api_routes` or `bot_handler` capability is declared. |
| `router_prefix` | string | No | `""` | URL path prefix appended after `/api/v1/p/{plugin_id}/`. Example: `"api"` results in routes at `/api/v1/p/movie-request/api/...`. |
| `bot_handler_priority` | integer | No | `50` | Dispatch priority for bot handlers. Range: 1-100. Lower values execute first. Core Panel handlers run at priority 0 (reserved). |
| `migrations_dir` | string | No | `"migrations"` | Relative path (from bundle root) to Alembic migration scripts. Required if `database` capability is declared. |
| `python_dependencies` | array | No | `[]` | Additional pip packages installed in the plugin's isolated virtual environment. Uses standard pip requirement specifier syntax. |

#### Entry Point Contract

The module referenced by `entry_point` MUST export:

```python
async def setup(sdk: PluginSDK) -> None:
    """Called once when the plugin is activated.

    Use the sdk object to:
    - Register API routes via sdk.register_router(router)
    - Register bot handlers via sdk.register_handler(handler)
    - Subscribe to events via sdk.on(event_name, callback)
    - Access configuration via sdk.config
    - Access storage via sdk.storage
    """
    ...

async def teardown(sdk: PluginSDK) -> None:
    """Called when the plugin is deactivated or uninstalled.

    Clean up resources:
    - Close external connections
    - Cancel background tasks
    - Flush buffers
    """
    ...
```

The `teardown` function is optional but strongly recommended.

---

### Frontend Configuration

These fields configure the plugin's React frontend. The entire `frontend` object is optional if the plugin is backend-only.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `remote_entry` | string | No | `"dist/remoteEntry.js"` | Relative path to the Webpack Module Federation remote entry file. |
| `exposed_modules` | object | No | `{}` | Module Federation `exposes` map. Keys are expose aliases (e.g. `"./Pages"`), values are source paths (e.g. `"./src/pages/index.tsx"`). |
| `sidebar` | array | No | `[]` | Sidebar navigation entries. See sidebar item schema below. |
| `settings_tabs` | array | No | `[]` | Settings page tab entries. Required if `settings_tab` capability is declared. |
| `routes` | array | No | `[]` | React Router route registrations. |

#### Sidebar Item Schema

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `path` | string | Yes | - | Route path. **MUST** start with `/p/{plugin_id}/`. Example: `/p/movie-request/requests`. |
| `label` | string | Yes | - | Menu item label. Max 40 characters. Translatable via i18n keys. |
| `icon` | string | Yes | - | lucide-react icon name (kebab-case). |
| `minRole` | string | No | `"agent"` | Minimum user role to see this item. One of: `"agent"`, `"admin"`, `"super_admin"`. |
| `position` | string\|integer | No | End of plugin section | Placement hint. `"after:dashboard"` places after the Dashboard item, `"before:settings"` places before Settings, or a numeric index. |
| `badge_api` | string | No | - | API endpoint (must be under the plugin's namespace) returning `{ "count": number }`. The Panel polls this endpoint every 30 seconds and renders a badge if count > 0. |

#### Core Sidebar Menu Item IDs (for `position` references)

| ID | Menu Item |
|----|-----------|
| `dashboard` | Dashboard |
| `conversations` | Conversations |
| `bots` | Bot Management |
| `users` | Users |
| `faq` | FAQ Management |
| `analytics` | Analytics |
| `settings` | Settings |

#### Settings Tab Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `key` | string | Yes | Unique tab key. Kebab-case. Used in the URL hash. |
| `label` | string | Yes | Tab label text. Max 40 characters. |
| `module` | string | Yes | Module Federation expose key that resolves to a React component. Must exist in `exposed_modules`. |

#### Route Schema

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `path` | string | Yes | - | Route path. **MUST** start with `/p/{plugin_id}/`. Supports React Router path params (e.g. `/p/movie-request/requests/:id`). |
| `module` | string | Yes | - | Module Federation expose key. |
| `exact` | boolean | No | `false` | Whether the route requires an exact path match. |

---

### Scheduled Tasks

An array of cron job definitions. Only valid when `capabilities.scheduled_tasks` is `true`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Unique task name within this plugin. Kebab-case or snake_case, max 50 chars. |
| `cron` | string | Yes | Standard 5-field cron expression: `minute hour day-of-month month day-of-week`. Example: `"0 */6 * * *"` (every 6 hours). |
| `handler` | string | Yes | Python callable in `module:function` format. Example: `"plugin.tasks:cleanup_expired"`. The function must be an `async def` accepting a single `sdk: PluginSDK` argument. |

---

### Config Schema

A standard JSON Schema (draft-07) object that defines plugin-specific settings. The Panel auto-generates a settings form from this schema and stores values in the `plugin_configs` table.

Supported JSON Schema types and their rendered UI widgets:

| JSON Schema Type | UI Widget | Notes |
|-----------------|-----------|-------|
| `string` | Text input | Use `maxLength` for validation |
| `string` + `enum` | Select dropdown | |
| `string` + `format: "uri"` | URL input | Validated as URL |
| `string` + `format: "email"` | Email input | |
| `string` + `x-ui-widget: "textarea"` | Textarea | Multi-line text |
| `string` + `x-ui-widget: "password"` | Password input | Value encrypted at rest |
| `string` + `x-ui-widget: "color"` | Color picker | |
| `number` / `integer` | Number input | Use `minimum`, `maximum` for range |
| `boolean` | Toggle switch | |
| `array` + `items.type: "string"` | Tag input | Comma-separated values |
| `object` | Nested fieldset | One level of nesting supported |

Plugin code accesses settings via `sdk.config.get("key")`.

---

### Uninstall

Configuration for the uninstall confirmation dialog.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `confirm_message` | string | No | Generic message | Custom warning shown in the uninstall confirmation dialog. Max 500 characters. |
| `options.keep_data` | object | No | `{ label: "Keep plugin data", default: true }` | Checkbox controlling whether plugin database rows are preserved after uninstall. |
| `options.drop_tables` | object | No | `{ label: "Drop database tables", default: false }` | Checkbox controlling whether plugin tables (`plg_{id}_*`) are dropped. Only shown if `keep_data` is unchecked. |

---

### i18n

Internationalization configuration.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `supported_locales` | array | No | `["en"]` | BCP 47 locale codes for which the plugin ships translation files. |
| `default_locale` | string | No | `"en"` | Fallback locale when the Panel's active locale is not in `supported_locales`. |

Translation files must be placed at `locales/{locale}.json` within the bundle and follow a flat key-value structure:

```json
{
  "sidebar.label": "Movie Requests",
  "page.title": "Request Queue",
  "config.api_key.title": "TMDB API Key"
}
```

---

## Complete Example

The following is a complete `manifest.json` for a hypothetical **Movie Request** plugin. Every field is shown for reference.

```json
{
  "id": "movie-request",
  "name": "Movie Request Manager",
  "version": "1.2.0",
  "description": "Let Telegram users request movies and track fulfillment status through the Panel.",
  "long_description_file": "docs/README.md",
  "author": {
    "name": "NovaHelix Labs",
    "email": "plugins@novahelix.dev",
    "url": "https://novahelix.dev"
  },
  "license": "MIT",
  "repository": "https://github.com/novahelix/acp-movie-request",
  "icon": "clapperboard",
  "color": "#E50914",
  "screenshots": [
    "screenshots/hero.png",
    "screenshots/request-queue.png",
    "screenshots/settings.png",
    "screenshots/bot-flow.png"
  ],
  "categories": ["media", "communication"],
  "tags": ["movie", "request", "tmdb", "media-management", "telegram-bot"],

  "min_panel_version": "0.8.0",
  "max_panel_version": null,
  "required_plugins": ["notification-center@^1.0.0"],
  "conflicts_with": ["legacy-media-bot"],

  "capabilities": {
    "database": true,
    "bot_handler": true,
    "api_routes": true,
    "frontend_pages": true,
    "settings_tab": true,
    "scheduled_tasks": true,
    "websocket_events": true,
    "media_storage": true
  },

  "permissions": {
    "core_api_scopes": [
      "users:read",
      "messages:read",
      "messages:write",
      "conversations:read",
      "bots:read"
    ],
    "bot_events": [
      "message.received",
      "message.sent",
      "user.created",
      "conversation.created"
    ]
  },

  "backend": {
    "entry_point": "movie_request.main",
    "router_prefix": "api",
    "bot_handler_priority": 30,
    "migrations_dir": "migrations",
    "python_dependencies": [
      "httpx>=0.27.0",
      "tmdbsimple>=2.9.0"
    ]
  },

  "frontend": {
    "remote_entry": "dist/remoteEntry.js",
    "exposed_modules": {
      "./RequestQueue": "./src/pages/RequestQueue.tsx",
      "./RequestDetail": "./src/pages/RequestDetail.tsx",
      "./Settings": "./src/pages/Settings.tsx",
      "./DashboardWidget": "./src/components/DashboardWidget.tsx"
    },
    "sidebar": [
      {
        "path": "/p/movie-request/requests",
        "label": "Movie Requests",
        "icon": "clapperboard",
        "minRole": "agent",
        "position": "after:conversations",
        "badge_api": "/api/v1/p/movie-request/api/pending-count"
      },
      {
        "path": "/p/movie-request/analytics",
        "label": "Request Analytics",
        "icon": "bar-chart-3",
        "minRole": "admin",
        "position": "after:analytics"
      }
    ],
    "settings_tabs": [
      {
        "key": "movie-request",
        "label": "Movie Requests",
        "module": "./Settings"
      }
    ],
    "routes": [
      {
        "path": "/p/movie-request/requests",
        "module": "./RequestQueue",
        "exact": true
      },
      {
        "path": "/p/movie-request/requests/:id",
        "module": "./RequestDetail",
        "exact": true
      },
      {
        "path": "/p/movie-request/analytics",
        "module": "./RequestQueue",
        "exact": true
      }
    ]
  },

  "scheduled_tasks": [
    {
      "name": "check-tmdb-availability",
      "cron": "0 */6 * * *",
      "handler": "movie_request.tasks:check_availability"
    },
    {
      "name": "cleanup-expired-requests",
      "cron": "0 3 * * 0",
      "handler": "movie_request.tasks:cleanup_expired"
    }
  ],

  "config_schema": {
    "type": "object",
    "required": ["tmdb_api_key"],
    "properties": {
      "tmdb_api_key": {
        "type": "string",
        "title": "TMDB API Key",
        "description": "API key from The Movie Database (themoviedb.org).",
        "x-ui-widget": "password"
      },
      "auto_search": {
        "type": "boolean",
        "title": "Auto Search TMDB",
        "description": "Automatically search TMDB when a user sends a movie title.",
        "default": true
      },
      "max_requests_per_user": {
        "type": "integer",
        "title": "Max Requests per User",
        "description": "Maximum pending requests a single user can have.",
        "default": 5,
        "minimum": 1,
        "maximum": 100
      },
      "request_expiry_days": {
        "type": "integer",
        "title": "Request Expiry (days)",
        "description": "Days after which unfulfilled requests are auto-expired.",
        "default": 30,
        "minimum": 1,
        "maximum": 365
      },
      "notification_channel": {
        "type": "string",
        "title": "Notification Channel",
        "description": "Where to send new request alerts.",
        "enum": ["panel_only", "telegram_group", "both"],
        "default": "panel_only"
      },
      "allowed_genres": {
        "type": "array",
        "title": "Allowed Genres",
        "description": "Genres users can request. Empty means all genres allowed.",
        "items": { "type": "string" },
        "default": []
      }
    }
  },

  "uninstall": {
    "confirm_message": "This will remove the Movie Request plugin. All pending requests will be lost unless you choose to keep data.",
    "options": {
      "keep_data": {
        "label": "Keep request history in database",
        "default": true
      },
      "drop_tables": {
        "label": "Drop all movie request tables (plg_movie-request_*)",
        "default": false
      }
    }
  },

  "i18n": {
    "supported_locales": ["en", "ja", "zh-CN"],
    "default_locale": "en"
  }
}
```

---

## Validation Rules

The Panel performs the following validation checks at install time. A failing check aborts installation and reports the specific error to the admin.

### Schema Validation

| # | Check | Error Message |
|---|-------|---------------|
| V1 | Manifest parses as valid JSON | `Invalid JSON: {parse_error}` |
| V2 | Manifest validates against the JSON Schema above | `Schema violation at {json_path}: {details}` |
| V3 | Semver fields parse correctly | `Invalid semver '{value}' at {field}` |
| V4 | Cron expressions parse correctly (5 fields) | `Invalid cron expression '{value}' in scheduled_tasks[{i}]` |

### Identity Validation

| # | Check | Error Message |
|---|-------|---------------|
| V5 | `id` does not collide with an already-installed plugin | `Plugin '{id}' is already installed` |
| V6 | `id` is not a reserved name (`core`, `panel`, `system`, `admin`, `api`, `plugin`) | `Plugin ID '{id}' is reserved` |
| V7 | `version` is newer than the currently installed version (for updates) | `Version {new} is not newer than installed {old}` |

### Compatibility Validation

| # | Check | Error Message |
|---|-------|---------------|
| V8 | Panel version >= `min_panel_version` | `Panel {panel_ver} below required {min_ver}` |
| V9 | Panel version <= `max_panel_version` (if set) | `Panel {panel_ver} above maximum {max_ver}` |
| V10 | All `required_plugins` are installed and version-compatible | `Missing dependency: {plugin_id}@{range}` |
| V11 | No plugin in `conflicts_with` is currently active | `Conflicts with active plugin: {plugin_id}` |

### Capability Consistency

| # | Check | Error Message |
|---|-------|---------------|
| V12 | If `api_routes` or `bot_handler` is true, `backend.entry_point` exists | `Capability {cap} requires backend.entry_point` |
| V13 | If `frontend_pages` is true, `frontend` object exists with at least one route | `Capability frontend_pages requires frontend.routes` |
| V14 | If `settings_tab` is true, `frontend.settings_tabs` is non-empty | `Capability settings_tab requires frontend.settings_tabs` |
| V15 | If `scheduled_tasks` is true, `scheduled_tasks` array is non-empty | `Capability scheduled_tasks requires task definitions` |
| V16 | If `database` is true, `backend.migrations_dir` exists in the bundle | `migrations_dir '{path}' not found in bundle` |

### File Integrity

| # | Check | Error Message |
|---|-------|---------------|
| V17 | `long_description_file` exists in the bundle (if set) | `File not found: {path}` |
| V18 | All `screenshots` files exist in the bundle | `Screenshot not found: {path}` |
| V19 | `frontend.remote_entry` file exists in the bundle (if frontend declared) | `Remote entry not found: {path}` |
| V20 | `backend.entry_point` module can be resolved from bundle root | `Entry point module not found: {module}` |
| V21 | Bundle zip signature is valid (Ed25519) | `Invalid bundle signature` |
| V22 | Bundle zip SHA-256 matches Market metadata | `Hash mismatch: expected {expected}, got {actual}` |

### Route Safety

| # | Check | Error Message |
|---|-------|---------------|
| V23 | All sidebar paths start with `/p/{id}/` | `Sidebar path must start with /p/{id}/` |
| V24 | All frontend route paths start with `/p/{id}/` | `Route path must start with /p/{id}/` |
| V25 | No route path collides with core Panel routes | `Route {path} collides with core route` |
| V26 | No route path collides with another installed plugin's routes | `Route {path} collides with plugin {other_id}` |
| V27 | `badge_api` paths start with `/api/v1/p/{id}/` | `badge_api must be under plugin API namespace` |

### Dependency Safety

| # | Check | Error Message |
|---|-------|---------------|
| V28 | `python_dependencies` do not include packages from the Panel's deny list | `Forbidden dependency: {package}` |
| V29 | No circular dependencies in `required_plugins` | `Circular dependency detected: {chain}` |

### Denied Python Packages

The following packages are blocked from `python_dependencies` to prevent security and stability issues:

| Package | Reason |
|---------|--------|
| `sqlalchemy` | Use SDK database access instead |
| `fastapi` | Already provided by Panel runtime |
| `aiogram` | Use SDK bot handler registration |
| `pydantic` | Already provided by Panel runtime |
| `uvicorn` | Server managed by Panel |
| `alembic` | Migrations managed by Panel |
| `celery` | Use Panel's APScheduler integration |
| `subprocess32` | No subprocess access allowed |

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-03-24 | Initial specification |
