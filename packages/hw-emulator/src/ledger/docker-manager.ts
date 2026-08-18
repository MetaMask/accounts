// eslint-disable-next-line import-x/no-nodejs-modules
import { execFile } from 'node:child_process';
// eslint-disable-next-line import-x/no-nodejs-modules
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
// eslint-disable-next-line import-x/no-nodejs-modules
import { tmpdir } from 'node:os';
// eslint-disable-next-line import-x/no-nodejs-modules
import path from 'node:path';
// eslint-disable-next-line import-x/no-nodejs-modules
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const CONTAINER_NAME_PREFIX = 'metamask-speculos';
const HEALTH_CHECK_INTERVAL_MS = 1000;
const HEALTH_CHECK_TIMEOUT_MS = 60_000;
const DEFAULT_STOP_TIMEOUT_MS = 30_000;

/**
 * Injectable `docker` CLI runner. Production uses promisified `execFile`;
 * tests can substitute a fake. Follows the signature of
 * `util.promisify(child_process.execFile)`.
 */
export type DockerCommandRunner = (
  command: string,
  args: string[],
  options: { timeout: number; env?: Record<string, string | undefined> },
) => Promise<{ stdout: string; stderr: string }>;

/**
 * Check if a Docker container's health status is "healthy".
 *
 * @param containerName - The container to inspect.
 * @param runDocker - The command runner used to invoke docker.
 * @returns True if the container reports healthy.
 */
async function isContainerHealthy(
  containerName: string,
  runDocker: DockerCommandRunner,
): Promise<boolean> {
  try {
    const { stdout } = await runDocker(
      'docker',
      ['inspect', '--format={{.State.Health.Status}}', containerName],
      { timeout: HEALTH_CHECK_TIMEOUT_MS },
    );
    return stdout.trim() === 'healthy';
  } catch {
    return false;
  }
}

/**
 * Compose project and container names only allow lowercase letters, digits,
 * dashes and underscores.
 *
 * @param name - The raw name.
 * @returns The sanitized name.
 */
function sanitizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9_-]/gu, '-');
}

/**
 * Options for configuring the Docker-based Speculos manager.
 */
export type DockerManagerOptions = {
  /** Path to the docker-compose.yml file. */
  composeFile: string;
  /** TCP port for the APDU protocol. */
  apduPort: number;
  /** TCP port for the REST API. */
  apiPort: number;
  /** Path to the Ethereum app ELF binary. */
  app: string;
  /** Speculos device model identifier. */
  model?: string;
  /** BIP-39 mnemonic seed. */
  seed?: string;
  /** Display backend. */
  display?: string;
  /** Whether to load NVRAM state. */
  loadNvram?: boolean;
  /** Maximum time in milliseconds to wait for the container to start. */
  startTimeout?: number;
  /** Maximum time in milliseconds to wait for the container to stop. */
  stopTimeout?: number;
  /**
   * Container name. Defaults to a unique name derived from the APDU port so
   * multiple instances can run concurrently.
   */
  containerName?: string;
  /**
   * Docker Compose project name. Defaults to a name derived from the APDU
   * port; the same project is targeted by both start() and stop().
   */
  projectName?: string;
  /**
   * Injectable `docker` CLI runner for tests. Production uses
   * `execFile` from `node:child_process`.
   */
  execFileAsync?: DockerCommandRunner;
};

/** Lifecycle status of the Docker container. */
export type DockerManagerStatus = 'idle' | 'starting' | 'running' | 'stopping';

/**
 * Manage a Speculos Docker container via docker-compose.
 *
 * Each instance pins its own container name (via a generated compose override
 * file) and Compose project name so multiple managers can run concurrently
 * without fighting over a single hardcoded `metamask-speculos` container.
 */
export class DockerManager {
  readonly #options: DockerManagerOptions;

  readonly #exec: DockerCommandRunner;

  readonly #containerName: string;

  readonly #projectName: string;

  #containerStatus: DockerManagerStatus = 'idle';

  #overrideDir: string | null = null;

  /**
   * @param options - Docker manager configuration.
   */
  constructor(options: DockerManagerOptions) {
    this.#options = options;
    this.#exec = options.execFileAsync ?? execFileAsync;
    this.#containerName = sanitizeName(
      options.containerName ?? `${CONTAINER_NAME_PREFIX}-${options.apduPort}`,
    );
    this.#projectName = sanitizeName(
      options.projectName ?? `${CONTAINER_NAME_PREFIX}-${options.apduPort}`,
    );
  }

  /**
   * Get the container name used by this manager.
   *
   * @returns The Docker container name.
   */
  getContainerName(): string {
    return this.#containerName;
  }

  /**
   * Get the Docker Compose project name used by this manager.
   *
   * @returns The Compose project name.
   */
  getProjectName(): string {
    return this.#projectName;
  }

  /**
   * Build the environment variables map for docker-compose variable substitution.
   *
   * @returns A record of environment variable names to values.
   */
  buildDockerEnv(): Record<string, string> {
    // Extract ELF filename from full path for docker-compose.yml variable substitution
    const elfFilename = path.basename(this.#options.app);

    const env: Record<string, string> = {
      SPECULOS_DEVICE: this.#options.model ?? 'nanosp',
      SPECULOS_ELF_FILENAME: elfFilename,
      SPECULOS_APDU_PORT: String(this.#options.apduPort),
      SPECULOS_API_PORT: String(this.#options.apiPort),
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
   * Write a compose override file pinning this instance's container name, and
   * return the compose flags (-f/-p) shared by all compose invocations.
   *
   * @returns The compose command arguments.
   */
  async #prepareComposeArgs(): Promise<string[]> {
    this.#overrideDir = await mkdtemp(
      path.join(tmpdir(), `${CONTAINER_NAME_PREFIX}-`),
    );
    const overrideFile = path.join(
      this.#overrideDir,
      'docker-compose.override.yml',
    );
    await writeFile(
      overrideFile,
      `services:\n  speculos:\n    container_name: ${this.#containerName}\n`,
      'utf8',
    );
    return [
      '-f',
      this.#options.composeFile,
      '-f',
      overrideFile,
      '-p',
      this.#projectName,
    ];
  }

  /**
   * Remove the temporary override directory, if any.
   */
  async #removeOverrideDir(): Promise<void> {
    if (this.#overrideDir) {
      await rm(this.#overrideDir, { recursive: true, force: true });
      this.#overrideDir = null;
    }
  }

  /**
   * Run `docker compose down` for this instance's project.
   *
   * @param composeArgs - The compose flags from #prepareComposeArgs.
   * @param timeoutMs - Timeout in milliseconds for the command.
   */
  async #runComposeDown(
    composeArgs: string[],
    timeoutMs: number,
  ): Promise<void> {
    // `docker compose down --timeout` takes seconds.
    const timeoutSeconds = String(Math.max(1, Math.round(timeoutMs / 1000)));
    await this.#exec(
      'docker',
      ['compose', ...composeArgs, 'down', '--timeout', timeoutSeconds],
      { timeout: timeoutMs },
    );
  }

  /**
   * Start the Docker container and wait for health checks.
   *
   * If `docker compose up` or the health check fails, `docker compose down`
   * is run for this project before the error is rethrown so no container is
   * left running behind.
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

    let composeArgs: string[];
    try {
      composeArgs = await this.#prepareComposeArgs();
    } catch (prepareError) {
      this.#containerStatus = 'idle';
      throw prepareError;
    }

    try {
      // Merge docker env vars into the process environment so that
      // docker-compose.yml variable substitution picks them up.
      // (docker compose up does NOT support -e flags — only docker compose run does.)
      // eslint-disable-next-line no-restricted-globals
      const childEnv = { ...process.env, ...env };

      await this.#exec('docker', ['compose', ...composeArgs, 'up', '-d'], {
        timeout,
        env: childEnv,
      });

      const deadline = Date.now() + timeout;
      while (Date.now() < deadline) {
        if (await isContainerHealthy(this.#containerName, this.#exec)) {
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
      // Tear the (possibly partially started) container down so nothing is
      // left running. Best effort — always rethrow the original error.
      const stopTimeout = this.#options.stopTimeout ?? DEFAULT_STOP_TIMEOUT_MS;
      try {
        await this.#runComposeDown(composeArgs, stopTimeout);
      } catch {
        // Best effort — surface the original error instead.
      }
      await this.#removeOverrideDir().catch(() => undefined);
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
    // Only treat the manager as fully stopped when the container is idle AND
    // no override directory is left behind. A failed start() resets the
    // status to 'idle' in its catch block, but the best-effort override-dir
    // cleanup there can itself fail — leaving #overrideDir set. Checking
    // only the status would then leak that leftover directory, so stop()
    // must still run to remove it.
    if (this.#containerStatus === 'idle' && this.#overrideDir === null) {
      return;
    }
    this.#containerStatus = 'stopping';

    const timeout = this.#options.stopTimeout ?? DEFAULT_STOP_TIMEOUT_MS;

    try {
      if (this.#overrideDir) {
        const overrideFile = path.join(
          this.#overrideDir,
          'docker-compose.override.yml',
        );
        await this.#exec(
          'docker',
          [
            'compose',
            '-f',
            this.#options.composeFile,
            '-f',
            overrideFile,
            '-p',
            this.#projectName,
            'down',
            '--timeout',
            String(Math.max(1, Math.round(timeout / 1000))),
          ],
          { timeout },
        );
      }
    } finally {
      await this.#removeOverrideDir().catch(() => undefined);
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
