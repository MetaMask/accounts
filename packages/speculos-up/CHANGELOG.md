# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial release of `@metamask/speculos-up` ([#TODO](https://github.com/MetaMask/accounts/pull/TODO))
  - Download and manage pre-built Speculos Ledger emulator binaries from GitHub releases
  - `downloadAndInstall()` — downloads, caches, and symlinks the speculos binary
  - `getSpeculosBinaryPath()` — resolves the path to the managed binary
  - `isSpeculosInstalled()` — checks if the managed binary exists
  - `cleanCache()` — removes cached installations
  - HTTP streaming download with redirect support
  - tar.gz extraction with optional SHA-256 checksum verification
  - CLI entry point `mm-speculos-up`
  - Add pre-packaged speculos binaries (linux-amd64 + linux-arm64) to avoid runtime downloads
  - `verifyBundledChecksum()` — verify a bundled archive against `bundled/checksums.json`
  - Honor `XDG_CACHE_HOME` (when absolute) when computing the default cache directory

### Changed

- **Breaking:** Remote downloads now require HTTPS and enforce SHA-256 verification against `bundled/checksums.json`; downloads fail closed on checksum mismatch or a missing checksum entry ([#TODO](https://github.com/MetaMask/accounts/pull/TODO))
  - `checkAndDownloadBinaries()` now takes a `packageDir` argument instead of optional per-binary checksums, downloads the archive to a temporary file, verifies its checksum, and only then extracts it
  - `http:` URLs and redirects that downgrade to `http:` are rejected
  - Installing a version that has no entry in `checksums.json` now fails instead of downloading an unverified archive
- **Breaking:** `normalizeSystemArchitecture()` now throws for unsupported architectures (such as `arm`/`armv7l`/`ia32`) instead of falling back to `amd64` ([#TODO](https://github.com/MetaMask/accounts/pull/TODO))
- **Breaking:** `cleanCache()` only deletes the default cache directory or paths inside it, and throws for anything else ([#TODO](https://github.com/MetaMask/accounts/pull/TODO))

### Fixed

- Fix bundled archive checksum verification failing open on unreadable or malformed `checksums.json` and on missing checksum entries; verification now fails closed ([#TODO](https://github.com/MetaMask/accounts/pull/TODO))
- Fix empty cache directories being treated as valid installations, which returned paths to a non-existent binary ([#TODO](https://github.com/MetaMask/accounts/pull/TODO))
- Harden tar extraction: reject symlink, hardlink, and other non-regular entries, treat tar warnings as errors (`strict` mode), and abort archives whose decompressed size exceeds 1 GiB ([#TODO](https://github.com/MetaMask/accounts/pull/TODO))
- Pin `pyinstaller` in the release build scripts for reproducible, verifiable builds ([#TODO](https://github.com/MetaMask/accounts/pull/TODO))

[Unreleased]: https://github.com/MetaMask/accounts/
