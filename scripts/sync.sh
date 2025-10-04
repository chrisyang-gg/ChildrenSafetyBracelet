#!/usr/bin/env bash
# Safe repo sync script: fetch then pull --ff-only to avoid merges
set -euo pipefail
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
logfile="$repo_root/.sync.log"
timestamp() { date --iso-8601=seconds; }
echo "[$(timestamp)] starting sync" >> "$logfile"
cd "$repo_root"
# ensure we're on main (don't auto-switch branches)
current_branch=$(git rev-parse --abbrev-ref HEAD)
echo "[$(timestamp)] branch: $current_branch" >> "$logfile"
git fetch --all --prune >> "$logfile" 2>&1 || { echo "[$(timestamp)] fetch failed" >> "$logfile"; exit 2; }
# try fast-forward only pull
if git pull --ff-only >> "$logfile" 2>&1; then
  echo "[$(timestamp)] pulled successfully" >> "$logfile"
  exit 0
else
  echo "[$(timestamp)] pull requires merge or failed; aborting" >> "$logfile"
  exit 3
fi
