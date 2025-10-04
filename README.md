# ChildrenSafetyBracelet

## Repo real-time sync helper

This repository includes optional helper files to keep the local copy in sync with the GitHub remote in a safe, pull-only fashion.

Files added:

- `scripts/sync.sh` — safe sync script: runs `git fetch` then `git pull --ff-only`. Writes a log to `.sync.log` in the repo root.
- `systemd/childrenbracelet-sync.service` — example systemd user service unit to run the script once.
- `systemd/childrenbracelet-sync.timer` — example systemd user timer that triggers the service periodically (every 30s by default).

Usage (recommended, pull-only):

1. Make the script executable:

```bash
chmod +x scripts/sync.sh
```

2. Install the systemd user units (copy them to your user systemd directory):

```bash
mkdir -p ~/.config/systemd/user
cp systemd/childrenbracelet-sync.* ~/.config/systemd/user/
```

3. Start and enable the timer for your user:

```bash
systemctl --user daemon-reload
systemctl --user enable --now childrenbracelet-sync.timer
```

4. Check logs and status:

```bash
systemctl --user status childrenbracelet-sync.timer
journalctl --user -u childrenbracelet-sync.service --follow
tail -n 200 .sync.log
```

Notes and safety:

- The script performs `git pull --ff-only` which will fail if a merge is required. This prevents accidental merge commits or automatic conflict resolution.
- By default this is pull-only. If you want two-way sync (auto-push local commits), reply to me and I can add an optional, careful push workflow, but I recommend manual commits for safety.
- If you prefer a different frequency adjust `OnUnitActiveSec` in `systemd/childrenbracelet-sync.timer`. Very frequent polling may be rate-limited by GitHub.

## Running the fall-detection server (local)

I added a simple Flask server that can simulate or use real BLE to detect events and stream them to a monitor page.

Quick steps:

```bash
# from repo root
./scripts/run_server.sh
```

Then open http://localhost:5000/monitor to view events. The run script creates/uses `.venv` in the repo root and installs required packages from `webapp/requirements.txt`.

Hardware integration
--------------------

While your BLE hardware and fall-detection accelerometer are being completed, you can start sending events to the server immediately over HTTP. The server exposes a simple `/ingest` endpoint that accepts JSON POSTs from the device (or a gateway) and forwards them to the web UI via Server-Sent Events.

Example payloads (POST JSON to `http://<server>:5000/ingest`):

- Location by coordinates:
```json
{"device_id":"DEV123","lat":37.7749,"lng":-122.4194}
```
- Presence or RSSI-only (for BLE-based location later):
```json
{"device_id":"DEV123","rssi":-42}
```
- Fall event (sent by accelerometer logic):
```json
{"device_id":"DEV123","fall":true,"severity":"high"}
```

The server will push these as SSE events to connected clients on `/events` so your web front-end (or the included `monitor.html`) will receive them immediately.



This is the project for 2025 Wireless Innovation Hackathon.
