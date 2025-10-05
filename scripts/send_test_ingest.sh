#!/usr/bin/env bash
set -euo pipefail
URL=${1:-http://127.0.0.1:5000/ingest}

case ${2:-location} in
  location)
    DATA='{"device_id":"DEV123","lat":37.7750,"lng":-122.4195,"rssi":-45}'
    ;;
  rssi)
    DATA='{"device_id":"DEV123","rssi":-42}'
    ;;
  fall)
    DATA='{"device_id":"DEV123","fall":true,"severity":"high"}'
    ;;
  *)
    echo "Unknown type: $2"; exit 2
    ;;
esac

curl -sS -X POST "$URL" -H 'Content-Type: application/json' -d "$DATA" | jq || true
