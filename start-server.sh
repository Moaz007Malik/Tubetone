#!/usr/bin/env bash
cd "$(dirname "$0")/server"
echo "Installing dependencies if needed..."
python -m pip install -r requirements.txt
echo
echo "Starting YTMP companion server..."
python server.py
