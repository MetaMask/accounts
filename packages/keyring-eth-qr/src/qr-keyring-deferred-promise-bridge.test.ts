import { type QrScanRequest, QrScanRequestType } from './qr-keyring';
import { QrKeyringDeferredPromiseBridge } from './qr-keyring-deferred-promise-bridge';

describe('QrKeyringDeferredPromiseBridge', () => {
  describe('requestScan', () => {
    it('calls `onScanRequested` if any', async () => {
      const request: QrScanRequest = {
        type: QrScanRequestType.PAIR,
      };
      const onScanRequested = jest.fn();
      const bridge = new QrKeyringDeferredPromiseBridge({
        onScanRequested,
      });
      onScanRequested.mockImplementation(() => {
        bridge.resolvePendingScan({
          type: 'test',
          cbor: 'testData',
        });
      });

      await bridge.requestScan(request);

      expect(onScanRequested).toHaveBeenCalledWith(request);
    });
  });

  describe('resolvePendingScan', () => {
    it('resolves the pending scan with the given result', async () => {
      const request: QrScanRequest = {
        type: QrScanRequestType.PAIR,
      };
      const result = {
        type: 'test',
        cbor: 'testData',
      };
      const onScanRequested = jest.fn();
      const onScanResolved = jest.fn();
      const bridge = new QrKeyringDeferredPromiseBridge({
        onScanRequested,
        onScanResolved,
      });
      onScanRequested.mockImplementation(() => {
        bridge.resolvePendingScan(result);
      });

      const pendingScan = await bridge.requestScan(request);

      expect(onScanResolved).toHaveBeenCalledWith(result);
      expect(pendingScan).toStrictEqual(result);
    });

    it('throws an error if no pending scan exists', () => {
      const bridge = new QrKeyringDeferredPromiseBridge();

      expect(() => {
        bridge.resolvePendingScan({ type: 'test', cbor: 'testData' });
      }).toThrow('No pending scan to resolve.');
    });
  });

  describe('rejectPendingScan', () => {
    it('calls `onScanRejected` if any', async () => {
      const error = new Error('Test error');
      const onScanRejected = jest.fn();
      const onScanRequested = jest.fn();
      const bridge = new QrKeyringDeferredPromiseBridge({
        onScanRequested,
        onScanRejected,
      });
      onScanRequested.mockImplementation(() => {
        bridge.rejectPendingScan(error);
      });

      await expect(
        bridge.requestScan({
          type: QrScanRequestType.PAIR,
        }),
      ).rejects.toThrow(error);
      expect(onScanRejected).toHaveBeenCalledWith(error);
    });

    it('throws an error if no pending scan exists', () => {
      const bridge = new QrKeyringDeferredPromiseBridge();

      expect(() => {
        bridge.rejectPendingScan(new Error('Test error'));
      }).toThrow('No pending scan to reject.');
    });
  });
});
