import { createSidecarManager } from './sidecar-manager';

describe('TrezorSidecarManager', () => {
  it('start() runs the bridge binary + asset server, stop() kills them', async () => {
    const forks: string[][] = [];
    const started = createSidecarManager({
      bridgeBin: '/fake/bridge/bin.js',
      assetDir: __dirname,
      bridgeStartupDelayMs: 0,
      forkFn: (bin: string, args?: string[]) => {
        forks.push([bin, ...(args ?? [])]);
        // return a minimal child-process stub
        return { on: () => {}, kill: () => {}, connected: true } as any;
      },
    });

    await started.start();
    expect(forks[0]).toEqual(['/fake/bridge/bin.js', 'udp']);
    expect(started.isRunning()).toBe(true);

    await started.stop();
    expect(started.isRunning()).toBe(false);
  });

  it('rejects when the asset dir does not exist', async () => {
    const started = createSidecarManager({
      bridgeBin: '/fake/bridge/bin.js',
      assetDir: '/does/not/exist',
      bridgeStartupDelayMs: 0,
      forkFn: () => ({ on: () => {}, connected: true } as any),
    });
    await expect(started.start()).rejects.toThrow(
      'connect-web iframe assets not found',
    );
  });
});
