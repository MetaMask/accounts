/**
 * Detect if MetaMask is installed.
 *
 * @returns `true` if the MetaMask is installed, `false` otherwise.
 */
export const hasMetaMask = async () => {
  return typeof window.ethereum !== 'undefined';
};
