import { expectAssignable, expectNotAssignable } from 'tsd';

import {
  AccountCreationType,
  type CreateAccountBip44DiscoverOptions,
  type CreateAccountBip44DeriveIndexOptions,
  type CreateAccountBip44DerivePathOptions,
  type CreateAccountCustomOptions,
  type CreateAccountOptions,
  type CreateAccountPrivateKeyOptions,
} from './create-account';
import {
  AccountExportType,
  type ExportAccountOptions,
  type ExportedAccount,
  type PrivateKeyExportedAccount,
} from './export-account';
import type { KeyringV2 } from './keyring';
import type { KeyringCapabilities } from './keyring-capabilities';
import { KeyringType } from './keyring-type';
import type { ImportPrivateKeyFormat } from './private-key';

// Test KeyringType enum
expectAssignable<KeyringType>(KeyringType.Hd);
expectAssignable<KeyringType>(KeyringType.PrivateKey);
expectAssignable<KeyringType>(KeyringType.Qr);
expectAssignable<KeyringType>(KeyringType.Snap);
expectAssignable<KeyringType>(KeyringType.Ledger);
expectAssignable<KeyringType>(KeyringType.Lattice);
expectAssignable<KeyringType>(KeyringType.Trezor);

// Test AccountCreationType enum
expectAssignable<AccountCreationType>(AccountCreationType.Bip44DerivePath);
expectAssignable<AccountCreationType>(AccountCreationType.Bip44DeriveIndex);
expectAssignable<AccountCreationType>(AccountCreationType.Bip44Discover);
expectAssignable<AccountCreationType>(AccountCreationType.PrivateKeyImport);
expectAssignable<AccountCreationType>(AccountCreationType.Custom);

// Test AccountExportType enum
expectAssignable<AccountExportType>(AccountExportType.PrivateKey);

// Test ImportPrivateKeyFormat
expectAssignable<ImportPrivateKeyFormat>({
  encoding: 'hexadecimal',
});

expectAssignable<ImportPrivateKeyFormat>({
  encoding: 'base58',
  type: 'eip155:eoa',
});

expectNotAssignable<ImportPrivateKeyFormat>({
  encoding: 'invalid',
});

// Test KeyringCapabilities
expectAssignable<KeyringCapabilities>({
  scopes: ['eip155:1'],
});

expectAssignable<KeyringCapabilities>({
  scopes: ['eip155:1', 'bip122:000000000019d6689c085ae165831e93'],
  bip44: {
    derivePath: true,
    deriveIndex: true,
    discover: false,
  },
});

expectAssignable<KeyringCapabilities>({
  scopes: ['eip155:1'],
  privateKey: {
    importFormats: [{ encoding: 'hexadecimal' }],
    exportFormats: [{ encoding: 'hexadecimal' }],
  },
});

expectAssignable<KeyringCapabilities>({
  scopes: ['eip155:1'],
  custom: {
    createAccounts: true,
  },
});

expectNotAssignable<KeyringCapabilities>({
  scopes: ['eip155:1'],
  custom: {
    createAccounts: true,
    exportAccount: true,
  },
});

// Test CreateAccountBip44DerivePathOptions
expectAssignable<CreateAccountBip44DerivePathOptions>({
  type: AccountCreationType.Bip44DerivePath,
  entropySource: '01K0BX6VDR5DPDPGGNA8PZVBVB',
  derivationPath: "m/44'/60'/0'/0/0",
});

expectNotAssignable<CreateAccountBip44DerivePathOptions>({
  type: AccountCreationType.Bip44DerivePath,
  entropySource: '01K0BX6VDR5DPDPGGNA8PZVBVB',
  // missing derivationPath
});

// Test CreateAccountBip44DeriveIndexOptions
expectAssignable<CreateAccountBip44DeriveIndexOptions>({
  type: AccountCreationType.Bip44DeriveIndex,
  entropySource: '01K0BX6VDR5DPDPGGNA8PZVBVB',
  groupIndex: 0,
});

// Test CreateAccountBip44DiscoverOptions
expectAssignable<CreateAccountBip44DiscoverOptions>({
  type: AccountCreationType.Bip44Discover,
  entropySource: '01K0BX6VDR5DPDPGGNA8PZVBVB',
  groupIndex: 0,
});

// Test CreateAccountPrivateKeyOptions
expectAssignable<CreateAccountPrivateKeyOptions>({
  type: AccountCreationType.PrivateKeyImport,
  privateKey: '0x1234567890abcdef',
  encoding: 'hexadecimal',
});

expectAssignable<CreateAccountPrivateKeyOptions>({
  type: AccountCreationType.PrivateKeyImport,
  privateKey: 'L1aW4aubDFB7yfras2S1mN3bqg9nwySY8nkoLmJebSLD5BWv3ENZ',
  encoding: 'base58',
  accountType: 'bip122:p2wpkh',
});

// Test CreateAccountCustomOptions
expectAssignable<CreateAccountCustomOptions>({
  type: AccountCreationType.Custom,
});

// Test CreateAccountOptions union
expectAssignable<CreateAccountOptions>({
  type: AccountCreationType.Bip44DerivePath,
  entropySource: '01K0BX6VDR5DPDPGGNA8PZVBVB',
  derivationPath: "m/44'/60'/0'/0/0",
});

expectAssignable<CreateAccountOptions>({
  type: AccountCreationType.Bip44DeriveIndex,
  entropySource: '01K0BX6VDR5DPDPGGNA8PZVBVB',
  groupIndex: 0,
});

expectAssignable<CreateAccountOptions>({
  type: AccountCreationType.PrivateKeyImport,
  privateKey: '0x1234567890abcdef',
  encoding: 'hexadecimal',
});

expectAssignable<CreateAccountOptions>({
  type: AccountCreationType.Custom,
});

// Test ExportAccountOptions
expectAssignable<ExportAccountOptions>({
  type: AccountExportType.PrivateKey,
  encoding: 'hexadecimal',
});

expectAssignable<ExportAccountOptions>({
  type: AccountExportType.PrivateKey,
  encoding: 'base58',
});

// Test PrivateKeyExportedAccount
expectAssignable<PrivateKeyExportedAccount>({
  type: AccountExportType.PrivateKey,
  privateKey: '0x1234567890abcdef',
  encoding: 'hexadecimal',
});

// Test ExportedAccount union
expectAssignable<ExportedAccount>({
  type: AccountExportType.PrivateKey,
  privateKey: 'L1aW4aubDFB7yfras2S1mN3bqg9nwySY8nkoLmJebSLD5BWv3ENZ',
  encoding: 'base58',
});

// Test KeyringV2 interface
expectAssignable<KeyringV2['type']>(KeyringType.Hd);
expectAssignable<KeyringV2['capabilities']>({
  scopes: ['eip155:1'],
});
