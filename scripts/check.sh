#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
shellcheck scripts/*.sh infra/install-proxy.sh
actionlint
export CHROMIUM_PATH="${CHROMIUM_PATH:-$(command -v chromium)}"
volta run node scripts/check-browser.mjs
