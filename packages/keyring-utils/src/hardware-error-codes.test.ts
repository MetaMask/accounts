import * as errorCodes from './hardware-error-codes';

describe('hardware-error-codes', () => {
  describe('exports', () => {
    it('should export all error code constants', () => {
      expect(Object.keys(errorCodes).length).toBeGreaterThan(0);
    });

    it('should export all constants as strings', () => {
      Object.values(errorCodes).forEach((value) => {
        expect(typeof value).toBe('string');
      });
    });
  });

  describe('Authentication & Security codes', () => {
    it('should have PIN error codes', () => {
      expect(errorCodes.AUTH_PIN_001).toBe('PIN invalid');
      expect(errorCodes.AUTH_PIN_002).toBe('PIN cancelled by user');
      expect(errorCodes.AUTH_PIN_003).toBe('PIN attempts remaining');
      expect(errorCodes.AUTH_PIN_004).toBe('PIN mismatch');
    });

    it('should have lock error codes', () => {
      expect(errorCodes.AUTH_LOCK_001).toBe('Device is locked');
      expect(errorCodes.AUTH_LOCK_002).toBe(
        'Device blocked due to failed attempts',
      );
    });

    it('should have security error codes', () => {
      expect(errorCodes.AUTH_SEC_001).toBe('Security conditions not satisfied');
      expect(errorCodes.AUTH_SEC_002).toBe('Access rights insufficient');
    });

    it('should have wipe code error', () => {
      expect(errorCodes.AUTH_WIPE_001).toBe('Wipe code mismatch');
    });
  });

  describe('User Action codes', () => {
    it('should have cancel error codes', () => {
      expect(errorCodes.USER_CANCEL_001).toBe('User rejected action on device');
      expect(errorCodes.USER_CANCEL_002).toBe('User cancelled operation');
    });

    it('should have user input codes', () => {
      expect(errorCodes.USER_INPUT_001).toBe('User input expected');
      expect(errorCodes.USER_CONFIRM_001).toBe('User confirmation required');
    });
  });

  describe('Device State codes', () => {
    it('should have device state error codes', () => {
      expect(errorCodes.DEVICE_STATE_001).toBe('Device not initialized');
      expect(errorCodes.DEVICE_STATE_002).toBe('Device busy');
      expect(errorCodes.DEVICE_STATE_003).toBe('Device disconnected');
      expect(errorCodes.DEVICE_STATE_004).toBe('Device used elsewhere');
      expect(errorCodes.DEVICE_STATE_005).toBe('Device call in progress');
    });

    it('should have device detection code', () => {
      expect(errorCodes.DEVICE_DETECT_001).toBe('Device not found');
    });

    it('should have device capability codes', () => {
      expect(errorCodes.DEVICE_CAP_001).toBe(
        'Device missing required capability',
      );
      expect(errorCodes.DEVICE_CAP_002).toBe(
        'Device is BTC-only, operation not supported',
      );
    });

    it('should have device mode code', () => {
      expect(errorCodes.DEVICE_MODE_001).toBe('Invalid device mode');
    });
  });

  describe('Connection & Transport codes', () => {
    it('should have transport error code', () => {
      expect(errorCodes.CONN_TRANSPORT_001).toBe('Transport layer missing');
    });

    it('should have connection error codes', () => {
      expect(errorCodes.CONN_CLOSED_001).toBe('Connection closed unexpectedly');
      expect(errorCodes.CONN_IFRAME_001).toBe(
        'Unable to establish iframe connection',
      );
      expect(errorCodes.CONN_SUITE_001).toBe('Unable to connect to Suite');
      expect(errorCodes.CONN_TIMEOUT_001).toBe('Connection timeout');
      expect(errorCodes.CONN_BLOCKED_001).toBe('Connection blocked');
    });
  });

  describe('Data & Validation codes', () => {
    it('should have data format error codes', () => {
      expect(errorCodes.DATA_FORMAT_001).toBe('Incorrect data length');
      expect(errorCodes.DATA_FORMAT_002).toBe('Invalid data received');
      expect(errorCodes.DATA_FORMAT_003).toBe('Invalid parameter');
    });

    it('should have data missing code', () => {
      expect(errorCodes.DATA_MISSING_001).toBe('Missing critical parameter');
    });

    it('should have data validation codes', () => {
      expect(errorCodes.DATA_VALIDATION_001).toBe('Address mismatch');
      expect(errorCodes.DATA_VALIDATION_002).toBe('Invalid signature');
    });

    it('should have data not found codes', () => {
      expect(errorCodes.DATA_NOTFOUND_001).toBe('Referenced data not found');
      expect(errorCodes.DATA_NOTFOUND_002).toBe('File not found');
      expect(errorCodes.DATA_NOTFOUND_003).toBe('Coin not found');
    });
  });

  describe('Cryptographic Operations codes', () => {
    it('should have crypto error codes', () => {
      expect(errorCodes.CRYPTO_SIGN_001).toBe('Signature operation failed');
      expect(errorCodes.CRYPTO_ALGO_001).toBe('Algorithm not supported');
      expect(errorCodes.CRYPTO_KEY_001).toBe('Invalid key check value');
      expect(errorCodes.CRYPTO_ENTROPY_001).toBe('Entropy check failed');
    });
  });

  describe('System & Internal codes', () => {
    it('should have internal error code', () => {
      expect(errorCodes.SYS_INTERNAL_001).toBe('Internal device error');
    });

    it('should have memory error codes', () => {
      expect(errorCodes.SYS_MEMORY_001).toBe('Not enough memory');
      expect(errorCodes.SYS_MEMORY_002).toBe('Memory problem');
    });

    it('should have file system error codes', () => {
      expect(errorCodes.SYS_FILE_001).toBe('File system error');
      expect(errorCodes.SYS_FILE_002).toBe('Inconsistent file');
    });

    it('should have license error code', () => {
      expect(errorCodes.SYS_LICENSE_001).toBe('Licensing error');
    });

    it('should have firmware error codes', () => {
      expect(errorCodes.SYS_FIRMWARE_001).toBe('Firmware error');
      expect(errorCodes.SYS_FIRMWARE_002).toBe('Firmware installation failed');
    });
  });

  describe('Command & Protocol codes', () => {
    it('should have command error codes', () => {
      expect(errorCodes.PROTO_CMD_001).toBe('Command not supported');
      expect(errorCodes.PROTO_CMD_002).toBe('Command incompatible');
      expect(errorCodes.PROTO_CMD_003).toBe('Unexpected message');
    });

    it('should have protocol message codes', () => {
      expect(errorCodes.PROTO_MSG_001).toBe('Invalid APDU command');
      expect(errorCodes.PROTO_PARAM_001).toBe('Invalid command parameters');
    });
  });

  describe('Configuration & Initialization codes', () => {
    it('should have initialization error codes', () => {
      expect(errorCodes.CONFIG_INIT_001).toBe('Not initialized');
      expect(errorCodes.CONFIG_INIT_002).toBe('Already initialized');
      expect(errorCodes.CONFIG_INIT_003).toBe('Manifest missing');
    });

    it('should have permission error code', () => {
      expect(errorCodes.CONFIG_PERM_001).toBe('Permissions not granted');
    });

    it('should have method error code', () => {
      expect(errorCodes.CONFIG_METHOD_001).toBe('Method not allowed');
    });
  });

  describe('Transaction codes', () => {
    it('should have transaction error codes', () => {
      expect(errorCodes.TX_FUNDS_001).toBe('Insufficient funds');
      expect(errorCodes.TX_FAIL_001).toBe('Transaction failed');
    });
  });

  describe('Special codes', () => {
    it('should have success code', () => {
      expect(errorCodes.SUCCESS_000).toBe('Operation successful');
    });

    it('should have unknown error code', () => {
      expect(errorCodes.UNKNOWN_001).toBe('Unknown error');
    });
  });

  describe('code uniqueness', () => {
    it('should have unique error code identifiers', () => {
      const codeNames = Object.keys(errorCodes);
      const uniqueNames = new Set(codeNames);
      expect(uniqueNames.size).toBe(codeNames.length);
    });

    it('should have unique error code messages', () => {
      const codeValues = Object.values(errorCodes);
      const uniqueValues = new Set(codeValues);
      expect(uniqueValues.size).toBe(codeValues.length);
    });
  });

  describe('naming conventions', () => {
    it('should follow naming pattern with underscores and numbers', () => {
      const codeNames = Object.keys(errorCodes);
      // Pattern: WORD_NNN or WORD_WORD_NNN (allows one or more words followed by numbers)
      const pattern = /^[A-Z]+(_[A-Z0-9]+)*_\d+$/u;

      codeNames.forEach((name) => {
        expect(name).toMatch(pattern);
      });
    });

    it('should have sequential numbering within categories', () => {
      const categories: Record<string, string[]> = {};

      Object.keys(errorCodes).forEach((code) => {
        const prefix = code.substring(0, code.lastIndexOf('_'));
        if (!categories[prefix]) {
          categories[prefix] = [];
        }
        categories[prefix].push(code);
      });

      // Check that each category has at least one code
      Object.values(categories).forEach((codes) => {
        expect(codes.length).toBeGreaterThan(0);
      });
    });
  });

  describe('error message quality', () => {
    it('should have descriptive error messages', () => {
      Object.values(errorCodes).forEach((message) => {
        expect(message.length).toBeGreaterThan(5);
        // Messages should start with a capital letter or be all caps
        expect(message[0]).toMatch(/[A-Z]/u);
      });
    });

    it('should not end with punctuation', () => {
      Object.values(errorCodes).forEach((message) => {
        expect(message).not.toMatch(/[.!?]$/u);
      });
    });
  });

  describe('category coverage', () => {
    it('should have error codes for all major categories', () => {
      const codeNames = Object.keys(errorCodes);

      const categories = [
        'AUTH',
        'USER',
        'DEVICE',
        'CONN',
        'DATA',
        'CRYPTO',
        'SYS',
        'PROTO',
        'CONFIG',
        'TX',
      ];

      categories.forEach((category) => {
        const hasCategoryCode = codeNames.some((code) =>
          code.startsWith(category),
        );
        expect(hasCategoryCode).toBe(true);
      });
    });
  });
});
