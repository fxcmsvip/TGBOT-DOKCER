"""acp-cli build — build a plugin zip bundle."""

from __future__ import annotations

import zipfile
from pathlib import Path

import click
from rich.console import Console

from acp_cli.builder import build_frontend, create_zip
from acp_plugin_sdk.manifest import validate_manifest

console = Console()


@click.command()
@click.option(
    "--dir", "-d", "plugin_dir", default=".", help="Plugin directory (default: current)"
)
@click.option("--skip-frontend", is_flag=True, help="Skip npm build step")
def build(plugin_dir: str, skip_frontend: bool) -> None:
    """Build a plugin zip bundle for distribution."""
    pdir = Path(plugin_dir).resolve()
    manifest_path = pdir / "manifest.json"

    # Step 1: Validate
    console.print("[cyan]Validating manifest...[/cyan]")
    schema, errors = validate_manifest(manifest_path)
    if errors:
        console.print("[red bold]Validation failed — cannot build.[/red bold]")
        for err in errors:
            console.print(f"  [red]- {err}[/red]")
        raise SystemExit(1)

    if schema is None:
        console.print("[red bold]Manifest parsing failed — cannot build.[/red bold]")
        raise SystemExit(1)

    # Step 2: Build frontend if needed
    if not skip_frontend and schema.capabilities.frontend_pages:
        if not build_frontend(pdir):
            console.print("[red]Frontend build failed — aborting.[/red]")
            raise SystemExit(1)

    # Step 3: Create zip
    console.print("[cyan]Creating plugin bundle...[/cyan]")
    zip_path = create_zip(pdir)

    # Summary
    sha_path = zip_path.with_suffix(".zip.sha256")
    sha = sha_path.read_text().strip() if sha_path.exists() else "unknown"
    size_kb = zip_path.stat().st_size / 1024

    console.print()
    console.print("[green bold]Build successful![/green bold]")
    console.print(f"  Plugin:  [cyan]{schema.name}[/cyan] v{schema.version}")
    console.print(f"  Output:  {zip_path}")
    console.print(f"  Size:    {size_kb:.1f} KB")
    console.print(f"  SHA-256: {sha[:16]}...")

    # List zip contents
    console.print()
    console.print("[dim]Bundle contents:[/dim]")
    with zipfile.ZipFile(zip_path) as zf:
        for info in zf.infolist():
            console.print(f"  [dim]{info.filename}[/dim] ({info.file_size} bytes)")
