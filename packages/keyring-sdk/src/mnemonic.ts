import { wordlist } from '@metamask/scure-bip39/dist/wordlists/english';

/**
 * Encodes a mnemonic as a string of words.
 *
 * @param mnemonicIndicesBytes - An array of bytes (16-bit unsigned integers) representing the indices of the words in the mnemonic.
 * @returns A string representing the mnemonic.
 */
export function encodeMnemonicWords(mnemonicIndicesBytes: Uint8Array): string {
  const mnemonicIndices = Array.from(
    // Create a new `Uint8Array` to ensure we have a proper view on the buffer
    // without having to worry about `byteOffset` and `byteLength` of
    // the inner buffer.
    new Uint16Array(new Uint8Array(mnemonicIndicesBytes).buffer),
  );
  return mnemonicIndices.map((i) => wordlist[i]).join(' ');
}

/**
 * Encodes a mnemonic as an array of bytes (UTF-8).
 *
 * @param mnemonicIndicesBytes - An array of bytes (16-bit unsigned integers) representing the indices of the words in the mnemonic.
 * @returns An array of bytes (UTF-8) representing the mnemonic.
 */
export function encodeMnemonic(mnemonicIndicesBytes: Uint8Array): number[] {
  return Array.from(new TextEncoder().encode(encodeMnemonicWords(mnemonicIndicesBytes)));
}
