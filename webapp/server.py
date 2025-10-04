#!/usr/bin/env python3
import json
import os
import threading
import time
from queue import Queue, Empty

from flask import Flask, request, jsonify, Response, send_from_directory

# Try to import bleak for BLE (optional). If not available we'll run a simulator.
try:
	from bleak import BleakScanner
	BLE_AVAILABLE = True
except Exception:
	BLE_AVAILABLE = False

app = Flask(__name__)

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
	while not stop_event.is_set():
		try:
			devices = BleakScanner.discover(timeout=3.0)
			for d in devices:
				# Example heuristic: device name contains 'bracelet' and RSSI drop may indicate fall
				name = d.name or ""
				if "bracelet" in name.lower():
					# Push a presence event (not necessarily a fall)
					push_event({"type": "presence", "address": d.address, "rssi": d.rssi})
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


@app.route("/monitor")
def monitor_html():
	# serve a simple static monitor page included in this folder
	return send_from_directory(os.path.dirname(__file__), "monitor.html")


@app.route("/status")
def status():
	return jsonify({"status": "running", "ble": BLE_AVAILABLE})


def start_background_threads():
	stop_event = threading.Event()
	if BLE_AVAILABLE:
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
