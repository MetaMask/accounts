#!/usr/bin/env bash
set -euo pipefail

# Build standalone speculos Linux binaries.
#
# On macOS (or any non-Linux host) this delegates to build-speculos-docker.sh
# so PyInstaller runs inside Linux containers for both amd64 and arm64.
#
# On Linux it builds natively for the host architecture only.
#
# Usage: ./scripts/build-speculos.sh [version] [arch...]
#
#   version  Speculos pip version (default: 0.25.13)
#   arch     amd64 and/or arm64 (macOS only; ignored on Linux)
#
# Produces in dist-build/:
#   speculos-v<version>-linux-<arch>.tar.gz

VERSION="${1:-0.25.13}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "[build] Non-Linux host detected — delegating to Docker build"
  exec "${SCRIPT_DIR}/build-speculos-docker.sh" "$@"
fi

# --- Native Linux build (host architecture only) ---

shift || true
if [[ $# -gt 0 ]]; then
  echo "[build] Warning: arch arguments ignored on Linux (builds host arch only)" >&2
fi

DIST_DIR="${SCRIPT_DIR}/../dist-build"
HOST_ARCH="$(uname -m)"

echo "[build] Building speculos v${VERSION} standalone binary (linux-${HOST_ARCH})"

rm -rf "${DIST_DIR}"
mkdir -p "${DIST_DIR}"

python3 -m venv "${DIST_DIR}/venv"
source "${DIST_DIR}/venv/bin/activate"
pip install --quiet "speculos==${VERSION}" pyinstaller

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

TAR_NAME="speculos-v${VERSION}-linux-${HOST_ARCH}.tar.gz"
tar -czf "${DIST_DIR}/${TAR_NAME}" -C "${DIST_DIR}" speculos

echo "[build] Archive created at: ${DIST_DIR}/${TAR_NAME}"

deactivate
