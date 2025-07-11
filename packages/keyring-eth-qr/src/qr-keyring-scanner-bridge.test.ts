import {
  type QrScanRequest,
  QrScanRequestType,
  QrKeyringScannerBridge,
} from '.';

describe('QrKeyringScannerBridge', () => {
  describe('requestScan', () => {
    it('forwards the request to the constructor hook', async () => {
      const request: QrScanRequest = {
        type: QrScanRequestType.PAIR,
      };
      const mockRequestScan = jest.fn();
      const hooks = {
        requestScan: mockRequestScan,
      };

      const qrKeyringScannerBridge = new QrKeyringScannerBridge(hooks);
      await qrKeyringScannerBridge.requestScan(request);

      expect(mockRequestScan).toHaveBeenCalledWith(request);
    });
  });
});
