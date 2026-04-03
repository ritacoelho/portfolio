#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# fetch-images.sh  —  Download project images from the live rita-coelho.com
# Run this script from a Terminal on your computer (not inside Cowork).
# It spoofs the Referer header so the CDN delivers the files.
#
# Usage:  bash fetch-images.sh
# ─────────────────────────────────────────────────────────────────────────────

BASE="https://rita-coelho.com/static/media"
REF="https://rita-coelho.com/"
DIR="$(cd "$(dirname "$0")" && pwd)"

dl() {
  local dest="$DIR/$1"
  local url="$BASE/$2"
  echo "  → $1"
  curl -s -L --fail -H "Referer: $REF" -o "$dest" "$url" || echo "    ✗ failed: $url"
}

echo "Downloading work page thumbnails…"
dl "images/work/pilot-thumbnail.png"   "pilot-thumbnail.23f24ee3ac67876ea1b7.png"
dl "images/work/ipad-screens.png"      "ipad-screens.fc038047de8d24fcba70.png"
dl "images/work/sonic-thumbnail.png"   "sonic-thumbnail.57ee73f0691da471668a.png"

echo "Downloading Atlassian project images…"
dl "images/projects/atlassian/mockup.png"       "mockup.fc6c4674de725084f512.png"
dl "images/projects/atlassian/analytics1.png"   "analytics1.ea32ce8b1f64b6effb0d.png"
dl "images/projects/atlassian/new-project1.png" "new-project1.c89fae7fa84154c83feb.png"

echo "Downloading Last Mile project images…"
dl "images/projects/last-mile/ipad-screens.png"  "ipad-screens.fc038047de8d24fcba70.png"
dl "images/projects/last-mile/track.png"         "track.0c900331701b33c21596.png"
dl "images/projects/last-mile/confirmation.png"  "confirmation.b83d5717e2aaf5b7c555.png"
dl "images/projects/last-mile/delivered.png"     "delivered.354c8979117d19e870b8.png"

echo "Downloading Sonic Link project images…"
dl "images/projects/sonic-link/site.png"   "site.78ef68a4d4710dcc5a45.png"
dl "images/projects/sonic-link/lofi1.png"  "lofi1.20a1f5b8ddeea772a238.png"
dl "images/projects/sonic-link/proto1.png" "proto1.93939e461b31d512ec63.png"
dl "images/projects/sonic-link/hifi1.png"  "hifi1.a69da420ceecd019b5b0.png"
dl "images/projects/sonic-link/hifi2.png"  "hifi2.cd51ab8075f5b8e2ffe3.png"

echo ""
echo "Done. Check the images/ folder — any ✗ lines above mean that image"
echo "needs to be saved manually from your browser."
