import { type DeferredPromise, createDeferredPromise } from '@metamask/utils';
import { Mutex } from 'async-mutex';

import type {
  QrKeyringBridge,
  QrScanRequest,
  SerializedUR,
} from './qr-keyring';

export type QrKeyringDeferredPromiseBridgeOptions = {
  /**
   * Callback invoked when a scan request is made.
   * This can be used to trigger the actual scanning process.
   */
  onScanRequested?: (request: QrScanRequest) => void;
  /**
   * Callback invoked when a scan is successfully resolved.
   * This can be used to handle the result of the scan.
   */
  onScanResolved?: (result: SerializedUR) => void;
  /**
   * Callback invoked when a scan is rejected with an error.
   * This can be used to handle errors that occur during the scan.
   */
  onScanRejected?: (error: Error) => void;
};

/**
 * A bridge that turns the scan request into a deferred promise, allowing
 * the consumer to control the resolution and rejection of the scan.
 */
export class QrKeyringDeferredPromiseBridge implements QrKeyringBridge {
  readonly #lock = new Mutex();

  readonly #onScanRequested?: ((request: QrScanRequest) => void) | undefined;

  readonly #onScanResolved?: ((result: SerializedUR) => void) | undefined;

  readonly #onScanRejected?: ((error: Error) => void) | undefined;

  #pendingScan?: DeferredPromise<SerializedUR> | null;

  constructor({
    onScanRequested,
    onScanResolved,
    onScanRejected,
  }: QrKeyringDeferredPromiseBridgeOptions = {}) {
    this.#onScanRequested = onScanRequested;
    this.#onScanResolved = onScanResolved;
    this.#onScanRejected = onScanRejected;
  }

  /**
   * Request a QR code scan, obtaining a CBOR and a type as response.
   *
   * @param request - The type of QR scan request.
   * @returns A promise that resolves with the scanned data as a serialized UR.
   */
  async requestScan(request: QrScanRequest): Promise<SerializedUR> {
    return this.#lock.runExclusive(async () => {
      const deferredPromise = createDeferredPromise<SerializedUR>();
      this.#pendingScan = deferredPromise;
      this.#onScanRequested?.(request);
      return deferredPromise.promise;
    });
  }

  /**
   * Resolve the pending scan with the given result.
   *
   * @param result - The scanned data as a serialized UR.
   */
  resolvePendingScan(result: SerializedUR): void {
    if (!this.#pendingScan) {
      throw new Error('No pending scan to resolve.');
    }
    this.#pendingScan.resolve(result);
    this.#pendingScan = null;
    this.#onScanResolved?.(result);
  }

  /**
   * Reject the pending scan with the given error.
   *
   * @param error - The error to reject the scan with.
   */
  rejectPendingScan(error: Error): void {
    if (!this.#pendingScan) {
      throw new Error('No pending scan to reject.');
    }
    this.#pendingScan.reject(error);
    this.#pendingScan = null;
    this.#onScanRejected?.(error);
  }
}
