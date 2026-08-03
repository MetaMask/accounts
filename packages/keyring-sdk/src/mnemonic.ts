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
  return Array.from(
    new TextEncoder().encode(encodeMnemonicWords(mnemonicIndicesBytes)),
  );
}

/**
 * Decodes a string of mnemonic words as an array of bytes (16-bit unsigned
 * integers) representing the indices of the words in the mnemonic.
 *
 * @param mnemonic - A string representing the mnemonic.
 * @returns An array of bytes representing the indices of the words in the mnemonic.
 * @throws If the mnemonic contains a word that is not in the English BIP-39 wordlist.
 */
export function decodeMnemonicWords(mnemonic: string): Uint8Array {
  if (mnemonic === '') {
    return new Uint8Array();
  }

  const mnemonicIndices = mnemonic.split(' ').map((word) => {
    const index = wordlist.indexOf(word);
    if (index === -1) {
      throw new Error(`Invalid mnemonic word: "${word}"`);
    }
    return index;
  });

  return new Uint8Array(new Uint16Array(mnemonicIndices).buffer);
}

/**
 * Decodes an array of bytes (UTF-8) representing a mnemonic as an array of
 * bytes (16-bit unsigned integers) representing the indices of the words in
 * the mnemonic.
 *
 * @param mnemonicBytes - An array of bytes (UTF-8) representing the mnemonic.
 * @returns An array of bytes representing the indices of the words in the mnemonic.
 * @throws If the mnemonic contains a word that is not in the English BIP-39 wordlist.
 */
export function decodeMnemonic(mnemonicBytes: Uint8Array): Uint8Array {
  return decodeMnemonicWords(new TextDecoder().decode(mnemonicBytes));
}
