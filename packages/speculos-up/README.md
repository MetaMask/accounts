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

Binaries are installed into the version-named directory `<cacheDir>/speculos-<version>-<platform>-<arch>` — the same directory that `getSpeculosBinaryPath()` and `isSpeculosInstalled()` check — and symlinked into `node_modules/.bin`.

Bundled archives (shipped with this package) are used when their SHA-256 checksum verifies against `bundled/checksums.json`. Otherwise the archive is downloaded over HTTPS from the release URL and its checksum is verified against the same file before extraction. Downloads fail closed: a missing or mismatching checksum entry aborts the install instead of proceeding unverified. Throws for unsupported system architectures.

### `getSpeculosBinaryPath(options?)`

Returns the absolute path to the managed binary, or `null` if not installed.

### `isSpeculosInstalled(options?)`

Returns `true` if the managed binary exists on disk.

### `verifyBundledChecksum(archivePath, packageDir)`

Verifies an archive's SHA-256 checksum against a package's `bundled/checksums.json`. Returns `true`/`false` on checksum match/mismatch, and throws when the checksums file is unreadable or malformed or has no entry for the archive (fail closed).

### `cleanCache(options?)`

Removes cached installations. Only the default cache directory itself or paths inside it can be deleted; anything else throws. The default cache directory is `$XDG_CACHE_HOME/metamask/speculos-up` when `XDG_CACHE_HOME` is set to an absolute path, and `~/.cache/metamask/speculos-up` otherwise.

### `SpeculosupOptions`

| Option     | Type           | Default                         | Description                        |
| ---------- | -------------- | ------------------------------- | ---------------------------------- |
| `version`  | string         | `'0.25.13'`                     | Speculos version to install.       |
| `repo`     | string         | `'MetaMask/accounts'`           | GitHub repo hosting releases.      |
| `cacheDir` | string         | `~/.cache/metamask/speculos-up` | Custom cache directory.            |
| `platform` | `Platform`     | `Platform.Linux`                | Target platform.                   |
| `arch`     | `Architecture` | Auto-detected                   | Target architecture (amd64/arm64). |

## How It Works

1. Computes an HTTPS download URL for the target platform/architecture
2. Checks the version-named install directory (`~/.cache/metamask/speculos-up/speculos-<version>-<platform>-<arch>/`) for existing binaries; a cached entry only counts if the binary file actually exists
3. If a bundled archive exists and its checksum verifies, extracts it directly — no network needed
4. Otherwise downloads the tar.gz over HTTPS (rejecting `http:` URLs and redirects), verifies its SHA-256 checksum against `bundled/checksums.json`, and extracts it only if the checksum matches
5. Extracts with hardened tar settings: symlinks, hardlinks, and other non-regular entries are rejected, warnings are treated as errors, and archives that decompress beyond 1 GiB are aborted
6. Symlinks (or copies) into `node_modules/.bin/speculos`

## Requirements

- **Linux** — native binary (pre-built via PyInstaller)
- **macOS / Windows** — use Docker mode via `@metamask/hw-emulator` instead

## Building release binaries (maintainers)

Release archives are **Linux ELF** binaries (`speculos-v<version>-linux-<arch>.tar.gz`). CI builds **linux-amd64** only (see `.github/workflows/build-speculos.yml`); build **linux-arm64** locally with the Docker script below.

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
