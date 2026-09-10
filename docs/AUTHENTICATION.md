# Authentication Design

Vector uses server-side sessions for the private dashboard.

1. Registration validates the email and requires an eight-character minimum password.
2. Passwords are salted and hashed with Node's `scrypt`; plaintext passwords are never stored.
3. Login uses a timing-safe comparison and returns the generic message `Invalid username or password.` for bad credentials.
4. A successful login creates a random session token. Only its SHA-256 digest is stored in SQLite.
5. The raw token is sent as an `HttpOnly`, `SameSite=Lax` cookie that expires after seven days.
6. Dashboard and vehicle API requests require a non-expired session.
7. Logout deletes the server-side session and expires the cookie.
8. Login and registration are limited to 10 attempts per client IP per 15 minutes.

Routes include `GET /login`, `GET /register`, `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, and `POST /api/auth/logout`.

Render provides HTTPS in production, which enables the cookie's `Secure` flag through the forwarded protocol. Before production use, add email verification, password reset, MFA, CSRF protection for cross-site mutations, structured audit logs, secret rotation, and a managed database with encrypted backups.
