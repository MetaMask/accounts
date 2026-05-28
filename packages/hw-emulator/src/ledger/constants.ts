export type DeviceConfig = {
  id: string;
  apduPort: number;
  apiPort: number;
  wsBridgePort: number;
};

export const DEFAULT_DEVICE: DeviceConfig = {
  id: 'default',
  apduPort: 9998,
  apiPort: 5001,
  wsBridgePort: 9876,
};

export const DEVICE_PRESETS: DeviceConfig[] = [
  DEFAULT_DEVICE,
  {
    id: 'second',
    apduPort: 9997,
    apiPort: 5002,
    wsBridgePort: 9875,
  },
];

export const SPECULOS_APDU_PORT = DEFAULT_DEVICE.apduPort;
export const SPECULOS_API_PORT = DEFAULT_DEVICE.apiPort;
export const SPECULOS_WS_BRIDGE_PORT = DEFAULT_DEVICE.wsBridgePort;

export const SPECULOS_LEDGER_ADDRESSES = [
  '0x24fC293546A31F5Ce73bAfecE37969A95CCd1aBf',
  '0x730A5c73bC3ACcf56daba2D5D897bEb10F852865',
  '0x805c2797CCBa57887F5fA0DD95C017145d67604a',
  '0x2Bf9972F600D8C3B3f0AEe8f1e17Fc4631242fF4',
  '0xDc660e6D52F6f774d0879f99929711155Bc03902',
] as const;

export const SPECULOS_LEDGER_ADDRESS = SPECULOS_LEDGER_ADDRESSES[0];

export const SPECULOS_SEED =
  'urban secret spare tunnel rubber rally ladder spatial feature elite success';

export type InteractionType = 'button' | 'touch';

export type DeviceModel = {
  id: string;
  name: string;
  speculosModel: string;
  interactionType: InteractionType;
  elfFile: string;
  screenSize: { width: number; height: number };
  confirmButton?: { x: number; y: number };
  rejectButton?: { x: number; y: number };
  backButton?: { x: number; y: number };
  reviewConfirmButton?: { x: number; y: number };
  reviewRejectButton?: { x: number; y: number };
  homeButton?: { x: number; y: number };
};

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
export const DEFAULT_DEVICE_MODEL: DeviceModel = FLEX_MODEL;

export function getDeviceModel(id = 'flex'): DeviceModel {
  const model = DEVICE_MODELS[id];
  if (!model) {
    throw new Error(
      `Unknown device model "${id}". Valid: ${Object.keys(DEVICE_MODELS).join(', ')}`,
    );
  }
  return model;
}

export type RunMode = 'native' | 'docker';

export function detectRunMode(): RunMode {
  // eslint-disable-next-line no-restricted-globals
  return process.platform === 'linux' ? 'native' : 'docker';
}

export const SPECULOS_VERSION = '1.7.1';

export const RELEASE_BASE_URL = `https://github.com/MetaMask/speculos-up/releases/download/v${SPECULOS_VERSION}`;

export type PlatformArch = {
  platform: string;
  arch: string;
  filename: string;
  checksum: string;
};

export const PLATFORMS: PlatformArch[] = [
  {
    platform: 'linux',
    arch: 'x64',
    filename: `speculos-${SPECULOS_VERSION}-linux-amd64.tar.gz`,
    checksum: 'PLACEHOLDER_RUN_BUILD_PIPELINE_FIRST',
  },
  {
    platform: 'linux',
    arch: 'arm64',
    filename: `speculos-${SPECULOS_VERSION}-linux-arm64.tar.gz`,
    checksum: 'PLACEHOLDER_RUN_BUILD_PIPELINE_FIRST',
  },
  {
    platform: 'darwin',
    arch: 'arm64',
    filename: `speculos-${SPECULOS_VERSION}-darwin-arm64.zip`,
    checksum: 'PLACEHOLDER_RUN_BUILD_PIPELINE_FIRST',
  },
];

export const DEFAULT_CACHE_DIR = '.metamask/cache';
