import { Common, Chain, Hardfork } from '@ethereumjs/common';
import { TransactionFactory } from '@ethereumjs/tx';
import { bytesToHex } from '@ethereumjs/util';
import { remove0x } from '@metamask/utils';

import { getTransactionSelector } from './utils';

const TRANSFER_SELECTOR = '0xa9059cbb';
const TRANSFER_FROM_SELECTOR = '0x23b872dd';
const APPROVE_SELECTOR = '0x095ea7b3';

describe('getTransactionSelector', () => {
  const commonLegacy = new Common({
    chain: Chain.Mainnet,
    hardfork: Hardfork.Berlin,
  });
  const common1559 = new Common({
    chain: Chain.Mainnet,
    hardfork: Hardfork.London,
  });

  it('returns the first four bytes of calldata for a legacy serialized tx', () => {
    const tx = TransactionFactory.fromTxData(
      {
        nonce: '0x00',
        gasPrice: '0x01',
        gasLimit: '0x5208',
        to: '0x0000000000000000000000000000000000000000',
        value: '0x00',
        data: `${TRANSFER_SELECTOR}00`,
      },
      { common: commonLegacy },
    );
    const serializedHex = bytesToHex(tx.serialize());
    expect(getTransactionSelector(serializedHex)).toBe(TRANSFER_SELECTOR);
  });

  it('returns the selector for an EIP-1559 serialized tx', () => {
    const tx = TransactionFactory.fromTxData(
      {
        type: 2,
        nonce: '0x00',
        maxFeePerGas: '0x01',
        maxPriorityFeePerGas: '0x01',
        gasLimit: '0x5208',
        to: '0x0000000000000000000000000000000000000000',
        value: '0x00',
        data: `${TRANSFER_SELECTOR}deadbeef`,
      },
      { common: common1559 },
    );
    const serializedHex = bytesToHex(tx.serialize());
    expect(getTransactionSelector(serializedHex)).toBe(TRANSFER_SELECTOR);
  });

  it('accepts hex without a 0x prefix', () => {
    const tx = TransactionFactory.fromTxData(
      {
        nonce: '0x00',
        gasPrice: '0x01',
        gasLimit: '0x5208',
        to: '0x0000000000000000000000000000000000000000',
        value: '0x00',
        data: `${TRANSFER_SELECTOR}00`,
      },
      { common: commonLegacy },
    );
    const serializedHex = remove0x(bytesToHex(tx.serialize()));
    expect(getTransactionSelector(serializedHex)).toBe(TRANSFER_SELECTOR);
  });

  it('returns undefined when calldata is empty', () => {
    const tx = TransactionFactory.fromTxData(
      {
        nonce: '0x00',
        gasPrice: '0x01',
        gasLimit: '0x5208',
        to: '0x0000000000000000000000000000000000000000',
        value: '0x00',
        data: '0x',
      },
      { common: commonLegacy },
    );
    expect(getTransactionSelector(bytesToHex(tx.serialize()))).toBeUndefined();
  });

  it('returns undefined for invalid serialized hex', () => {
    expect(getTransactionSelector('0xnothex')).toBeUndefined();
  });

  it('returns transferFrom selector when calldata uses transferFrom', () => {
    const tx = TransactionFactory.fromTxData(
      {
        nonce: '0x00',
        gasPrice: '0x01',
        gasLimit: '0x5208',
        to: '0x0000000000000000000000000000000000000000',
        value: '0x00',
        data: `${TRANSFER_FROM_SELECTOR}00`,
      },
      { common: commonLegacy },
    );
    expect(getTransactionSelector(bytesToHex(tx.serialize()))).toBe(
      TRANSFER_FROM_SELECTOR,
    );
  });

  it('returns approve selector when calldata uses approve', () => {
    const tx = TransactionFactory.fromTxData(
      {
        nonce: '0x00',
        gasPrice: '0x01',
        gasLimit: '0x5208',
        to: '0x0000000000000000000000000000000000000000',
        value: '0x00',
        data: `${APPROVE_SELECTOR}00`,
      },
      { common: commonLegacy },
    );
    expect(getTransactionSelector(bytesToHex(tx.serialize()))).toBe(
      APPROVE_SELECTOR,
    );
  });

  it('returns undefined when calldata is shorter than four bytes', () => {
    const tx = TransactionFactory.fromTxData(
      {
        nonce: '0x00',
        gasPrice: '0x01',
        gasLimit: '0x5208',
        to: '0x0000000000000000000000000000000000000000',
        value: '0x00',
        data: '0xabcd',
      },
      { common: commonLegacy },
    );
    expect(getTransactionSelector(bytesToHex(tx.serialize()))).toBeUndefined();
  });
});
