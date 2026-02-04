import LedgerHwAppEth from '@ledgerhq/hw-app-eth';
import { Buffer } from 'buffer';

import type { GetAppNameAndVersionResponse } from './ledger-bridge';

export class MetaMaskLedgerHwAppEth
  extends LedgerHwAppEth
  implements MetaMaskLedgerHwAppEth
{
  readonly mainAppName = 'BOLOS';

  readonly ethAppName = 'Ethereum';

  readonly transportEncoding = 'ascii';

  /**
   * Method to open ethereum application on ledger device.
   *
   */
  async openEthApp(): Promise<void> {
    await this.transport.send(
      0xe0,
      0xd8,
      0x00,
      0x00,
      Buffer.from(this.ethAppName, this.transportEncoding),
    );
  }

  /**
   * Method to close all running application on ledger device.
   *
   */
  async closeApps(): Promise<void> {
    await this.transport.send(0xb0, 0xa7, 0x00, 0x00);
  }

  /**
   * Method to retrieve the name and version of the running application in ledger device.
   *
   * @returns An object contains appName and version.
   */
  async getAppNameAndVersion(): Promise<GetAppNameAndVersionResponse> {
    const response = await this.transport.send(0xb0, 0x01, 0x00, 0x00);
    if (response[0] !== 1) {
      throw new Error('Incorrect format return from getAppNameAndVersion.');
    }

    let i = 1;
    const nameLength = response[i] ?? 0;
    i += 1;

    const appName = response
      .slice(i, (i += nameLength))
      .toString(this.transportEncoding);

    const versionLength = response[i] ?? 0;
    i += 1;

    const version = response
      .slice(i, (i += versionLength))
      .toString(this.transportEncoding);

    return {
      appName,
      version,
    };
  }
}
