/**
 * Port and connection configuration for a Speculos device instance.
 */
export type DeviceConfig = {
  /** Unique identifier for this device configuration. */
  id: string;
  /** TCP port for the APDU protocol. */
  apduPort: number;
  /** TCP port for the REST API. */
  apiPort: number;
  /** TCP port for the WebSocket bridge. */
  wsBridgePort: number;
};

/** Default device configuration with standard ports. */
export const DEFAULT_DEVICE: DeviceConfig = {
  id: 'default',
  apduPort: 9998,
  apiPort: 5001,
  wsBridgePort: 9876,
};

/** Pre-configured device presets supporting multiple concurrent emulator instances. */
export const DEVICE_PRESETS: DeviceConfig[] = [
  DEFAULT_DEVICE,
  {
    id: 'second',
    apduPort: 9997,
    apiPort: 5002,
    wsBridgePort: 9875,
  },
];

/** Default APDU port, derived from the default device configuration. */
export const SPECULOS_APDU_PORT = DEFAULT_DEVICE.apduPort;
/** Default REST API port, derived from the default device configuration. */
export const SPECULOS_API_PORT = DEFAULT_DEVICE.apiPort;
/** Default WebSocket bridge port, derived from the default device configuration. */
export const SPECULOS_WS_BRIDGE_PORT = DEFAULT_DEVICE.wsBridgePort;

/** Ethereum addresses derived from the default Speculos seed. */
export const SPECULOS_LEDGER_ADDRESSES = [
  '0xb0358b8F2314F6f6a392a4be8C7C422e631d9F63',
  '0xE004F1e6F8bB51106fD488550f7e6e6f54430018',
  '0xd957f2200aEDA0Ac1604d29F6C823bD113A13780',
  '0x797b3EF4B1807c30F6831381dE79be50217B53a5',
  '0x335Fcb7dd8d2190c9698026Df2dBa62A990371F4',
] as const;

/** Primary Ledger address derived from the default Speculos seed. */
export const SPECULOS_LEDGER_ADDRESS = SPECULOS_LEDGER_ADDRESSES[0];

/** BIP-39 mnemonic seed used by default in the Speculos emulator. */
export const SPECULOS_SEED =
  'grit essence story volume tip entry situate found february olympic monitor hybrid';

/** Interaction method used by the device — button-based or touch-based. */
export type InteractionType = 'button' | 'touch';

/**
 * Describes a Ledger device model with its Speculos configuration, screen size,
 * and touch button coordinates (for touch-based devices).
 */
export type DeviceModel = {
  /** Unique model identifier (e.g. 'nanosp', 'stax'). */
  id: string;
  /** Human-readable model name. */
  name: string;
  /** Model identifier passed to the Speculos binary. */
  speculosModel: string;
  /** Whether the device uses button or touch interaction. */
  interactionType: InteractionType;
  /** Filename of the Ethereum app ELF binary. */
  elfFile: string;
  /** Screen dimensions in pixels. */
  screenSize: { width: number; height: number };
  /** Touch coordinate for the generic confirm button. */
  confirmButton?: { x: number; y: number };
  /** Touch coordinate for the generic reject button. */
  rejectButton?: { x: number; y: number };
  /** Touch coordinate for the back button. */
  backButton?: { x: number; y: number };
  /** Touch coordinate for the confirm button during transaction review. */
  reviewConfirmButton?: { x: number; y: number };
  /** Touch coordinate for the reject button during transaction review. */
  reviewRejectButton?: { x: number; y: number };
  /** Touch coordinate for the home button. */
  homeButton?: { x: number; y: number };
};

/** Registry of all supported Ledger device models. */
export const DEVICE_MODELS: Record<string, DeviceModel> = {
  nanosp: {
    id: 'nanosp',
    name: 'Nano S+',
    speculosModel: 'nanosp',
    interactionType: 'button',
    elfFile: 'ethereum-nanosp.elf',
    screenSize: { width: 128, height: 64 },
  },
  nanox: {
    id: 'nanox',
    name: 'Nano X',
    speculosModel: 'nanox',
    interactionType: 'button',
    elfFile: 'ethereum-nanox.elf',
    screenSize: { width: 128, height: 64 },
  },
  stax: {
    id: 'stax',
    name: 'Stax',
    speculosModel: 'stax',
    interactionType: 'touch',
    elfFile: 'ethereum-stax.elf',
    screenSize: { width: 400, height: 672 },
    backButton: { x: 36, y: 36 },
    confirmButton: { x: 200, y: 606 },
    rejectButton: { x: 36, y: 606 },
    reviewConfirmButton: { x: 200, y: 515 },
    reviewRejectButton: { x: 36, y: 606 },
    homeButton: { x: 200, y: 606 },
  },
  flex: {
    id: 'flex',
    name: 'Flex',
    speculosModel: 'flex',
    interactionType: 'touch',
    elfFile: 'ethereum-flex.elf',
    screenSize: { width: 480, height: 600 },
    backButton: { x: 45, y: 45 },
    confirmButton: { x: 240, y: 550 },
    rejectButton: { x: 55, y: 530 },
    reviewConfirmButton: { x: 240, y: 435 },
    reviewRejectButton: { x: 55, y: 530 },
    homeButton: { x: 240, y: 550 },
  },
};

const FLEX_MODEL = DEVICE_MODELS.flex;
if (!FLEX_MODEL) {
  throw new Error('Flex device model not found in DEVICE_MODELS');
}
/** The default device model used when none is specified. */
export const DEFAULT_DEVICE_MODEL: DeviceModel = FLEX_MODEL;

/**
 * Look up a device model by its identifier.
 *
 * @param id - The device model identifier (defaults to 'flex').
 * @returns The matching DeviceModel.
 * @throws If the model identifier is not recognized.
 */
export function getDeviceModel(id = 'flex'): DeviceModel {
  const model = DEVICE_MODELS[id];
  if (!model) {
    throw new Error(
      `Unknown device model "${id}". Valid: ${Object.keys(DEVICE_MODELS).join(', ')}`,
    );
  }
  return model;
}

/** Execution mode for Speculos — native binary or Docker container. */
export type RunMode = 'native' | 'docker';

/**
 * Detect the appropriate Speculos run mode based on the current platform.
 *
 * @returns 'native' on Linux, 'docker' on all other platforms.
 */
export function detectRunMode(): RunMode {
  // eslint-disable-next-line no-restricted-globals
  return process.platform === 'linux' ? 'native' : 'docker';
}
