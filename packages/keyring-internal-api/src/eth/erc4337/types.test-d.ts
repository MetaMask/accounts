import { expectAssignable, expectNotAssignable } from 'tsd';

import type { EthUserOperation } from './types';

// Valid UserOperation
expectAssignable<EthUserOperation>({
  sender: '0x2A3e54af44480ad269cca53e3a4d90ce2DbEb23a',
  nonce: '0x1',
  initCode: '0x',
  callData: '0x70641a22000000000000000000000000',
  callGasLimit: '0x58a83',
  verificationGasLimit: '0xe8c4',
  preVerificationGas: '0xc57c',
  maxFeePerGas: '0x87f0878c0',
  maxPriorityFeePerGas: '0x1dcd6500',
  paymasterAndData: '0x1234',
  signature: '0x1234',
});

// Missing `paymasterAndData` property
expectNotAssignable<EthUserOperation>({
  sender: '0x2A3e54af44480ad269cca53e3a4d90ce2DbEb23a',
  nonce: '0x1',
  initCode: '0x',
  callData: '0x70641a22000000000000000000000000',
  callGasLimit: '0x58a83',
  verificationGasLimit: '0xe8c4',
  preVerificationGas: '0xc57c',
  maxFeePerGas: '0x87f0878c0',
  maxPriorityFeePerGas: '0x1dcd6500',
  signature: '0x1234',
});

// Missing `signature` property
expectNotAssignable<EthUserOperation>({
  sender: '0x2A3e54af44480ad269cca53e3a4d90ce2DbEb23a',
  nonce: '0x1',
  initCode: '0x',
  callData: '0x70641a22000000000000000000000000',
  callGasLimit: '0x58a83',
  verificationGasLimit: '0xe8c4',
  preVerificationGas: '0xc57c',
  maxFeePerGas: '0x87f0878c0',
  maxPriorityFeePerGas: '0x1dcd6500',
  paymasterAndData: '0x1234',
});
