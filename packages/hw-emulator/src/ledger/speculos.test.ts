import { DEVICE_MODELS } from './constants';
import type { DeviceModel } from './constants';
import { Speculos } from './speculos';

// Mock the client and docker manager so start() lifecycle tests don't touch
// real Docker or TCP sockets. Class-based mocks (rather than jest.fn()) are
// used because the base jest config sets `resetMocks: true`, which strips
// jest.fn implementations before each test. Behavior is exposed via module
// properties created inside the factories.
jest.mock('./client', () => {
  const behavior = { connectShouldFail: false };
  class SpeculosClient {
    async connectWithRetry(): Promise<void> {
      if (behavior.connectShouldFail) {
        return Promise.reject(new Error('connect failed'));
      }
      return Promise.resolve();
    }

    async disconnect(): Promise<void> {
      return Promise.resolve();
    }
  }
  return { SpeculosClient, __clientBehavior: behavior };
});

jest.mock('./docker-manager', () => {
  const behavior = {
    start: jest.fn<Promise<void>, []>(),
    stop: jest.fn<Promise<void>, []>(),
  };
  class DockerManager {
    async start(): Promise<void> {
      await behavior.start();
    }

    async stop(): Promise<void> {
      await behavior.stop();
    }
  }
  return { DockerManager, __dockerBehavior: behavior };
});

/**
 * Get the mutable client behavior object created by the client mock.
 *
 * @returns The client behavior holder.
 */
function getClientBehavior(): { connectShouldFail: boolean } {
  return jest.requireMock('./client').__clientBehavior;
}

/**
 * Get the DockerManager behavior object created by the docker mock.
 *
 * @returns The docker behavior holder.
 */
function getDockerBehavior(): { start: jest.Mock; stop: jest.Mock } {
  return jest.requireMock('./docker-manager').__dockerBehavior;
}

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
    const model = DEVICE_MODELS.stax as DeviceModel;
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
    expect(() => speculos.getInteraction()).toThrow('Speculos not started');
  });

  it('throws when startBridge called before start', async () => {
    const speculos = new Speculos();
    await expect(speculos.startBridge()).rejects.toThrow(
      'Speculos not started',
    );
  });

  it('stop resolves when not started', async () => {
    const speculos = new Speculos();
    await speculos.stop();
    expect(true).toBe(true);
  });

  it('returns WebHID mock script', () => {
    const speculos = new Speculos();
    const script = speculos.getWebHIDMockScript(9999);
    expect(script).toContain('9999');
    expect(script).toContain('WebSocket');
    expect(script).toContain('mockHID');
  });

  it('detects device model for unknown id', () => {
    const speculos = new Speculos({ device: 'nonexistent' });
    expect(() => speculos.getDeviceModel()).toThrow('Unknown device model');
  });
});

describe('Speculos lifecycle', () => {
  beforeEach(() => {
    getClientBehavior().connectShouldFail = false;
    jest.clearAllMocks();
  });

  it('cleans up the docker manager when the client connect fails during start', async () => {
    getClientBehavior().connectShouldFail = true;

    const speculos = new Speculos({ mode: 'docker' });
    await expect(speculos.start()).rejects.toThrow('connect failed');

    expect(getDockerBehavior().stop).toHaveBeenCalledTimes(1);

    expect(speculos.isRunning()).toBe(false);
    expect(() => speculos.getClient()).toThrow('Speculos not started');
  });

  it('starts and stops the docker-based emulator', async () => {
    const speculos = new Speculos({ mode: 'docker' });
    await speculos.start();
    expect(speculos.isRunning()).toBe(true);
    expect(speculos.getClient()).toBeDefined();

    await speculos.stop();

    expect(speculos.isRunning()).toBe(false);
    expect(getDockerBehavior().stop).toHaveBeenCalledTimes(1);
  });

  it('throws when startBridge is called while a bridge is already running', async () => {
    const speculos = new Speculos({ mode: 'docker', wsBridgePort: 0 });
    await speculos.start();

    await speculos.startBridge(0);
    await expect(speculos.startBridge(0)).rejects.toThrow('already running');

    await speculos.stop();
  });
});
