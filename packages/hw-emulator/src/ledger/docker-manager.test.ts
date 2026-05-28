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

  it('buildDockerEnv includes SPECULOS_SEED when seed option is set', () => {
    const manager = new DockerManager({
      composeFile: '/path/to/docker-compose.yml',
      apduPort: 9998,
      apiPort: 5001,
      app: '/path/to/apps/ethereum-flex.elf',
      model: 'flex',
      seed: 'custom test seed phrase',
    });

    expect(manager.buildDockerEnv()).toStrictEqual({
      SPECULOS_DEVICE: 'flex',
      SPECULOS_ELF_FILENAME: 'ethereum-flex.elf',
      SPECULOS_APDU_PORT: '9998',
      SPECULOS_API_PORT: '5001',
      SPECULOS_SEED: 'custom test seed phrase',
    });
  });

  it('buildDockerEnv omits SPECULOS_SEED when seed option is unset', () => {
    const manager = new DockerManager({
      composeFile: '/path/to/docker-compose.yml',
      apduPort: 9998,
      apiPort: 5001,
      app: '/path/to/app.elf',
    });

    expect(manager.buildDockerEnv()).toStrictEqual({
      SPECULOS_DEVICE: 'nanosp',
      SPECULOS_ELF_FILENAME: 'app.elf',
      SPECULOS_APDU_PORT: '9998',
      SPECULOS_API_PORT: '5001',
    });
  });

  it('buildDockerEnv maps non-default host ports for DEVICE_PRESETS', () => {
    const manager = new DockerManager({
      composeFile: '/path/to/docker-compose.yml',
      apduPort: 9997,
      apiPort: 5002,
      app: 'ethereum-nanosp.elf',
    });

    expect(manager.buildDockerEnv()).toMatchObject({
      SPECULOS_APDU_PORT: '9997',
      SPECULOS_API_PORT: '5002',
    });
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

  it('buildDockerEnv includes SPECULOS_DISPLAY when display option is set', () => {
    const manager = new DockerManager({
      composeFile: '/path/to/docker-compose.yml',
      apduPort: 9997,
      apiPort: 5002,
      app: '/apps/ethereum-flex.elf',
      model: 'flex',
      seed: 'test seed words',
      display: 'headless',
    });

    expect(manager.buildDockerEnv()).toStrictEqual({
      SPECULOS_DEVICE: 'flex',
      SPECULOS_ELF_FILENAME: 'ethereum-flex.elf',
      SPECULOS_APDU_PORT: '9997',
      SPECULOS_API_PORT: '5002',
      SPECULOS_SEED: 'test seed words',
      SPECULOS_DISPLAY: 'headless',
    });
  });
});
