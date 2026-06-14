# `@metamask/speculos-ble`

Virtual BLE Ledger device for E2E testing with [Speculos](https://github.com/LedgerHQ/speculos).

This package provides a Python BLE bridge that wraps the Speculos APDU stream into a Bluetooth Low Energy GATT server, enabling Bluetooth-based Ledger device testing on Android emulators and physical devices.

## Installation

```bash
yarn add @metamask/speculos-ble
```

or

```bash
npm install @metamask/speculos-ble
```

## Overview

`@metamask/speculos-ble` creates a virtual BLE Ledger device that appears as a real Nano X to Bluetooth scanners. It bridges:

1. **BLE GATT server** — advertises as a Ledger Nano X, accepts BLE connections
2. **APDU bridge** — forwards BLE APDU packets to/from the Speculos emulator
3. **Control API** — HTTP endpoint for test automation (button presses, screenshots, BLE disconnect)

This enables end-to-end testing of MetaMask Mobile's Bluetooth Ledger integration without physical hardware.

## Architecture

```
┌──────────────┐      BLE GATT      ┌─────────────┐      TCP APDU      ┌──────────┐
│  MetaMask    │ ◄─────────────────► │ speculos-ble │ ◄────────────────► │ Speculos │
│  Mobile      │   (Bluetooth LE)    │  (Python)    │   (localhost)      │ (Docker) │
└──────────────┘                     └──────┬──────┘                     └──────────┘
                                            │ HTTP
                                            ▼
                                     ┌─────────────┐
                                     │ Control API  │
                                     │ (test driver)│
                                     └─────────────┘
```

## Usage

### Programmatic (TypeScript)

```typescript
import { SpeculosBleRunner } from '@metamask/speculos-ble';

// One-time venv setup
if (!SpeculosBleRunner.isVenvReady()) {
  SpeculosBleRunner.setupVenv();
}

const runner = new SpeculosBleRunner({
  controlApiPort: 5002,
  deviceName: 'Ledger Nano X',
});

// Start the BLE bridge
runner.start();
await runner.waitForControlApi();

// ... run tests ...

// Cleanup
await runner.disconnectBle();
await runner.stop();
```

### Shell Script

```bash
# Set up Python venv (first time only)
./scripts/setup-python.sh

# Start Speculos + BLE bridge
./scripts/start-android.sh
```

### Docker

```bash
docker build -t speculos-ble .
docker run -p 9999:9999 -p 5000:5000 -p 5002:5002 speculos-ble
```

## Python Test Suite

```bash
# From the package directory
cd python_tests && python -m pytest -v
```

## Requirements

- Python 3.10–3.13 (for the BLE bridge)
- Docker (for Speculos emulator)
- Android emulator with Bluetooth netsim support (for `android-netsim` transport)
- VHCI kernel module (for `vhci` transport on Linux)
