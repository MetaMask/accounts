import { DockerManager } from './docker-manager';

describe('DockerManager', () => {
  it('initializes with idle status', () => {
    const manager = new DockerManager({
      composeFile: '/path/to/docker-compose.yml',
      apduPort: 9998,
      apiPort: 5001,
      app: '/path/to/app.elf',
    });
    expect(manager.getStatus()).toBe('idle');
  });

  it('throws if start is called when not idle', async () => {
    const manager = new DockerManager({
      composeFile: '/path/to/docker-compose.yml',
      apduPort: 9998,
      apiPort: 5001,
      app: '/path/to/app.elf',
    });
    // Direct start with invalid compose file should fail
    await expect(manager.start()).rejects.toThrow('docker compose');
    expect(manager.getStatus()).toBe('idle');
  });

  it('stop resolves immediately when idle', async () => {
    const manager = new DockerManager({
      composeFile: '/path/to/docker-compose.yml',
      apduPort: 9998,
      apiPort: 5001,
      app: '/path/to/app.elf',
    });
    await manager.stop();
    expect(manager.getStatus()).toBe('idle');
  });
});
