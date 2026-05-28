// eslint-disable-next-line import-x/no-nodejs-modules
import { join } from 'node:path';
import type { HardwareWalletEmulator, DeviceInteraction as SharedDeviceInteraction } from '../types';
import { SpeculosClient } from './client';
import { ApduBridge } from './apdu-bridge';
import {
  createDeviceInteraction,
} from './device-interaction';
import type { DeviceInteraction } from './device-interaction';
import { createProcessManager } from './process-manager';
import type { ProcessManager } from './process-manager';
import { DockerManager } from './docker-manager';
import { getWebHidMockScript } from './webhid-mock-script';
import {
  getDeviceModel,
  detectRunMode,
  SPECULOS_SEED,
  DEFAULT_DEVICE,
} from './constants';
import type { DeviceModel, DeviceConfig, RunMode } from './constants';
import { ensureBinary } from './download';

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

export class Speculos implements HardwareWalletEmulator {
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
    return join(__dirname, '..', '..', 'apps', config.deviceModel.elfFile);
  }

  getNvramPath(): string {
    // eslint-disable-next-line no-restricted-globals
    return join(__dirname, '..', '..', 'nvram', 'main_nvram.bin');
  }

  getDockerComposePath(): string {
    // eslint-disable-next-line no-restricted-globals
    return join(__dirname, '..', '..', 'docker-compose.yml');
  }

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

    await this.#clientInstance.connectWithRetry({
      autoReconnect: true,
      reconnectAttempts: 5,
      reconnectDelayMs: 2000,
    });

    this.#interactionInstance = createDeviceInteraction(
      this.#clientInstance,
      config.deviceModel,
    );

    this.#started = true;
  }

  async startNative(config: ResolvedConfig): Promise<void> {
    let { binary } = this.#options;

    binary ??= await ensureBinary();

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

    if (this.#clientInstance) {
      await this.#clientInstance.disconnect();
      this.#clientInstance = null;
    }

    this.#interactionInstance = null;
    this.#started = false;
  }

  getClient(): SpeculosClient {
    if (!this.#clientInstance) {
      throw new Error('Speculos not started. Call start() first.');
    }
    return this.#clientInstance;
  }

  getInteraction(): SharedDeviceInteraction {
    if (!this.#interactionInstance) {
      throw new Error('Speculos not started. Call start() first.');
    }
    return this.#interactionInstance;
  }

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

  getWebHIDMockScript(wsPort?: number): string {
    const config = this.resolveConfig();
    const port = wsPort ?? config.deviceConfig.wsBridgePort;
    return getWebHidMockScript(port);
  }

  isRunning(): boolean {
    return this.#started;
  }

  getDeviceModel(): DeviceModel {
    return this.resolveConfig().deviceModel;
  }

  getDeviceConfig(): DeviceConfig {
    return this.resolveConfig().deviceConfig;
  }

  async approveTransaction(): Promise<void> {
    return this.getInteraction().approveTransaction();
  }

  async approveSigning(): Promise<void> {
    return this.getInteraction().approveSigning();
  }

  async rejectTransaction(): Promise<void> {
    return this.getInteraction().rejectTransaction();
  }

  async navigateToMainMenu(): Promise<void> {
    return this.getInteraction().navigateToMainMenu();
  }
}
