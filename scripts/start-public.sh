#!/usr/bin/env bash
# Rebuild, serve dist on :4173 and open a Cloudflare quick tunnel. Prints the new https URL.
cd "$(dirname "$0")/.." && npx vite build >/dev/null
ss -ltn | grep -q ':4173 ' || (setsid nohup npm run preview > /tmp/fc-preview.log 2>&1 &)
pgrep -x cloudflared >/dev/null || (setsid nohup ~/bin/cloudflared tunnel --no-autoupdate --url http://localhost:4173 > /tmp/fc-tunnel.log 2>&1 &)
sleep 12; grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' /tmp/fc-tunnel.log | tail -1
