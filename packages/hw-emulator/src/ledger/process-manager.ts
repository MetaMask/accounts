// eslint-disable-next-line import-x/no-nodejs-modules
import { spawn } from 'node:child_process';
// eslint-disable-next-line import-x/no-nodejs-modules
import type { ChildProcess } from 'node:child_process';
// eslint-disable-next-line import-x/no-nodejs-modules
import { EventEmitter } from 'node:events';
// eslint-disable-next-line import-x/no-nodejs-modules
import net from 'node:net';

const READINESS_POLL_INTERVAL_MS = 250;
const READINESS_PROBE_TIMEOUT_MS = 1000;
const DEFAULT_APDU_PORT = 9999;
const DEFAULT_API_PORT = 5000;

/**
 * Options for configuring the native Speculos process manager.
 */
export type ProcessManagerOptions = {
  /** Path to the Speculos binary. */
  binary: string;
  /** Path to the Ethereum app ELF binary. */
  app: string;
  /** Speculos device model identifier. */
  model?: string;
  /** BIP-39 mnemonic seed. */
  seed?: string;
  /** TCP port for the APDU protocol. */
  apduPort?: number;
  /** TCP port for the REST API. */
  apiPort?: number;
  /** Display backend. */
  display?: string;
  /** Whether to load NVRAM state. */
  loadNvram?: boolean;
  /** Working directory for the spawned process. */
  cwd?: string;
  /** Maximum time in milliseconds to wait for the process to start. */
  startTimeout?: number;
  /** Maximum time in milliseconds to wait for the process to stop. */
  stopTimeout?: number;
};

/** Lifecycle status of the Speculos process. */
export type ProcessManagerStatus =
  | 'idle'
  | 'starting'
  | 'listening'
  | 'stopping';

/**
 * Interface for managing the Speculos native process lifecycle.
 */
export type ProcessManager = {
  /** Start the Speculos process and wait until APDU and API ports are reachable. */
  start(): Promise<void>;
  /** Stop the Speculos process gracefully. */
  stop(): Promise<void>;
  /** Current process status. */
  readonly status: ProcessManagerStatus;
  /** Process ID of the running Speculos instance, or undefined. */
  readonly pid: number | undefined;
};

/**
 * Check if a TCP port is reachable within a given timeout.
 *
 * @param port - The port number to check.
 * @param host - The hostname to connect to.
 * @param timeoutMs - Connection timeout in milliseconds.
 * @returns True if the port is reachable.
 */
async function isTcpReachable(
  port: number,
  host = '127.0.0.1',
  timeoutMs = READINESS_PROBE_TIMEOUT_MS,
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
 * Create a process manager for spawning a native Speculos binary.
 *
 * @param options - Process configuration.
 * @returns A ProcessManager instance.
 */
export function createProcessManager(
  options: ProcessManagerOptions,
): ProcessManager {
  let proc: ChildProcess | undefined;
  let status: ProcessManagerStatus = 'idle';
  const emitter = new EventEmitter();

  function buildArgs(): string[] {
    const args: string[] = [];
    if (options.model) {
      args.push('--model', options.model);
    }
    if (options.seed) {
      args.push('--seed', options.seed);
    }
    if (options.apduPort !== undefined) {
      args.push('--apdu-port', String(options.apduPort));
    }
    if (options.apiPort !== undefined) {
      args.push('--api-port', String(options.apiPort));
    }
    if (options.display) {
      args.push('--display', options.display);
    }
    if (options.loadNvram) {
      args.push('--load-nvram');
    }
    args.push(options.app);
    return args;
  }

  async function start(): Promise<void> {
    if (status !== 'idle') {
      throw new Error(`Speculos process not idle (current: ${status})`);
    }
    status = 'starting';

    const binaryPath = options.binary;
    const args = buildArgs();
    const timeout = options.startTimeout ?? 60_000;
    const apduPort = options.apduPort ?? DEFAULT_APDU_PORT;
    const apiPort = options.apiPort ?? DEFAULT_API_PORT;

    return new Promise((resolve, reject) => {
      let lastLog: string | undefined;
      let settled = false;
      let pollHandle: ReturnType<typeof setTimeout> | undefined;
      let startTimer: ReturnType<typeof setTimeout> | undefined;

      const onExit = (exitCode: number | null): void => {
        if (settled) {
          return;
        }
        if (status === 'starting') {
          settled = true;
          status = 'idle';
          if (pollHandle) {
            clearTimeout(pollHandle);
            pollHandle = undefined;
          }
          if (startTimer) {
            clearTimeout(startTimer);
            startTimer = undefined;
          }
          reject(
            new Error(
              `Speculos exited during startup${lastLog ? `: ${lastLog.trim()}` : ''} (code ${exitCode})`,
            ),
          );
        }
      };

      const cleanup = (): void => {
        if (pollHandle) {
          clearTimeout(pollHandle);
          pollHandle = undefined;
        }
        if (startTimer) {
          clearTimeout(startTimer);
          startTimer = undefined;
        }
        proc?.removeListener('exit', onExit);
      };

      const onStdout = (data: Buffer): void => {
        const line = data.toString();
        emitter.emit('log', line);
        lastLog = line;
      };

      startTimer = setTimeout(() => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        proc?.kill('SIGTERM');
        status = 'idle';
        reject(new Error('Speculos failed to start within timeout'));
      }, timeout);

      const pollReady = async (): Promise<void> => {
        if (settled) {
          return;
        }
        try {
          const [apduOk, apiOk] = await Promise.all([
            isTcpReachable(apduPort),
            isTcpReachable(apiPort),
          ]);
          if (apduOk && apiOk) {
            if (settled) {
              return;
            }
            settled = true;
            status = 'listening';
            cleanup();
            resolve();
            return;
          }
        } catch {
          // probe failure is non-fatal
        }
        if (!settled) {
          pollHandle = setTimeout(
            () =>
              // eslint-disable-next-line no-void
              void pollReady(),
            READINESS_POLL_INTERVAL_MS,
          );
        }
      };

      const spawnOpts: import('node:child_process').SpawnOptions = {
        stdio: ['pipe', 'pipe', 'pipe'],
      };
      if (options.cwd) {
        spawnOpts.cwd = options.cwd;
      }
      proc = spawn(binaryPath, args, spawnOpts);
      proc.stdout?.on('data', onStdout);
      proc.stderr?.on('data', onStdout);
      proc.on('exit', onExit as (code: number | null) => void);
      proc.on('error', (spawnError: Error) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        status = 'idle';
        reject(spawnError);
      });

      pollHandle = setTimeout(
        () =>
          // eslint-disable-next-line no-void
          void pollReady(),
        READINESS_POLL_INTERVAL_MS,
      );
    });
  }

  async function stop(): Promise<void> {
    if (!proc || status === 'idle') {
      return undefined;
    }
    status = 'stopping';
    const timeout = options.stopTimeout ?? 10_000;

    return new Promise((resolve) => {
      const stopTimer = setTimeout((): void => {
        proc?.kill('SIGKILL');
        status = 'idle';
        resolve();
      }, timeout);

      if (proc) {
        proc.on('exit', () => {
          clearTimeout(stopTimer);
          status = 'idle';
          proc = undefined;
          resolve();
        });
        proc.kill('SIGTERM');
      } else {
        clearTimeout(stopTimer);
        status = 'idle';
        resolve();
      }
    });
  }

  return {
    start,
    stop,
    get status(): ProcessManagerStatus {
      return status;
    },
    get pid(): number | undefined {
      return proc?.pid;
    },
  };
}
