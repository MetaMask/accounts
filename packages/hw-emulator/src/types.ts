export const EmulatorType = {
  Ledger: 'ledger',
  Trezor: 'trezor',
} as const;

export type EmulatorType = (typeof EmulatorType)[keyof typeof EmulatorType];

export type DeviceInteraction = {
  approveTransaction(): Promise<void>;
  approveSigning(): Promise<void>;
  rejectTransaction(): Promise<void>;
  navigateToMainMenu(): Promise<void>;
};

export type HardwareWalletEmulator = {
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
  getInteraction(): DeviceInteraction;
  approveTransaction(): Promise<void>;
  approveSigning(): Promise<void>;
  rejectTransaction(): Promise<void>;
  navigateToMainMenu(): Promise<void>;
};
