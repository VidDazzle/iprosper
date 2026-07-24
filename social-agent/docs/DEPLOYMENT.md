# Deployment

The daemon (`iprosper-social-agent daemon`) is a single long-running Node
process with no external dependencies beyond a SQLite file (`data/*.db`).
Pick whichever host keeps it running 24/7 — that's the only real
requirement for "runs without me."

## Cloud VPS (recommended for real autonomy)

A phone or laptop that sleeps, loses wifi, or gets rebooted will silently
miss posting windows. If the whole point is "runs in my absence, no
approvals," a small always-on VPS (a $5-6/mo box is plenty) is the honest
choice. Options, in order of setup effort:

1. **Docker** — `docker compose up -d` using the included
   `docker-compose.yml`. Restarts automatically on crash or host reboot
   (`restart: unless-stopped`).
2. **systemd** — copy `systemd/iprosper-social-agent.service`, adjust the
   paths/user, `systemctl enable --now iprosper-social-agent`. Survives
   reboots, restarts on crash, logs to `journalctl -u iprosper-social-agent`.
3. **PM2** — `pm2 start ecosystem.config.js && pm2 save && pm2 startup`.
   Easiest if you're already comfortable with PM2 from other Node apps.

## Desktop (Mac/Windows/Linux)

Same as VPS via PM2 or a systemd user unit / launchd / NSSM service — but
the machine has to stay powered on and awake. Disable sleep for this to be
reliable, or just use a VPS.

## Phone (Android via Termux)

Technically works, is not recommended as your only deployment:

```bash
pkg install nodejs git
git clone <your fork> && cd social-agent
npm install && npm run build
cp .env.example .env && cp accounts.example.yaml accounts.yaml   # fill in
termux-wake-lock          # prevents Android from suspending the process
node dist/cli.js daemon
```

Caveats that make this unsuitable as your *only* copy: Android aggressively
kills background processes to save battery regardless of `termux-wake-lock`
on many OEM skins, a dead battery or OS update stops everything, and there's
no automatic restart-on-reboot without extra Termux:Boot setup. Fine as a
secondary control point (e.g. running the MCP server mode so you can check
status/trigger a run from your phone) — not fine as the sole 24/7 poster.
iOS has no equivalent background-daemon story at all; don't attempt it there.

## Environment & secrets

- `.env` holds every API key and account token. Never commit it — `.gitignore`
  already excludes it, along with `accounts.yaml` (which references the env
  var *names*, not the secrets themselves) and the SQLite data directory.
- Rotate platform tokens on whatever cadence that platform requires (TikTok
  access tokens expire every 24h and need a refresh-token flow; YouTube
  OAuth tokens expire hourly). None of the agents implement token refresh
  themselves — wire a refresh cron/webhook that rewrites the relevant env
  var, or front the daemon with a secrets manager that does it for you.

## Scaling to more accounts/campaigns

The orchestrator is stateless per run — add accounts and campaigns to
`accounts.yaml` and restart the daemon. `ConcurrencyLimiter` in
`src/core/queue.ts` caps concurrent posts (default 3) so a large roster
doesn't slam every platform API simultaneously; raise it if you have
headroom.
