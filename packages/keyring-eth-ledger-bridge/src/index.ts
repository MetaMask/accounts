export * from './ledger-keyring';
export * from './ledger-iframe-bridge';
export * from './ledger-mobile-bridge';
export type * from './ledger-bridge';
export * from './ledger-transport-middleware';
export type * from './type';
export * from './ledger-hw-app';
export * from './errors';
export * from './ledger-error-handler';

// Re-export HardwareWalletError and related types from hw-wallet-sdk for convenience
export {
  HardwareWalletError,
  ErrorCode,
  Severity,
  Category,
  LEDGER_ERROR_MAPPINGS,
  BLE_ERROR_MAPPINGS,
  MOBILE_ERROR_MAPPINGS,
} from '@metamask/hw-wallet-sdk';
export type { HardwareWalletErrorOptions } from '@metamask/hw-wallet-sdk';
