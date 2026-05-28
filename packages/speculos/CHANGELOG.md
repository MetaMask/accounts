# Changelog

## [1.0.0]

### Added

- Initial release of `@metamask/speculos`
- `Speculos` class for emulator lifecycle management (start/stop)
- `SpeculosClient` for TCP APDU and REST API communication
- `ApduBridge` WebSocket HID relay for browser-based E2E testing
- `DockerManager` for Docker-based Speculos lifecycle
- `ProcessManager` for native binary lifecycle
- `DeviceInteraction` handlers for button (Nano) and touch (Stax/Flex) devices
- `getWebHidMockScript()` for browser-side WebHID mocking
- Bundled ELF app binaries for nanosp, nanox, stax, flex
- Bundled NVRAM with blind signing pre-enabled
- Docker Compose file with pinned `ghcr.io/ledgerhq/speculos:1.7.1`
