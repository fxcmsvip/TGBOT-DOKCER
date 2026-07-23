"""acp-cli publish — publish a plugin to ACP Market."""

from __future__ import annotations

import json
from pathlib import Path

import click
import httpx
from rich.console import Console

from acp_cli.config import (
    get_access_token,
    get_market_url,
    get_refresh_token,
    is_logged_in,
    save_auth,
)
from acp_plugin_sdk.manifest import validate_manifest

console = Console()


def _refresh_token_if_needed(market_url: str) -> str | None:
    """Try to refresh the access token using the refresh token.

    Returns new access token on success, None on failure.
    """
    refresh = get_refresh_token()
    if not refresh:
        return None

    try:
        resp = httpx.post(
            f"{market_url}/auth/refresh",
            json={"refresh_token": refresh},
            timeout=30,
        )
        if resp.status_code == 200:
            body = resp.json()
            data = body.get("data", body)
            new_access = data["access_token"]
            new_refresh = data.get("refresh_token", refresh)
            save_auth(access_token=new_access, refresh_token=new_refresh)
            return new_access
    except httpx.HTTPError:
        pass

    return None


def _upload(
    url: str,
    zip_path: Path,
    token: str,
    form_data: dict[str, str],
    *,
    status_msg: str = "Uploading...",
) -> httpx.Response:
    """Upload the zip bundle to the given URL.

    Opens and closes the file handle safely. Catches network errors cleanly.
    """
    with console.status(status_msg):
        with zip_path.open("rb") as fh:
            files = {"bundle": ("plugin.zip", fh, "application/zip")}
            headers = {"Authorization": f"Bearer {token}"}
            try:
                return httpx.post(
                    url, headers=headers, files=files, data=form_data, timeout=120
                )
            except httpx.HTTPError as exc:
                console.print(f"[red]Network error: {exc}[/red]")
                raise SystemExit(1)


def _build_metadata(manifest_path: Path, changelog: str | None) -> dict:
    """Build the metadata JSON for the publish request."""
    data = json.loads(manifest_path.read_text(encoding="utf-8"))

    metadata = {
        "plugin_id": data["id"],
        "version": data["version"],
        "name": data["name"],
        "description": data.get("description", ""),
        "categories": data.get("categories", []),
        "tags": data.get("tags", []),
        "manifest": data,
    }

    if data.get("compatibility", {}).get("min_panel_version"):
        metadata["min_panel_version"] = data["compatibility"]["min_panel_version"]
    elif data.get("min_panel_version"):
        metadata["min_panel_version"] = data["min_panel_version"]

    if changelog:
        metadata["changelog"] = changelog

    return metadata


@click.command()
@click.option(
    "--dir", "-d", "plugin_dir", default=".", help="Plugin directory (default: current)"
)
@click.option("--changelog", "-c", default=None, help="Version changelog text")
@click.option("--new", "is_new", is_flag=True, help="Force publish as new plugin (not version update)")
def publish(plugin_dir: str, changelog: str | None, is_new: bool) -> None:
    """Publish a plugin bundle to ACP Market."""
    pdir = Path(plugin_dir).resolve()
    manifest_path = pdir / "manifest.json"
    zip_path = pdir / "dist" / "plugin.zip"

    # Pre-checks
    if not is_logged_in():
        console.print("[red]Not logged in. Run [bold]acp-cli login[/bold] first.[/red]")
        raise SystemExit(1)

    if not zip_path.exists():
        console.print(
            "[red]No build artifact found. Run [bold]acp-cli build[/bold] first.[/red]"
        )
        raise SystemExit(1)

    schema, errors = validate_manifest(manifest_path)
    if errors:
        console.print("[red]Manifest validation failed:[/red]")
        for err in errors:
            console.print(f"  [red]- {err}[/red]")
        raise SystemExit(1)

    if schema is None:
        console.print("[red]Manifest parsing failed.[/red]")
        raise SystemExit(1)

    market_url = get_market_url()
    token = get_access_token()
    if not token:
        console.print("[red]No access token found. Run [bold]acp-cli login[/bold] first.[/red]")
        raise SystemExit(1)

    # Track the current valid token (may be refreshed later)
    current_token = token

    # Build metadata
    metadata = _build_metadata(manifest_path, changelog)
    form_data = {"metadata": json.dumps(metadata)}

    # Determine initial URL
    if is_new:
        url = f"{market_url}/plugins"
    else:
        url = f"{market_url}/plugins/{schema.id}/versions"

    # Upload
    resp = _upload(
        url, zip_path, current_token, form_data,
        status_msg=f"Publishing {schema.name} v{schema.version}...",
    )

    # Handle 401 — try refresh
    if resp.status_code == 401:
        console.print("[yellow]Token expired, refreshing...[/yellow]")
        new_token = _refresh_token_if_needed(market_url)
        if not new_token:
            console.print(
                "[red]Token refresh failed. Run [bold]acp-cli login[/bold] again.[/red]"
            )
            raise SystemExit(1)

        current_token = new_token
        resp = _upload(
            url, zip_path, current_token, form_data,
            status_msg="Retrying upload...",
        )

    # Handle 404 for version update — try as new plugin
    if resp.status_code == 404 and not is_new:
        console.print("[yellow]Plugin not found on Market — creating new submission...[/yellow]")
        url = f"{market_url}/plugins"
        resp = _upload(
            url, zip_path, current_token, form_data,
            status_msg="Submitting new plugin...",
        )

    if resp.status_code in (200, 201):
        body = resp.json()
        # Support both {status, ...} and {code, data: {...}}
        data = body.get("data", body)
        status = data.get("review_status", data.get("status", "submitted"))
        console.print()
        console.print("[green bold]Published successfully![/green bold]")
        console.print(f"  Plugin:  [cyan]{schema.name}[/cyan] v{schema.version}")
        console.print(f"  Status:  {status}")
        if data.get("url"):
            console.print(f"  URL:     {data['url']}")
        if data.get("id"):
            console.print(f"  ID:      {data['id']}")
    else:
        console.print()
        console.print(f"[red bold]Publish failed ({resp.status_code})[/red bold]")
        try:
            body = resp.json()
            detail = body.get("detail") or body.get("message") or resp.text
        except Exception:
            detail = resp.text
        console.print(f"  [red]{detail}[/red]")
        raise SystemExit(1)
