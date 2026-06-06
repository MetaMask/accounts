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
 * Reads the Ethereum app configuration via the Ethereum application's
 * `getAppConfiguration` APDU (CLA `0xE0`, INS `0x06`).
 *
 * The wire-format of the response is documented by the Ledger Ethereum app
 * APDU specification (`GET APP CONFIGURATION`):
 *
 *   https://github.com/LedgerHQ/app-ethereum/blob/develop/doc/ethapp.adoc
 *
 * Layout of the response payload (4 bytes):
 *
 *   byte 0       - feature flags bitmask
 *                   bit 0 (0x01): arbitrary data signature enabled (blind signing)
 *                   bit 4 (0x10): transaction check enabled (web3 checks)
 *                   bit 5 (0x20): transaction check opt-in done (web3 checks opt-in)
 *   bytes 1..3   - app version (major, minor, patch)
 *
 * This command mirrors the implementation in
 * `@ledgerhq/device-signer-kit-ethereum` at
 * `internal/app-binder/command/GetAppConfigurationCommand`, which is not
 * re-exported from that package's public entry point. Until the signer kit
 * exposes `GetAppConfiguration` publicly, this module is the only way to
 * invoke the Ethereum `getAppConfiguration` APDU through the DMK
 * `sendCommand` API.
 *
 * Note: this is distinct from the DMK OS-level `GetAppAndVersionCommand`
 * (`@ledgerhq/device-management-kit`), which returns only the app's name and
 * version and does not expose Ethereum-specific feature flags.
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
