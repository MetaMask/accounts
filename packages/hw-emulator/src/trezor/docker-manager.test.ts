import { TrezorDockerManager } from './docker-manager';

describe('TrezorDockerManager', () => {
  it('runs docker compose up -d with the given compose file', async () => {
    const calls: string[][] = [];
    const mgr = new TrezorDockerManager({
      composeFile: '/tmp/trezor.yml',
      runner: async (
        file: string,
        args: string[],
      ): Promise<{ stdout: string; stderr: string }> => {
        calls.push([file, ...args]);
        return { stdout: '', stderr: '' };
      },
    });
    await mgr.start();
    expect(calls[0]).toStrictEqual([
      'docker',
      'compose',
      '-f',
      '/tmp/trezor.yml',
      'up',
      '-d',
    ]);
  });

  it('runs docker compose down on stop', async () => {
    const calls: string[][] = [];
    const mgr = new TrezorDockerManager({
      composeFile: '/tmp/trezor.yml',
      runner: async (
        file: string,
        args: string[],
      ): Promise<{ stdout: string; stderr: string }> => {
        calls.push([file, ...args]);
        return { stdout: '', stderr: '' };
      },
    });
    await mgr.stop();
    expect(calls[0]).toStrictEqual([
      'docker',
      'compose',
      '-f',
      '/tmp/trezor.yml',
      'down',
    ]);
  });
});
