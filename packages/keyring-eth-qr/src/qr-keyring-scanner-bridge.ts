import type {
  QrKeyringBridge,
  QrScanRequest,
  SerializedUR,
} from './qr-keyring';

/**
 * Options for the QrKeyringScannerBridge.
 */
export type QrKeyringScannerBridgeOptions = {
  /**
   * An injected function that the bridge uses to request a QR code scan.
   */
  requestScan: (request: QrScanRequest) => Promise<SerializedUR>;
};

/**
 * A bridge that allows the QrKeyring to request a QR code scan
 * while keeping the implementation defined by the QrKeyring consumer.
 */
export class QrKeyringScannerBridge implements QrKeyringBridge {
  readonly #requestScan: QrKeyringScannerBridgeOptions['requestScan'];

  constructor({ requestScan }: QrKeyringScannerBridgeOptions) {
    this.#requestScan = requestScan;
  }

  /**
   * Request a QR code scan, obtaining a CBOR and a type as response.
   *
   * @param request - The type of QR scan request.
   * @returns The scanned data as a serialized UR.
   */
  async requestScan(request: QrScanRequest): Promise<SerializedUR> {
    return this.#requestScan(request);
  }
}
