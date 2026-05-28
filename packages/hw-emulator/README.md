# `@metamask/hw-emulator`

Hardware wallet emulator lifecycle, transport, and device interaction for E2E testing.

Provides a programmatic interface for launching and controlling hardware wallet emulators (Ledger via [Speculos](https://github.com/LedgerHQ/speculos)), sending APDU commands, and automating device screen interactions (button presses, touch gestures) — all without physical hardware.

## Installation

`yarn add @metamask/hw-emulator`

or

`npm install @metamask/hw-emulator`

## Supported Devices

| Device    | Model ID | Interaction Type |
| --------- | -------- | ---------------- |
| Nano S+   | `nanosp` | Button           |
| Nano X    | `nanox`  | Button           |
| Stax      | `stax`   | Touch            |
| Flex      | `flex`   | Touch            |

## Quick Start

### Docker Mode (recommended for macOS / CI)

```typescript
import { createEmulator, EmulatorType } from '@metamask/hw-emulator';

const emulator = createEmulator(EmulatorType.Ledger, {
  device: 'flex',
  mode: 'docker',
});

await emulator.start();
await emulator.approveTransaction();
await emulator.stop();
```

### Native Mode (Linux only)

Requires the Speculos binary to be installed and available on `PATH`, or passed via the `binary` option.

```typescript
import { createEmulator, EmulatorType } from '@metamask/hw-emulator';

const emulator = createEmulator(EmulatorType.Ledger, {
  device: 'nanosp',
  mode: 'native',
  binary: '/usr/local/bin/speculos',
});

await emulator.start();
await emulator.approveSigning();
await emulator.stop();
```

## API

### `createEmulator(type, options?)`

Factory function that creates a `HardwareWalletEmulator` instance.

- **`type`** — `'ledger'` (via `EmulatorType.Ledger`). Trezor support is not yet implemented.
- **`options`** — See [`SpeculosOptions`](#speculosoptions).

### `HardwareWalletEmulator`

| Method                   | Description                              |
| ------------------------ | ---------------------------------------- |
| `start()`                | Start the emulator (Docker or native).   |
| `stop()`                 | Stop the emulator and clean up resources.|
| `isRunning()`            | Returns whether the emulator is active.  |
| `approveTransaction()`   | Approve the current transaction on screen.|
| `approveSigning()`       | Approve the current signing request.     |
| `rejectTransaction()`    | Reject the current transaction on screen.|
| `navigateToMainMenu()`   | Navigate back to the device main menu.   |
| `getInteraction()`       | Get the low-level device interaction API. |

### `SpeculosOptions`

| Option          | Type     | Default     | Description                                     |
| --------------- | -------- | ----------- | ----------------------------------------------- |
| `device`        | `string` | `'flex'`    | Device model ID (`nanosp`, `nanox`, `stax`, `flex`). |
| `seed`          | `string` | Built-in    | Mnemonic seed for deterministic accounts.        |
| `apduPort`      | `number` | `9998`      | APDU communication port.                         |
| `apiPort`       | `number` | `5001`      | Speculos REST API port.                          |
| `wsBridgePort`  | `number` | `9876`      | WebSocket bridge port for WebHID mock.           |
| `mode`          | `string` | Auto        | Run mode: `'docker'` or `'native'`. Auto-detected. |
| `binary`        | `string` | —           | Path to Speculos binary (native mode only).      |
| `display`       | `string` | `'headless'`| Display mode.                                    |
| `loadNvram`     | `boolean`| `true`      | Load persisted NVRAM state.                      |
| `startTimeout`  | `number` | `60000`     | Startup timeout in ms.                           |

### Low-Level APIs

The package also exports granular components for advanced use cases:

- **`SpeculosClient`** — HTTP client for the Speculos REST API (APDU exchange, screen events).
- **`ApduBridge`** — WebSocket-to-APDU bridge for browser-based WebHID mocking.
- **`DockerManager`** — Direct Docker Compose lifecycle management.
- **`createProcessManager()`** — Native Speculos process spawning and monitoring.
- **`createDeviceInteraction()`** — Screen automation (button presses, touch coordinates).
- **`withRetry()` / `ExponentialBackoff`** — Resilience utilities for flaky device communication.
- **`createLedgerHidFramingSession()`** — Low-level Ledger HID frame encoding/decoding.
- **`getWebHidMockScript()`** — Generates a browser script to mock WebHID for E2E tests.

## Docker Setup

The package includes a `docker-compose.yml` for running Speculos via Docker:

```bash
# Start with default device (Flex)
docker compose up -d

# Start with a specific device
SPECULOS_DEVICE=nanosp docker compose up -d
```

The ELF app binaries for all supported devices are bundled in the `apps/` directory.

## Deterministic Accounts

The default seed produces these pre-funded Ethereum accounts:

| Index | Address                                          |
| ----- | ------------------------------------------------ |
| 0     | `0x24fC293546A31F5Ce73bAfecE37969A95CCd1aBf`     |
| 1     | `0x730A5c73bC3ACcf56daba2D5D897bEb10F852865`     |
| 2     | `0x805c2797CCBa57887F5fA0DD95C017145d67604a`     |
| 3     | `0x2Bf9972F600D8C3B3f0AEe8f1e17Fc4631242fF4`     |
| 4     | `0xDc660e6D52F6f774d0879f99929711155Bc03902`     |

## Contributing

This package is part of a monorepo. Instructions for contributing can be found in the [monorepo README](https://github.com/MetaMask/accounts#readme).
