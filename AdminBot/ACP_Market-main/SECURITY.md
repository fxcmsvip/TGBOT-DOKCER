# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in ACP Market, please report it responsibly:

1. **Do NOT** open a public GitHub issue
2. Email: **security@novahelix.org**
3. Include: description, steps to reproduce, potential impact
4. We aim to respond within 48 hours

## Security Measures

- HttpOnly + Secure + SameSite=Lax cookies for authentication
- Bcrypt password hashing (passlib)
- JWT access tokens (15 min) + refresh tokens (30 days) with rotation
- Stripe webhook signature verification + idempotency
- Path traversal prevention on plugin bundle storage
- Input validation (regex for plugin IDs, version format)
- CSV formula injection prevention
- Role-based access control with 5-tier hierarchy
- CORS allowlist configuration
- No secrets in client-side code
