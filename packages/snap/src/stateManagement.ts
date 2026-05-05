import type { KeyringState } from './keyring';
import { logger } from './logger';

/**
 * Default keyring state.
 */
const defaultState: KeyringState = {
  wallets: {},
  pendingRequests: {},
  useSyncApprovals: true,
  selectedAccounts: [],
};

/**
 * Retrieves the current state of the keyring.
 *
 * @returns The current state of the keyring.
 */
export async function getState(): Promise<KeyringState> {
  const state = (await snap.request({
    method: 'snap_manageState',
    params: { operation: 'get' },
  })) as any;

  logger.debug('Retrieved state:', JSON.stringify(state));

  return {
    ...defaultState,
    ...state,
  };
}

/**
 * Persists the given snap state.
 *
 * @param state - New snap state.
 */
export async function saveState(state: KeyringState) {
  await snap.request({
    method: 'snap_manageState',
    params: { operation: 'update', newState: state },
  });
}
