import { getBinaryPath } from './download';

jest.mock('node:fs', () => ({
  ...jest.requireActual('node:fs'),
  existsSync: jest.fn(),
}));

jest.mock('./platform');

describe('getBinaryPath', () => {
  it('returns path with default cache dir when no options given', () => {
    const result = getBinaryPath();
    expect(result).toContain('speculos-1.7.1');
    expect(result).toContain('speculos');
  });

  it('returns path with custom cache dir', () => {
    const result = getBinaryPath('/tmp/test-cache');
    expect(result).toBe('/tmp/test-cache/speculos-1.7.1/speculos');
  });
});

describe('ensureBinary', () => {
  it('returns cached binary path if binary exists', async () => {
    const { existsSync } = jest.requireMock('node:fs');
    existsSync.mockReturnValue(true);

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ensureBinary } = require('./download');
    const result = await ensureBinary({ cacheDir: '/tmp/test' });
    expect(result).toContain('speculos');
  });
});
