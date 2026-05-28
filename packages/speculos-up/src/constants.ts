export const SPECULOS_VERSION = '1.7.1';

export const RELEASE_BASE_URL = `https://github.com/MetaMask/speculos-up/releases/download/v${SPECULOS_VERSION}`;

export type PlatformArch = {
  platform: string;
  arch: string;
  filename: string;
  checksum: string;
};

export const PLATFORMS: PlatformArch[] = [
  {
    platform: 'linux',
    arch: 'x64',
    filename: `speculos-${SPECULOS_VERSION}-linux-amd64.tar.gz`,
    checksum: 'PLACEHOLDER_RUN_BUILD_PIPELINE_FIRST',
  },
  {
    platform: 'linux',
    arch: 'arm64',
    filename: `speculos-${SPECULOS_VERSION}-linux-arm64.tar.gz`,
    checksum: 'PLACEHOLDER_RUN_BUILD_PIPELINE_FIRST',
  },
  {
    platform: 'darwin',
    arch: 'arm64',
    filename: `speculos-${SPECULOS_VERSION}-darwin-arm64.zip`,
    checksum: 'PLACEHOLDER_RUN_BUILD_PIPELINE_FIRST',
  },
];

export const DEFAULT_CACHE_DIR = '.metamask/cache';
