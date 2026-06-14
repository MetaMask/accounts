#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_DIR="$(dirname "$SCRIPT_DIR")"

SPECULOS_HOST="${SPECULOS_HOST:-127.0.0.1}"
SPECULOS_APDU_PORT="${SPECULOS_APDU_PORT:-9999}"
SPECULOS_API_PORT="${SPECULOS_API_PORT:-5000}"
CONTROL_API_PORT="${CONTROL_API_PORT:-5002}"
DEVICE_NAME="${DEVICE_NAME:-Ledger Nano X}"
TRANSPORT="${TRANSPORT:-android-netsim}"
VERBOSE="${VERBOSE:-}"

SPECULOS_APP="${SPECULOS_APP:-ethereum}"
SPECULOS_MODEL="${SPECULOS_MODEL:-nanox}"

# Look for ELF in hw-emulator package (via node_modules or sibling package dir)
ELF_PATH=""
HW_EMULATOR_DIRS=(
    "${HW_EMULATOR_DIR:-}"
    "${PKG_DIR}/../../node_modules/@metamask-previews/hw-emulator/apps"
    "${PKG_DIR}/../../node_modules/@metamask/hw-emulator/apps"
    "${PKG_DIR}/../hw-emulator/apps"
)
for dir in "${HW_EMULATOR_DIRS[@]}"; do
    [ -z "$dir" ] && continue
    if [ -d "$dir" ]; then
        ELF_PATH="$(find "$dir" -name "${SPECULOS_APP}*.elf" 2>/dev/null | head -1)"
        [ -n "$ELF_PATH" ] && break
    fi
done

if [ -z "$ELF_PATH" ]; then
    echo "WARNING: Could not find $SPECULOS_APP ELF binary."
    echo "Set HW_EMULATOR_DIR or install @metamask/hw-emulator."
    echo "Will attempt to use Docker image's built-in app."
fi

cleanup() {
    echo ""
    echo "Stopping processes..."
    [ -n "${SPECULOS_PID:-}" ] && kill "$SPECULOS_PID" 2>/dev/null || true
    [ -n "${BLE_PID:-}" ] && kill "$BLE_PID" 2>/dev/null || true
    wait 2>/dev/null
}
trap cleanup EXIT INT TERM

if ! curl -sf "http://${SPECULOS_HOST}:${SPECULOS_API_PORT}/ping" >/dev/null 2>&1; then
    echo "Starting Speculos..."

    if docker ps --format '{{.Names}}' | grep -q '^speculos-ledger$'; then
        echo "Stopping existing speculos-ledger container..."
        docker stop speculos-ledger >/dev/null 2>&1 || true
        docker rm speculos-ledger >/dev/null 2>&1 || true
    fi

    if [ -n "$ELF_PATH" ]; then
        ELF_DIR="$(dirname "$ELF_PATH")"
        ELF_NAME="$(basename "$ELF_PATH")"
        docker run -d \
            --name speculos-ledger \
            -p "${SPECULOS_APDU_PORT}:9998" \
            -p "${SPECULOS_API_PORT}:5000" \
            -v "${ELF_DIR}:/apps:ro" \
            ghcr.io/ledgerhq/speculos \
            --model "$SPECULOS_MODEL" \
            --display headless \
            --apdu-port 9998 \
            --api-port 5000 \
            "/apps/${ELF_NAME}" \
            &
    else
        docker run -d \
            --name speculos-ledger \
            -p "${SPECULOS_APDU_PORT}:9998" \
            -p "${SPECULOS_API_PORT}:5000" \
            ghcr.io/ledgerhq/speculos \
            --model "$SPECULOS_MODEL" \
            --display headless \
            --apdu-port 9998 \
            --api-port 5000 \
            "apps/${SPECULOS_MODEL}/${SPECULOS_APP}.elf" \
            &
    fi
    SPECULOS_PID=$!

    echo "Waiting for Speculos API on :${SPECULOS_API_PORT}..."
    for i in $(seq 1 30); do
        if curl -sf "http://${SPECULOS_HOST}:${SPECULOS_API_PORT}/ping" >/dev/null 2>&1; then
            break
        fi
        sleep 1
    done

    if ! curl -sf "http://${SPECULOS_HOST}:${SPECULOS_API_PORT}/ping" >/dev/null 2>&1; then
        echo "ERROR: Speculos failed to start"
        exit 1
    fi
fi

echo "Speculos ready."

VENV="${SPECULOS_BLE_VENV_DIR:-$PKG_DIR/.venv}"
if [ ! -d "$VENV" ]; then
    echo "ERROR: Python venv not found at $VENV. Run scripts/setup-python.sh first."
    exit 1
fi
source "$VENV/bin/activate"

echo "Starting speculos-ble (transport: $TRANSPORT)..."
VERBOSE_FLAG=""
[ -n "$VERBOSE" ] && VERBOSE_FLAG="-v"

speculos-ble \
    --transport "$TRANSPORT" \
    --device-name "$DEVICE_NAME" \
    --speculos-host "$SPECULOS_HOST" \
    --speculos-apdu-port "$SPECULOS_APDU_PORT" \
    --speculos-api-port "$SPECULOS_API_PORT" \
    --control-api-port "$CONTROL_API_PORT" \
    $VERBOSE_FLAG \
    &
BLE_PID=$!

echo "Waiting for Control API on :${CONTROL_API_PORT}..."
for i in $(seq 1 30); do
    if curl -sf "http://${SPECULOS_HOST}:${CONTROL_API_PORT}/health" >/dev/null 2>&1; then
        echo "speculos-ble ready."
        break
    fi
    sleep 1
done

if ! curl -sf "http://${SPECULOS_HOST}:${CONTROL_API_PORT}/health" >/dev/null 2>&1; then
    echo "ERROR: speculos-ble Control API failed to start"
    exit 1
fi

echo ""
echo "=== Stack Running ==="
echo "Speculos API:  http://${SPECULOS_HOST}:${SPECULOS_API_PORT}"
echo "Control API:   http://${SPECULOS_HOST}:${CONTROL_API_PORT}"
echo "APDU TCP:      ${SPECULOS_HOST}:${SPECULOS_APDU_PORT}"
echo ""
echo "Press Ctrl+C to stop."

wait
