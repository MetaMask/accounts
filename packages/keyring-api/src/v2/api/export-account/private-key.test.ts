import { SENSITIVE_REDACTED } from '@metamask/keyring-utils';
import type { StructError } from '@metamask/superstruct';
import { assert } from '@metamask/superstruct';

import { PrivateKeyExportedAccountStruct } from './private-key';

const RAW_PRIVATE_KEY =
  '0xdeadbeef1234567890abcdef1234567890abcdef1234567890abcdef12345678';

describe('PrivateKeyExportedAccountStruct', () => {
  it('accepts a valid exported account', () => {
    expect(() =>
      assert(
        {
          type: 'private-key',
          privateKey: RAW_PRIVATE_KEY,
          encoding: 'hexadecimal',
        },
        PrivateKeyExportedAccountStruct,
      ),
    ).not.toThrow();
  });

  it('redacts the private key value from the error when `privateKey` is invalid', () => {
    let error: StructError | undefined;
    try {
      assert(
        { type: 'private-key', privateKey: 123, encoding: 'hexadecimal' },
        PrivateKeyExportedAccountStruct,
      );
    } catch (caughtError) {
      error = caughtError as StructError;
    }
    expect(error?.value).toBe(SENSITIVE_REDACTED);
    expect(error?.message).toContain(SENSITIVE_REDACTED);
    expect(error?.message).not.toContain('123');
  });

  it('redacts the private key from `branch` when a sibling field fails', () => {
    let error: StructError | undefined;
    try {
      assert(
        {
          type: 'private-key',
          privateKey: RAW_PRIVATE_KEY,
          encoding: 'invalid-encoding',
        },
        PrivateKeyExportedAccountStruct,
      );
    } catch (caughtError) {
      error = caughtError as StructError;
    }
    expect(error?.message).toContain('encoding');
    const allBranchItems = (error?.failures() ?? []).flatMap(
      (failure) => failure.branch,
    );
    expect(allBranchItems).not.toContainEqual(
      expect.objectContaining({ privateKey: RAW_PRIVATE_KEY }),
    );
  });
});
