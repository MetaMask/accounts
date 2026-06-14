import { execSync, spawn, type ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import type { SpeculosBleConfig, SpeculosBleRunnerOptions } from './types';

const DEFAULT_CONFIG: SpeculosBleConfig = {
  speculosHost: '127.0.0.1',
  speculosApduPort: 9998,
  speculosApiPort: 5001,
  controlApiPort: 5002,
  deviceName: 'Ledger Nano X',
  transport: 'android-netsim',
  verbose: false,
};

/**
 * Manages the lifecycle of the speculos-ble Python service.
 *
 * This TypeScript wrapper provides a programmatic API for starting,
 * monitoring, and stopping the BLE bridge process that emulates a
 * Bluetooth Ledger device using Speculos.
 *
 * The Python source lives under `python_src/` in this package. The
 * virtual environment is created at `.venv/` by running
 * `scripts/setup-python.sh`.
 */
export class SpeculosBleRunner {
  private readonly config: SpeculosBleConfig;

  private childProcess: ChildProcess | undefined;

  /**
   * Resolve the Python source directory relative to the compiled
   * TypeScript output (`dist/`).
   */
  static get pythonDir(): string {
    return resolve(dirname(__dirname), 'python_src');
  }

  /**
   * Resolve the package root directory (parent of `dist/`).
   */
  static get packageDir(): string {
    return dirname(__dirname);
  }

  /**
   * Path to the Python venv interpreter.
   */
  static get venvPython(): string {
    return join(SpeculosBleRunner.packageDir, '.venv', 'bin', 'python');
  }

  /**
   * Check whether the Python venv has been created.
   */
  static isVenvReady(): boolean {
    return existsSync(SpeculosBleRunner.venvPython);
  }

  /**
   * Run `scripts/setup-python.sh` to create the venv.
   */
  static setupVenv(): void {
    const script = join(SpeculosBleRunner.packageDir, 'scripts', 'setup-python.sh');
    execSync(`bash "${script}"`, { stdio: 'inherit' });
  }

  constructor(options: SpeculosBleRunnerOptions = {}) {
    this.config = { ...DEFAULT_CONFIG, ...options };
  }

  /** Speculos host. */
  get host(): string {
    return this.config.speculosHost;
  }

  /** Control API port. */
  get controlApiPort(): number {
    return this.config.controlApiPort;
  }

  /** Whether the child process is still running. */
  get isRunning(): boolean {
    return this.childProcess !== undefined && this.childProcess.exitCode === null;
  }

  /**
   * Start the BLE bridge Python service.
   *
   * @returns The spawned child process.
   * @throws If the venv is not ready.
   */
  start(): ChildProcess {
    if (!SpeculosBleRunner.isVenvReady()) {
      throw new Error(
        'Python venv not found. Run `SpeculosBleRunner.setupVenv()` or `scripts/setup-python.sh` first.',
      );
    }

    const args = [
      '-m',
      'speculos_ble',
      '--transport',
      this.config.transport,
      '--device-name',
      this.config.deviceName,
      '--speculos-host',
      this.config.speculosHost,
      '--speculos-apdu-port',
      String(this.config.speculosApduPort),
      '--speculos-api-port',
      String(this.config.speculosApiPort),
      '--control-api-port',
      String(this.config.controlApiPort),
    ];

    if (this.config.verbose) {
      args.push('-v');
    }

    this.childProcess = spawn(SpeculosBleRunner.venvPython, args, {
      cwd: SpeculosBleRunner.pythonDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        VIRTUAL_ENV: join(SpeculosBleRunner.packageDir, '.venv'),
      },
    });

    return this.childProcess;
  }

  /**
   * Stop the BLE bridge service gracefully (SIGTERM, then SIGKILL after 5s).
   */
  async stop(): Promise<void> {
    const proc = this.childProcess;
    if (!proc) {
      return;
    }
    this.childProcess = undefined;

    proc.kill('SIGTERM');

    await new Promise<void>((res) => {
      proc.once('exit', () => res());
      setTimeout(() => {
        proc.kill('SIGKILL');
        res();
      }, 5_000);
    });
  }

  /**
   * Check whether the Control API is responding and reports `ready`.
   */
  async isControlApiReady(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2_000);
      const resp = await fetch(
        `http://${this.config.speculosHost}:${this.config.controlApiPort}/health`,
        { signal: controller.signal },
      );
      clearTimeout(timeout);
      if (!resp.ok) {
        return false;
      }
      const json = (await resp.json()) as { status: string };
      return json.status === 'ready';
    } catch {
      return false;
    }
  }

  /**
   * Poll the Control API until it is ready or the retry budget is exhausted.
   *
   * @param maxRetries - Maximum number of polling attempts.
   * @param delayMs - Delay between attempts in milliseconds.
   * @throws If the Control API does not become ready in time.
   */
  async waitForControlApi(maxRetries = 30, delayMs = 2_000): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      if (await this.isControlApiReady()) {
        return;
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }
    throw new Error(
      `Control API not ready at ${this.config.speculosHost}:${this.config.controlApiPort} after ${maxRetries} retries`,
    );
  }

  /**
   * Disconnect any active BLE connections via the Control API.
   */
  async disconnectBle(): Promise<void> {
    try {
      await fetch(
        `http://${this.config.speculosHost}:${this.config.controlApiPort}/ble/disconnect`,
        { method: 'POST' },
      );
    } catch {
      // Best effort
    }
  }
}
