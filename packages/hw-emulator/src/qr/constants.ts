/* eslint-disable no-restricted-globals -- Buffer is required for public-key-to-address derivation. */

import { publicToAddress } from '@ethereumjs/util';
import { mnemonicToSeedSync } from '@metamask/bip39';
import { add0x, getChecksumAddress } from '@metamask/utils';
import type { Hex } from '@metamask/utils';
import HdKey from 'hdkey';

/**
 * Canonical BIP-39 12-word test vector. Default seed for the QR emulator;
 * override per-instance via the factory `seed` option.
 */
export const QR_EMULATOR_SEED =
  'test test test test test test test test test test test junk';

/**
 * Root derivation path. Matches the Keystone legacy live-chain path.
 */
export const QR_EMULATOR_ROOT_DERIVATION_PATH = "m/44'/60'";

/**
 * Account-level hardened path component appended to the root path.
 */
export const QR_EMULATOR_ACCOUNT_PATH = "0'";

/**
 * Children path within the account. Matches the QR keyring's
 * `DEFAULT_CHILDREN_PATH` (`0/*`).
 */
export const QR_EMULATOR_CHILDREN_PATH = '0/*';

/**
 * Full account-level derivation path (`m/44'/60'/0'`). The emulator derives an
 * extended public key (xpub) at this path and then derives child addresses from
 * it with the children path.
 */
export const QR_EMULATOR_ACCOUNT_DERIVATION_PATH = `${QR_EMULATOR_ROOT_DERIVATION_PATH}/${QR_EMULATOR_ACCOUNT_PATH}`;

/**
 * Device fingerprint (4-byte hex, `0x`-prefixed). Stable per default seed and
 * independent of the BIP-32 master fingerprint by design, mirroring the way the
 * QR keyring treats the fingerprint as an opaque device identifier.
 */
export const QR_EMULATOR_DEFAULT_XFP = '0xdeadbeef';

/**
 * Full address derivation path for the first account
 * (`m/44'/60'/0'/0/0`).
 */
export const QR_EMULATOR_FIRST_ADDRESS_PATH = `${QR_EMULATOR_ACCOUNT_DERIVATION_PATH}/0/0`;

/**
 * Internal helper: derive the checksum address at a given derivation path from
 * a mnemonic seed. Uses the compressed public key, matching the way the QR
 * keyring computes addresses from a `CryptoHDKey` public key.
 *
 * @param seed - The BIP-39 mnemonic seed.
 * @param path - The full derivation path (e.g. `m/44'/60'/0'/0/0`).
 * @returns The EIP-55 checksum address.
 */
export function deriveAddressFromSeed(seed: string, path: string): Hex {
  const master = HdKey.fromMasterSeed(mnemonicToSeedSync(seed));
  const child = master.derive(path);
  const address = Buffer.from(publicToAddress(child.publicKey, true)).toString(
    'hex',
  );
  return getChecksumAddress(add0x(address));
}

/**
 * First derived address (`m/44'/60'/0'/0/0`) for the default seed. Equivalent
 * to `SPECULOS_LEDGER_ADDRESS` for the Ledger emulator — assertable in tests
 * and stable across instances.
 */
export const QR_EMULATOR_ADDRESS: Hex = deriveAddressFromSeed(
  QR_EMULATOR_SEED,
  QR_EMULATOR_FIRST_ADDRESS_PATH,
);

// ── Codec / rendering constants (mirror MetaMask's `player.js` exactly) ──────

/**
 * Bytes per BC-UR fountain fragment. Matches `QR_FRAGMENT_SIZE` in MetaMask's
 * `qr-hardware-sign-request/player.js`.
 */
export const QR_FRAGMENT_SIZE = 200;

/**
 * QR refresh interval in milliseconds (5 fps). Matches `QR_REFRESH_RATE` in
 * MetaMask's `player.js`.
 */
export const QR_REFRESH_MS = 200;

/**
 * Rendered QR code edge length in pixels. Matches `QR_CODE_SIZE` in MetaMask's
 * `player.js`.
 */
export const QR_CODE_SIZE_PX = 225;

/**
 * Target edge length (pixels) for QR PNGs rendered into Y4M video files for
 * Chrome's `--use-file-for-fake-video-capture` fake camera.
 *
 * Larger than {@link QR_CODE_SIZE_PX} (which matches MM's in-DOM QRCodeSVG size)
 * because Chrome's fake camera + zxing browser decoder needs more pixels per
 * module for reliable fountain-decode of multi-account URs. At 225px a 5-account
 * `crypto-account` (81 modules + 8 quiet zone) gets only ~2px/module — below
 * zxing's decode threshold. At 648px it gets ~7px/module, validated end-to-end
 * by the Phase-0 spike and Lane 4 sign-flow specs. See spec §12.1 (R1).
 */
export const QR_Y4M_RENDER_SIZE_PX = 648;

/**
 * Whether fragment strings are uppercased before QR encoding. Matches
 * MetaMask's `player.js` (`currentQRCode.toUpperCase()`).
 */
export const QR_UPPERCASE = true;
