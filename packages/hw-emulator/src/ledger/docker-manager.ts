// eslint-disable-next-line import-x/no-nodejs-modules
import { execFile } from 'node:child_process';
// eslint-disable-next-line import-x/no-nodejs-modules
import { promisify } from 'node:util';
// eslint-disable-next-line import-x/no-nodejs-modules
import net from 'node:net';

const execFileAsync = promisify(execFile);

const HEALTH_CHECK_INTERVAL_MS = 500;
const HEALTH_CHECK_TIMEOUT_MS = 60_000;

export type DockerManagerOptions = {
  composeFile: string;
  apduPort: number;
  apiPort: number;
  app: string;
  model?: string;
  seed?: string;
  display?: string;
  loadNvram?: boolean;
  startTimeout?: number;
  stopTimeout?: number;
};

export type DockerManagerStatus =
  | 'idle'
  | 'starting'
  | 'running'
  | 'stopping';

async function isTcpReachable(
  port: number,
  host = '127.0.0.1',
  timeoutMs = 1000,
): Promise<boolean> {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    let settled = false;
    const finish = (ok: boolean): void => {
      if (settled) {
        return;
      }
      settled = true;
      sock.destroy();
      resolve(ok);
    };
    sock.setTimeout(timeoutMs);
    sock.once('connect', () => finish(true));
    sock.once('timeout', () => finish(false));
    sock.once('error', () => finish(false));
    sock.connect(port, host);
  });
}

/**
 * Manage a Speculos Docker container via docker-compose.
 */
export class DockerManager {
  readonly #options: DockerManagerOptions;

  #containerStatus: DockerManagerStatus = 'idle';

  constructor(options: DockerManagerOptions) {
    this.#options = options;
  }

  buildDockerEnv(): Record<string, string> {
    // Extract ELF filename from full path for docker-compose.yml variable substitution
    const elfFilename = this.#options.app.split('/').pop() ?? this.#options.app;

    const env: Record<string, string> = {
      SPECULOS_DEVICE: this.#options.model ?? 'nanosp',
      SPECULOS_ELF_FILENAME: elfFilename,
    };
    if (this.#options.seed) {
      env.SPECULOS_SEED = this.#options.seed;
    }
    if (this.#options.display) {
      env.SPECULOS_DISPLAY = this.#options.display;
    }
    return env;
  }

  /**
   * Start the Docker container and wait for health checks.
   *
   * @returns A promise that resolves when the container is healthy.
   */
  async start(): Promise<void> {
    if (this.#containerStatus !== 'idle') {
      throw new Error(
        `Docker container not idle (current: ${this.#containerStatus})`,
      );
    }
    this.#containerStatus = 'starting';

    const env = this.buildDockerEnv();

    const timeout = this.#options.startTimeout ?? HEALTH_CHECK_TIMEOUT_MS;

    try {
      // Merge docker env vars into the process environment so that
      // docker-compose.yml variable substitution picks them up.
      // (docker compose up does NOT support -e flags — only docker compose run does.)
      const childEnv = { ...process.env, ...env };

      await execFileAsync('docker', [
        'compose',
        '-f',
        this.#options.composeFile,
        'up',
        '-d',
      ], { timeout, env: childEnv });

      const deadline = Date.now() + timeout;
      while (Date.now() < deadline) {
        const [apduOk, apiOk] = await Promise.all([
          isTcpReachable(this.#options.apduPort),
          isTcpReachable(this.#options.apiPort),
        ]);
        if (apduOk && apiOk) {
          this.#containerStatus = 'running';
          return;
        }
        await new Promise((resolve) =>
          setTimeout(resolve, HEALTH_CHECK_INTERVAL_MS),
        );
      }

      throw new Error(
        `Docker container health check timed out after ${timeout}ms`,
      );
    } catch (startError: unknown) {
      this.#containerStatus = 'idle';
      throw startError;
    }
  }

  /**
   * Stop and remove the Docker container.
   *
   * @returns A promise that resolves when the container is stopped.
   */
  async stop(): Promise<void> {
    if (this.#containerStatus === 'idle') {
      return;
    }
    this.#containerStatus = 'stopping';

    const timeout = this.#options.stopTimeout ?? 30_000;

    try {
      await execFileAsync(
        'docker',
        ['compose', '-f', this.#options.composeFile, 'down', '--timeout', '10'],
        { timeout },
      );
    } finally {
      this.#containerStatus = 'idle';
    }
  }

  /**
   * Get the current container status.
   *
   * @returns The container status.
   */
  getStatus(): DockerManagerStatus {
    return this.#containerStatus;
  }
}
