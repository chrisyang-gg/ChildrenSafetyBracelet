#!/usr/bin/env python3
import json
import os
import threading
import time
from queue import Queue, Empty

from flask import Flask, request, jsonify, Response, send_from_directory
from flask_cors import CORS

# Try to import bleak for BLE (optional). If not available we'll run a simulator.
try:
	from bleak import BleakScanner
	BLE_AVAILABLE = True
except Exception:
	BleakScanner = None
	BLE_AVAILABLE = False

# Only enable BLE scanning if the environment variable ENABLE_BLE=1 is set.
# This prevents the server from failing during development when hardware isn't ready.
BLE_ENABLED = os.getenv("ENABLE_BLE", "0") == "1"

app = Flask(__name__)
CORS(app)

# Simple event queue for server-sent events
events = Queue()


def push_event(payload: dict):
	payload.setdefault("ts", time.time())
	events.put(payload)


def ble_scanner_loop(stop_event: threading.Event):
	"""
	If BLE is available, scan for advertisements and detect 'fall' signals.
	This is a very small example that looks for devices advertising a specific
	name or manufacturer data. In practice the wearable should send a
	characteristic notification which you'd subscribe to.
	"""
	if not BLE_AVAILABLE:
		return

	print("BLE available: starting scanner loop")
	# Bleak provides async APIs. We'll call the discover coroutine via asyncio.run
	import asyncio
	while not stop_event.is_set():
		try:
			devices = asyncio.run(BleakScanner.discover(timeout=3.0))
			for d in devices:
				name = d.name or ""
				if "bracelet" in name.lower():
					push_event({"type": "location", "device": d.address, "address": d.address, "rssi": d.rssi, "source": "ble"})
			time.sleep(1.0)
		except Exception as e:
			print("BLE scanner error:", e)
			time.sleep(2.0)


def simulator_loop(stop_event: threading.Event):
	"""
	Simulator: periodically emits 'fall' events so the front-end can be tested
	without real BLE hardware. Also honors manual test triggers via /test-fall.
	"""
	print("BLE not available — running simulator loop")
	counter = 0
	while not stop_event.is_set():
		time.sleep(10)
		counter += 1
		# Every 3 cycles emit a simulated fall
		# Emit a location-like presence event every cycle
		push_event({"type": "location", "address": "SIMULATED_DEVICE_001", "rssi": -40 + (counter % 10), "lat": 37.7749 + (counter % 5) * 0.0001, "lng": -122.4194 - (counter % 5) * 0.0001, "source": "simulator"})
		if counter % 3 == 0:
			push_event({"type": "fall", "severity": "high", "source": "simulator"})


@app.route("/events")
def sse_events():
	def gen():
		# stream events as Server-Sent Events
		while True:
			try:
				ev = events.get(timeout=0.5)
			except Empty:
				# send a keepalive comment to avoid proxies closing the connection
				yield ": keepalive\n\n"
				continue
			data = json.dumps(ev)
			yield f"data: {data}\n\n"

	return Response(gen(), mimetype="text/event-stream")


@app.route("/test-fall", methods=["POST"])
def test_fall():
	"""Trigger a test fall event. POST JSON payload will be merged into the event."""
	try:
		payload = request.get_json(force=True)
	except Exception:
		payload = {}
	ev = {"type": "fall", "severity": payload.get("severity", "medium"), "source": "manual"}
	push_event(ev)
	return jsonify({"ok": True, "event": ev})


@app.route("/ingest", methods=["POST"])
def ingest():
	"""Generic ingest endpoint for hardware: accepts JSON payloads containing
	device_id, rssi, lat, lng, and fall (boolean). The server immediately
	pushes corresponding SSE events so the front-end can react in real-time.

	Example payloads:
	  {"device_id":"DEV123","rssi":-42}
	  {"device_id":"DEV123","lat":37.7749, "lng":-122.4194}
	  {"device_id":"DEV123","fall":true, "severity":"high"}
	"""
	try:
		data = request.get_json(force=True)
	except Exception:
		return jsonify({"ok": False, "error": "invalid json"}), 400

	device = data.get("device_id") or data.get("address") or "unknown"

	# If hardware reports fall directly
	if data.get("fall"):
		ev = {
			"type": "fall",
			"device": device,
			"severity": data.get("severity", "high"),
			"meta": data.get("meta", {}),
			"source": "ingest"
		}
		push_event(ev)
		return jsonify({"ok": True, "event": ev})

	# If hardware reports location
	if "lat" in data and "lng" in data:
		ev = {
			"type": "location",
			"device": device,
			"lat": float(data["lat"]),
			"lng": float(data["lng"]),
			"rssi": data.get("rssi"),
			"source": "ingest"
		}
		push_event(ev)
		return jsonify({"ok": True, "event": ev})

	# Fallback: rssi-only presence/location
	if "rssi" in data:
		ev = {
			"type": "location",
			"device": device,
			"rssi": data.get("rssi"),
			"source": "ingest"
		}
		push_event(ev)
		return jsonify({"ok": True, "event": ev})

	return jsonify({"ok": False, "error": "no recognized fields"}), 400


@app.route("/monitor")
def monitor_html():
	# serve a simple static monitor page included in this folder
	return send_from_directory(os.path.dirname(__file__), "monitor.html")


@app.route("/status")
def status():
	return jsonify({"status": "running", "ble": BLE_AVAILABLE})


def start_background_threads():
	stop_event = threading.Event()
	if BLE_ENABLED and BLE_AVAILABLE:
		t = threading.Thread(target=ble_scanner_loop, args=(stop_event,), daemon=True)
		t.start()
	else:
		t = threading.Thread(target=simulator_loop, args=(stop_event,), daemon=True)
		t.start()
	return stop_event


if __name__ == "__main__":
	stop_event = start_background_threads()
	# Flask's built-in server; for production use gunicorn/uvicorn.
	app.run(host="0.0.0.0", port=5000, threaded=True)
