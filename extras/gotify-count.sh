#!/bin/sh
# Write Gotify's real counts for the Homepage Gotify card: apps, clients, all messages, messages in the last
# 24 hours (Gotify's API has no message totals; the built-in widget counts one page, "100") and when the latest
# message arrived ("Last Received"; custom.js keeps it ticking between messages).
# Run it every 15 seconds on the Docker host (a systemd timer, or cron plus a sleep loop), as a user that can read
# Gotify's database. Set DB to Gotify's gotify.db and OUT to a file in the folder mounted at Homepage's
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
# Gotify stores "2026-10-10 07:55:46.766641405+08:00"; Homepage's relativeDate wants ISO 8601
latest=$(q "SELECT replace(substr(date, 1, 19), ' ', 'T') || substr(date, -6) FROM messages ORDER BY id DESC LIMIT 1;")
[ -n "$latest" ] && latest="\"$latest\"" || latest=null
tmp=$(mktemp "$OUT.XXXXXX")
printf '{"applications": %s, "clients": %s, "messages": %s, "last_24h": %s, "latest_date": %s}\n' \
  "$apps" "$clients" "$messages" "$last_24h" "$latest" > "$tmp"
chmod 0644 "$tmp"
chown 1000:1000 "$tmp"
mv "$tmp" "$OUT"
