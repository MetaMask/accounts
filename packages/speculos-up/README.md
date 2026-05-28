# @metamask/speculos-up

Binary downloader for the Speculos Ledger device emulator.

## Installation

```bash
yarn add @metamask/speculos-up
```

## Usage

### Programmatic

```typescript
import { ensureBinary, getBinaryPath } from '@metamask/speculos-up';

// Download (if not cached) and return path
const binaryPath = await ensureBinary();
console.log(`Binary at: ${binaryPath}`);

// Just resolve the expected path without downloading
const path = getBinaryPath();
```

### CLI

```bash
yarn speculos-up
# Prints the path to the cached binary
```

### Custom Cache Directory

```typescript
const binaryPath = await ensureBinary({ cacheDir: '/tmp/speculos-cache' });
```

## Supported Platforms

| Platform | Architecture |
|----------|-------------|
| Linux    | x64         |
| Linux    | arm64       |
| macOS    | arm64       |

## Configuration

| Option      | Environment Variable | Default               |
|-------------|---------------------|-----------------------|
| Cache Dir   | -                   | `.metamask/cache`     |
