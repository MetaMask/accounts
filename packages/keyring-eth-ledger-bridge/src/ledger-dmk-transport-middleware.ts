import { type DeviceManagementKit } from '@ledgerhq/device-management-kit';
import { SignerEthBuilder } from '@ledgerhq/device-signer-kit-ethereum';

type StartDiscoveringParameters = Parameters<
  DeviceManagementKit['startDiscovering']
>;

type StartDiscoveringResult = ReturnType<
  DeviceManagementKit['startDiscovering']
>;

type ConnectParameters = Parameters<DeviceManagementKit['connect']>;

type ConnectResult = ReturnType<DeviceManagementKit['connect']>;

/**
 * LedgerDMKTransportMiddleware is a middleware to communicate with the Ledger device via DMK.
 * It adapts the new DMK Signer ETH to the existing bridging architectural patterns.
 */
export class LedgerDMKTransportMiddleware {
  readonly #sdk: DeviceManagementKit;

  #sessionId?: string;

  constructor(sdk: DeviceManagementKit) {
    this.#sdk = sdk;
  }

  /**
   * Method to retrieve the DeviceManagementKit instance.
   *
   * @returns The DeviceManagementKit instance.
   */
  getSDK(): DeviceManagementKit {
    return this.#sdk;
  }

  /**
   * Starts device discovery using the configured DMK transport.
   *
   * @param args - Optional DMK discovery options.
   * @returns An observable that emits discovered devices.
   */
  startDiscovering(
    ...args: StartDiscoveringParameters
  ): StartDiscoveringResult {
    return this.#sdk.startDiscovering(...args);
  }

  /**
   * Method to set the session ID.
   *
   * @param sessionId - The session ID for the connected Ledger device.
   */
  setSessionId(sessionId: string): void {
    this.#sessionId = sessionId;
  }

  /**
   * Method to retrieve the session ID.
   *
   * @returns The session ID.
   */
  getSessionId(): string {
    if (!this.#sessionId) {
      throw new Error('Instance `sessionId` is not initialized.');
    }
    return this.#sessionId;
  }

  /**
   * Connects to a discovered device and stores the resulting session ID.
   *
   * @param args - The DMK connection arguments.
   * @returns The created session ID.
   */
  async connect(...args: ConnectParameters): ConnectResult {
    const sessionId = await this.#sdk.connect(...args);
    this.setSessionId(sessionId);

    return sessionId;
  }

  /**
   * Method to get a SignerEth instance.
   *
   * @returns An Ethereum signer instance.
   */
  getEthSigner(): ReturnType<SignerEthBuilder['build']> {
    return new SignerEthBuilder({
      dmk: this.#sdk,
      sessionId: this.getSessionId(),
    }).build();
  }

  /**
   * Method to close the session.
   *
   * @returns A promise that resolves when the session is closed.
   */
  async dispose(): Promise<void> {
    if (this.#sessionId) {
      await this.#sdk.disconnect({ sessionId: this.#sessionId });
      this.#sessionId = undefined;
    }
  }
}
