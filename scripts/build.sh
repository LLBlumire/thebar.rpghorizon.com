#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
export NEXT_TELEMETRY_DISABLED=1
volta run npm ci --ignore-scripts
volta run npm run build
test -f out/index.html
test -f out/play.html
test -f out/import.html
test -f out/404.html
