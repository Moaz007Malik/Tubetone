#!/bin/sh
set -eu

if [ -f /opt/bgutil/build/main.js ]; then
  echo "Starting bgutil POT provider on :4416 ..."
  node /opt/bgutil/build/main.js --port 4416 &
  sleep 3
else
  echo "WARNING: bgutil POT provider not found — YouTube downloads may fail on cloud IPs"
fi

exec python /app/server.py
