export type GetAppNameAndVersionResponse = {
  appName: string;
  version: string;
};

export type LedgerMobileBridgeOptions = Record<string, never>;

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
   */
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}
