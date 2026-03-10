import {
  type DeviceActionState,
  DeviceActionStatus,
  type ExecuteDeviceActionReturnType,
} from '@ledgerhq/device-management-kit';
import {
  DefaultDescriptorTemplate,
  DefaultWallet,
  type SignerBtc,
} from '@ledgerhq/device-signer-kit-bitcoin';

import type {
  BitcoinSigner,
  GetAddressResponse,
  GetXpubResponse,
  SignMessageArguments,
  SignMessageResponse,
  SignPsbtArguments,
  SignPsbtResponse,
} from './bitcoin-signer';
import type { Bip32PathNode } from '../entropy/entropy';

/**
 * Subscribes to a Ledger device action observable and returns a promise that resolves
 * with the output on completion or rejects on error.
 *
 * @param action - The device action return value containing an observable.
 * @returns The device action output.
 */
async function resolveDeviceAction<Output, ActionError, Intermediate>(
  action: ExecuteDeviceActionReturnType<Output, ActionError, Intermediate>,
): Promise<Output> {
  return new Promise((resolve, reject) => {
    action.observable.subscribe({
      next(state: DeviceActionState<Output, ActionError, Intermediate>) {
        if (state.status === DeviceActionStatus.Completed) {
          resolve(state.output);
        } else if (state.status === DeviceActionStatus.Error) {
          const reason = state.error;
          reject(reason instanceof Error ? reason : new Error(String(reason)));
        }
      },
    });
  });
}

/**
 * Converts an Uint8Array to a hex string.
 *
 * @param bytes - The bytes to convert.
 * @returns The hex-encoded string.
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
}

/**
 * Converts a hex string (with or without 0x prefix) to a Uint8Array.
 *
 * @param value - The hex string to convert.
 * @returns The decoded bytes.
 */
function hexToBytes(value: string): Uint8Array {
  const stripped = value.startsWith('0x') ? value.slice(2) : value;
  const bytes = new Uint8Array(stripped.length / 2);
  for (let index = 0; index < bytes.length; index++) {
    bytes[index] = parseInt(stripped.substring(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Encodes a Ledger message signature as a base64 Bitcoin compact signature
 * (65 bytes: recovery_flag || r || s).
 *
 * Uses compressed key recovery flag (v + 31) per BIP-137.
 *
 * @param ledgerSignature - The Ledger signature.
 * @param ledgerSignature.r - The r component (hex-encoded).
 * @param ledgerSignature.s - The s component (hex-encoded).
 * @param ledgerSignature.v - The recovery parameter.
 * @returns The base64-encoded compact signature.
 */
function encodeMessageSignature(ledgerSignature: {
  r: string;
  s: string;
  v: number;
}): string {
  const rBytes = hexToBytes(ledgerSignature.r);
  const sBytes = hexToBytes(ledgerSignature.s);
  // BIP-137: compressed key recovery flag = v + 31
  const recoveryFlag = ledgerSignature.v + 31;

  const compact = new Uint8Array(65);
  compact[0] = recoveryFlag;
  compact.set(rBytes, 1);
  compact.set(sBytes, 33);

  return btoa(String.fromCharCode(...compact));
}

const purposeToDescriptor: Record<string, DefaultDescriptorTemplate> = {
  "44'": DefaultDescriptorTemplate.LEGACY,
  "49'": DefaultDescriptorTemplate.NESTED_SEGWIT,
  "84'": DefaultDescriptorTemplate.NATIVE_SEGWIT,
  "86'": DefaultDescriptorTemplate.TAPROOT,
};

/**
 * Infers the descriptor template from the BIP purpose in a derivation path.
 *
 * @param derivationPath - The derivation path segments
 * (e.g. `["84'", "0'", "0'", "0", "0"]`).
 * @returns The matching descriptor template.
 */
function inferDescriptorTemplate(
  derivationPath: Bip32PathNode[],
): DefaultDescriptorTemplate {
  const purpose = derivationPath[0];
  const template = purposeToDescriptor[purpose as string];
  if (!template) {
    throw new Error(
      `Unsupported BIP purpose "${purpose}" in path "${derivationPath.join(
        '/',
      )}"`,
    );
  }
  return template;
}

/**
 * Ledger account descriptor.
 */
type LedgerAccountDescriptor = {
  derivationPath: string;
  index: number;
  change: boolean;
};

/**
 * Parses a full BIP-44 derivation path into its account path, change, and
 * index components.
 *
 * @param derivationPath - The derivation path segments
 * (e.g. `["84'", "0'", "0'", "0", "0"]`).
 * @returns The parsed components.
 */
function parseDerivationPath(
  derivationPath: Bip32PathNode[],
): LedgerAccountDescriptor {
  if (derivationPath.length !== 5) {
    throw new Error(
      `Expected a derivation path with exactly 5 segments, got ${derivationPath.length}`,
    );
  }

  const segments = [...derivationPath];
  const indexSegment = segments.pop() as string;
  const changeSegment = segments.pop() as string;
  return {
    derivationPath: segments.join('/'),
    change: changeSegment === '1',
    index: parseInt(indexSegment, 10),
  };
}

/**
 * {@link BitcoinSigner} implementation backed by a Ledger device.
 *
 * The full derivation path (including change and index) is bound at
 * construction time. Each instance corresponds to a single address
 * (e.g. `m/84'/0'/0'/0/0`).
 */
export class LedgerBitcoinSigner implements BitcoinSigner {
  readonly scope = 'bip122';

  readonly #session: SignerBtc;

  readonly #account: LedgerAccountDescriptor;

  readonly #wallet: DefaultWallet;

  /**
   * Creates a new LedgerBitcoinSigner.
   *
   * @param session - The Ledger Bitcoin signer session.
   * @param derivationPath - The full derivation path segments
   * (e.g. `["84'", "0'", "0'", "0", "0"]`).
   */
  constructor(session: SignerBtc, derivationPath: Bip32PathNode[]) {
    this.#session = session;
    this.#account = parseDerivationPath(derivationPath);
    this.#wallet = new DefaultWallet(
      this.#account.derivationPath,
      inferDescriptorTemplate(derivationPath),
    );
  }

  async getXpub(): Promise<GetXpubResponse> {
    const [{ extendedPublicKey }, { masterFingerprint }] = await Promise.all([
      resolveDeviceAction(
        this.#session.getExtendedPublicKey(this.#account.derivationPath),
      ),
      resolveDeviceAction(this.#session.getMasterFingerprint()),
    ]);

    return {
      xpub: extendedPublicKey,
      fingerprint: bytesToHex(masterFingerprint),
    };
  }

  async getAddress(): Promise<GetAddressResponse> {
    const { address } = await resolveDeviceAction(
      this.#session.getWalletAddress(this.#wallet, this.#account.index, {
        change: this.#account.change,
      }),
    );

    return { address };
  }

  async signPsbt(_args: SignPsbtArguments): Promise<SignPsbtResponse> {
    // The Ledger SDK returns individual PsbtSignature[] that need to be merged back
    // into the PSBT binary. This requires a PSBT parsing library or manual binary
    // manipulation.
    throw new Error('Method not implemented.');
  }

  async signMessage(args: SignMessageArguments): Promise<SignMessageResponse> {
    const ledgerSignature = await resolveDeviceAction(
      this.#session.signMessage(this.#account.derivationPath, args.message),
    );

    return {
      signature: encodeMessageSignature(ledgerSignature),
    };
  }
}
