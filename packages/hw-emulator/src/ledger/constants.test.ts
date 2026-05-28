import {
  DEVICE_MODELS,
  DEFAULT_DEVICE_MODEL,
  DEFAULT_DEVICE,
  DEVICE_PRESETS,
  SPECULOS_APDU_PORT,
  SPECULOS_API_PORT,
  SPECULOS_WS_BRIDGE_PORT,
  SPECULOS_LEDGER_ADDRESSES,
  SPECULOS_LEDGER_ADDRESS,
  SPECULOS_SEED,
  getDeviceModel,
  detectRunMode,
} from './constants';

describe('constants', () => {
  describe('DEVICE_MODELS', () => {
    it('contains all expected device models', () => {
      expect(Object.keys(DEVICE_MODELS)).toStrictEqual([
        'nanosp',
        'nanox',
        'stax',
        'flex',
      ]);
    });

    it('each model has required properties', () => {
      for (const model of Object.values(DEVICE_MODELS)) {
        expect(model.id).toBeDefined();
        expect(model.name).toBeDefined();
        expect(model.speculosModel).toBeDefined();
        expect(model.interactionType).toMatch(/^(button|touch)$/u);
        expect(model.elfFile).toMatch(/\.elf$/u);
        expect(model.screenSize.width).toBeGreaterThan(0);
        expect(model.screenSize.height).toBeGreaterThan(0);
      }
    });

    it('touch devices have button coordinates', () => {
      const touchModels = Object.values(DEVICE_MODELS).filter(
        (item) => item.interactionType === 'touch',
      );
      for (const model of touchModels) {
        expect(model.backButton).toBeDefined();
        expect(model.confirmButton).toBeDefined();
      }
    });
  });

  describe('DEFAULT_DEVICE_MODEL', () => {
    it('is the flex model', () => {
      expect(DEFAULT_DEVICE_MODEL.id).toBe('flex');
    });
  });

  describe('DEFAULT_DEVICE', () => {
    it('has expected port values', () => {
      expect(DEFAULT_DEVICE.apduPort).toBe(9998);
      expect(DEFAULT_DEVICE.apiPort).toBe(5001);
      expect(DEFAULT_DEVICE.wsBridgePort).toBe(9876);
    });
  });

  describe('DEVICE_PRESETS', () => {
    it('contains at least two presets', () => {
      expect(DEVICE_PRESETS.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('port exports', () => {
    it('matches DEFAULT_DEVICE', () => {
      expect(SPECULOS_APDU_PORT).toBe(DEFAULT_DEVICE.apduPort);
      expect(SPECULOS_API_PORT).toBe(DEFAULT_DEVICE.apiPort);
      expect(SPECULOS_WS_BRIDGE_PORT).toBe(DEFAULT_DEVICE.wsBridgePort);
    });
  });

  describe('SPECULOS_LEDGER_ADDRESSES', () => {
    it('contains 5 addresses', () => {
      expect(SPECULOS_LEDGER_ADDRESSES).toHaveLength(5);
    });

    it('sPECULOS_LEDGER_ADDRESS is the first address', () => {
      expect(SPECULOS_LEDGER_ADDRESS).toBe(SPECULOS_LEDGER_ADDRESSES[0]);
    });

    it('all addresses are valid hex', () => {
      for (const address of SPECULOS_LEDGER_ADDRESSES) {
        expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/u);
      }
    });
  });

  describe('SPECULOS_SEED', () => {
    it('is a non-empty string', () => {
      expect(typeof SPECULOS_SEED).toBe('string');
      expect(SPECULOS_SEED.length).toBeGreaterThan(0);
    });
  });

  describe('getDeviceModel', () => {
    it('returns flex by default', () => {
      expect(getDeviceModel().id).toBe('flex');
    });

    it('returns nanosp when specified', () => {
      expect(getDeviceModel('nanosp').id).toBe('nanosp');
    });

    it('throws for unknown model', () => {
      expect(() => getDeviceModel('unknown')).toThrow(
        'Unknown device model "unknown"',
      );
    });
  });

  describe('detectRunMode', () => {
    it('returns a valid run mode', () => {
      const mode = detectRunMode();
      expect(mode === 'native' || mode === 'docker').toBe(true);
    });
  });
});
