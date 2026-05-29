// eslint-disable-next-line import-x/no-nodejs-modules
import { join } from 'node:path';

import type {
  HardwareWalletEmulator,
  DeviceInteraction as SharedDeviceInteraction,
} from '../types';
import { ApduBridge } from './apdu-bridge';
import { SpeculosClient } from './client';
import {
  getDeviceModel,
  detectRunMode,
  SPECULOS_SEED,
  DEFAULT_DEVICE,
} from './constants';
import type { DeviceModel, DeviceConfig, RunMode } from './constants';
import { createDeviceInteraction } from './device-interaction';
import type { DeviceInteraction } from './device-interaction';
import { DockerManager } from './docker-manager';
import { createProcessManager } from './process-manager';
import type { ProcessManager } from './process-manager';
import { getWebHidMockScript } from './webhid-mock-script';

/**
 * Configuration options for the Speculos Ledger emulator.
 */
export type SpeculosOptions = {
  /** Device model or model identifier string (defaults to 'flex'). */
  device?: DeviceModel | string;
  /** BIP-39 mnemonic seed (defaults to SPECULOS_SEED). */
  seed?: string;
  /** TCP port for the APDU protocol. */
  apduPort?: number;
  /** TCP port for the REST API. */
  apiPort?: number;
  /** TCP port for the WebSocket bridge. */
  wsBridgePort?: number;
  /** Execution mode — 'native' or 'docker' (auto-detected by default). */
  mode?: RunMode;
  /** Path to the Speculos binary (required in native mode). */
  binary?: string;
  /** Display backend (defaults to 'headless'). */
  display?: string;
  /** Whether to load NVRAM state (defaults to true). */
  loadNvram?: boolean;
  /** Maximum time in milliseconds to wait for the emulator to start. */
  startTimeout?: number;
};

/**
 * Fully resolved configuration after applying defaults.
 */
type ResolvedConfig = {
  deviceModel: DeviceModel;
  deviceConfig: DeviceConfig;
  seed: string;
  mode: RunMode;
};

const DEFAULT_DISPLAY = 'headless';

/**
 * Speculos Ledger emulator — manages the full lifecycle of a Ledger device emulation,
 * including starting/stopping the emulator process or Docker container, communicating
 * via APDU, and providing device screen interaction capabilities.
 */
export class Speculos implements HardwareWalletEmulator {
  readonly #options: SpeculosOptions;

  #resolvedConfig: ResolvedConfig | null = null;

  #processManager: ProcessManager | null = null;

  #dockerManager: DockerManager | null = null;

  #bridgeInstance: ApduBridge | null = null;

  #clientInstance: SpeculosClient | null = null;

  #interactionInstance: DeviceInteraction | null = null;

  #started = false;

  /**
   * @param options - Configuration options for the emulator.
   */
  constructor(options: SpeculosOptions = {}) {
    this.#options = options;
  }

  /**
   * Resolve and cache the full configuration, applying defaults for any unset options.
   *
   * @returns The resolved configuration.
   */
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

  /**
   * Get the filesystem path to the Ethereum app ELF binary for the configured device.
   *
   * @returns The absolute path to the ELF file.
   */
  getElfPath(): string {
    const config = this.resolveConfig();
    // eslint-disable-next-line no-restricted-globals
    return join(__dirname, '..', '..', 'apps', config.deviceModel.elfFile);
  }

  /**
   * Get the filesystem path to the NVRAM binary file for persistent device state.
   *
   * @returns The absolute path to the NVRAM file.
   */
  getNvramPath(): string {
    // eslint-disable-next-line no-restricted-globals
    return join(__dirname, '..', '..', 'nvram', 'main_nvram.bin');
  }

  /**
   * Get the filesystem path to the docker-compose.yml file.
   *
   * @returns The absolute path to the compose file.
   */
  getDockerComposePath(): string {
    // eslint-disable-next-line no-restricted-globals
    return join(__dirname, '..', '..', 'docker-compose.yml');
  }

  /**
   * Attempt to resolve the speculos binary via @metamask/speculosup.
   *
   * @returns The binary path if speculosup is installed, null otherwise.
   */
  async #resolveSpeculosupBinary(): Promise<string | null> {
    try {
      const mod = (await import('@metamask/speculosup' as string)) as {
        getSpeculosBinaryPath: () => string | null;
      };
      return mod.getSpeculosBinaryPath();
    } catch {
      return null;
    }
  }

  /**
   * Start the Speculos emulator and connect the APDU client.
   *
   * @throws If already started.
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

  /**
   * Start Speculos as a native process (Linux only).
   *
   * @param config - The resolved emulator configuration.
   */
  async startNative(config: ResolvedConfig): Promise<void> {
    const speculosupBinary = await this.#resolveSpeculosupBinary();
    const binary = this.#options.binary ?? speculosupBinary ?? 'speculos';

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

  /**
   * Start Speculos via Docker Compose.
   *
   * @param config - The resolved emulator configuration.
   */
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
   * Stop the emulator and release all resources (bridge, process/docker, client).
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

    if (this.#clientInstance) {
      await this.#clientInstance.disconnect();
      this.#clientInstance = null;
    }

    this.#interactionInstance = null;
    this.#started = false;
  }

  /**
   * Get the Speculos client for direct APDU and API communication.
   *
   * @returns The connected SpeculosClient instance.
   * @throws If the emulator has not been started.
   */
  getClient(): SpeculosClient {
    if (!this.#clientInstance) {
      throw new Error('Speculos not started. Call start() first.');
    }
    return this.#clientInstance;
  }

  /**
   * Get the device interaction handler for screen actions.
   *
   * @returns The device interaction instance.
   * @throws If the emulator has not been started.
   */
  getInteraction(): SharedDeviceInteraction {
    if (!this.#interactionInstance) {
      throw new Error('Speculos not started. Call start() first.');
    }
    return this.#interactionInstance;
  }

  /**
   * Start a WebSocket bridge that relays HID-framed APDUs between a browser and Speculos.
   *
   * @param wsPort - Override port for the WebSocket server.
   * @returns The started ApduBridge instance.
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
   * Generate the browser-side WebHID mock script for connecting to the WebSocket bridge.
   *
   * @param wsPort - Override port for the WebSocket connection.
   * @returns JavaScript source code as a string.
   */
  getWebHIDMockScript(wsPort?: number): string {
    const config = this.resolveConfig();
    const port = wsPort ?? config.deviceConfig.wsBridgePort;
    return getWebHidMockScript(port);
  }

  /**
   * Check whether the emulator is currently running.
   *
   * @returns True if started and running.
   */
  isRunning(): boolean {
    return this.#started;
  }

  /**
   * Get the resolved device model configuration.
   *
   * @returns The device model.
   */
  getDeviceModel(): DeviceModel {
    return this.resolveConfig().deviceModel;
  }

  /**
   * Get the resolved device port configuration.
   *
   * @returns The device config with port numbers.
   */
  getDeviceConfig(): DeviceConfig {
    return this.resolveConfig().deviceConfig;
  }

  /**
   * Approve a transaction on the device screen.
   *
   * @returns A promise that resolves when the approval is complete.
   */
  async approveTransaction(): Promise<void> {
    return this.getInteraction().approveTransaction();
  }

  /**
   * Approve a signing request on the device screen.
   *
   * @returns A promise that resolves when the approval is complete.
   */
  async approveSigning(): Promise<void> {
    return this.getInteraction().approveSigning();
  }

  /**
   * Reject a transaction on the device screen.
   *
   * @returns A promise that resolves when the rejection is complete.
   */
  async rejectTransaction(): Promise<void> {
    return this.getInteraction().rejectTransaction();
  }

  /**
   * Navigate to the main menu on the device screen.
   *
   * @returns A promise that resolves when navigation is complete.
   */
  async navigateToMainMenu(): Promise<void> {
    return this.getInteraction().navigateToMainMenu();
  }
}
