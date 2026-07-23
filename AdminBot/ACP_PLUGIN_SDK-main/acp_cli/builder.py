"""Build logic — compile frontend + create plugin zip bundle."""

from __future__ import annotations

import hashlib
import subprocess
import zipfile
from pathlib import Path

from rich.console import Console

console = Console()

# Maximum bundle size (50 MB)
MAX_BUNDLE_SIZE = 50 * 1024 * 1024

# Directories and patterns to always exclude from the bundle
_EXCLUDED_DIRS = {
    "__pycache__",
    ".git",
    ".svn",
    ".hg",
    "node_modules",
    ".venv",
    "venv",
    ".tox",
    ".mypy_cache",
    ".pytest_cache",
    ".ruff_cache",
    ".egg-info",
}

_EXCLUDED_FILES = {
    ".DS_Store",
    "Thumbs.db",
    ".env",
    ".env.local",
    ".env.production",
}

_EXCLUDED_SUFFIXES = {
    ".pyc",
    ".pyo",
    ".egg-info",
    ".swp",
    ".swo",
}


def _should_exclude(path: Path) -> bool:
    """Check if a path should be excluded from the bundle."""
    # Check file name
    if path.name in _EXCLUDED_FILES:
        return True
    # Check suffix
    if path.suffix in _EXCLUDED_SUFFIXES:
        return True
    # Check if any parent directory is excluded
    for part in path.parts:
        if part in _EXCLUDED_DIRS:
            return True
    return False


def _safe_collect_files(
    base_dir: Path, root_dir: Path
) -> list[tuple[Path, str]]:
    """Collect files from base_dir, with symlink and path traversal protection.

    Returns list of (absolute_path, archive_name) tuples.
    Skips symlinks that point outside root_dir.
    """
    root_resolved = root_dir.resolve()
    files: list[tuple[Path, str]] = []

    for f in base_dir.rglob("*"):
        if not f.is_file():
            continue

        # Skip symlinks pointing outside the project
        if f.is_symlink():
            target = f.resolve()
            if not target.is_relative_to(root_resolved):
                console.print(
                    f"[yellow]Skipping symlink outside project: {f} -> {target}[/yellow]"
                )
                continue

        # Verify resolved path is within project (even for non-symlinks)
        resolved = f.resolve()
        if not resolved.is_relative_to(root_resolved):
            console.print(
                f"[yellow]Skipping file outside project: {f}[/yellow]"
            )
            continue

        # Check exclusion rules against the relative path
        rel = f.relative_to(root_dir)
        if _should_exclude(rel):
            continue

        files.append((f, str(rel)))

    return files


def build_frontend(plugin_dir: Path) -> bool:
    """Run npm install + npm run build in the frontend directory.

    Returns True if frontend was built (or not needed), False on failure.
    """
    frontend_dir = plugin_dir / "frontend"
    if not frontend_dir.exists():
        return True

    package_json = frontend_dir / "package.json"
    if not package_json.exists():
        console.print("[yellow]frontend/ exists but no package.json — skipping npm build[/yellow]")
        return True

    console.print("[cyan]Installing frontend dependencies...[/cyan]")
    result = subprocess.run(
        ["npm", "install"],
        cwd=frontend_dir,
        capture_output=True,
        text=True,
        timeout=300,
    )
    if result.returncode != 0:
        console.print(f"[red]npm install failed:[/red]\n{result.stderr}")
        return False

    console.print("[cyan]Building frontend...[/cyan]")
    result = subprocess.run(
        ["npm", "run", "build"],
        cwd=frontend_dir,
        capture_output=True,
        text=True,
        timeout=300,
    )
    if result.returncode != 0:
        console.print(f"[red]npm run build failed:[/red]\n{result.stderr}")
        return False

    remote_entry = frontend_dir / "dist" / "remoteEntry.js"
    if not remote_entry.exists():
        console.print(
            "[yellow]Warning: frontend/dist/remoteEntry.js not found after build[/yellow]"
        )

    console.print("[green]Frontend built successfully.[/green]")
    return True


def create_zip(plugin_dir: Path, output_dir: Path | None = None) -> Path:
    """Create the plugin zip bundle.

    Includes:
    - manifest.json
    - backend/**  (Python source)
    - frontend/dist/**  (built frontend, not source)
    - README.md  (if exists)
    - screenshots/  (if exists)

    Returns path to the created zip file.
    """
    if output_dir is None:
        output_dir = plugin_dir / "dist"
    output_dir.mkdir(parents=True, exist_ok=True)

    zip_path = output_dir / "plugin.zip"
    sha_path = output_dir / "plugin.zip.sha256"

    total_size = 0

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        # manifest.json (required)
        manifest = plugin_dir / "manifest.json"
        zf.write(manifest, "manifest.json")
        total_size += manifest.stat().st_size

        # backend/
        backend_dir = plugin_dir / "backend"
        if backend_dir.exists():
            for fpath, arcname in _safe_collect_files(backend_dir, plugin_dir):
                total_size += fpath.stat().st_size
                if total_size > MAX_BUNDLE_SIZE:
                    raise click.ClickException(
                        f"Bundle exceeds {MAX_BUNDLE_SIZE // (1024 * 1024)} MB limit"
                    )
                zf.write(fpath, arcname)

        # frontend/dist/ (built output only)
        frontend_dist = plugin_dir / "frontend" / "dist"
        if frontend_dist.exists():
            for fpath, arcname in _safe_collect_files(frontend_dist, plugin_dir):
                total_size += fpath.stat().st_size
                if total_size > MAX_BUNDLE_SIZE:
                    raise click.ClickException(
                        f"Bundle exceeds {MAX_BUNDLE_SIZE // (1024 * 1024)} MB limit"
                    )
                zf.write(fpath, arcname)

        # README.md
        readme = plugin_dir / "README.md"
        if readme.exists():
            zf.write(readme, "README.md")

        # screenshots/
        screenshots = plugin_dir / "screenshots"
        if screenshots.exists():
            for fpath, arcname in _safe_collect_files(screenshots, plugin_dir):
                total_size += fpath.stat().st_size
                if total_size > MAX_BUNDLE_SIZE:
                    raise click.ClickException(
                        f"Bundle exceeds {MAX_BUNDLE_SIZE // (1024 * 1024)} MB limit"
                    )
                zf.write(fpath, arcname)

    # Compute SHA-256
    sha256 = hashlib.sha256(zip_path.read_bytes()).hexdigest()
    sha_path.write_text(sha256 + "\n", encoding="utf-8")

    return zip_path
