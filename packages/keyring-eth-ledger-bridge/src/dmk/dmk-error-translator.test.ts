import { DeviceExchangeError } from '@ledgerhq/device-management-kit';
import { TransportStatusError } from '@ledgerhq/hw-transport';

import { translateDmkError } from './dmk-error-translator';

describe('translateDmkError', () => {
  describe('EthAppCommandError (DeviceExchangeError with EthErrorCodes)', () => {
    it('translates error code "6985" to TransportStatusError with statusCode 0x6985', () => {
      const dmkError = createMockDeviceExchangeError('6985');

      const result = translateDmkError(dmkError);

      expect(result).toBeInstanceOf(TransportStatusError);
      expect(result.statusCode).toBe(0x6985);
    });

    it('translates error code "6a80" to TransportStatusError with statusCode 0x6a80', () => {
      const dmkError = createMockDeviceExchangeError('6a80');

      const result = translateDmkError(dmkError);

      expect(result).toBeInstanceOf(TransportStatusError);
      expect(result.statusCode).toBe(0x6a80);
    });

    it('translates error code "6a84" to TransportStatusError with statusCode 0x6a84', () => {
      const dmkError = createMockDeviceExchangeError('6a84');

      const result = translateDmkError(dmkError);

      expect(result).toBeInstanceOf(TransportStatusError);
      expect(result.statusCode).toBe(0x6a84);
    });

    it('translates error code "6982" to TransportStatusError with statusCode 0x6982', () => {
      const dmkError = createMockDeviceExchangeError('6982');

      const result = translateDmkError(dmkError);

      expect(result).toBeInstanceOf(TransportStatusError);
      expect(result.statusCode).toBe(0x6982);
    });

    it('translates error code "6b00" to TransportStatusError with statusCode 0x6b00', () => {
      const dmkError = createMockDeviceExchangeError('6b00');

      const result = translateDmkError(dmkError);

      expect(result).toBeInstanceOf(TransportStatusError);
      expect(result.statusCode).toBe(0x6b00);
    });

    it('translates error code "6d00" to TransportStatusError with statusCode 0x6d00', () => {
      const dmkError = createMockDeviceExchangeError('6d00');

      const result = translateDmkError(dmkError);

      expect(result).toBeInstanceOf(TransportStatusError);
      expect(result.statusCode).toBe(0x6d00);
    });

    it('translates error code "6e00" to TransportStatusError with statusCode 0x6e00', () => {
      const dmkError = createMockDeviceExchangeError('6e00');

      const result = translateDmkError(dmkError);

      expect(result).toBeInstanceOf(TransportStatusError);
      expect(result.statusCode).toBe(0x6e00);
    });

    it('translates error code "6f00" to TransportStatusError with statusCode 0x6f00', () => {
      const dmkError = createMockDeviceExchangeError('6f00');

      const result = translateDmkError(dmkError);

      expect(result).toBeInstanceOf(TransportStatusError);
      expect(result.statusCode).toBe(0x6f00);
    });

    it('translates error code "6a00" to TransportStatusError with statusCode 0x6a00', () => {
      const dmkError = createMockDeviceExchangeError('6a00');

      const result = translateDmkError(dmkError);

      expect(result).toBeInstanceOf(TransportStatusError);
      expect(result.statusCode).toBe(0x6a00);
    });

    it('translates error code "6a88" to TransportStatusError with statusCode 0x6a88', () => {
      const dmkError = createMockDeviceExchangeError('6a88');

      const result = translateDmkError(dmkError);

      expect(result).toBeInstanceOf(TransportStatusError);
      expect(result.statusCode).toBe(0x6a88);
    });
  });

  describe('unknown DMK error codes', () => {
    it('translates unknown error code to TransportStatusError with numeric conversion', () => {
      const dmkError = createMockDeviceExchangeError('ffff');

      const result = translateDmkError(dmkError);

      expect(result).toBeInstanceOf(TransportStatusError);
      expect(result.statusCode).toBe(0xffff);
    });
  });

  describe('non-DeviceExchangeError errors', () => {
    it('wraps generic Error instances in TransportStatusError with status 0x6f00', () => {
      const error = new Error('something went wrong');

      const result = translateDmkError(error);

      expect(result).toBeInstanceOf(TransportStatusError);
      expect(result.statusCode).toBe(0x6f00);
    });

    it('wraps non-Error values in TransportStatusError with status 0x6f00', () => {
      const result = translateDmkError('string error');

      expect(result).toBeInstanceOf(TransportStatusError);
      expect(result.statusCode).toBe(0x6f00);
    });

    it('wraps null/undefined in TransportStatusError with status 0x6f00', () => {
      const result = translateDmkError(null);

      expect(result).toBeInstanceOf(TransportStatusError);
      expect(result.statusCode).toBe(0x6f00);
    });
  });

  describe('DeviceExchangeError without error code', () => {
    it('wraps DeviceExchangeError with void error code in TransportStatusError', () => {
      const dmkError = createMockDeviceExchangeError<void>(undefined);

      const result = translateDmkError(dmkError);

      expect(result).toBeInstanceOf(TransportStatusError);
      expect(result.statusCode).toBe(0x6f00);
    });
  });
});

function createMockDeviceExchangeError<TErrorCode = string>(
  errorCode: TErrorCode,
): DeviceExchangeError<TErrorCode> {
  return {
    _tag: 'EthAppCommandError',
    message: `DMK error: ${String(errorCode)}`,
    errorCode,
    originalError: undefined,
  } as unknown as DeviceExchangeError<TErrorCode>;
}
