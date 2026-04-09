import { Common, Chain, Hardfork } from '@ethereumjs/common';
import { TransactionFactory } from '@ethereumjs/tx';

import { shouldUseNftLedgerClearSign } from './ledger-nft-clear-sign';

const commonEIP1559 = new Common({
  chain: Chain.Mainnet,
  hardfork: Hardfork.London,
});

/** EIP-1559 tx with ERC-20 `approve` calldata (`0x095ea7b3`). */
const SERIALIZED_TX_ERC20_APPROVE =
  '02f86b0180843b9aca00843b9aca0082520894111111111111111111111111111111111111111180b840095ea7b3000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c0808080';

/** EIP-1559 tx with ERC-721 / ERC-1155 `setApprovalForAll` calldata (`0xa22cb465`). */
const SERIALIZED_TX_SET_APPROVAL_FOR_ALL =
  '02f86b0180843b9aca00843b9aca0082520894111111111111111111111111111111111111111180b840a22cb465000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c0808080';

function serializeType2TxWithData(data: `0x${string}`): string {
  return TransactionFactory.fromTxData(
    {
      type: 2,
      nonce: '0x00',
      maxFeePerGas: '0x3b9aca00',
      maxPriorityFeePerGas: '0x3b9aca00',
      gasLimit: '0x5208',
      to: `0x${'2'.repeat(40)}`,
      value: '0x00',
      data,
      v: '0x0',
      r: `0x${'0'.repeat(64)}`,
      s: `0x${'0'.repeat(64)}`,
    },
    { common: commonEIP1559, freeze: false },
  )
    .serialize()
    .toString('hex');
}

describe('shouldUseNftLedgerClearSign', function () {
  it('returns false for empty input', function () {
    expect(shouldUseNftLedgerClearSign('')).toBe(false);
    expect(shouldUseNftLedgerClearSign('0x')).toBe(false);
  });

  it('returns false when calldata is shorter than 4 bytes', function () {
    const hex = serializeType2TxWithData('0x010203');
    expect(shouldUseNftLedgerClearSign(hex)).toBe(false);
    expect(shouldUseNftLedgerClearSign(`0x${hex}`)).toBe(false);
  });

  it('returns false for ERC-20 approve selector (shared with ERC-721 approve)', function () {
    expect(shouldUseNftLedgerClearSign(SERIALIZED_TX_ERC20_APPROVE)).toBe(false);
    expect(
      shouldUseNftLedgerClearSign(`0x${SERIALIZED_TX_ERC20_APPROVE}`),
    ).toBe(false);
  });

  it('returns true for setApprovalForAll selector', function () {
    expect(
      shouldUseNftLedgerClearSign(SERIALIZED_TX_SET_APPROVAL_FOR_ALL),
    ).toBe(true);
  });

  it('returns true for ERC-721 safeTransferFrom(address,address,uint256)', function () {
    const hex = serializeType2TxWithData(
      `0x42842e0e${'00'.repeat(60)}`,
    );
    expect(shouldUseNftLedgerClearSign(hex)).toBe(true);
  });

  it('returns true for ERC-721 safeTransferFrom with bytes', function () {
    const hex = serializeType2TxWithData(
      `0xb88d4fde${'00'.repeat(60)}`,
    );
    expect(shouldUseNftLedgerClearSign(hex)).toBe(true);
  });

  it('returns true for ERC-1155 safeTransferFrom', function () {
    const hex = serializeType2TxWithData(
      `0xf242432a${'00'.repeat(60)}`,
    );
    expect(shouldUseNftLedgerClearSign(hex)).toBe(true);
  });

  it('returns true for ERC-1155 safeBatchTransferFrom', function () {
    const hex = serializeType2TxWithData(
      `0x2eb2c2d6${'00'.repeat(60)}`,
    );
    expect(shouldUseNftLedgerClearSign(hex)).toBe(true);
  });

  it('returns false for transferFrom selector (shared ERC-20 / ERC-721)', function () {
    const hex = serializeType2TxWithData(
      `0x23b872dd${'00'.repeat(60)}`,
    );
    expect(shouldUseNftLedgerClearSign(hex)).toBe(false);
  });

  it('returns false on invalid serialized transaction', function () {
    expect(shouldUseNftLedgerClearSign('zz')).toBe(false);
    expect(shouldUseNftLedgerClearSign('deadbeef')).toBe(false);
  });
});
