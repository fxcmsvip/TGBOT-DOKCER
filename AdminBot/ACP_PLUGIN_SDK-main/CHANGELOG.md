# Changelog

## [0.2.1] - 2026-03-28

### Changed
- **Design System Kit** — Updated all CSS variable names from `--acp-*` prefix to `--color-*` prefix to match what the host Panel actually provides (`--color-bg-page`, `--color-accent`, `--color-text-primary`, etc.)
- **Design System Kit** — Updated section numbering to accommodate new Theme Support section
- **Design System Kit** — Updated Do's and Don'ts to emphasize using CSS variables over hardcoded hex values

### Added
- **Theme Support section** in Design System Kit — Documents the dual theme system (dark default + light mode), explains that `var(--color-*)` variables auto-adapt when the user toggles theme, and warns against hardcoding hex colors
- **Complete Variable Reference** — Added a full CSS variable listing in the Color Tokens section for quick reference
- New status color variables: `--color-blue` and `--color-gold`

## [0.2.0] - 2026-03-28

### Changed
- **Plugin frontend build format** — Changed from ES module + externals to IIFE format with window globals; ES module bare specifiers (`import 'react'`) don't work in browsers, IIFE with globals (`React`, `ReactDOM`, `ReactJSXRuntime`, `TanStackReactQuery`) resolves from host Panel's `window` exports
- **Template vite.config.ts** — Updated with `define: { 'process.env.NODE_ENV': 'production' }`, IIFE format, and complete globals mapping
- **Template index.ts** — Updated with window registry pattern (no ES exports)
- **Template package.json** — Updated dependency versions (React 19, Vite 8, TypeScript 5.9), added `@tanstack/react-query` as peer dependency

### Added
- CHANGELOG.md

## [0.1.0] - 2026-03-25

### Added
- Initial release of ACP Plugin SDK + CLI
- `acp-cli init` — Scaffold new plugin from template
- `acp-cli validate` — Validate manifest.json
- `acp-cli build` — Build plugin zip bundle (frontend + backend)
- `acp-cli publish` — Publish to ACP Market
- `acp-cli login` — Authenticate with Market
- Comprehensive documentation (9 guides)
