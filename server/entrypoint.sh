#!/bin/sh
set -eu

NODE_BIN="${NODE_BIN:-/usr/local/bin/node}"
# Free Render is ~512MB. Node+bgutil alone can OOM the box — off by default.
ENABLE_BGUTIL="${ENABLE_BGUTIL:-0}"

if [ "$ENABLE_BGUTIL" = "1" ] && [ -f /opt/bgutil/build/main.js ] && [ -x "$NODE_BIN" ]; then
  echo "Starting bgutil POT provider on :4416 (node $($NODE_BIN -v 2>/dev/null || echo unknown)) ..."
  set +e
  NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=96}" \
    "$NODE_BIN" /opt/bgutil/build/main.js --port 4416 &
  POT_PID=$!
  sleep 3
  if kill -0 "$POT_PID" 2>/dev/null; then
    echo "bgutil POT provider is up (pid $POT_PID)"
  else
    echo "WARNING: bgutil POT provider exited — continuing without it"
  fi
  set -e
else
  echo "bgutil POT disabled (ENABLE_BGUTIL=$ENABLE_BGUTIL) — saves RAM on free tier"
fi

exec python /app/server.py
