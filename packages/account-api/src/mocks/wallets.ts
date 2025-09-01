import {
  MOCK_ENTROPY_SOURCE_1,
  MOCK_PRIVATE_KEY_KEYRING_TYPE,
  MOCK_SNAP_1,
  MOCK_SNAP_2,
} from './accounts';
import { AccountWalletType } from '../api';

export const MOCK_ENTROPY_WALLET_ID = `${AccountWalletType.Entropy}:${MOCK_ENTROPY_SOURCE_1}`;
export const MOCK_SNAP_LOCAL_WALLET_ID = `${AccountWalletType.Snap}:${MOCK_SNAP_1.id}`;
export const MOCK_SNAP_NPM_WALLET_ID = `${AccountWalletType.Snap}:${MOCK_SNAP_2.id}`;
export const MOCK_KEYRING_WALLET_ID = `${AccountWalletType.Keyring}:${MOCK_PRIVATE_KEY_KEYRING_TYPE}`;
