import type { HardwareWalletEmulator } from '../types';
import type { DeviceInteraction } from './device-interaction';
import { TrezorDeviceInteraction } from './device-interaction';
import type { TrezorDockerManager } from './docker-manager';
import type { TrezorControllerClient } from './controller-client';
import type { TrezorSidecarManager } from './sidecar-manager';
import { MODEL_PROFILES, type TrezorModel } from './model-profiles';
import { TREZOR_DEFAULT_MODEL, TREZOR_EMULATOR_SEED } from './constants';

export interface TrezorEmulatorOptions {
  model?: TrezorModel;
  seed?: string;
  label?: string;
  composeFile?: string;
  connectSrcPort?: number;
  transportBridgePort?: number;
  controllerPort?: number;
  // Injectable for tests; production constructs real instances:
  docker?: TrezorDockerManager;
  controller?: TrezorControllerClient;
  sidecarManager?: TrezorSidecarManager;
}

function assert<T>(val: T | undefined, name: string): T {
  if (!val) {
    throw new Error(`TrezorEmulator: ${name} not provided. Use the factory (createEmulator) for real instances, or inject mocks for tests.`);
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
  #interaction: TrezorDeviceInteraction | null = null;
  #running = false;

  constructor(opts: TrezorEmulatorOptions) {
    this.#docker = assert(opts.docker, 'docker');
    this.#controller = assert(opts.controller, 'controller');
    this.#sidecar = assert(opts.sidecarManager, 'sidecarManager');
    this.#model = opts.model ?? TREZOR_DEFAULT_MODEL;
    this.#seed = opts.seed ?? TREZOR_EMULATOR_SEED;
    this.#label = opts.label ?? 'MetaMask Test';
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
    await this.#controller.connect();
    await this.#controller.ping();
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
    await this.#controller.bridgeStart();
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
