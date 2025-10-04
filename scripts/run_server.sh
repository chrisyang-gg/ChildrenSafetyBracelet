#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV="$ROOT/.venv"

echo "repo root: $ROOT"

if [ ! -x "$VENV/bin/python" ]; then
  echo "Virtualenv not found at $VENV. Attempting to create..."
  python3 -m venv "$VENV"
fi

echo "Using python: $VENV/bin/python"
"$VENV/bin/python" -m pip install --upgrade pip setuptools wheel
if [ -f "$ROOT/webapp/requirements.txt" ]; then
  echo "Installing requirements..."
  "$VENV/bin/python" -m pip install -r "$ROOT/webapp/requirements.txt"
fi

echo "Starting server..."
exec "$VENV/bin/python" "$ROOT/webapp/server.py"
