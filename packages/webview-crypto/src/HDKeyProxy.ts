import type { AsyncHDKeyProxy } from './types';
import { WebViewManager } from './WebviewManager';

export type Versions = {
  private: number;
  public: number;
};

export class HDKeyProxy implements AsyncHDKeyProxy {
  readonly #instanceId: string;

  readonly #manager: WebViewManager;

  constructor(instanceId: string) {
    this.#instanceId = instanceId;
    this.#manager = WebViewManager.getInstance();
  }

  // Static methods
  static async fromMasterSeed(
    seed: Uint8Array,
    versions?: Versions,
  ): Promise<HDKeyProxy> {
    const startTime = Date.now();
    // eslint-disable-next-line no-console
    console.log('[HDKeyProxy] Starting fromMasterSeed');

    const manager = WebViewManager.getInstance();
    const result = await manager.sendMessage('fromMasterSeed', {
      seed: Array.from(seed),
      versions,
    });
    const { instanceId } = result as { instanceId: string };

    const duration = Date.now() - startTime;
    // eslint-disable-next-line no-console
    console.log(`[HDKeyProxy] fromMasterSeed completed in ${duration}ms`);

    return new HDKeyProxy(instanceId);
  }

  static async fromExtendedKey(
    base58key: string,
    versions?: Versions,
  ): Promise<HDKeyProxy> {
    const startTime = Date.now();
    // eslint-disable-next-line no-console
    console.log('[HDKeyProxy] Starting fromExtendedKey');

    const manager = WebViewManager.getInstance();
    const result = await manager.sendMessage('fromExtendedKey', {
      base58key,
      versions,
    });
    const { instanceId } = result as { instanceId: string };

    const duration = Date.now() - startTime;
    // eslint-disable-next-line no-console
    console.log(`[HDKeyProxy] fromExtendedKey completed in ${duration}ms`);

    return new HDKeyProxy(instanceId);
  }

  static async fromJSON(json: { xpriv: string }): Promise<HDKeyProxy> {
    const startTime = Date.now();
    // eslint-disable-next-line no-console
    console.log('[HDKeyProxy] Starting fromJSON');

    const manager = WebViewManager.getInstance();
    const result = await manager.sendMessage('fromJSON', { json });
    const { instanceId } = result as { instanceId: string };

    const duration = Date.now() - startTime;
    // eslint-disable-next-line no-console
    console.log(`[HDKeyProxy] fromJSON completed in ${duration}ms`);

    return new HDKeyProxy(instanceId);
  }

  // Instance methods
  async derive(path: string): Promise<HDKeyProxy> {
    const result = await this.#manager.sendMessage(
      'derive',
      { path },
      this.#instanceId,
    );
    const { instanceId } = result as { instanceId: string };
    return new HDKeyProxy(instanceId);
  }

  async deriveChild(index: number): Promise<HDKeyProxy> {
    const result = await this.#manager.sendMessage(
      'deriveChild',
      { index },
      this.#instanceId,
    );
    const { instanceId } = result as { instanceId: string };
    return new HDKeyProxy(instanceId);
  }

  async sign(hash: Uint8Array): Promise<Uint8Array> {
    const result = await this.#manager.sendMessage(
      'sign',
      { hash: Array.from(hash) },
      this.#instanceId,
    );
    const { signature } = result as { signature: number[] };
    return new Uint8Array(signature);
  }

  async verify(hash: Uint8Array, signature: Uint8Array): Promise<boolean> {
    const result = await this.#manager.sendMessage(
      'verify',
      {
        hash: Array.from(hash),
        signature: Array.from(signature),
      },
      this.#instanceId,
    );
    return (result as { isValid: boolean }).isValid;
  }

  async wipePrivateData(): Promise<HDKeyProxy> {
    await this.#manager.sendMessage('wipePrivateData', {}, this.#instanceId);
    return this;
  }

  async toJSON(): Promise<{ xpriv: string; xpub: string }> {
    const result = await this.#manager.sendMessage(
      'toJSON',
      {},
      this.#instanceId,
    );
    return result as { xpriv: string; xpub: string };
  }

  // Property getters as async methods
  async getFingerprint(): Promise<number> {
    const result = await this.#manager.sendMessage(
      'getProperty',
      { property: 'fingerprint' },
      this.#instanceId,
    );
    return result as number;
  }

  async getIdentifier(): Promise<Uint8Array | undefined> {
    const result = await this.#manager.sendMessage(
      'getProperty',
      { property: 'identifier' },
      this.#instanceId,
    );
    return result ? new Uint8Array(result as number[]) : undefined;
  }

  async getPubKeyHash(): Promise<Uint8Array | undefined> {
    const result = await this.#manager.sendMessage(
      'getProperty',
      { property: 'pubKeyHash' },
      this.#instanceId,
    );
    return result ? new Uint8Array(result as number[]) : undefined;
  }

  async getPrivateKey(): Promise<Uint8Array | null> {
    const result = await this.#manager.sendMessage(
      'getProperty',
      { property: 'privateKey' },
      this.#instanceId,
    );
    return result ? new Uint8Array(result as number[]) : null;
  }

  async getPublicKey(): Promise<Uint8Array | null> {
    const result = await this.#manager.sendMessage(
      'getProperty',
      { property: 'publicKey' },
      this.#instanceId,
    );
    return result ? new Uint8Array(result as number[]) : null;
  }

  async getPrivateExtendedKey(): Promise<string> {
    const result = await this.#manager.sendMessage(
      'getProperty',
      { property: 'privateExtendedKey' },
      this.#instanceId,
    );
    return result as string;
  }

  async getPublicExtendedKey(): Promise<string> {
    const result = await this.#manager.sendMessage(
      'getProperty',
      { property: 'publicExtendedKey' },
      this.#instanceId,
    );
    return result as string;
  }

  async getVersions(): Promise<Versions> {
    const result = await this.#manager.sendMessage(
      'getProperty',
      { property: 'versions' },
      this.#instanceId,
    );
    return result as Versions;
  }

  async getDepth(): Promise<number> {
    const result = await this.#manager.sendMessage(
      'getProperty',
      { property: 'depth' },
      this.#instanceId,
    );
    return result as number;
  }

  async getIndex(): Promise<number> {
    const result = await this.#manager.sendMessage(
      'getProperty',
      { property: 'index' },
      this.#instanceId,
    );
    return result as number;
  }

  async getChainCode(): Promise<Uint8Array | null> {
    const result = await this.#manager.sendMessage(
      'getProperty',
      { property: 'chainCode' },
      this.#instanceId,
    );
    return result ? new Uint8Array(result as number[]) : null;
  }

  async getParentFingerprint(): Promise<number> {
    const result = await this.#manager.sendMessage(
      'getProperty',
      { property: 'parentFingerprint' },
      this.#instanceId,
    );
    return result as number;
  }

  // Cleanup
  async dispose(): Promise<void> {
    await this.#manager.sendMessage('dispose', {}, this.#instanceId);
  }
}
