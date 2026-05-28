import { Speculos } from './speculos';
import { DEVICE_MODELS } from './constants';

describe('Speculos', () => {
  it('constructs with default options', () => {
    const speculos = new Speculos();
    expect(speculos.isRunning()).toBe(false);
  });

  it('constructs with a string device id', () => {
    const speculos = new Speculos({ device: 'nanosp' });
    expect(speculos.isRunning()).toBe(false);
    expect(speculos.getDeviceModel().id).toBe('nanosp');
  });

  it('constructs with a DeviceModel object', () => {
    const model = DEVICE_MODELS.stax;
    const speculos = new Speculos({ device: model });
    expect(speculos.getDeviceModel().id).toBe('stax');
  });

  it('returns default device config', () => {
    const speculos = new Speculos();
    const config = speculos.getDeviceConfig();
    expect(config.apduPort).toBe(9998);
    expect(config.apiPort).toBe(5001);
    expect(config.wsBridgePort).toBe(9876);
  });

  it('uses custom ports', () => {
    const speculos = new Speculos({
      apduPort: 9997,
      apiPort: 5002,
      wsBridgePort: 9875,
    });
    const config = speculos.getDeviceConfig();
    expect(config.apduPort).toBe(9997);
    expect(config.apiPort).toBe(5002);
    expect(config.wsBridgePort).toBe(9875);
  });

  it('throws when getClient called before start', () => {
    const speculos = new Speculos();
    expect(() => speculos.getClient()).toThrow('Speculos not started');
  });

  it('throws when getInteraction called before start', () => {
    const speculos = new Speculos();
    expect(() => speculos.getInteraction()).toThrow(
      'Speculos not started',
    );
  });

  it('throws when startBridge called before start', async () => {
    const speculos = new Speculos();
    await expect(speculos.startBridge()).rejects.toThrow(
      'Speculos not started',
    );
  });

  it('stop resolves when not started', async () => {
    const speculos = new Speculos();
    await expect(speculos.stop()).resolves.toBeUndefined();
  });

  it('returns WebHID mock script', () => {
    const speculos = new Speculos();
    const script = speculos.getWebHIDMockScript(9999);
    expect(script).toContain('9999');
    expect(script).toContain('WebSocket');
    expect(script).toContain('mockHID');
  });

  it('detects device model for unknown id', () => {
    expect(() => new Speculos({ device: 'nonexistent' })).toThrow(
      'Unknown device model',
    );
  });
});
