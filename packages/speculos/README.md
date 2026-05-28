# @metamask/speculos

Speculos Ledger device emulator lifecycle, transport, and device interaction for E2E testing.

## Installation

```bash
yarn add @metamask/speculos
```

For native mode (Linux), also install the binary helper:

```bash
yarn add @metamask/speculos-up
```

## Usage

### Basic Lifecycle

```typescript
import { Speculos } from '@metamask/speculos';

const speculos = new Speculos({
  device: 'flex', // or 'nanosp', 'nanox', 'stax'
  mode: 'docker', // or 'native', auto-detected if omitted
});

await speculos.start();

const client = speculos.getClient();
const interaction = speculos.getInteraction();

// Press buttons or tap the screen
await interaction.approveTransaction();

await speculos.stop();
```

### WebSocket HID Bridge (Browser E2E)

```typescript
const bridge = await speculos.startBridge(9876);

// Inject WebHID mock into browser
const mockScript = speculos.getWebHIDMockScript(9876);
await page.evaluate(mockScript);

// Wait for signing APDU and approve
await bridge.waitForSigningApduAndApprove(interaction);
```

### Docker Mode (macOS/Windows)

```typescript
const speculos = new Speculos({ mode: 'docker' });
await speculos.start(); // Uses bundled docker-compose.yml
```

### Native Mode (Linux)

```typescript
const speculos = new Speculos({ mode: 'native' });
await speculos.start(); // Uses @metamask/speculos-up binary
```

## Device Models

| Model    | ID      | Interaction Type |
|----------|---------|------------------|
| Nano S+  | nanosp  | Button           |
| Nano X   | nanox   | Button           |
| Stax     | stax    | Touch            |
| Flex     | flex    | Touch            |

## Configuration

| Option         | Type              | Default   | Description                        |
|----------------|-------------------|-----------|------------------------------------|
| `device`       | `string`/DeviceModel | `'flex'`  | Device model to emulate            |
| `seed`         | `string`          | Built-in  | Mnemonic seed for key derivation   |
| `mode`         | `'native'`/`'docker'` | Auto     | Run mode (native on Linux)         |
| `apduPort`     | `number`          | `9998`    | APDU TCP port                      |
| `apiPort`      | `number`          | `5001`    | REST API port                      |
| `wsBridgePort` | `number`          | `9876`    | WebSocket bridge port              |
| `binary`       | `string`          | Auto      | Path to native Speculos binary     |
| `display`      | `string`          | `'headless'` | Display mode                    |
| `loadNvram`    | `boolean`         | `true`    | Load NVRAM with blind signing on   |
