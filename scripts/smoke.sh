#!/usr/bin/env bash
# Boots the production build and checks that the public pages render. The data
# API routes need Vercel KV credentials, which ci does not have. Run after
# `npm run build`.
set -euo pipefail

PORT="${PORT:-3799}"
LOG="$(mktemp)"

npx --no-install next start -p "$PORT" >"$LOG" 2>&1 &
SERVER=$!
trap 'kill "$SERVER" 2>/dev/null || true' EXIT

for _ in $(seq 1 30); do
  curl -sf -o /dev/null "http://127.0.0.1:$PORT/" && break
  if ! kill -0 "$SERVER" 2>/dev/null; then cat "$LOG"; exit 1; fi
  sleep 1
done

for page in / /dashboard /dashboard/posts /privacy; do
  curl -sf "http://127.0.0.1:$PORT$page" | grep -q "coolfollowers.com</title>" || { echo "$page did not render"; cat "$LOG"; exit 1; }
done
echo "smoke: public pages render from the production build"
