import type { TrezorModel } from './model-profiles';

/** Canonical SLIP-14 test mnemonic (matches trezor-connect's own test preset). */
export const TREZOR_EMULATOR_SEED =
  'all all all all all all all all all all all all';

/** Default model: Trezor Model T / Safe 3 (touchscreen, flagship). */
export const TREZOR_DEFAULT_MODEL: TrezorModel = 'T2T1';

/** connectSrc override: URL of the locally-served connect-web iframe assets.
 * Injected via window.__TREZOR_CONNECT_SRC (see html-injector.ts). */
export const TREZOR_CONNECT_SRC = 'http://localhost:8088/';

/** @trezor/transport-bridge HTTP port (default). The iframe's BridgeTransport hits this. */
export const TREZOR_TRANSPORT_BRIDGE_PORT = 21328;

/** trezor-user-env WebSocket controller port. */
export const TREZOR_CONTROLLER_PORT = 9001;

/** Emulator UDP debug-link port (informational; transport-bridge talks to this). */
export const TREZOR_EMULATOR_PORT = 21324;

/** Trezor protobuf message type IDs used for signing detection. */
export const TREZOR_MSG = {
  EthereumSignTx: 58,
  EthereumSignMessage: 60,
  EthereumSignTypedData: 495,
} as const;

/** Models supported by trezor-user-env. (Type re-exported for convenience.) */
export type { TrezorModel };
