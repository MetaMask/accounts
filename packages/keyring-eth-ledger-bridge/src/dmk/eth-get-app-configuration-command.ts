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
// Feature flags defined by the Ethereum app `getAppConfiguration` APDU spec.
// See: https://github.com/LedgerHQ/app-ethereum/blob/master/doc/ethapp.adoc#get-app-configuration
//   0x01 - arbitrary data signature enabled by user (blind signing)
//   0x02 - ERC 20 Token information needs to be provided externally
//   0x10 - Transaction Check enabled (web3 checks)
//   0x20 - Transaction Check Opt-In done (web3 checks opt-in)
const BLIND_SIGNING_FLAG = 0x01;
const WEB3_CHECKS_ENABLED_FLAG = 0x10;
const WEB3_CHECKS_OPT_IN_FLAG = 0x20;
const SUCCESS_STATUS_WORD_HI = 0x90;
const SUCCESS_STATUS_WORD_LO = 0x00;

/**
 * Discriminator (`_tag`) used by `EthGetAppConfigurationCommand` when raising
 * a {@link DeviceExchangeError}. Exported so tests and translators can
 * reference the canonical string instead of repeating a magic literal.
 */
export const ETH_APP_COMMAND_ERROR_TAG = 'EthAppCommandError';

/**
 * Reads the Ethereum app configuration via the Ethereum application's
 * `getAppConfiguration` APDU (CLA `0xE0`, INS `0x06`).
 *
 * ## Wire format
 *
 * Defined by the Ethereum application APDU specification
 * ([`doc/ethapp.adoc`](https://github.com/LedgerHQ/app-ethereum/blob/master/doc/ethapp.adoc#get-app-configuration),
 * § *GET APP CONFIGURATION*).
 *
 * The 4-byte response payload is laid out as:
 *
 * ```
 *  byte 0       flags bitmask
 *  bytes 1..3   app version (major, minor, patch)
 * ```
 *
 * The `flags` byte is defined by the spec as:
 *
 * ```
 *  0x01  arbitrary data signature enabled by user     (blind signing)
 *  0x02  ERC 20 Token information needs to be provided externally
 *  0x10  Transaction Check enabled                    (web3 checks)
 *  0x20  Transaction Check Opt-In done                (web3 checks opt-in)
 * ```
 *
 * This command mirrors the implementation in
 * [`@ledgerhq/device-signer-kit-ethereum`](https://github.com/LedgerHQ/device-sdk-ts/blob/main/packages/signer/signer-eth/src/internal/app-binder/command/GetAppConfigurationCommand.ts)
 * (`internal/app-binder/command/GetAppConfigurationCommand`), which is not
 * re-exported from that package's public entry point. Until the signer kit
 * exposes `GetAppConfiguration` publicly, this module is the only way to
 * invoke the Ethereum `getAppConfiguration` APDU through the DMK
 * `sendCommand` API.
 *
 * ## Related APDU docs
 *
 * The other Ethereum APDUs the DMK signer kit sends on our behalf are also
 * defined in the same `ethapp.adoc` document:
 *
 * - `GET ETH PUBLIC ADDRESS`        — INS `0x02`
 * - `SIGN ETH TRANSACTION`          — INS `0x04`
 * - `SIGN ETH PERSONAL MESSAGE`     — INS `0x08`
 * - `SIGN ETH EIP 712`              — INS `0x0C`
 * - `SIGN EIP 7702 AUTHORIZATION`   — INS `0x34`
 *
 * ## Distinguishing DMK commands
 *
 * Note: this command is distinct from the DMK OS-level
 * [`GetAppAndVersionCommand`](https://github.com/LedgerHQ/device-sdk-ts/blob/main/packages/device-management-kit/src/api/command/os/GetAppAndVersionCommand.ts)
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
        error: new InvalidStatusWordError(
          'Cannot extract config flags from response body',
        ),
      });
    }

    const major = parser.extract8BitUInt();
    const minor = parser.extract8BitUInt();
    const patch = parser.extract8BitUInt();
    if (major === undefined || minor === undefined || patch === undefined) {
      return CommandResultFactory({
        error: new InvalidStatusWordError(
          'Cannot extract version bytes from response body',
        ),
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

/**
 * Test whether a single-bit flag is set in a bitmask.
 *
 * Per the Ethereum `getAppConfiguration` APDU spec
 * ([ethapp.adoc](https://github.com/LedgerHQ/app-ethereum/blob/master/doc/ethapp.adoc#get-app-configuration)),
 * each supported feature occupies one bit of the `flags` byte. The spec
 * defines *which* bits carry meaning (`0x01`, `0x10`, `0x20`); it does not
 * prescribe an implementation technique for testing them. Bitwise AND is
 * the idiomatic way to test a single bit in any language, and is the
 * same formulation used by Ledger's own
 * [`GetAppConfiguration`](https://github.com/LedgerHQ/device-sdk-ts/blob/main/packages/signer/signer-eth/src/internal/app-binder/command/GetAppConfigurationCommand.ts)
 * implementation upstream.
 *
 * @param flags - The bitmask (the first response byte).
 * @param flag - The single-bit value to test (e.g. `0x01`, `0x10`, `0x20`).
 * @returns `true` if the bit is set, `false` otherwise.
 */
function isFlagSet(flags: number, flag: number): boolean {
  // Bitwise AND is the idiomatic way to test a single-bit flag in a
  // bitmask and matches the upstream Ledger implementation; the
  // `ethapp.adoc` spec defines the flag *values* (0x01, 0x10, 0x20) but
  // leaves the testing technique to the implementer.
  // eslint-disable-next-line no-bitwise
  return (flags & flag) !== 0;
}

function isSuccessStatusCode(statusCode: Uint8Array): boolean {
  return (
    statusCode[0] === SUCCESS_STATUS_WORD_HI &&
    statusCode[1] === SUCCESS_STATUS_WORD_LO
  );
}

function createEthAppCommandError(
  statusCode: Uint8Array,
): DeviceExchangeError<string> {
  const errorCode = Array.from(statusCode)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  return {
    _tag: ETH_APP_COMMAND_ERROR_TAG,
    errorCode,
    message: `Ledger Ethereum app command failed with status 0x${errorCode}.`,
    originalError: undefined,
  };
}
