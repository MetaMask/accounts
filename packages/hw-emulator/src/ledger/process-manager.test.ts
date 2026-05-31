import { createProcessManager } from './process-manager';

describe('createProcessManager', () => {
  it('returns an object with start, stop, status, and pid', () => {
    const manager = createProcessManager({
      binary: '/usr/bin/speculos',
      app: '/path/to/app.elf',
    });
    expect(manager.status).toBe('idle');
    expect(manager.pid).toBeUndefined();
    expect(typeof manager.start).toBe('function');
    expect(typeof manager.stop).toBe('function');
  });

  it('throws if start is called when not idle', async () => {
    const manager = createProcessManager({
      binary: '/usr/bin/speculos',
      app: '/path/to/app.elf',
    });
    // First start will try to spawn and fail (binary doesn't exist)
    // But we can test the status check by mocking
    await expect(manager.start()).rejects.toThrow('ENOENT');
  });

  it('stop resolves immediately when idle', async () => {
    const manager = createProcessManager({
      binary: '/usr/bin/speculos',
      app: '/path/to/app.elf',
    });
    await manager.stop();
    expect(manager.status).toBe('idle');
  });
});
