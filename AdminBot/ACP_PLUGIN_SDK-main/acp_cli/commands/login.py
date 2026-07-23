"""acp-cli login — authenticate with ACP Market."""

from __future__ import annotations

import os

import click
import httpx
from rich.console import Console

from acp_cli.config import DEFAULT_MARKET_URL, get_market_url, save_auth

console = Console()


@click.command()
@click.option("--email", prompt=False, default=None, help="Market account email")
@click.option(
    "--api-key",
    default=None,
    envvar="ACP_API_KEY",
    help="API key for CI/CD (or set ACP_API_KEY env var)",
)
@click.option(
    "--market-url",
    default=None,
    help=f"Market API URL (default: {DEFAULT_MARKET_URL})",
)
def login(
    email: str | None,
    api_key: str | None,
    market_url: str | None,
) -> None:
    """Authenticate with ACP Market.

    For CI/CD, use --api-key or set the ACP_API_KEY environment variable.
    For interactive use, you will be prompted for email and password.
    """
    url = market_url or get_market_url()

    # Warn on non-HTTPS URLs
    if url.startswith("http://") and "localhost" not in url and "127.0.0.1" not in url:
        console.print(
            "[yellow]Warning: Using unencrypted HTTP. "
            "Credentials will be sent in plaintext.[/yellow]"
        )
        if not click.confirm("Continue?", default=False):
            raise SystemExit(0)

    if api_key:
        # API key mode — store directly
        save_auth(access_token=api_key, market_url=url)
        console.print("[green]Logged in with API key.[/green]")
        return

    # Interactive mode — always prompt for password (never accept via CLI arg)
    if not email:
        email = click.prompt("Email")
    password = click.prompt("Password", hide_input=True)

    with console.status("Authenticating..."):
        try:
            resp = httpx.post(
                f"{url}/auth/login",
                json={"email": email, "password": password},
                timeout=30,
            )
        except httpx.HTTPError as exc:
            console.print(f"[red]Cannot connect to Market at {url}: {exc}[/red]")
            raise SystemExit(1)

    if resp.status_code == 200:
        body = resp.json()
        # Support both {access_token, ...} and {code, data: {access_token, ...}}
        data = body.get("data", body)
        save_auth(
            access_token=data["access_token"],
            refresh_token=data.get("refresh_token"),
            market_url=url,
        )
        user = data.get("user", {})
        if user:
            console.print(
                f"[green]Login successful![/green] "
                f"({user.get('email', '')} / {user.get('role', '')})"
            )
        else:
            console.print("[green]Login successful![/green]")
    elif resp.status_code == 401:
        console.print("[red]Invalid email or password.[/red]")
        raise SystemExit(1)
    else:
        console.print(f"[red]Login failed ({resp.status_code}): {resp.text}[/red]")
        raise SystemExit(1)
