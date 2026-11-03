import { DockerManager } from './docker-manager';
import type { DockerCommandRunner } from './docker-manager';

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
  }, 10_000);

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

describe('DockerManager concurrent naming', () => {
  it('derives a unique container and project name from the APDU port by default', () => {
    const first = new DockerManager({
      composeFile: '/path/to/docker-compose.yml',
      apduPort: 9998,
      apiPort: 5001,
      app: '/path/to/app.elf',
    });
    const second = new DockerManager({
      composeFile: '/path/to/docker-compose.yml',
      apduPort: 9997,
      apiPort: 5002,
      app: '/path/to/app.elf',
    });

    expect(first.getContainerName()).toBe('metamask-speculos-9998');
    expect(first.getProjectName()).toBe('metamask-speculos-9998');
    expect(second.getContainerName()).toBe('metamask-speculos-9997');
    expect(first.getContainerName()).not.toBe(second.getContainerName());
  });

  it('honors explicit container and project names', () => {
    const manager = new DockerManager({
      composeFile: '/path/to/docker-compose.yml',
      apduPort: 9998,
      apiPort: 5001,
      app: '/path/to/app.elf',
      containerName: 'Custom Container_Name',
      projectName: 'Custom Project',
    });

    expect(manager.getContainerName()).toBe('custom-container_name');
    expect(manager.getProjectName()).toBe('custom-project');
  });
});

describe('DockerManager lifecycle (injected runner)', () => {
  type RecordedCall = { command: string; args: string[] };

  function createRecordingRunner(
    healthStatus: 'healthy' | 'starting' = 'healthy',
  ): {
    runner: DockerCommandRunner;
    calls: RecordedCall[];
    failOn: (subcommand: string) => void;
  } {
    const calls: RecordedCall[] = [];
    let failSubcommand: string | null = null;
    const failOn = (subcommand: string): void => {
      failSubcommand = subcommand;
    };
    const runner: DockerCommandRunner = async (command, args) => {
      calls.push({ command, args });
      if (failSubcommand && args.includes(failSubcommand)) {
        throw new Error(`forced failure: ${failSubcommand}`);
      }
      if (args.includes('inspect')) {
        return { stdout: `${healthStatus}\n`, stderr: '' };
      }
      return { stdout: '', stderr: '' };
    };
    return { runner, calls, failOn };
  }

  function findCall(
    calls: RecordedCall[],
    subcommand: string,
  ): RecordedCall | undefined {
    return calls.find((call) => call.args.includes(subcommand));
  }

  const baseOptions = {
    composeFile: '/path/to/docker-compose.yml',
    apduPort: 9998,
    apiPort: 5001,
    app: '/path/to/app.elf',
  };

  it('uses the same project name for up and down', async () => {
    const { runner, calls } = createRecordingRunner();
    const manager = new DockerManager({
      ...baseOptions,
      execFileAsync: runner,
    });

    await manager.start();
    await manager.stop();

    const upCall = findCall(calls, 'up');
    const downCall = findCall(calls, 'down');
    expect(upCall).toBeDefined();
    expect(downCall).toBeDefined();

    const projectIndex = upCall?.args.indexOf('-p');
    expect(projectIndex).toBeGreaterThan(-1);
    expect(upCall?.args[(projectIndex as number) + 1]).toBe(
      'metamask-speculos-9998',
    );
    expect(downCall?.args).toContain('-p');
    expect(downCall?.args).toContain('metamask-speculos-9998');
  });

  it('passes the configured stopTimeout (seconds) to docker compose down --timeout', async () => {
    const { runner, calls } = createRecordingRunner();
    const manager = new DockerManager({
      ...baseOptions,
      stopTimeout: 5_000,
      execFileAsync: runner,
    });

    await manager.start();
    await manager.stop();

    const downCall = findCall(calls, 'down');
    const timeoutIndex = downCall?.args.indexOf('--timeout');
    expect(timeoutIndex).toBeGreaterThan(-1);
    expect(downCall?.args[(timeoutIndex as number) + 1]).toBe('5');
  });

  it('runs docker compose down when the health check times out', async () => {
    const { runner, calls } = createRecordingRunner('starting');
    const manager = new DockerManager({
      ...baseOptions,
      startTimeout: 100,
      stopTimeout: 1_000,
      execFileAsync: runner,
    });

    await expect(manager.start()).rejects.toThrow('health check timed out');

    expect(findCall(calls, 'down')).toBeDefined();
    expect(manager.getStatus()).toBe('idle');
  });

  it('runs docker compose down when docker compose up fails', async () => {
    const { runner, calls, failOn } = createRecordingRunner();
    failOn('up');
    const manager = new DockerManager({
      ...baseOptions,
      execFileAsync: runner,
    });

    await expect(manager.start()).rejects.toThrow('forced failure: up');

    // A failed start must tear the (possibly partial) container down.
    expect(findCall(calls, 'down')).toBeDefined();
    expect(manager.getStatus()).toBe('idle');
  });
});
