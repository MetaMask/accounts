import type {
  Apdu,
  ApduResponse,
  Command,
  CommandResult,
  DeviceExchangeError,
} from '@ledgerhq/device-management-kit';
import {
  ApduBuilder,
  ApduParser,
  CommandResultFactory,
  InvalidStatusWordError,
} from '@ledgerhq/device-management-kit';

export type EthGetAppConfigurationResponse = {
  readonly blindSigningEnabled: boolean;
  readonly web3ChecksEnabled: boolean;
  readonly web3ChecksOptIn: boolean;
  readonly version: string;
};

const CLA = 0xe0;
const INS = 0x06;
const BLIND_SIGNING_FLAG = 0x01;
const WEB3_CHECKS_ENABLED_FLAG = 0x10;
const WEB3_CHECKS_OPT_IN_FLAG = 0x20;

/**
 * Reads the Ethereum app configuration using the same APDU contract as the DMK
 * Ethereum signer's GetAppConfiguration command.
 */
export class EthGetAppConfigurationCommand implements Command<
  EthGetAppConfigurationResponse,
  void,
  string
> {
  readonly name = 'getAppConfiguration';

  getApdu(): Apdu {
    return new ApduBuilder({ cla: CLA, ins: INS, p1: 0, p2: 0 }).build();
  }

  parseResponse(
    response: ApduResponse,
  ): CommandResult<EthGetAppConfigurationResponse, string> {
    if (!isSuccessStatusCode(response.statusCode)) {
      return CommandResultFactory({
        error: createEthAppCommandError(response.statusCode),
      });
    }

    const parser = new ApduParser(response);

    const flags = parser.extract8BitUInt();
    if (flags === undefined) {
      return CommandResultFactory({
        error: new InvalidStatusWordError('Cannot extract config flags'),
      });
    }

    const major = parser.extract8BitUInt();
    const minor = parser.extract8BitUInt();
    const patch = parser.extract8BitUInt();
    if (major === undefined || minor === undefined || patch === undefined) {
      return CommandResultFactory({
        error: new InvalidStatusWordError('Cannot extract version'),
      });
    }

    return CommandResultFactory({
      data: {
        blindSigningEnabled: isFlagSet(flags, BLIND_SIGNING_FLAG),
        web3ChecksEnabled: isFlagSet(flags, WEB3_CHECKS_ENABLED_FLAG),
        web3ChecksOptIn: isFlagSet(flags, WEB3_CHECKS_OPT_IN_FLAG),
        version: `${major}.${minor}.${patch}`,
      },
    });
  }
}

function isFlagSet(flags: number, flag: number): boolean {
  return Math.floor(flags / flag) % 2 === 1;
}

function isSuccessStatusCode(statusCode: Uint8Array): boolean {
  return statusCode[0] === 0x90 && statusCode[1] === 0x00;
}

function createEthAppCommandError(
  statusCode: Uint8Array,
): DeviceExchangeError<string> {
  const errorCode = Array.from(statusCode)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  return {
    _tag: 'EthAppCommandError',
    errorCode,
    message: `Ledger Ethereum app command failed with status 0x${errorCode}.`,
    originalError: undefined,
  };
}
