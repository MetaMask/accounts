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

[Unreleased]: https://github.com/MetaMask/accounts/
