"""acp-cli init — scaffold a new plugin project from template."""

from __future__ import annotations

import importlib.resources
import json
import re
from pathlib import Path

import click
from jinja2 import Environment, FileSystemLoader
from rich.console import Console

console = Console()


def _get_templates_dir() -> Path | None:
    """Find the templates/basic directory.

    Works both in development (relative path) and after pip install (package data).
    """
    # Try relative path first (development / editable install)
    dev_path = Path(__file__).parent.parent.parent / "templates" / "basic"
    if dev_path.exists():
        return dev_path

    # Try importlib.resources (installed package)
    try:
        ref = importlib.resources.files("acp_cli").parent / "templates" / "basic"
        path = Path(str(ref))
        if path.exists():
            return path
    except (TypeError, FileNotFoundError):
        pass

    return None


def _slugify(name: str) -> str:
    """Convert a name to a valid plugin ID (kebab-case).

    Rules: lowercase, only [a-z0-9-], starts with letter, 3-50 chars.
    """
    slug = name.lower()
    # Replace common separators with hyphens
    slug = slug.replace(" ", "-").replace("_", "-")
    # Remove anything that isn't alphanumeric or hyphen
    slug = re.sub(r"[^a-z0-9-]", "", slug)
    # Collapse consecutive hyphens
    slug = re.sub(r"-{2,}", "-", slug)
    # Strip leading/trailing hyphens
    slug = slug.strip("-")
    # Ensure starts with a letter
    slug = re.sub(r"^[^a-z]+", "", slug)
    # Ensure minimum length
    if len(slug) < 3:
        slug = slug + "-plugin" if slug else "my-plugin"
    # Truncate to max length
    slug = slug[:50]
    return slug


@click.command("init")
@click.argument("name", required=False)
def init_cmd(name: str | None) -> None:
    """Create a new plugin project from template."""
    # Interactive prompts
    if not name:
        name = click.prompt("Plugin name", type=str)

    plugin_id = click.prompt("Plugin ID (kebab-case)", default=_slugify(name))
    description = click.prompt("Description", default="")
    author_name = click.prompt("Author name", default="")
    author_email = click.prompt("Author email", default="")
    with_frontend = click.confirm("Include frontend?", default=False)

    target = Path.cwd() / plugin_id
    if target.exists():
        console.print(f"[red]Directory already exists: {target}[/red]")
        raise SystemExit(1)

    ctx = {
        "plugin_id": plugin_id,
        "plugin_name": name,
        "description": description,
        "author_name": author_name,
        "author_email": author_email,
        "with_frontend": with_frontend,
    }

    console.print(f"[cyan]Creating plugin project: {plugin_id}[/cyan]")

    # Create directories
    target.mkdir(parents=True)
    (target / "backend").mkdir()
    if with_frontend:
        (target / "frontend" / "src").mkdir(parents=True)

    # Render templates if available, otherwise generate directly
    templates_dir = _get_templates_dir()
    if templates_dir is not None:
        env = Environment(
            loader=FileSystemLoader(str(templates_dir)),
            keep_trailing_newline=True,
        )
        _render_template(env, "manifest.json.j2", target / "manifest.json", ctx)
        _render_template(
            env, "backend/plugin.py.j2", target / "backend" / "plugin.py", ctx
        )
        # __init__.py for backend
        (target / "backend" / "__init__.py").write_text("")

        if with_frontend:
            _render_template(
                env, "frontend/package.json.j2", target / "frontend" / "package.json", ctx
            )
            # Copy static files
            for static in ["frontend/vite.config.ts", "frontend/src/index.ts"]:
                src = templates_dir / static
                if src.exists():
                    dest = target / static
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    dest.write_text(src.read_text(encoding="utf-8"), encoding="utf-8")
    else:
        # Fallback — generate files without templates
        _generate_manifest(target, ctx)
        _generate_plugin_py(target, ctx)
        (target / "backend" / "__init__.py").write_text("")

        if with_frontend:
            _generate_package_json(target, ctx)

    console.print()
    console.print("[green bold]Plugin project created![/green bold]")
    console.print(f"  [cyan]cd {plugin_id}[/cyan]")
    console.print(f"  [cyan]acp-cli validate[/cyan]")


def _render_template(
    env: Environment, template_name: str, output: Path, ctx: dict
) -> None:
    """Render a Jinja2 template to a file. Raises on error."""
    try:
        tmpl = env.get_template(template_name)
        output.write_text(tmpl.render(**ctx), encoding="utf-8")
    except Exception as exc:
        console.print(f"[red]Failed to render template {template_name}: {exc}[/red]")
        raise SystemExit(1)


def _generate_manifest(target: Path, ctx: dict) -> None:
    manifest = {
        "id": ctx["plugin_id"],
        "name": ctx["plugin_name"],
        "version": "0.1.0",
        "description": ctx["description"],
        "author": {"name": ctx["author_name"], "email": ctx["author_email"]},
        "license": "MIT",
        "entry_point": "backend/plugin.py",
        "min_panel_version": "0.3.0",
        "capabilities": {
            "database": False,
            "bot_handler": False,
            "api_routes": True,
            "frontend_pages": ctx["with_frontend"],
            "settings_tab": False,
        },
        "permissions": {"core_api_scopes": [], "bot_events": []},
    }
    if ctx["with_frontend"]:
        manifest["frontend"] = {
            "remote_entry": "frontend/dist/remoteEntry.js",
            "sidebar": [],
            "settings_tabs": [],
        }
    (target / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )


def _generate_plugin_py(target: Path, ctx: dict) -> None:
    code = f'''"""Plugin: {ctx["plugin_name"]}"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from acp_plugin_sdk import PluginContext

_context: PluginContext | None = None


async def setup(context: PluginContext) -> None:
    """Called when the plugin is activated."""
    global _context
    _context = context
    context.logger.info(f"{{context.plugin_id}} v{{context.version}} activated")


async def teardown() -> None:
    """Called when the plugin is deactivated."""
    global _context
    if _context:
        _context.logger.info(f"{{_context.plugin_id}} deactivated")
    _context = None
'''
    (target / "backend" / "plugin.py").write_text(code, encoding="utf-8")


def _generate_package_json(target: Path, ctx: dict) -> None:
    pkg = {
        "name": f"acp-plugin-{ctx['plugin_id']}-frontend",
        "version": "0.1.0",
        "private": True,
        "scripts": {
            "dev": "vite",
            "build": "vite build",
        },
        "dependencies": {
            "react": "^18.2.0",
            "react-dom": "^18.2.0",
        },
        "devDependencies": {
            "@vitejs/plugin-react": "^4.0.0",
            "vite": "^5.0.0",
            "typescript": "^5.3.0",
        },
    }
    (target / "frontend" / "package.json").write_text(
        json.dumps(pkg, indent=2) + "\n", encoding="utf-8"
    )
