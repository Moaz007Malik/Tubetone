#!/bin/sh
set -eu

NODE_BIN="${NODE_BIN:-/usr/local/bin/node}"

if [ -f /opt/bgutil/build/main.js ] && [ -x "$NODE_BIN" ]; then
  echo "Starting bgutil POT provider on :4416 (node $($NODE_BIN -v 2>/dev/null || echo unknown)) ..."
  set +e
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
  echo "WARNING: bgutil/node not found — YouTube downloads may fail on cloud IPs"
fi

exec python /app/server.py
