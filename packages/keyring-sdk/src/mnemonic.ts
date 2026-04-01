import { wordlist } from '@metamask/scure-bip39/dist/wordlists/english';

/**
 * Encodes a mnemonic as an array of bytes (UTF-8).
 *
 * @param mnemonicIndicesBytes - An array of bytes (16-bit unsigned integers) representing the indices of the words in the mnemonic.
 * @returns An array of bytes (UTF-8) representing the mnemonic.
 */
export function encodeMnemonic(mnemonicIndicesBytes: Uint8Array): number[] {
  const mnemonicIndices = Array.from(
    new Uint16Array(mnemonicIndicesBytes.buffer),
  );
  const mnemonic = mnemonicIndices.map((i) => wordlist[i]).join(' ');
  return Array.from(new TextEncoder().encode(mnemonic));
}
