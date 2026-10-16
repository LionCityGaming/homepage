"""Beszel summary for the Homepage Beszel tile's second row (15/10/2026).

Homepage's own Beszel widget shows either the totals or one machine; it cannot show "which machine is
busiest" across all of them, and Beszel's API needs a login token that expires. This logs in to the hub
with the same login the widget uses (BESZEL_USER / BESZEL_PASSWORD from the environment, never printed),
reads all systems every minute and serves the result on :8091 for Homepage's customapi widget:
  {"busiest": "Proxmox (16%)", "fullest": "Synology (71%)", "systems": 11, "updated": "..."}
and on :8091/history the last 24 hours of each machine's CPU and memory use, one reading per 20 minutes, for the
small trend lines on Homepage's server cards (16/10/2026):
  {"Proxmox": {"cpu": [4.2, 5.1, ...], "mem": [79.1, ...]}, ..., "updated": "..."}   (oldest first, up to 72 each)
Only reachable on the komodo Docker network (no published port). Standard library only."""
import json, os, threading, time, urllib.parse, urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HUB = os.environ.get("BESZEL_URL", "http://beszel:8090")
state = {"busiest": "-", "fullest": "-", "systems": 0, "updated": None}
history = {"updated": None}
last_history = 0
token = None


def call(path, data=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = token
    req = urllib.request.Request(HUB + path, data=json.dumps(data).encode() if data else None, headers=headers)
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)


def login():
    global token
    token = None
    token = call("/api/collections/users/auth-with-password",
                 {"identity": os.environ["BESZEL_USER"], "password": os.environ["BESZEL_PASSWORD"]})["token"]


def refresh():
    global token
    try:
        items = call("/api/collections/systems/records?perPage=200").get("items", [])
    except urllib.error.HTTPError as e:
        if e.code not in (401, 403):
            raise
        login()  # token expired: log in again
        items = call("/api/collections/systems/records?perPage=200").get("items", [])
    up = [s for s in items if s.get("status") == "up" and s.get("info")]
    if up:
        b = max(up, key=lambda s: s["info"].get("cpu") or 0)
        f = max(up, key=lambda s: s["info"].get("dp") or 0)
        state["busiest"] = "%s (%d%%)" % (b["name"], round(b["info"].get("cpu") or 0))
        state["fullest"] = "%s (%d%%)" % (f["name"], round(f["info"].get("dp") or 0))
    state["systems"] = len(items)
    state["updated"] = time.strftime("%Y-%m-%dT%H:%M:%S%z")
    global last_history
    if time.time() - last_history >= 600:  # Beszel adds a 20-minute reading every 20 minutes; checked twice as often
        read_history(items)
        last_history = time.time()


def read_history(items):
    names = {s["id"]: s["name"] for s in items}
    since = time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime(time.time() - 86400))
    flt = urllib.parse.quote("type='20m' && created>='%s'" % since)
    rows, page = [], 1
    while True:
        r = call("/api/collections/system_stats/records?perPage=500&sort=created&fields=system,stats,created"
                 "&filter=%s&page=%d" % (flt, page))
        rows += r.get("items", [])
        if page >= r.get("totalPages", 1):
            break
        page += 1
    out = {}
    for row in rows:
        n = names.get(row["system"])
        st = row.get("stats") or {}
        if not n:
            continue
        h = out.setdefault(n, {"cpu": [], "mem": []})
        h["cpu"].append(round(st.get("cpu") or 0, 1))
        h["mem"].append(round(st.get("mp") or 0, 1))
    out["updated"] = time.strftime("%Y-%m-%dT%H:%M:%S%z")
    history.clear()
    history.update(out)


def loop():
    while True:
        try:
            if not token:
                login()
            refresh()
        except Exception as e:
            print("refresh failed:", type(e).__name__, getattr(e, "code", ""), flush=True)
        time.sleep(60)


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        data = history if self.path.rstrip("/") == "/history" else state
        body = json.dumps(data).encode()
        self.send_response(200 if data["updated"] else 503)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass  # Homepage polls every minute; keep the log quiet


threading.Thread(target=loop, daemon=True).start()
ThreadingHTTPServer(("0.0.0.0", 8091), Handler).serve_forever()
