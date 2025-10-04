#!/usr/bin/env bash
set -euo pipefail

# Watch the repository for changes and automatically git add/commit/push them.
# Safe defaults: honors .gitignore, debounces events, and logs to .watch-sync.log

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOGFILE="$REPO_ROOT/.watch-sync.log"
GIT_REMOTE="${GIT_REMOTE:-origin}"
GIT_BRANCH="${GIT_BRANCH:-main}"
DEBOUNCE_SECONDS="${DEBOUNCE_SECONDS:-4}"
MAX_FILES_IN_MSG=8

cd "$REPO_ROOT"

echo "$(date --iso-8601=seconds) - starting watch-and-sync (remote=$GIT_REMOTE branch=$GIT_BRANCH)" >> "$LOGFILE"

cleanup() {
  echo "$(date --iso-8601=seconds) - exiting" >> "$LOGFILE"
  exit 0
}
trap cleanup INT TERM

commit_and_push() {
  # Only commit if there are changes
  if ! git status --porcelain | grep -q .; then
    echo "$(date --iso-8601=seconds) - no changes to commit" >> "$LOGFILE"
    return
  fi

  # Build short file list for commit message
  files=$(git status --porcelain | awk '{print $2}' | head -n $MAX_FILES_IN_MSG | tr '\n' ',' | sed 's/,$//')
  files=${files:-changes}

  git add -A
  # If nothing staged after adding (e.g., only ignored files), skip
  if git diff --cached --quiet; then
    echo "$(date --iso-8601=seconds) - nothing staged after add (maybe ignored)" >> "$LOGFILE"
    return
  fi

  msg="Auto commit: $(date --utc +'%Y-%m-%dT%H:%M:%SZ') - $files"
  if git commit -m "$msg"; then
    echo "$(date --iso-8601=seconds) - committed: $msg" >> "$LOGFILE"
    if git push "$GIT_REMOTE" "$GIT_BRANCH"; then
      echo "$(date --iso-8601=seconds) - pushed to $GIT_REMOTE/$GIT_BRANCH" >> "$LOGFILE"
    else
      echo "$(date --iso-8601=seconds) - push failed" >> "$LOGFILE"
    fi
  else
    echo "$(date --iso-8601=seconds) - commit failed" >> "$LOGFILE"
  fi
}

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not inside a git repository: $REPO_ROOT" >&2
  exit 2
fi

if command -v inotifywait >/dev/null 2>&1; then
  echo "Using inotifywait to watch filesystem events" >> "$LOGFILE"
  # Watch recursively, ignore the .git directory
  while true; do
    inotifywait -r -e modify,create,delete,move --format '%w%f' --exclude '\.git' . >/dev/null 2>&1 || true
    sleep "$DEBOUNCE_SECONDS"
    commit_and_push || true
  done
else
  echo "inotifywait not found; falling back to polling every ${DEBOUNCE_SECONDS}s" >> "$LOGFILE"
  while true; do
    if git status --porcelain | grep -q .; then
      sleep "$DEBOUNCE_SECONDS"
      commit_and_push || true
    else
      sleep 2
    fi
  done
fi
