#!/usr/bin/env bash
# Scheduled Cloudflare preview rebuild. Requires the existing site and
# Cloudflare credentials as environment variables; never prints their values.
set -euo pipefail
cd "$(dirname "$0")/../.."

PORT=8799
DB_PORT=8798
DEV_PID=
DB_PID=
cleanup() {
  test -z "$DEV_PID" || kill "$DEV_PID" 2>/dev/null || true
  test -z "$DB_PID" || kill "$DB_PID" 2>/dev/null || true
  rm -f dist/server/.dev.vars
}
trap cleanup EXIT

for name in CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY; do
  test -n "${!name:-}" || { echo "Missing required variable: $name" >&2; exit 1; }
done

npm run -s build
# Every database read of this build goes through a local proxy: identical reads are
# fetched once, and the first 402/5xx answer stops all further requests to the project.
node scripts/static-edge/db-proxy.mjs "$DB_PORT" dist/db-proxy-stats.json > /tmp/dropped-db-proxy.log 2>&1 &
DB_PID=$!
for i in $(seq 1 20); do
  curl -s -m 2 -o /dev/null "http://127.0.0.1:$DB_PORT/" && break
  sleep 0.5
done
DB_PROXY="http://127.0.0.1:$DB_PORT"
# Price snapshot: previous copy from the live site (or the committed seed) plus only the new rows.
SUPABASE_URL="$DB_PROXY" node scripts/static-edge/price-snapshot.mjs dist/client/snapshot
DB_PROXY="$DB_PROXY" node -e '
const fs = require("fs");
const names = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SITE_URL"];
const value = (n) => (n.endsWith("SUPABASE_URL") ? process.env.DB_PROXY : process.env[n] ?? "");
fs.writeFileSync("dist/server/.dev.vars", names.map(n => `${n}=${value(n)}`).join("\n") + "\n", { mode: 0o600 });
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
# Price pages without a readable record are answered live with 503 and are not stored,
# so the minimum covers the editorial and store pages that never depend on the database.
test "$HTML_COUNT" -ge 150 || { echo "Only $HTML_COUNT HTML pages rendered; refusing to deploy" >&2; exit 1; }
node -e 'const h=require("crypto").createHash("sha1").update("/").digest("hex");require("fs").accessSync("dist/client/__static/"+h+".html")' || { echo "Home page was not stored; refusing to deploy" >&2; exit 1; }
# Database use of this build (no secrets): requests, cache hits, bytes, circuit state.
cat dist/db-proxy-stats.json 2>/dev/null || echo '{"requests":0}'
echo
cleanup
DEV_PID=
DB_PID=
npx --no-install wrangler deploy --config dist/server/edge-wrangler.json
