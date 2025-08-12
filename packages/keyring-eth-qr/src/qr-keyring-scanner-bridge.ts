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
   * The function that the bridge will use to initiate a QR scan request.
   */
  requestScan: (request: QrScanRequest) => Promise<SerializedUR>;
};

/**
 * A generic transport bridge that allows the consumer to inject a scan
 * request hook at construction time.
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
