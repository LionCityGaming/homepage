#!/bin/sh
# Write Gotify's real counts for the Homepage Gotify card: apps, clients, all messages and messages in the
# last 24 hours (Gotify's API has no message totals; the built-in widget counts one page, "100").
# Run it every few minutes on the Docker host (cron or a systemd timer), as a user that can read Gotify's
# database. Set DB to Gotify's gotify.db and OUT to a file in the folder mounted at Homepage's
# /app/public/images. Homepage only serves files that existed when it started, so restart Homepage once
# after the first run; after that the file can change freely. Needs sqlite3.
set -eu
DB=${DB:-/opt/app-data/gotify/gotify.db}
OUT=${OUT:-/opt/app-data/homepage/images/gotify-count.json}
q() { sqlite3 -readonly -cmd ".timeout 10000" "$DB" "$1"; }
apps=$(q "SELECT count(*) FROM applications;")
clients=$(q "SELECT count(*) FROM clients;")
messages=$(q "SELECT count(*) FROM messages;")
last_24h=$(q "SELECT count(*) FROM messages WHERE datetime(substr(date, 1, 19)) >= datetime('now', 'localtime', '-1 day');")
tmp=$(mktemp "$OUT.XXXXXX")
printf '{"applications": %s, "clients": %s, "messages": %s, "last_24h": %s}\n' "$apps" "$clients" "$messages" "$last_24h" > "$tmp"
chmod 0644 "$tmp"
chown 1000:1000 "$tmp" 2>/dev/null || true  # Homepage runs as 1000 by default
mv "$tmp" "$OUT"
