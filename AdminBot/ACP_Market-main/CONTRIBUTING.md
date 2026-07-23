# Contributing to ACP Market

Thank you for your interest in contributing!

## Development Setup

```bash
git clone https://github.com/fxxkrlab/ACP_Market.git
cd ACP_Market
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8001
- Default admin: `admin@novahelix.org` / `changeme`

## Branch Strategy

- `main` — stable release branch
- Feature branches: `feat/description`
- Bug fixes: `fix/description`

## Pull Request Process

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes
4. Ensure `cd frontend && npm run build` passes with zero errors
5. Submit a PR with a clear description

## Code Style

### Backend (Python)
- Python 3.12+
- Type hints required
- Async/await for all I/O
- Pydantic v2 for schemas

### Frontend (JavaScript/React)
- React 19 functional components
- Zustand for state management
- Tailwind CSS v4 for styling
- No direct `localStorage` usage (auth via HttpOnly cookies)

## Versioning

- Patch (`+0.0.1`): bug fixes
- Minor (`+0.1.0`): new features
- Never reuse version tags

## Reporting Issues

Use [GitHub Issues](https://github.com/fxxkrlab/ACP_Market/issues) for bug reports and feature requests.

For security vulnerabilities, see [SECURITY.md](./SECURITY.md).
