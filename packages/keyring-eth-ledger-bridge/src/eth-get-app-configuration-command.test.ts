import {
  CommandResultStatus,
  InvalidStatusWordError,
} from '@ledgerhq/device-management-kit';

import { EthGetAppConfigurationCommand } from './eth-get-app-configuration-command';

describe('EthGetAppConfigurationCommand', () => {
  const command = new EthGetAppConfigurationCommand();

  it('uses the Ethereum getAppConfiguration APDU', () => {
    expect(command.name).toBe('getAppConfiguration');
    expect(command.getApdu().getRawApdu()).toStrictEqual(
      Uint8Array.from([0xe0, 0x06, 0x00, 0x00, 0x00]),
    );
  });

  it('parses blind signing and web3 check flags', () => {
    const result = command.parseResponse({
      statusCode: Uint8Array.from([0x90, 0x00]),
      data: Uint8Array.from([0x31, 0x01, 0x02, 0x03]),
    });

    expect(result).toStrictEqual({
      status: CommandResultStatus.Success,
      data: {
        blindSigningEnabled: true,
        web3ChecksEnabled: true,
        web3ChecksOptIn: true,
        version: '1.2.3',
      },
    });
  });

  it('returns a DMK-style exchange error for APDU status errors', () => {
    const result = command.parseResponse({
      statusCode: Uint8Array.from([0x69, 0x85]),
      data: Uint8Array.from([]),
    });

    expect(result).toStrictEqual({
      status: CommandResultStatus.Error,
      error: {
        _tag: 'EthAppCommandError',
        errorCode: '6985',
        message: 'Ledger Ethereum app command failed with status 0x6985.',
        originalError: undefined,
      },
    });
  });

  it('returns an invalid status word error when config flags are missing', () => {
    const result = command.parseResponse({
      statusCode: Uint8Array.from([0x90, 0x00]),
      data: Uint8Array.from([]),
    });

    expect(result.status).toBe(CommandResultStatus.Error);
    const error =
      result.status === CommandResultStatus.Error ? result.error : undefined;
    expect(error).toBeInstanceOf(InvalidStatusWordError);
    expect(error).toStrictEqual(
      expect.objectContaining({
        originalError: new Error('Cannot extract config flags'),
      }),
    );
  });

  it('returns an invalid status word error when version bytes are missing', () => {
    const result = command.parseResponse({
      statusCode: Uint8Array.from([0x90, 0x00]),
      data: Uint8Array.from([0x01]),
    });

    expect(result.status).toBe(CommandResultStatus.Error);
    const error =
      result.status === CommandResultStatus.Error ? result.error : undefined;
    expect(error).toBeInstanceOf(InvalidStatusWordError);
    expect(error).toStrictEqual(
      expect.objectContaining({
        originalError: new Error('Cannot extract version'),
      }),
    );
  });
});
