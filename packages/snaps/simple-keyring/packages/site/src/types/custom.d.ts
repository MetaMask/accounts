/// <reference types="react-scripts" />

import type { MetaMaskInpageProvider } from '@metamask/providers';

/**
 * Window type extension to support ethereum
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Window {
    ethereum: MetaMaskInpageProvider;
  }
}
