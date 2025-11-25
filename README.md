Sips of Borongan (SoB)
======================

Local dev + deployment notes for the Sips of Borongan social cafe review app.

Quick overview
- Backend: Node.js + Express + PostgreSQL (folder: `backend`)
- Frontend: Static HTML/JS/CSS served during development with `live-server` (folder: `frontend`)

Prerequisites (local dev)
- Node.js (v18+ recommended)
- npm
- PostgreSQL (local server running)
- `psql` in PATH (optional but handy)
- `live-server` for frontend (optional)

Getting started (development)

1) Install dependencies (backend)

```powershell
cd backend
npm install
```

2) Create `.env` (backend)
- Copy `backend/.env.example` to `backend/.env` and fill values (DB, JWT secret, etc.)

3) Start backend

```powershell
cd backend
node server.js
# or for auto-reload during development
npm run dev
```

4) Start frontend (static dev server)

```powershell
cd frontend
live-server --port=5500
```

Open the site at `http://127.0.0.1:5500` (or `http://localhost:5500`).

Database migrations (local)

A `migrations.sql` script exists at `backend/migrations.sql` to create the base tables. You can run it manually with `psql`:

```powershell
psql -h localhost -U postgres -d sob -f backend/migrations.sql
```

(Or let the backend attempt to apply it on startup.)

Environment variables

Create `backend/.env` with at least these variables (see `backend/.env.example`):
- `PORT` (optional, default 4000)
- `DATABASE_URL` (postgres://user:pass@host:port/dbname)
- `JWT_SECRET` (long random secret)
- `BCRYPT_SALT_ROUNDS` (e.g. 10)

Production checklist (recommended)

- Database:
	- Use a managed Postgres (RDS/Azure/Heroku, etc.) or a well-configured dedicated instance.
	- Ensure `DATABASE_URL` uses SSL (if required by provider).
	- Run migrations (or allow the app to run them).
	- Create a database user with limited privileges for the app.

- Secrets:
	- Use environment variables or a secrets manager (do NOT commit `.env` to Git).
	- Rotate `JWT_SECRET` and keep it secure.

- Process manager & reverse proxy:
	- Use `pm2` or a systemd service to keep Node running and auto-restart on crashes.
	- Use Nginx as a reverse proxy to handle TLS (HTTPS), static file serving, gzip, and upstream to Node.

- TLS / Domain:
	- Obtain TLS certs (Let's Encrypt or provider-managed) and configure Nginx.

- CORS & Security:
	- Ensure `CORS` origins match production domain(s).
	- Keep `helmet` enabled; review headers for production needs.

- Static assets & uploads:
	- Consider serving uploaded images from a cloud storage (S3) or a CDN.
	- If serving uploads from the app filesystem, configure file permissions and backup.

- Logging & monitoring:
	- Add centralized logs (Papertrail, Loggly, CloudWatch, etc.) or structured logs.
	- Add health checks and uptime monitoring.

- Backups & DB maintenance:
	- Schedule regular DB backups and test restores.

- Tests & CI:
	- Add automated tests for critical flows (auth, posting reviews, messaging).
	- Use CI (GitHub Actions) to run tests and optionally deploy.

Useful commands (dev)

- Kill node processes (Windows PowerShell):
```powershell
Get-Process node -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.Id -Force }
```

- Tail backend logs (PowerShell):
```powershell
Get-Content backend\\server.log -Tail 200 -Wait
```

- Start backend (dev):
```powershell
cd backend
npm run dev
```

Commit and push

When ready, commit the configuration changes (do NOT commit your `.env`):

```powershell
git add -A
git commit -m "Prepare backend for deployment: migrations, config, README"
git push
```

If you want, I can create a small `README` entry in `backend` and a `.env.example`. Tell me if you want me to commit and push these changes now.
