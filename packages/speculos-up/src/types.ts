export enum Architecture {
  Amd64 = 'amd64',
  Arm64 = 'arm64',
}

export enum Platform {
  Linux = 'linux',
}

export enum Binary {
  Speculos = 'speculos',
}

export type DownloadOptions = {
  method?: 'GET' | 'HEAD';
  headers?: Record<string, string>;
  maxRedirects?: number;
};

export type SpeculosupOptions = {
  /** Speculos version to install. */
  version?: string;
  /** GitHub repository hosting releases. */
  repo?: string;
  /** Custom cache directory. */
  cacheDir?: string;
  /** Target platform. */
  platform?: Platform;
  /** Target architecture. */
  arch?: Architecture;
};
