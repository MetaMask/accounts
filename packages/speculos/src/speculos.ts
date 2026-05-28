// eslint-disable-next-line import-x/no-nodejs-modules
import { join } from 'node:path';
import { SpeculosClient } from './client';
import { ApduBridge } from './apdu-bridge';
import {
  createDeviceInteraction
  
} from './device-interaction';
import type {DeviceInteraction} from './device-interaction';
import { createProcessManager  } from './process-manager';
import type {ProcessManager} from './process-manager';
import { DockerManager } from './docker-manager';
import { getWebHidMockScript } from './webhid-mock-script';
import {
  
  
  
  getDeviceModel,
  detectRunMode,
  SPECULOS_SEED,
  DEFAULT_DEVICE
} from './constants';
import type {DeviceModel, DeviceConfig, RunMode} from './constants';

export type SpeculosOptions = {
  device?: DeviceModel | string;
  seed?: string;
  apduPort?: number;
  apiPort?: number;
  wsBridgePort?: number;
  mode?: RunMode;
  binary?: string;
  display?: string;
  loadNvram?: boolean;
  startTimeout?: number;
};

type ResolvedConfig = {
  deviceModel: DeviceModel;
  deviceConfig: DeviceConfig;
  seed: string;
  mode: RunMode;
};

const DEFAULT_DISPLAY = 'headless';

/**
 * Core Speculos emulator lifecycle manager.
 *
 * Provides start/stop lifecycle, APDU client, device interaction helpers,
 * and an optional WebSocket HID bridge for browser-based E2E testing.
 */
export class Speculos {
  readonly #options: SpeculosOptions;

  #resolvedConfig: ResolvedConfig | null = null;

  #processManager: ProcessManager | null = null;

  #dockerManager: DockerManager | null = null;

  #bridgeInstance: ApduBridge | null = null;

  #clientInstance: SpeculosClient | null = null;

  #interactionInstance: DeviceInteraction | null = null;

  #started = false;

  constructor(options: SpeculosOptions = {}) {
    this.#options = options;
  }

  resolveConfig(): ResolvedConfig {
    if (this.#resolvedConfig) {
      return this.#resolvedConfig;
    }

    const deviceModel =
      typeof this.#options.device === 'string'
        ? getDeviceModel(this.#options.device)
        : (this.#options.device ?? getDeviceModel());

    const deviceConfig: DeviceConfig = {
      id: 'default',
      apduPort: this.#options.apduPort ?? DEFAULT_DEVICE.apduPort,
      apiPort: this.#options.apiPort ?? DEFAULT_DEVICE.apiPort,
      wsBridgePort: this.#options.wsBridgePort ?? DEFAULT_DEVICE.wsBridgePort,
    };

    const mode = this.#options.mode ?? detectRunMode();

    this.#resolvedConfig = {
      deviceModel,
      deviceConfig,
      seed: this.#options.seed ?? SPECULOS_SEED,
      mode,
    };

    return this.#resolvedConfig;
  }

  getElfPath(): string {
    const config = this.resolveConfig();
    // eslint-disable-next-line no-restricted-globals
    return join(__dirname, '..', 'apps', config.deviceModel.elfFile);
  }

  getNvramPath(): string {
    // eslint-disable-next-line no-restricted-globals
    return join(__dirname, '..', 'nvram', 'main_nvram.bin');
  }

  getDockerComposePath(): string {
    // eslint-disable-next-line no-restricted-globals
    return join(__dirname, '..', 'docker-compose.yml');
  }

  /**
   * Start the Speculos emulator.
   *
   * @returns A promise that resolves when the emulator is ready.
   */
  async start(): Promise<void> {
    if (this.#started) {
      throw new Error('Speculos already started');
    }

    const config = this.resolveConfig();

    if (config.mode === 'native') {
      await this.startNative(config);
    } else {
      await this.startDocker(config);
    }

    this.#clientInstance = new SpeculosClient({
      apduPort: config.deviceConfig.apduPort,
      apiPort: config.deviceConfig.apiPort,
    });

    this.#interactionInstance = createDeviceInteraction(
      this.#clientInstance,
      config.deviceModel,
    );

    this.#started = true;
  }

  async startNative(config: ResolvedConfig): Promise<void> {
    let {binary} = this.#options;

    if (!binary) {
      try {
        const speculosUp = await import('@metamask/speculos-up');
        binary = await speculosUp.ensureBinary();
      } catch {
        throw new Error(
          'Native mode requires @metamask/speculos-up. Install it or provide a binary path.',
        );
      }
    }

    this.#processManager = createProcessManager({
      binary,
      app: this.getElfPath(),
      model: config.deviceModel.speculosModel,
      seed: config.seed,
      apduPort: config.deviceConfig.apduPort,
      apiPort: config.deviceConfig.apiPort,
      display: this.#options.display ?? DEFAULT_DISPLAY,
      loadNvram: this.#options.loadNvram ?? true,
      ...(this.#options.startTimeout === undefined
        ? {}
        : { startTimeout: this.#options.startTimeout }),
    });

    await this.#processManager.start();
  }

  async startDocker(config: ResolvedConfig): Promise<void> {
    this.#dockerManager = new DockerManager({
      composeFile: this.getDockerComposePath(),
      apduPort: config.deviceConfig.apduPort,
      apiPort: config.deviceConfig.apiPort,
      app: this.getElfPath(),
      model: config.deviceModel.speculosModel,
      seed: config.seed,
      display: this.#options.display ?? DEFAULT_DISPLAY,
      loadNvram: this.#options.loadNvram ?? true,
      ...(this.#options.startTimeout === undefined
        ? {}
        : { startTimeout: this.#options.startTimeout }),
    });

    await this.#dockerManager.start();
  }

  /**
   * Stop the Speculos emulator and clean up resources.
   *
   * @returns A promise that resolves when stopped.
   */
  async stop(): Promise<void> {
    if (!this.#started) {
      return;
    }

    if (this.#bridgeInstance) {
      await this.#bridgeInstance.stop();
      this.#bridgeInstance = null;
    }

    if (this.#processManager) {
      await this.#processManager.stop();
      this.#processManager = null;
    }

    if (this.#dockerManager) {
      await this.#dockerManager.stop();
      this.#dockerManager = null;
    }

    this.#clientInstance = null;
    this.#interactionInstance = null;
    this.#started = false;
  }

  /**
   * Get the SpeculosClient for direct APDU/REST communication.
   *
   * @returns The client instance.
   * @throws If the emulator has not been started.
   */
  getClient(): SpeculosClient {
    if (!this.#clientInstance) {
      throw new Error('Speculos not started. Call start() first.');
    }
    return this.#clientInstance;
  }

  /**
   * Get the device interaction handler.
   *
   * @returns The device interaction instance.
   * @throws If the emulator has not been started.
   */
  getInteraction(): DeviceInteraction {
    if (!this.#interactionInstance) {
      throw new Error('Speculos not started. Call start() first.');
    }
    return this.#interactionInstance;
  }

  /**
   * Start the WebSocket HID bridge for browser-based testing.
   *
   * @param wsPort - Optional port override.
   * @returns The ApduBridge instance.
   * @throws If the emulator has not been started.
   */
  async startBridge(wsPort?: number): Promise<ApduBridge> {
    if (!this.#clientInstance) {
      throw new Error('Speculos not started. Call start() first.');
    }

    const config = this.resolveConfig();
    const port = wsPort ?? config.deviceConfig.wsBridgePort;

    this.#bridgeInstance = new ApduBridge(this.#clientInstance, port);
    await this.#bridgeInstance.start();
    return this.#bridgeInstance;
  }

  /**
   * Get the browser-side WebHID mock script for injection.
   *
   * @param wsPort - Optional WebSocket port override.
   * @returns The JavaScript source code as a string.
   * @throws If the emulator has not been started.
   */
  getWebHIDMockScript(wsPort?: number): string {
    const config = this.resolveConfig();
    const port = wsPort ?? config.deviceConfig.wsBridgePort;
    return getWebHidMockScript(port);
  }

  /**
   * Check if the emulator is currently running.
   *
   * @returns True if started.
   */
  isRunning(): boolean {
    return this.#started;
  }

  /**
   * Get the resolved device model.
   *
   * @returns The device model.
   */
  getDeviceModel(): DeviceModel {
    return this.resolveConfig().deviceModel;
  }

  /**
   * Get the resolved device config with port numbers.
   *
   * @returns The device config.
   */
  getDeviceConfig(): DeviceConfig {
    return this.resolveConfig().deviceConfig;
  }
}
