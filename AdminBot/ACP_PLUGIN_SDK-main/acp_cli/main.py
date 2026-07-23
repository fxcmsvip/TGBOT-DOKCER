"""ACP CLI — main entry point.

Usage: acp-cli [command]
"""

from __future__ import annotations

import click

from acp_plugin_sdk.version import __version__


@click.group()
@click.version_option(__version__, prog_name="acp-cli")
def cli() -> None:
    """ACP Plugin SDK — build and publish ADMINCHAT Panel plugins."""


def _register_commands() -> None:
    from acp_cli.commands.build import build
    from acp_cli.commands.init_cmd import init_cmd
    from acp_cli.commands.login import login
    from acp_cli.commands.publish import publish
    from acp_cli.commands.validate import validate

    cli.add_command(login)
    cli.add_command(init_cmd)
    cli.add_command(validate)
    cli.add_command(build)
    cli.add_command(publish)


_register_commands()

if __name__ == "__main__":
    cli()
