export { QrEmulator, type QrEmulatorOptions } from './emulator';
export type {
  QrKeyringBridge,
  QrScanRequest,
  QrSignatureRequest,
} from './emulator';
export { QrScanRequestType } from './emulator';
export type {
  QrPairMode,
  SerializedUR,
  SynthesizeOptions,
} from './core/ur-synth';
export {
  synthesizeAccountUR,
  buildCryptoAccountUR,
  buildCryptoHDKeyUR,
  deriveAccountAddress,
  deriveKey,
  getMasterKey,
  CRYPTO_ACCOUNT_TYPE,
  CRYPTO_HDKEY_TYPE,
} from './core/ur-synth';
export {
  signRequest,
  decodeSignRequest,
  derivePrivateKey,
} from './core/signer';
export type { SignerOptions } from './core/signer';
export {
  parseXfp,
  pathToComponents,
  createKeypath,
  createCryptoHDKey,
  createCryptoOutput,
  createCryptoAccount,
} from './core/registry';
export {
  encodeToFragments,
  createEncoder,
  toRegistryUR,
} from './codec/encoder';
export { FragmentDecoder, decodeFragments } from './codec/decoder';
export { renderQrPng } from './render/png';
export {
  renderUrToY4m,
  ensureFfmpegAvailable,
  isFfmpegAvailable,
  FfmpegUnavailableError,
  type Y4mRenderOptions,
} from './render/y4m';
export {
  decodeQrImage,
  decodeQrScreenshots,
  decodePngToRgb,
} from './decode/screenshots';
export {
  QR_EMULATOR_SEED,
  QR_EMULATOR_ROOT_DERIVATION_PATH,
  QR_EMULATOR_ACCOUNT_PATH,
  QR_EMULATOR_CHILDREN_PATH,
  QR_EMULATOR_ACCOUNT_DERIVATION_PATH,
  QR_EMULATOR_FIRST_ADDRESS_PATH,
  QR_EMULATOR_DEFAULT_XFP,
  QR_EMULATOR_ADDRESS,
  QR_FRAGMENT_SIZE,
  QR_REFRESH_MS,
  QR_CODE_SIZE_PX,
  QR_UPPERCASE,
  deriveAddressFromSeed,
} from './constants';
