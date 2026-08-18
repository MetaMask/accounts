// eslint-disable-next-line import-x/no-nodejs-modules
import { execFileSync, spawn } from 'node:child_process';
// eslint-disable-next-line import-x/no-nodejs-modules
import type { ChildProcess } from 'node:child_process';
// eslint-disable-next-line import-x/no-nodejs-modules
import { existsSync } from 'node:fs';
// eslint-disable-next-line import-x/no-nodejs-modules
import { dirname, join, resolve } from 'node:path';

import type {
  SpeculosBleConfig,
  SpeculosBleLogStream,
  SpeculosBleRunnerOptions,
} from './types';

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
  readonly #config: SpeculosBleConfig;

  readonly #onLog:
    | ((line: string, stream: SpeculosBleLogStream) => void)
    | undefined;

  #childProcess: ChildProcess | undefined;

  /**
   * Resolve the package root directory.
   *
   * Defaults to the directory two levels above the compiled output
   * (`dist/ble/` → package root). Override with the `SPECULOS_BLE_PACKAGE_DIR`
   * environment variable so the runner can locate `python_src/`, `scripts/`,
   * and the venv even when the package has been copied into a consumer's
   * `node_modules` (e.g. via a Yarn `file:` resolution), where the relative
   * resolution would point at the copy rather than the source of truth.
   *
   * @returns The resolved package root directory.
   */
  static get packageDir(): string {
    // eslint-disable-next-line no-restricted-globals
    const envDir = process.env.SPECULOS_BLE_PACKAGE_DIR;
    return envDir
      ? resolve(envDir)
      : // eslint-disable-next-line no-restricted-globals
        dirname(dirname(__dirname));
  }

  /**
   * Resolve the Python source directory (`<packageDir>/python_src`).
   *
   * @returns The resolved Python source directory.
   */
  static get pythonDir(): string {
    return join(SpeculosBleRunner.packageDir, 'python_src');
  }

  /**
   * Resolve the virtualenv directory.
   *
   * Defaults to `<packageDir>/.venv`. Override with the
   * `SPECULOS_BLE_VENV_DIR` environment variable (mirrors
   * `scripts/setup-python.sh`) to keep the venv at a stable location
   * independent of where the package is resolved.
   *
   * @returns The resolved virtualenv directory.
   */
  static get venvDir(): string {
    // eslint-disable-next-line no-restricted-globals
    const envVenv = process.env.SPECULOS_BLE_VENV_DIR;
    return envVenv
      ? resolve(envVenv)
      : join(SpeculosBleRunner.packageDir, '.venv');
  }

  /**
   * Path to the Python venv interpreter.
   *
   * @returns The path to the venv's Python interpreter.
   */
  static get venvPython(): string {
    return join(SpeculosBleRunner.venvDir, 'bin', 'python');
  }

  /**
   * Check whether the Python venv has been created.
   *
   * @returns True if the venv interpreter exists.
   */
  static isVenvReady(): boolean {
    return existsSync(SpeculosBleRunner.venvPython);
  }

  /**
   * Run `scripts/setup-python.sh` to create the venv.
   *
   * The script path is passed as a dedicated argument to `bash` via
   * `execFileSync` (no shell) so it is never subject to shell interpolation.
   */
  static setupVenv(): void {
    const script = join(
      SpeculosBleRunner.packageDir,
      'scripts',
      'setup-python.sh',
    );
    execFileSync('bash', [script], { stdio: 'inherit' });
  }

  constructor(options: SpeculosBleRunnerOptions = {}) {
    this.#config = { ...DEFAULT_CONFIG, ...options };
    this.#onLog = options.onLog;
  }

  /**
   * Speculos host.
   *
   * @returns The configured Speculos host.
   */
  get host(): string {
    return this.#config.speculosHost;
  }

  /**
   * Control API port.
   *
   * @returns The configured Control API port.
   */
  get controlApiPort(): number {
    return this.#config.controlApiPort;
  }

  /**
   * Whether the child process is still running.
   *
   * @returns True if the child process has not exited.
   */
  get isRunning(): boolean {
    return this.#childProcess?.exitCode === null;
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
      this.#config.transport,
      '--device-name',
      this.#config.deviceName,
      '--speculos-host',
      this.#config.speculosHost,
      '--speculos-apdu-port',
      String(this.#config.speculosApduPort),
      '--speculos-api-port',
      String(this.#config.speculosApiPort),
      '--control-api-port',
      String(this.#config.controlApiPort),
    ];

    if (this.#config.verbose) {
      args.push('-v');
    }

    this.#childProcess = spawn(SpeculosBleRunner.venvPython, args, {
      cwd: SpeculosBleRunner.pythonDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        // eslint-disable-next-line no-restricted-globals
        ...process.env,
        VIRTUAL_ENV: SpeculosBleRunner.venvDir,
      },
    });

    const proc = this.#childProcess;
    const onLog = this.#onLog;
    if (onLog) {
      proc.stdout?.on('data', (data: Buffer) => {
        const line = data.toString().trim();
        if (line) {
          onLog(line, 'stdout');
        }
      });
      proc.stderr?.on('data', (data: Buffer) => {
        const line = data.toString().trim();
        if (line) {
          onLog(line, 'stderr');
        }
      });
      proc.on('error', (error: Error) => {
        onLog(error.message, 'error');
      });
      proc.on('exit', (code: number | null, signal: string | null) => {
        onLog(`exited code=${code} signal=${signal}`, 'exit');
      });
    }

    return this.#childProcess;
  }

  /**
   * Stop the BLE bridge service gracefully (SIGTERM, then SIGKILL after 5s).
   *
   * Killing a process that already exited throws, so both signals are
   * best-effort and an already-exited process is a no-op.
   */
  async stop(): Promise<void> {
    const proc = this.#childProcess;
    if (!proc) {
      return;
    }
    this.#childProcess = undefined;

    // Already exited — nothing to terminate or wait for.
    if (proc.exitCode !== null || proc.signalCode !== null) {
      return;
    }

    try {
      proc.kill('SIGTERM');
    } catch {
      // Already exited.
      return;
    }

    await new Promise<void>((resolveExit) => {
      const killTimer = setTimeout(() => {
        try {
          proc.kill('SIGKILL');
        } catch {
          // Already exited.
        }
        resolveExit();
      }, 5_000);
      proc.once('exit', () => {
        clearTimeout(killTimer);
        resolveExit();
      });
    });
  }

  /**
   * Check whether the Control API is responding and reports `ready`.
   *
   * The abort timer is always cleared, including when the fetch rejects, so
   * no timer is leaked.
   *
   * @returns True if the Control API reports `ready`.
   */
  async isControlApiReady(): Promise<boolean> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2_000);
    try {
      const resp = await fetch(
        `http://${this.#config.speculosHost}:${this.#config.controlApiPort}/health`,
        { signal: controller.signal },
      );
      if (!resp.ok) {
        return false;
      }
      const json = (await resp.json()) as { status: string };
      return json.status === 'ready';
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
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
      await new Promise((resolveDelay) => {
        setTimeout(resolveDelay, delayMs);
      });
    }
    throw new Error(
      `Control API not ready at ${this.#config.speculosHost}:${this.#config.controlApiPort} after ${maxRetries} retries`,
    );
  }

  /**
   * Disconnect any active BLE connections via the Control API.
   */
  async disconnectBle(): Promise<void> {
    try {
      await fetch(
        `http://${this.#config.speculosHost}:${this.#config.controlApiPort}/ble/disconnect`,
        { method: 'POST' },
      );
    } catch {
      // Best effort
    }
  }
}
