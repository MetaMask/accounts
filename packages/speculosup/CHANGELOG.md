# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0]

### Added

- Initial release of `@metamask/speculosup` ([#TODO](https://github.com/MetaMask/accounts/pull/TODO))
  - Download and manage the Speculos Ledger emulator binary via a managed Python virtual environment
  - `installSpeculos()` — installs speculos into `~/.cache/metamask/speculosup/speculos-{version}`
  - `uninstallSpeculos()` — removes a managed installation
  - `getSpeculosBinaryPath()` — resolves the path to the managed binary
  - `isSpeculosInstalled()` — checks if the managed binary exists
  - `getInstalledVersion()` — queries the installed binary version
  - CLI entry point `mm-speculosup`

[0.1.0]: https://github.com/MetaMask/accounts/releases/tag/@metamask/speculosup@0.1.0
