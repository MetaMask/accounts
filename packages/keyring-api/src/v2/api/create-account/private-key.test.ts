import type { StructError } from '@metamask/superstruct';
import { assert, object, string } from '@metamask/superstruct';

import { CreateAccountPrivateKeyOptionsStruct } from './private-key';

const SENSITIVE_REDACTED = '***';

const RAW_PRIVATE_KEY =
  '0xdeadbeef1234567890abcdef1234567890abcdef1234567890abcdef12345678';

const VALID_OPTIONS = {
  type: 'private-key:import' as const,
  privateKey: RAW_PRIVATE_KEY,
  encoding: 'hexadecimal' as const,
};

describe('CreateAccountPrivateKeyOptionsStruct', () => {
  it('accepts a valid options object', () => {
    expect(() =>
      assert(VALID_OPTIONS, CreateAccountPrivateKeyOptionsStruct),
    ).not.toThrow();
  });

  it('redacts the private key value from the error when `privateKey` is invalid', () => {
    let error: StructError | undefined;
    try {
      assert(
        {
          type: 'private-key:import',
          privateKey: 123,
          encoding: 'hexadecimal',
        },
        CreateAccountPrivateKeyOptionsStruct,
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
          type: 'private-key:import',
          privateKey: RAW_PRIVATE_KEY,
          encoding: 'invalid-encoding',
        },
        CreateAccountPrivateKeyOptionsStruct,
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

  it('redacts the private key from nested `branch` items when wrapped in an outer struct', () => {
    const WrapperStruct = object({
      options: CreateAccountPrivateKeyOptionsStruct,
      tag: string(),
    });

    let error: StructError | undefined;
    try {
      assert(
        {
          options: {
            type: 'private-key:import',
            privateKey: RAW_PRIVATE_KEY,
            encoding: 'invalid-encoding', // Triggers failure inside the nested struct.
          },
          tag: 'ok',
        },
        WrapperStruct,
      );
    } catch (caughtError) {
      error = caughtError as StructError;
    }

    // The branch for the `encoding` failure travels through the outer object
    // -> options object -> 'invalid-encoding'. The options object sitting in
    // that branch must not expose the raw private key.
    const allBranchItems = (error?.failures() ?? []).flatMap(
      (failure) => failure.branch,
    );
    expect(JSON.stringify(allBranchItems)).not.toContain(RAW_PRIVATE_KEY);
  });
});
