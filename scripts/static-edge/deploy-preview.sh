#!/usr/bin/env bash
# Scheduled Cloudflare preview rebuild. Requires the existing site and
# Cloudflare credentials as environment variables; never prints their values.
set -euo pipefail
cd "$(dirname "$0")/../.."

PORT=8799
DEV_PID=
cleanup() {
  test -z "$DEV_PID" || kill "$DEV_PID" 2>/dev/null || true
  rm -f dist/server/.dev.vars
}
trap cleanup EXIT

for name in CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY; do
  test -n "${!name:-}" || { echo "Missing required variable: $name" >&2; exit 1; }
done

npm run -s build
node -e '
const fs = require("fs");
const names = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SITE_URL"];
fs.writeFileSync("dist/server/.dev.vars", names.map(n => `${n}=${process.env[n] ?? ""}`).join("\n") + "\n", { mode: 0o600 });
'

npx --no-install wrangler dev --config dist/server/wrangler.json --port "$PORT" --ip 127.0.0.1 --log-level error > /tmp/dropped-preview-dev.log 2>&1 &
DEV_PID=$!
for i in $(seq 1 40); do
  if test "$(curl -sS -m 5 -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/robots.txt" 2>/dev/null)" = 200; then break; fi
  sleep 3
done
test "$(curl -sS -m 60 -o /tmp/dropped-preview-home.html -w '%{http_code}' "http://127.0.0.1:$PORT/")" = 200
grep -q 'dropped.kr' /tmp/dropped-preview-home.html

SITE_HOST=dropped.kr PARAM_LIMITS='{"/store-deals":1}' node scripts/static-edge/prerender.mjs "http://127.0.0.1:$PORT" 3000
HTML_COUNT=$(find dist/client/__static -maxdepth 1 -name '*.html' | wc -l)
test "$HTML_COUNT" -ge 400 || { echo "Only $HTML_COUNT HTML pages rendered; refusing to deploy" >&2; exit 1; }
cleanup
DEV_PID=
npx --no-install wrangler deploy --config dist/server/edge-wrangler.json
