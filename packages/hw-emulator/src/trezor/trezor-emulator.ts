import type { HardwareWalletEmulator } from '../types';
import {
  TREZOR_DEFAULT_MODEL,
  TREZOR_EMULATOR_SEED,
  TREZOR_TRANSPORT_BRIDGE_PORT,
} from './constants';
import type { TrezorControllerClient } from './controller-client';
import { TrezorControllerClient as RealTrezorControllerClient } from './controller-client';
import type { DeviceInteraction } from './device-interaction';
import { TrezorDeviceInteraction } from './device-interaction';
import type { TrezorDockerManager } from './docker-manager';
import { TrezorDockerManager as RealTrezorDockerManager } from './docker-manager';
import { MODEL_PROFILES } from './model-profiles';
import type { TrezorModel } from './model-profiles';
import type {
  SidecarManagerOptions,
  TrezorSidecarManager,
} from './sidecar-manager';
import { createSidecarManager } from './sidecar-manager';

/**
 * Attempts to connect and ping the trezor-user-env WebSocket controller
 * before giving up. Docker startup of trezor-user-env takes 30+ s, so this
 * is deliberately generous.
 */
const CONTROLLER_CONNECT_MAX_ATTEMPTS = 60;

/** Delay between controller connection attempts. */
const CONTROLLER_CONNECT_INTERVAL_MS = 2000;

/** Time to wait for the bridge HTTP server to bind inside the container. */
const BRIDGE_READY_DELAY_MS = 5000;

export type TrezorEmulatorOptions = {
  model?: TrezorModel;
  seed?: string;
  label?: string;
  /**
   * Path to the trezor-user-env docker-compose.yml used by the built-in
   * Docker manager. Required unless a `docker` manager is injected.
   */
  composeFile?: string;
  connectSrcPort?: number;
  /**
   * Port the iframe's BridgeTransport talks to (the sidecar's CORS proxy
   * listens here).
   */
  transportBridgePort?: number;
  controllerPort?: number;
  /** Absolute path to the connect-web iframe assets directory. */
  assetDir?: string;
  // Injectable for tests; production constructs real instances:
  docker?: TrezorDockerManager;
  controller?: TrezorControllerClient;
  sidecarManager?: TrezorSidecarManager;
};

export class TrezorEmulator implements HardwareWalletEmulator {
  readonly #docker: TrezorDockerManager;

  readonly #controller: TrezorControllerClient;

  readonly #sidecar: TrezorSidecarManager;

  readonly #model: TrezorModel;

  readonly #seed: string;

  readonly #label: string;

  readonly #composeFile: string;

  readonly #connectSrcPort: number;

  readonly #transportBridgePort: number;

  #interaction: TrezorDeviceInteraction | null = null;

  #running = false;

  constructor(opts: TrezorEmulatorOptions) {
    this.#model = opts.model ?? TREZOR_DEFAULT_MODEL;
    this.#seed = opts.seed ?? TREZOR_EMULATOR_SEED;
    this.#label = opts.label ?? 'MetaMask Test';
    // The compose file is only needed when constructing the real Docker
    // manager below; an injected test double never reads it.
    if (!opts.composeFile && !opts.docker) {
      throw new Error(
        'TrezorEmulator: the composeFile option (path to the trezor-user-env docker-compose.yml) is required when no docker manager is injected.',
      );
    }
    this.#composeFile = opts.composeFile ?? '';
    this.#connectSrcPort = opts.connectSrcPort ?? 8088;
    this.#transportBridgePort =
      opts.transportBridgePort ?? TREZOR_TRANSPORT_BRIDGE_PORT;
    this.#docker =
      opts.docker ??
      new RealTrezorDockerManager({ composeFile: this.#composeFile });
    this.#controller =
      opts.controller ??
      new RealTrezorControllerClient(
        opts.controllerPort ? { port: opts.controllerPort } : {},
      );
    const sidecarOpts: SidecarManagerOptions = {
      assetServerPort: this.#connectSrcPort,
      corsProxyPort: this.#transportBridgePort,
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

  /**
   * Get the controller client used to talk to trezor-user-env.
   *
   * Available before `start()`; commands fail until the controller
   * WebSocket is connected, which `start()` manages.
   *
   * @returns The controller client.
   */
  getControllerClient(): TrezorControllerClient {
    return this.#controller;
  }

  /**
   * Get the sidecar manager (bridge CORS proxy + iframe asset server).
   *
   * Available before `start()`; its servers only listen after `start()`.
   *
   * @returns The sidecar manager.
   */
  getSidecarManager(): TrezorSidecarManager {
    return this.#sidecar;
  }

  /**
   * Get the device interaction helper for confirm/reject/scroll actions.
   *
   * @returns The interaction helper.
   * @throws If the emulator has not been started.
   */
  getInteraction(): DeviceInteraction {
    if (!this.#interaction) {
      throw new Error('emulator not started');
    }
    return this.#interaction;
  }

  /**
   * Capture a screenshot of the emulated device screen.
   *
   * @returns The screenshot as a PNG buffer.
   * @throws If the emulator has not been started (the controller connection
   * is only established by `start()`).
   */
  async getScreenshot(): Promise<Buffer> {
    return this.#controller.getScreenshot();
  }

  async start(): Promise<void> {
    await this.#docker.start();

    // Wait for the controller to become available (Docker startup takes 30+ s)
    for (
      let attempt = 0;
      attempt < CONTROLLER_CONNECT_MAX_ATTEMPTS;
      attempt++
    ) {
      try {
        await this.#controller.connect();
        await this.#controller.ping();
        break;
      } catch {
        await this.#controller.disconnect().catch(() => undefined);
        if (attempt === CONTROLLER_CONNECT_MAX_ATTEMPTS - 1) {
          // Do not leave the Docker stack running when the controller
          // never becomes available.
          await this.#docker.stop().catch(() => undefined);
          const timeoutSeconds =
            (CONTROLLER_CONNECT_MAX_ATTEMPTS * CONTROLLER_CONNECT_INTERVAL_MS) /
            1000;
          throw new Error(`Controller not reachable within ${timeoutSeconds}s`);
        }
        await new Promise((resolve) =>
          setTimeout(resolve, CONTROLLER_CONNECT_INTERVAL_MS),
        );
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
    await new Promise((resolve) => setTimeout(resolve, BRIDGE_READY_DELAY_MS));
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
    // HardwareWalletEmulator-facing name; on Trezor this dismisses a long
    // transaction summary by scrolling to its end.
    await this.getInteraction().dismissSummaryScreen();
  }
}
