import type { DeviceInteraction, HardwareWalletEmulator } from '../types';
import { decodeFragments } from './codec/decoder';
import { encodeToFragments } from './codec/encoder';
import {
  QR_EMULATOR_ACCOUNT_DERIVATION_PATH,
  QR_EMULATOR_CHILDREN_PATH,
  QR_EMULATOR_DEFAULT_XFP,
  QR_EMULATOR_SEED,
} from './constants';
import { signRequest } from './core/signer';
import {
  CRYPTO_ACCOUNT_TYPE,
  CRYPTO_HDKEY_TYPE,
  DEFAULT_DESCRIPTOR_COUNT,
  synthesizeAccountUR,
} from './core/ur-synth';
import type {
  QrPairMode,
  SerializedUR,
  SynthesizeOptions,
} from './core/ur-synth';
import { decodeQrImage, decodeQrScreenshots } from './decode/screenshots';
import { renderQrPng } from './render/png';
import { renderUrToY4m } from './render/y4m';

/**
 * Scan-request type discriminator. Mirrors `QrScanRequestType` from
 * `@metamask/eth-qr-keyring` (values `'pair'` and `'sign'`) so this package has
 * no runtime dependency on the keyring package.
 */
export const QrScanRequestType = {
  Pair: 'pair',
  Sign: 'sign',
} as const;

/**
 * A signature scan request payload (the animated sign-request QR decoded back
 * to a SerializedUR).
 */
export type QrSignatureRequest = {
  requestId: string;
  payload: SerializedUR;
  requestTitle?: string;
  requestDescription?: string;
};

/**
 * A scan request — either a pairing request or a signature request.
 * Structurally compatible with `QrScanRequest` from `@metamask/eth-qr-keyring`.
 */
export type QrScanRequest = {
  type: (typeof QrScanRequestType)[keyof typeof QrScanRequestType];
  request?: QrSignatureRequest;
};

/**
 * Bridge contract the QR keyring calls into. Structurally compatible with
 * `QrKeyringBridge` from `@metamask/eth-qr-keyring`.
 */
export type QrKeyringBridge = {
  requestScan: (request: QrScanRequest) => Promise<SerializedUR>;
};

/**
 * Options for constructing a {@link QrEmulator} via the factory.
 */
export type QrEmulatorOptions = {
  /** BIP-39 mnemonic seed (defaults to {@link QR_EMULATOR_SEED}). */
  seed?: string;
  /** Human-readable device name (defaults to `'Keystone Test'`). */
  deviceName?: string;
  /** Device fingerprint, hex (defaults to {@link QR_EMULATOR_DEFAULT_XFP}). */
  xfp?: string;
  /** Full account derivation path (defaults to `m/44'/60'/0'`). */
  derivationPath?: string;
  /** Children path within the account (defaults to `0/*`). */
  childrenPath?: string;
  /** Pairing mode (defaults to `'crypto-account'`). */
  pairMode?: QrPairMode;
  /** Number of address descriptors in `crypto-account` mode (defaults to 5). */
  descriptorCount?: number;
};

const DEFAULT_DEVICE_NAME = 'Keystone Test';

/**
 * QR hardware wallet emulator.
 *
 * Holds a deterministic seed, derives accounts, produces BC-UR-encoded pairing
 * URs the way a Keystone-class device would, and signs transactions and
 * messages with real ECDSA. Implements both {@link HardwareWalletEmulator}
 * (interface symmetry with the Ledger Speculos emulator) and
 * {@link QrKeyringBridge} (so it can be wired directly into a real
 * `QrKeyring` in Jest tests).
 */
export class QrEmulator implements HardwareWalletEmulator, QrKeyringBridge {
  readonly #options: Required<QrEmulatorOptions>;

  #running = false;

  #rejectNext = false;

  /**
   * @param options - Configuration options (all optional; sensible defaults).
   */
  constructor(options: QrEmulatorOptions = {}) {
    this.#options = {
      seed: options.seed ?? QR_EMULATOR_SEED,
      deviceName: options.deviceName ?? DEFAULT_DEVICE_NAME,
      xfp: options.xfp ?? QR_EMULATOR_DEFAULT_XFP,
      derivationPath:
        options.derivationPath ?? QR_EMULATOR_ACCOUNT_DERIVATION_PATH,
      childrenPath: options.childrenPath ?? QR_EMULATOR_CHILDREN_PATH,
      pairMode: options.pairMode ?? 'crypto-account',
      descriptorCount: options.descriptorCount ?? DEFAULT_DESCRIPTOR_COUNT,
    };
  }

  /**
   * Resolved seed.
   *
   * @returns The mnemonic seed string.
   */
  get seed(): string {
    return this.#options.seed;
  }

  /**
   * Resolved pairing mode.
   *
   * @returns The pair mode (`crypto-account` or `crypto-hdkey`).
   */
  get pairMode(): QrPairMode {
    return this.#options.pairMode;
  }

  /**
   * Build the synthesize options for the UR synth helpers.
   *
   * @returns The resolved SynthesizeOptions.
   */
  #synthOptions(): SynthesizeOptions {
    return {
      seed: this.#options.seed,
      accountPath: this.#options.derivationPath,
      childrenPath: this.#options.childrenPath,
      xfp: this.#options.xfp,
      deviceName: this.#options.deviceName,
      pairMode: this.#options.pairMode,
      descriptorCount: this.#options.descriptorCount,
    };
  }

  // ── HardwareWalletEmulator ──────────────────────────────────────────────

  /**
   * Start the emulator. No-op for the QR emulator (pure TypeScript, no process
   * to spawn).
   */
  async start(): Promise<void> {
    this.#running = true;
  }

  /**
   * Stop the emulator and release any held resources. No-op beyond flipping the
   * running flag (ffmpeg child handles are scoped per-render).
   */
  async stop(): Promise<void> {
    this.#running = false;
  }

  /**
   * Whether the emulator is currently running.
   *
   * @returns `true` if the emulator has been started and not stopped.
   */
  isRunning(): boolean {
    return this.#running;
  }

  /**
   * Get the device interaction handler. For the QR emulator the interaction is
   * a thin shim that toggles the internal reject flag consumed by the next sign
   * request.
   *
   * @returns The device interaction.
   */
  getInteraction(): DeviceInteraction {
    return {
      approveTransaction: async (): Promise<void> => {
        this.#rejectNext = false;
      },
      approveSigning: async (): Promise<void> => {
        this.#rejectNext = false;
      },
      rejectTransaction: async (): Promise<void> => {
        this.#rejectNext = true;
      },
      navigateToMainMenu: async (): Promise<void> => {
        // No device screen to navigate; intentional no-op.
      },
    };
  }

  /**
   * Pre-approve the next incoming sign request. Clears any armed rejection so
   * the next `handleSignRequest` call proceeds.
   *
   * @returns Resolves once approval is armed.
   */
  async approveTransaction(): Promise<void> {
    this.#rejectNext = false;
  }

  /**
   * Pre-approve the next incoming sign request (semantic alias for
   * {@link approveTransaction}).
   */
  async approveSigning(): Promise<void> {
    await this.approveTransaction();
  }

  /**
   * Pre-reject the next incoming sign request. The flag is consumed by the
   * next `handleSignRequest` call, which will throw.
   *
   * @returns Resolves once rejection is armed.
   */
  async rejectTransaction(): Promise<void> {
    this.#rejectNext = true;
  }

  /**
   * Navigate to the main menu. No-op for the QR emulator (no device screen).
   */
  async navigateToMainMenu(): Promise<void> {
    // Intentional no-op.
  }

  // ── QrKeyringBridge ─────────────────────────────────────────────────────

  /**
   * Handle a scan request from the QR keyring, routing by type.
   *
   * @param req - The scan request (pair or sign).
   * @returns The resulting SerializedUR.
   */
  async requestScan(req: QrScanRequest): Promise<SerializedUR> {
    switch (req.type) {
      case QrScanRequestType.Pair:
        return this.getAccountUR();
      case QrScanRequestType.Sign:
        if (!req.request) {
          throw new Error('Sign request missing payload');
        }
        return this.handleSignRequest(req.request.payload);
      default:
        throw new Error(`Unknown scan request type: ${String(req.type)}`);
    }
  }

  // ── UR production ───────────────────────────────────────────────────────

  /**
   * Produce the pairing SerializedUR (for the PAIR flow). Routes by pair mode.
   *
   * @returns The pairing SerializedUR (`crypto-account` or `crypto-hdkey`).
   */
  getAccountUR(): SerializedUR {
    return synthesizeAccountUR(this.#synthOptions());
  }

  /**
   * Handle an incoming sign-request SerializedUR (for the SIGN flow). Produces
   * a real ECDSA signature from the derived key.
   *
   * If a rejection was armed via {@link rejectTransaction}, the next call
   * throws and the rejection flag is cleared. By default (and after an explicit
   * {@link approveTransaction}) signing is permitted.
   *
   * @param ur - The `eth-sign-request` SerializedUR.
   * @returns The `eth-signature` SerializedUR.
   * @throws If a rejection is armed.
   */
  async handleSignRequest(ur: SerializedUR): Promise<SerializedUR> {
    if (this.#rejectNext) {
      this.#rejectNext = false;
      throw new Error('Sign request rejected by emulator');
    }
    return signRequest(ur, { seed: this.#options.seed });
  }

  // ── QR rendering (test driver) ──────────────────────────────────────────

  /**
   * Render a SerializedUR to an animated Y4M file via ffmpeg (for the Chrome
   * fake-camera transport).
   *
   * @param ur - The SerializedUR to animate.
   * @param opts - Render options (`outputPath` required).
   * @param opts.fps - Frames per second (optional, forwarded to ffmpeg).
   * @param opts.durationS - Total duration in seconds (optional).
   * @param opts.outputPath - Destination `.y4m` file path.
   * @param opts.size - Target square edge length in pixels (optional, defaults to `QR_Y4M_RENDER_SIZE_PX`).
   * @returns The output path.
   */
  async renderToY4m(
    ur: SerializedUR,
    opts: { fps?: number; durationS?: number; size?: number; outputPath: string },
  ): Promise<string> {
    return renderUrToY4m(ur, opts);
  }

  /**
   * Render a (small) SerializedUR as a single-frame QR PNG. Suitable for URs
   * that fit in one BC-UR fragment.
   *
   * @param ur - The SerializedUR to render.
   * @returns A PNG Buffer.
   */
  async renderToPng(ur: SerializedUR): Promise<Buffer> {
    const fragments = encodeToFragments(ur);
    const fragment = fragments[0] ?? '';
    return renderQrPng(fragment);
  }

  // ── QR decoding (test driver) ───────────────────────────────────────────

  /**
   * Decode a sequence of QR-code PNG screenshots into the original SerializedUR
   * (fragments may arrive in any order).
   *
   * @param pathsOrBuffers - PNG file paths or buffers.
   * @returns The reconstructed SerializedUR.
   */
  async decodeQrScreenshots(
    pathsOrBuffers: (string | Buffer)[],
  ): Promise<SerializedUR> {
    return decodeQrScreenshots(pathsOrBuffers);
  }

  /**
   * Decode a single QR PNG buffer into its fragment string.
   *
   * @param png - A PNG buffer.
   * @returns The fragment string, or `null` if no QR was found.
   */
  async decodeQrImage(png: Buffer): Promise<string | null> {
    return decodeQrImage(png);
  }

  // ── Convenience ─────────────────────────────────────────────────────────

  /**
   * Return this emulator typed as a {@link QrKeyringBridge}, for wiring
   * directly into a real `QrKeyring` in Jest unit/integration tests.
   *
   * @returns This instance as a QrKeyringBridge.
   */
  asBridge(): QrKeyringBridge {
    return this;
  }

  /**
   * Reconstruct a SerializedUR from a list of fragments. Exposed as a
   * convenience for tests that capture fragments directly.
   *
   * @param fragments - BC-UR fragment strings.
   * @returns The reconstructed SerializedUR.
   */
  decodeFragments(fragments: string[]): SerializedUR {
    return decodeFragments(fragments);
  }
}

export { CRYPTO_ACCOUNT_TYPE, CRYPTO_HDKEY_TYPE };
