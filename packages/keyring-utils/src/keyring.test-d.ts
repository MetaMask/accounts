import type { TypedTransaction, TypedTxData } from '@ethereumjs/tx';
import type { Eip1024EncryptedData, Hex, Json } from '@metamask/utils';
import { expectAssignable, expectNotAssignable, expectType } from 'tsd';

import type { BaseKeyring, EthKeyring, Keyring } from './keyring';
import type { Extends } from './typing';
import { expectTrue } from './typing';

// Required members are all present on Keyring
expectTrue<
  Extends<
    Keyring,
    {
      type: string;
      getAccounts(): Promise<Hex[]>;
      addAccounts(number: number): Promise<Hex[]>;
      serialize(): Promise<Json>;
      deserialize(state: Json): Promise<void>;
    }
  >
>();

// A minimal valid implementation is assignable to Keyring
const minimalKeyring: Keyring = {
  type: 'Test',
  getAccounts: async () => [],
  addAccounts: async (_n: number) => [],
  serialize: async () => ({}),
  deserialize: async (_state: Json) => undefined,
};
expectAssignable<Keyring>(minimalKeyring);

// Objects missing required members are NOT assignable to Keyring
expectNotAssignable<Keyring>({ type: 'Test' });
expectNotAssignable<Keyring>({
  getAccounts: async () => [],
  addAccounts: async (_n: number) => [],
  serialize: async () => ({}),
  deserialize: async () => undefined,
});

// Optional members have the correct signatures (checked individually so a
// single removed method fails exactly one assertion).
// We use Required<Keyring> so that removal of a method causes a compile error.
// NOTE: Extends<Keyring, { method?() }> s alawys be true for any type because
// TypeScript satisfies optional-only targets structurally.
expectTrue<Extends<Required<Keyring>, { init(): Promise<void> }>>();
expectTrue<Extends<Required<Keyring>, { removeAccount(address: Hex): void }>>();
expectTrue<
  Extends<
    Required<Keyring>,
    {
      exportAccount(
        address: Hex,
        options?: Record<string, unknown>,
      ): Promise<string>;
    }
  >
>();
expectTrue<
  Extends<
    Required<Keyring>,
    { getAppKeyAddress(address: Hex, origin: string): Promise<Hex> }
  >
>();
expectTrue<
  Extends<
    Required<Keyring>,
    {
      signTransaction(
        address: Hex,
        transaction: TypedTransaction,
        options?: Record<string, unknown>,
      ): Promise<TypedTxData>;
    }
  >
>();
expectTrue<
  Extends<
    Required<Keyring>,
    {
      signMessage(
        address: Hex,
        message: string,
        options?: Record<string, unknown>,
      ): Promise<string>;
    }
  >
>();
expectTrue<
  Extends<
    Required<Keyring>,
    {
      signEip7702Authorization(
        address: Hex,
        authorization: [chainId: number, contractAddress: Hex, nonce: number],
        options?: Record<string, unknown>,
      ): Promise<string>;
    }
  >
>();
expectTrue<
  Extends<
    Required<Keyring>,
    {
      signPersonalMessage(
        address: Hex,
        message: Hex,
        options?: { version?: string } & Record<string, unknown>,
      ): Promise<string>;
    }
  >
>();
expectTrue<
  Extends<
    Required<Keyring>,
    {
      signTypedData(
        address: Hex,
        typedData: unknown[] | Record<string, unknown>,
        options?: Record<string, unknown>,
      ): Promise<string>;
    }
  >
>();
expectTrue<
  Extends<
    Required<Keyring>,
    {
      getEncryptionPublicKey(
        account: Hex,
        options?: Record<string, unknown>,
      ): Promise<string>;
    }
  >
>();
expectTrue<
  Extends<
    Required<Keyring>,
    {
      decryptMessage(
        account: Hex,
        encryptedData: Eip1024EncryptedData,
      ): Promise<string>;
    }
  >
>();
expectTrue<
  Extends<Required<Keyring>, { generateRandomMnemonic(): Promise<void> }>
>();
expectTrue<Extends<Required<Keyring>, { destroy(): Promise<void> }>>();

// Keyring is assignable to BaseKeyring
expectTrue<Extends<Keyring, BaseKeyring>>();

// EthKeyring is an alias for Keyring
expectType<EthKeyring>(minimalKeyring);
expectTrue<Extends<EthKeyring, Keyring>>();
expectTrue<Extends<Keyring, EthKeyring>>();
