import { execSync, spawn, type ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
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
  private readonly config: SpeculosBleConfig;

  private readonly onLog:
    | ((line: string, stream: SpeculosBleLogStream) => void)
    | undefined;

  private childProcess: ChildProcess | undefined;

  /**
   * Resolve the package root directory.
   *
   * Defaults to the directory two levels above the compiled output
   * (`dist/ble/` → package root). Override with the `SPECULOS_BLE_PACKAGE_DIR`
   * environment variable so the runner can locate `python_src/`, `scripts/`,
   * and the venv even when the package has been copied into a consumer's
   * `node_modules` (e.g. via a Yarn `file:` resolution), where the relative
   * resolution would point at the copy rather than the source of truth.
   */
  static get packageDir(): string {
    const envDir = process.env.SPECULOS_BLE_PACKAGE_DIR;
    return envDir ? resolve(envDir) : dirname(dirname(__dirname));
  }

  /**
   * Resolve the Python source directory (`<packageDir>/python_src`).
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
   */
  static get venvDir(): string {
    const envVenv = process.env.SPECULOS_BLE_VENV_DIR;
    return envVenv ? resolve(envVenv) : join(SpeculosBleRunner.packageDir, '.venv');
  }

  /**
   * Path to the Python venv interpreter.
   */
  static get venvPython(): string {
    return join(SpeculosBleRunner.venvDir, 'bin', 'python');
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
    this.onLog = options.onLog;
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
        VIRTUAL_ENV: SpeculosBleRunner.venvDir,
      },
    });

    const proc = this.childProcess;
    const onLog = this.onLog;
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
      proc.on('error', (err: Error) => {
        onLog(err.message, 'error');
      });
      proc.on('exit', (code, signal) => {
        onLog(`exited code=${code} signal=${signal}`, 'exit');
      });
    }

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
