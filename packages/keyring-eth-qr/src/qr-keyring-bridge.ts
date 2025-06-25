import type { QrKeyringBridge } from './qr-keyring';

/**
 * Options for the QrKeyringScannerBridge.
 */
export type QrKeyringScannerBridgeOptions = {
  /**
   * An injected function that the bridge uses to request a QR code scan.
   */
  requestScan: () => Promise<string>;
};

/**
 * A bridge that allows the QrKeyring to request a QR code scan
 * while keeping the implementation defined by the QrKeyring consumer.
 */
export class QrKeyringScannerBridge implements QrKeyringBridge {
  readonly #requestScan: () => Promise<string>;

  constructor({ requestScan }: QrKeyringScannerBridgeOptions) {
    this.#requestScan = requestScan;
  }

  /**
   * Requests a QR code scan and returns the scanned data.
   *
   * @returns The scanned data as a string.
   */
  async requestScan(): Promise<string> {
    return this.#requestScan();
  }
}
