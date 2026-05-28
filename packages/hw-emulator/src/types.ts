/**
 * Supported hardware wallet emulator types.
 */
export const EmulatorType = {
  Ledger: 'ledger',
  Trezor: 'trezor',
} as const;

/**
 * String union of supported emulator type identifiers.
 */
export type EmulatorType = (typeof EmulatorType)[keyof typeof EmulatorType];

/**
 * Interface for interacting with an emulated hardware wallet device screen.
 * Provides methods to approve, reject, and navigate through on-screen prompts.
 */
export type DeviceInteraction = {
  /**
   * Approve a transaction on the device screen.
   */
  approveTransaction(): Promise<void>;
  /**
   * Approve a signing request on the device screen.
   */
  approveSigning(): Promise<void>;
  /**
   * Reject a transaction on the device screen.
   */
  rejectTransaction(): Promise<void>;
  /**
   * Navigate back to the main menu on the device screen.
   */
  navigateToMainMenu(): Promise<void>;
};

/**
 * Hardware wallet emulator providing lifecycle management and device interaction.
 */
export type HardwareWalletEmulator = {
  /**
   * Start the emulator.
   */
  start(): Promise<void>;
  /**
   * Stop the emulator and release all resources.
   */
  stop(): Promise<void>;
  /**
   * Check whether the emulator is currently running.
   */
  isRunning(): boolean;
  /**
   * Get the device interaction handler for screen actions.
   *
   * @returns The device interaction instance.
   */
  getInteraction(): DeviceInteraction;
  /**
   * Approve a transaction via the device screen.
   */
  approveTransaction(): Promise<void>;
  /**
   * Approve a signing request via the device screen.
   */
  approveSigning(): Promise<void>;
  /**
   * Reject a transaction via the device screen.
   */
  rejectTransaction(): Promise<void>;
  /**
   * Navigate to the main menu on the device screen.
   */
  navigateToMainMenu(): Promise<void>;
};
