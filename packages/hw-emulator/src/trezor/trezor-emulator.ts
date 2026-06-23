import type { HardwareWalletEmulator } from '../types';
import type { DeviceInteraction } from './device-interaction';
import { TrezorDeviceInteraction } from './device-interaction';
import type { TrezorDockerManager } from './docker-manager';
import { TrezorDockerManager as RealTrezorDockerManager } from './docker-manager';
import type { TrezorControllerClient } from './controller-client';
import { TrezorControllerClient as RealTrezorControllerClient } from './controller-client';
import type { TrezorSidecarManager } from './sidecar-manager';
import { createSidecarManager } from './sidecar-manager';
import { MODEL_PROFILES, type TrezorModel } from './model-profiles';
import {
  TREZOR_DEFAULT_MODEL,
  TREZOR_EMULATOR_SEED,
} from './constants';

export interface TrezorEmulatorOptions {
  model?: TrezorModel;
  seed?: string;
  label?: string;
  composeFile?: string;
  connectSrcPort?: number;
  transportBridgePort?: number;
  controllerPort?: number;
  /** Absolute path to the connect-web iframe assets directory. */
  assetDir?: string;
  // Injectable for tests; production constructs real instances:
  docker?: TrezorDockerManager;
  controller?: TrezorControllerClient;
  sidecarManager?: TrezorSidecarManager;
}

function assert<T>(val: T | undefined, name: string): T {
  if (!val) {
    throw new Error(
      `TrezorEmulator: ${name} not provided. ` +
        `Use the factory (createEmulator) for real instances, or inject mocks for tests.`,
    );
  }
  return val;
}

export class TrezorEmulator implements HardwareWalletEmulator {
  readonly #docker: TrezorDockerManager;
  readonly #controller: TrezorControllerClient;
  readonly #sidecar: TrezorSidecarManager;
  readonly #model: TrezorModel;
  readonly #seed: string;
  readonly #label: string;
  readonly #composeFile: string;
  readonly #connectSrcPort: number;
  #interaction: TrezorDeviceInteraction | null = null;
  #running = false;

  constructor(opts: TrezorEmulatorOptions) {
    this.#model = opts.model ?? TREZOR_DEFAULT_MODEL;
    this.#seed = opts.seed ?? TREZOR_EMULATOR_SEED;
    this.#label = opts.label ?? 'MetaMask Test';
    this.#composeFile = opts.composeFile ?? '';
    this.#connectSrcPort = opts.connectSrcPort ?? 8088;
    this.#docker = opts.docker ?? new RealTrezorDockerManager({ composeFile: this.#composeFile });
    this.#controller = opts.controller ?? new RealTrezorControllerClient(
      opts.controllerPort ? { port: opts.controllerPort } : {},
    );
    const sidecarOpts: any = {
      assetServerPort: this.#connectSrcPort,
    };
    if (opts.assetDir) {
      sidecarOpts.assetDir = opts.assetDir;
    }
    this.#sidecar = opts.sidecarManager ?? createSidecarManager(sidecarOpts);
  }

  getModel(): TrezorModel {
    return this.#model;
  }
  isRunning(): boolean {
    return this.#running;
  }
  getControllerClient(): TrezorControllerClient {
    return this.#controller;
  }
  getSidecarManager(): TrezorSidecarManager {
    return this.#sidecar;
  }
  getInteraction(): DeviceInteraction {
    if (!this.#interaction) {
      throw new Error('emulator not started');
    }
    return this.#interaction;
  }
  async getScreenshot(): Promise<Buffer> {
    return this.#controller.getScreenshot();
  }

  async start(): Promise<void> {
    await this.#docker.start();

    // Wait for the controller to become available (Docker startup takes 30+ s)
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        await this.#controller.connect();
        await this.#controller.ping();
        break;
      } catch {
        await this.#controller.disconnect().catch(() => {});
        if (attempt === 59) {
          throw new Error('Controller not reachable within 120s');
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    await this.#controller.emulatorStart({
      model: this.#model,
      wipe: true,
    });
    await this.#controller.emulatorSetup({
      mnemonic: this.#seed,
      pin: '',
      passphrase_protection: false,
      label: this.#label,
    });
    await this.#controller.bridgeStart('node-bridge');
    // Wait for the bridge HTTP server to bind inside the container
    await new Promise((r) => setTimeout(r, 5000));
    await this.#sidecar.start();
    this.#interaction = new TrezorDeviceInteraction(
      this.#controller,
      MODEL_PROFILES[this.#model],
    );
    this.#running = true;
  }

  async stop(): Promise<void> {
    await this.#sidecar.stop();
    await this.#controller.disconnect();
    await this.#docker.stop();
    this.#interaction = null;
    this.#running = false;
  }

  async approveTransaction(): Promise<void> {
    await this.getInteraction().approveTransaction();
  }
  async approveSigning(): Promise<void> {
    await this.getInteraction().approveSigning();
  }
  async rejectTransaction(): Promise<void> {
    await this.getInteraction().rejectTransaction();
  }
  async navigateToMainMenu(): Promise<void> {
    await this.getInteraction().navigateToMainMenu();
  }
}
