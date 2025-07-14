/* eslint-disable no-restricted-syntax */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import type { AsyncHDKeyInstance } from '@metamask/webview-crypto';
import { HDKey } from 'ethereum-cryptography/hdkey';

export class AsyncHDKey implements AsyncHDKeyInstance {
  private readonly hdKey: HDKey;

  constructor(hdKey: HDKey) {
    this.hdKey = hdKey;
  }

  static async fromMasterSeed(
    ...args: Parameters<typeof HDKey.fromMasterSeed>
  ) {
    const hdKey = HDKey.fromMasterSeed(...args);
    return new AsyncHDKey(hdKey);
  }

  static async fromExtendedKey(
    ...args: Parameters<typeof HDKey.fromExtendedKey>
  ) {
    const hdKey = HDKey.fromExtendedKey(...args);
    return new AsyncHDKey(hdKey);
  }

  static async fromJSON(...args: Parameters<typeof HDKey.fromJSON>) {
    const hdKey = HDKey.fromJSON(...args);
    return new AsyncHDKey(hdKey);
  }

  async derive(path: string) {
    const hdKey = this.hdKey.derive(path);
    return new AsyncHDKey(hdKey);
  }

  async deriveChild(index: number) {
    const hdKey = this.hdKey.deriveChild(index);
    return new AsyncHDKey(hdKey);
  }

  async sign(hash: Uint8Array) {
    return this.hdKey.sign(hash);
  }

  async verify(hash: Uint8Array, signature: Uint8Array) {
    return this.hdKey.verify(hash, signature);
  }

  async wipePrivateData() {
    const hdKey = this.hdKey.wipePrivateData();
    return new AsyncHDKey(hdKey);
  }

  async toJSON() {
    return this.hdKey.toJSON();
  }

  async getFingerprint() {
    return this.hdKey.fingerprint;
  }

  async getIdentifier() {
    return this.hdKey.identifier;
  }

  async getPubKeyHash() {
    return this.hdKey.pubKeyHash;
  }

  async getPrivateKey() {
    return this.hdKey.privateKey;
  }

  async getPublicKey() {
    return this.hdKey.publicKey;
  }

  async getPrivateExtendedKey() {
    return this.hdKey.privateExtendedKey;
  }

  async getPublicExtendedKey() {
    return this.hdKey.publicExtendedKey;
  }

  async getVersions() {
    return this.hdKey.versions;
  }

  async getDepth() {
    return this.hdKey.depth;
  }

  async getIndex() {
    return this.hdKey.index;
  }

  async getChainCode() {
    return this.hdKey.chainCode;
  }

  async getParentFingerprint() {
    return this.hdKey.parentFingerprint;
  }
}
