#!/usr/bin/env bash
set -euo pipefail

# Build a standalone speculos binary using PyInstaller.
# Must run on Linux with speculos installed.
#
# Usage: ./scripts/build-speculos.sh [version]
#
# Produces: dist/speculos  (standalone binary)

VERSION="${1:-0.25.13}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DIST_DIR="${SCRIPT_DIR}/../dist-build"

echo "[build] Building speculos v${VERSION} standalone binary"

rm -rf "${DIST_DIR}"
mkdir -p "${DIST_DIR}"

# Create a temporary venv and install speculos
python3 -m venv "${DIST_DIR}/venv"
source "${DIST_DIR}/venv/bin/activate"
pip install --quiet "speculos==${VERSION}" pyinstaller

# Build standalone binary with PyInstaller
pyinstaller \
  --onefile \
  --name speculos \
  --distpath "${DIST_DIR}" \
  --workpath "${DIST_DIR}/build" \
  --specpath "${DIST_DIR}" \
  --noupx \
  --collect-all speculos \
  "$(python3 -c 'import speculos; print(speculos.__file__)')"

echo "[build] Binary created at: ${DIST_DIR}/speculos"
ls -lh "${DIST_DIR}/speculos"

# Package as tar.gz
TAR_NAME="speculos-v${VERSION}-linux-$(uname -m).tar.gz"
tar -czf "${DIST_DIR}/${TAR_NAME}" -C "${DIST_DIR}" speculos

echo "[build] Archive created at: ${DIST_DIR}/${TAR_NAME}"

deactivate
