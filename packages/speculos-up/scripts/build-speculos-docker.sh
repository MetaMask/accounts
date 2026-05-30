#!/usr/bin/env bash
set -euo pipefail

# Build Linux Speculos release archives via Docker (macOS, Windows, or Linux hosts).
# PyInstaller cannot cross-compile: each arch runs in a matching linux/<arch> container.
#
# Usage: ./scripts/build-speculos-docker.sh [version] [arch...]
#
#   version  Speculos pip version (default: 0.25.13)
#   arch     One or more of: amd64, arm64 (default: both)
#
# Produces in packages/speculos-up/dist-build/:
#   speculos-v<version>-linux-amd64.tar.gz
#   speculos-v<version>-linux-arm64.tar.gz

DEFAULT_VERSION="0.25.13"
PYTHON_IMAGE="python:3.11-bookworm"
DEBIAN_IMAGE="debian:bookworm-slim"

usage() {
  cat <<'EOF'
Usage: ./scripts/build-speculos-docker.sh [version] [arch...]

Build Linux ELF Speculos binaries with PyInstaller inside Docker.

Arguments:
  version  Speculos pip version (default: 0.25.13)
  arch     amd64 and/or arm64 (default: both)

Examples:
  ./scripts/build-speculos-docker.sh
  ./scripts/build-speculos-docker.sh 0.25.13 arm64
  ./scripts/build-speculos-docker.sh 0.25.13 amd64 arm64

Requires Docker. On Apple Silicon, linux/arm64 builds are fast; linux/amd64 uses emulation.
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

VERSION="${1:-$DEFAULT_VERSION}"
shift || true

ARCHS=()
if [[ $# -eq 0 ]]; then
  ARCHS=(amd64 arm64)
else
  for arch in "$@"; do
    case "${arch}" in
      amd64 | arm64)
        ARCHS+=("${arch}")
        ;;
      *)
        echo "error: unknown arch '${arch}' (expected amd64 or arm64)" >&2
        exit 1
        ;;
    esac
  done
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DIST_DIR="${SCRIPT_DIR}/../dist-build"
mkdir -p "${DIST_DIR}"

if ! command -v docker >/dev/null 2>&1; then
  echo "error: docker is not installed or not on PATH" >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "error: Docker daemon is not running" >&2
  exit 1
fi

docker_platform() {
  case "$1" in
    amd64) echo "linux/amd64" ;;
    arm64) echo "linux/arm64" ;;
  esac
}

file_arch_pattern() {
  case "$1" in
    amd64) echo "x86-64" ;;
    arm64) echo "ARM aarch64" ;;
  esac
}

build_arch() {
  local arch="$1"
  local platform file_arch image
  platform="$(docker_platform "${arch}")"
  file_arch="$(file_arch_pattern "${arch}")"

  # PyQt6 publishes pre-built wheels for x86_64 but not always aarch64.
  # For arm64 use a Debian image where we install PyQt6 from system packages
  # so pip never tries to build from source.
  if [[ "${arch}" == "arm64" ]]; then
    image="${DEBIAN_IMAGE}"
  else
    image="${PYTHON_IMAGE}"
  fi

  echo "[build] speculos v${VERSION} linux-${arch} (${platform})"

  if [[ "${arch}" == "arm64" ]]; then
    docker run --rm \
      --platform "${platform}" \
      -v "${DIST_DIR}:/out" \
      -w /out \
      -e "SPECULOS_VERSION=${VERSION}" \
      -e "TARGET_ARCH=${arch}" \
      -e "FILE_ARCH=${file_arch}" \
      "${image}" \
      bash -c '
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq && apt-get install -qq -y --no-install-recommends \
  python3 python3-pip python3-venv python3-pyqt6 binutils file \
  libpython3.11-dev libgl1 libglib2.0-0 > /dev/null
python3 -m venv --system-site-packages /tmp/venv
source /tmp/venv/bin/activate
pip install --upgrade pip
pip install pyinstaller "speculos==${SPECULOS_VERSION}" --no-deps
pip install construct "flask>=2.0.0,<3.0.0" flask-restful flask-cors \
  "jsonschema>=3.2.0,<4.18.0" mnemonic "pillow>=8.0.0,<11.0.0" \
  pyelftools requests ledgered pygame altgraph packaging setuptools pyinstaller-hooks-contrib
rm -rf build dist
mkdir -p build dist
pyinstaller \
  --onefile \
  --name speculos \
  --distpath dist \
  --workpath build \
  --noupx \
  --collect-all speculos \
  "$(python3 -c "import speculos; print(speculos.__file__)")"
file dist/speculos | tee /tmp/speculos-file.txt
grep -Fq "${FILE_ARCH}" /tmp/speculos-file.txt
ARCHIVE="/out/speculos-v${SPECULOS_VERSION}-linux-${TARGET_ARCH}.tar.gz"
tar -czf "${ARCHIVE}" -C dist speculos
ls -lh "${ARCHIVE}"
'
  else
    docker run --rm \
      --platform "${platform}" \
      -v "${DIST_DIR}:/out" \
      -w /out \
      -e "SPECULOS_VERSION=${VERSION}" \
      -e "TARGET_ARCH=${arch}" \
      -e "FILE_ARCH=${file_arch}" \
      "${image}" \
      bash -lc '
set -euo pipefail
pip install --upgrade pip
pip install pyinstaller "speculos==${SPECULOS_VERSION}"
rm -rf build dist
mkdir -p build dist
pyinstaller \
  --onefile \
  --name speculos \
  --distpath dist \
  --workpath build \
  --noupx \
  --collect-all speculos \
  "$(python -c "import speculos; print(speculos.__file__)")"
file dist/speculos | tee /tmp/speculos-file.txt
grep -Fq "${FILE_ARCH}" /tmp/speculos-file.txt
ARCHIVE="/out/speculos-v${SPECULOS_VERSION}-linux-${TARGET_ARCH}.tar.gz"
tar -czf "${ARCHIVE}" -C dist speculos
ls -lh "${ARCHIVE}"
'
  fi

  echo "[build] Wrote ${DIST_DIR}/speculos-v${VERSION}-linux-${arch}.tar.gz"
}

echo "[build] Output directory: ${DIST_DIR}"
for arch in "${ARCHS[@]}"; do
  build_arch "${arch}"
done

echo "[build] Done."
