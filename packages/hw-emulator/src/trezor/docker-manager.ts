import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type DockerRunner = (
  file: string,
  args: string[],
) => Promise<{ stdout: string; stderr: string }>;

export interface DockerManagerOptions {
  composeFile: string;
  runner?: DockerRunner;
}

export class TrezorDockerManager {
  readonly #composeFile: string;
  readonly #runner: DockerRunner;

  constructor(opts: DockerManagerOptions) {
    this.#composeFile = opts.composeFile;
    this.#runner =
      opts.runner ??
      ((file, args) => execFileAsync(file, args));
  }

  async start(): Promise<void> {
    await this.#runner('docker', [
      'compose',
      '-f',
      this.#composeFile,
      'up',
      '-d',
    ]);
  }

  async stop(): Promise<void> {
    await this.#runner('docker', [
      'compose',
      '-f',
      this.#composeFile,
      'down',
    ]);
  }
}
