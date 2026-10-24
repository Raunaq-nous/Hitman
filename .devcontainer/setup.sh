#!/usr/bin/env bash
# One-time Codespace setup (docs/TESTING.md): dependencies, .env.local, database, migrations, seed.
set -euo pipefail
cd "$(dirname "$0")/.."

npm ci

if [ ! -f .env.local ]; then
  cp .env.example .env.local
  # sign-in redirects must point at the forwarded port, not localhost
  if [ -n "${CODESPACE_NAME:-}" ] && [ -n "${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-}" ]; then
    url="https://${CODESPACE_NAME}-3000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
    sed -i "s|^# NEXTAUTH_URL=.*|NEXTAUTH_URL=\"${url}\"|" .env.local
  fi
  secret="$(node -e 'console.log(require("node:crypto").randomBytes(32).toString("base64"))')"
  sed -i "s|^NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=\"${secret}\"|" .env.local
  # the tester account that may open /admin/scoreboards (docs/TESTING.md)
  sed -i 's|^ADMIN_EMAILS=.*|ADMIN_EMAILS="tester@example.com"|' .env.local
fi

npm run db:local
npm run db:migrate
npm run db:seed
echo "Setup done. The app starts on port 3000 when the terminal attaches (npm run dev)."
