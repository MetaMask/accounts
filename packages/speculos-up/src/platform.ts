import { PLATFORMS  } from './constants';
import type {PlatformArch} from './constants';

/**
 * Detect the current platform and return the matching download config.
 *
 * @returns The platform-specific download configuration.
 * @throws If the current platform is not supported.
 */
export function getPlatform(): PlatformArch {
  const {platform} = process;
  const {arch} = process;

  const match = PLATFORMS.find(
    (item) => item.platform === platform && item.arch === arch,
  );

  if (!match) {
    const supported = PLATFORMS.map((item) => `${item.platform}-${item.arch}`).join(', ');
    throw new Error(
      `Unsupported platform: ${platform}-${arch}. Supported: ${supported}`,
    );
  }

  return match;
}
