import fs from 'node:fs/promises';
import path from 'node:path';

const scriptPath = path.join(
  __dirname,
  '..',
  '..',
  'scripts',
  'start-android.sh',
);

const composePath = path.join(__dirname, '..', '..', 'docker-compose.yml');

describe('scripts/start-android.sh', () => {
  let scriptContents: string;

  beforeAll(async () => {
    scriptContents = await fs.readFile(scriptPath, 'utf8');
  });

  it('stops and removes the detached speculos container in the cleanup trap', () => {
    expect(scriptContents).toContain('docker stop speculos-ledger');
    expect(scriptContents).toContain('docker rm speculos-ledger');
  });

  it('defaults host ports to 9998 (APDU) and 5001 (API), matching docker-compose.yml and src/ledger/constants.ts', () => {
    expect(scriptContents).toContain('SPECULOS_APDU_PORT:-9998');
    expect(scriptContents).toContain('SPECULOS_API_PORT:-5001');
  });
});

describe('docker-compose.yml', () => {
  let composeContents: string;

  beforeAll(async () => {
    composeContents = await fs.readFile(composePath, 'utf8');
  });

  it('pins the Speculos image to the bundled version instead of :latest', () => {
    expect(composeContents).toContain('ghcr.io/ledgerhq/speculos:0.25.13');
    expect(composeContents).not.toContain('ghcr.io/ledgerhq/speculos:latest');
  });
});
