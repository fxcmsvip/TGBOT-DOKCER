"""acp-cli validate — validate a plugin's manifest.json."""

from __future__ import annotations

from pathlib import Path

import click
from rich.console import Console

from acp_plugin_sdk.manifest import validate_manifest

console = Console()


@click.command()
@click.option(
    "--dir", "-d", "plugin_dir", default=".", help="Plugin directory (default: current)"
)
def validate(plugin_dir: str) -> None:
    """Validate manifest.json against the plugin schema."""
    manifest_path = Path(plugin_dir) / "manifest.json"

    schema, errors = validate_manifest(manifest_path)

    if errors:
        console.print("[red bold]Validation FAILED[/red bold]")
        for err in errors:
            console.print(f"  [red]- {err}[/red]")
        raise SystemExit(1)

    if schema is None:
        console.print("[red bold]Validation FAILED — could not parse manifest[/red bold]")
        raise SystemExit(1)

    console.print("[green bold]Validation PASSED[/green bold]")
    console.print(f"  Plugin: [cyan]{schema.name}[/cyan] ({schema.id}) v{schema.version}")
    if schema.capabilities:
        caps = [k for k, v in schema.capabilities.model_dump().items() if v]
        if caps:
            console.print(f"  Capabilities: {', '.join(caps)}")
    if schema.permissions and schema.permissions.core_api_scopes:
        console.print(f"  Scopes: {', '.join(schema.permissions.core_api_scopes)}")
