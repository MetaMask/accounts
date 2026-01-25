export type LedgerMobileBridgeOptions = Record<string, never>;

/**
 * @deprecated Use `HardwareWalletError` from `@metamask/hw-wallet-sdk` instead.
 * This class is kept for backwards compatibility only.
 */
export class LedgerStatusError extends Error {
  /**
   * The status code of the error.
   */
  public readonly statusCode: number;

  /**
   * Creates a new LedgerStatusError.
   *
   * @param statusCode - The status code of the error.
   * @param message - The message of the error.
   * @deprecated Use `HardwareWalletError` from `@metamask/hw-wallet-sdk` instead.
   */
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}
