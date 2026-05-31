# `@metamask/speculos-up`

Download and manage pre-built [Speculos](https://github.com/LedgerHQ/speculos) Ledger emulator binaries from GitHub releases.

Inspired by [`@metamask/foundryup`](https://github.com/MetaMask/core/tree/main/packages/foundryup) — provides zero-dependency, cross-platform binary management for the Speculos hardware wallet emulator.

## Installation

`yarn add @metamask/speculos-up`

or

`npm install @metamask/speculos-up`

## Overview

Speculos is a Python-based Ledger device emulator. This package downloads pre-built standalone Speculos binaries (produced by PyInstaller on Linux) from GitHub releases, caches them locally, and provides a simple API for resolving the binary path at runtime.

This avoids requiring developers to install Python, set up a virtual environment, or manage Speculos manually.

## Usage

### CLI

```bash
# Download and install the default version
yarn mm-speculos-up

# The binary is available at node_modules/.bin/speculos
```

### Programmatic

```typescript
import {
  getSpeculosBinaryPath,
  downloadAndInstall,
} from '@metamask/speculos-up';

// Check if already installed
const binaryPath = getSpeculosBinaryPath();

// Or download explicitly
await downloadAndInstall();
```

### With `@metamask/hw-emulator`

`hw-emulator` automatically resolves the managed binary via an optional peer dependency:

```typescript
import { createEmulator, EmulatorType } from '@metamask/hw-emulator';

const emulator = createEmulator(EmulatorType.Ledger, {
  device: 'flex',
  mode: 'native',
  // No `binary` option needed — uses speculos-up's managed binary
});

await emulator.start();
```

## API

### `downloadAndInstall(options?)`

Download, cache, and symlink the Speculos binary.

### `getSpeculosBinaryPath(options?)`

Returns the absolute path to the managed binary, or `null` if not installed.

### `isSpeculosInstalled(options?)`

Returns `true` if the managed binary exists on disk.

### `cleanCache(options?)`

Removes all cached installations.

### `SpeculosupOptions`

| Option     | Type           | Default                        | Description                        |
| ---------- | -------------- | ------------------------------ | ---------------------------------- |
| `version`  | string         | `'0.25.13'`                    | Speculos version to install.       |
| `repo`     | string         | `'MetaMask/accounts'`          | GitHub repo hosting releases.      |
| `cacheDir` | string         | `~/.cache/metamask/speculos-up` | Custom cache directory.            |
| `platform` | `Platform`     | `Platform.Linux`               | Target platform.                   |
| `arch`     | `Architecture` | Auto-detected                  | Target architecture (amd64/arm64). |

## How It Works

1. Computes a download URL for the target platform/architecture
2. Checks a local cache (`~/.cache/metamask/speculos-up/`) for existing binaries
3. If not cached, downloads the tar.gz from GitHub releases
4. Extracts and verifies checksums (if provided)
5. Symlinks (or copies) into `node_modules/.bin/speculos`

## Requirements

- **Linux** — native binary (pre-built via PyInstaller)
- **macOS / Windows** — use Docker mode via `@metamask/hw-emulator` instead

## Building release binaries (maintainers)

Release archives are **Linux ELF** binaries (`speculos-v<version>-linux-<arch>.tar.gz`). CI builds them on native Linux runners (see `.github/workflows/build-speculos.yml`).

On **macOS** (including Apple Silicon) or Windows, use Docker so PyInstaller runs inside Linux:

```bash
cd packages/speculos-up

# Both linux-amd64 and linux-arm64 (arm64 is fast on M-series; amd64 uses emulation)
./scripts/build-speculos-docker.sh 0.25.13

# Single architecture
./scripts/build-speculos-docker.sh 0.25.13 arm64
```

Artifacts land in `packages/speculos-up/dist-build/`. Upload them to a GitHub release tagged `speculos-v<version>` on `MetaMask/accounts`.

On **Linux**, you can use `./scripts/build-speculos.sh` for the host architecture only, or the Docker script for both arches.

## Contributing

This package is part of a monorepo. Instructions for contributing can be found in the [monorepo README](https://github.com/MetaMask/accounts#readme).
