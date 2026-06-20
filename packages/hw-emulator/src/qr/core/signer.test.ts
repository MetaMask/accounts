import { Common, Hardfork } from '@ethereumjs/common';
/* eslint-disable id-length -- r/s/v are the canonical ECDSA signature component names. */
import { RLP } from '@ethereumjs/rlp';
import { TransactionFactory } from '@ethereumjs/tx';
import type { TypedTransaction } from '@ethereumjs/tx';
import type { AddressLike } from '@ethereumjs/util';
import {
  DataType,
  ETHSignature,
  EthSignRequest,
} from '@keystonehq/bc-ur-registry-eth';
import {
  recoverPersonalSignature,
  recoverTypedSignature,
  SignTypedDataVersion,
} from '@metamask/eth-sig-util';
import type { MessageTypes, TypedMessage } from '@metamask/eth-sig-util';
import { add0x, getChecksumAddress, remove0x } from '@metamask/utils';
import type { Hex } from '@metamask/utils';
import { randomUUID } from 'node:crypto';
import { parse as uuidParse, stringify as uuidStringify } from 'uuid';

import {
  QR_EMULATOR_ACCOUNT_DERIVATION_PATH,
  QR_EMULATOR_ADDRESS,
  QR_EMULATOR_DEFAULT_XFP,
  QR_EMULATOR_SEED,
} from '../constants';
import { decodeSignRequest, signRequest } from './signer';
import type { SerializedUR } from './ur-synth';

const FIRST_ADDRESS_PATH = `${QR_EMULATOR_ACCOUNT_DERIVATION_PATH}/0/0`;
const OTHER_ADDRESS_PATH = `${QR_EMULATOR_ACCOUNT_DERIVATION_PATH}/0/1`;
const OTHER_ADDRESS = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

const common = new Common({ chain: 1, hardfork: Hardfork.SpuriousDragon });

function extractSignatureParts(ur: SerializedUR): {
  r: Hex;
  s: Hex;
  v: Hex;
  requestId: string;
} {
  const signature = ETHSignature.fromCBOR(Buffer.from(ur.cbor, 'hex'));
  const raw = signature.getSignature();
  const r = add0x(raw.subarray(0, 32).toString('hex'));
  const s = add0x(raw.subarray(32, 64).toString('hex'));
  const v = add0x(raw.subarray(64).toString('hex'));
  const requestId = signature.getRequestId()
    ? uuidStringify(signature.getRequestId() as Uint8Array)
    : '';
  return { r, s, v, requestId };
}

function buildSignRequest(
  signData: Buffer,
  dataType: DataType,
  hdPath: string,
  requestId: string,
  chainId?: number,
  address?: string,
): SerializedUR {
  const request = EthSignRequest.constructETHRequest(
    signData,
    dataType,
    hdPath,
    QR_EMULATOR_DEFAULT_XFP.replace('0x', ''),
    requestId,
    chainId,
    address,
  );
  const ur = request.toUR();
  return { type: ur.type, cbor: ur.cbor.toString('hex') };
}

describe('QR signer', () => {
  it('decodes a sign request and exposes the derivation path', () => {
    const ur = buildSignRequest(
      Buffer.from('00', 'hex'),
      DataType.personalMessage,
      FIRST_ADDRESS_PATH,
      randomUUID(),
    );
    const request = decodeSignRequest(ur);
    expect(request.getDerivationPath()).toBe(
      FIRST_ADDRESS_PATH.replace('m/', ''),
    );
    expect(request.getDataType()).toBe(DataType.personalMessage);
  });

  describe('transactions', () => {
    it('signs a legacy (type 0) transaction and recovers QR_EMULATOR_ADDRESS', () => {
      const tx = TransactionFactory.fromTxData(
        {
          nonce: 1,
          gasPrice: 10_000_000_000,
          gasLimit: 21_000,
          to: `0x${'11'.repeat(20)}` as AddressLike,
          value: 1000,
          data: '0x',
        },
        { common },
      );
      const signData = Buffer.from(RLP.encode(tx.getMessageToSign() as never));
      const requestId = randomUUID();
      const ur = buildSignRequest(
        signData,
        DataType.transaction,
        FIRST_ADDRESS_PATH,
        requestId,
        1,
      );

      const signature = signRequest(ur, { seed: QR_EMULATOR_SEED });
      const {
        r,
        s,
        v,
        requestId: returnedId,
      } = extractSignatureParts(signature);
      expect(returnedId).toBe(requestId);

      const signed = TransactionFactory.fromTxData(
        { ...tx.toJSON(), r, s, v },
        { common },
      ) as TypedTransaction;

      expect(signed.verifySignature()).toBe(true);
      expect(getChecksumAddress(signed.getSenderAddress().toString())).toBe(
        QR_EMULATOR_ADDRESS,
      );
    });

    it('signs an EIP-1559 (type 2) transaction and recovers QR_EMULATOR_ADDRESS', () => {
      const londonCommon = new Common({
        chain: 1,
        hardfork: Hardfork.London,
      });
      const tx = TransactionFactory.fromTxData(
        {
          type: 2,
          nonce: 5,
          maxFeePerGas: 20_000_000_000,
          maxPriorityFeePerGas: 1_000_000_000,
          gasLimit: 21_000,
          to: `0x${'22'.repeat(20)}` as AddressLike,
          value: 5000,
          data: '0xabcd',
          accessList: [],
          chainId: 1,
        },
        { common: londonCommon },
      );
      const signData = Buffer.from(tx.getMessageToSign() as Buffer);
      const requestId = randomUUID();
      const ur = buildSignRequest(
        signData,
        DataType.typedTransaction,
        FIRST_ADDRESS_PATH,
        requestId,
        1,
      );

      const signature = signRequest(ur, { seed: QR_EMULATOR_SEED });
      const { r, s, v } = extractSignatureParts(signature);

      const signed = TransactionFactory.fromTxData(
        { ...tx.toJSON(), r, s, v },
        { common: londonCommon },
      ) as TypedTransaction;

      expect(signed.verifySignature()).toBe(true);
      expect(getChecksumAddress(signed.getSenderAddress().toString())).toBe(
        QR_EMULATOR_ADDRESS,
      );
    });
  });

  describe('messages', () => {
    const typedData: TypedMessage<MessageTypes> = {
      types: {
        EIP712Domain: [
          { name: 'name', type: 'string' },
          { name: 'version', type: 'string' },
          { name: 'chainId', type: 'uint256' },
          { name: 'verifyingContract', type: 'address' },
        ],
        Mail: [
          { name: 'from', type: 'Person' },
          { name: 'contents', type: 'string' },
        ],
        Person: [
          { name: 'name', type: 'string' },
          { name: 'wallet', type: 'address' },
        ],
      },
      primaryType: 'Mail',
      domain: {
        name: 'Ether Mail',
        version: '1',
        chainId: 1,
        verifyingContract: `0x${'cc'.repeat(20)}`,
      },
      message: {
        from: { name: 'Cow', wallet: QR_EMULATOR_ADDRESS },
        contents: 'Hello, QR',
      },
    } as never;

    it('signs EIP-712 typed data v4 and recovers QR_EMULATOR_ADDRESS', () => {
      const signData = Buffer.from(JSON.stringify(typedData), 'utf8');
      const requestId = randomUUID();
      const ur = buildSignRequest(
        signData,
        DataType.typedData,
        FIRST_ADDRESS_PATH,
        requestId,
        undefined,
        QR_EMULATOR_ADDRESS,
      );

      const signature = signRequest(ur, { seed: QR_EMULATOR_SEED });
      const { r, s, v } = extractSignatureParts(signature);
      const combined = add0x(`${r.slice(2)}${s.slice(2)}${v.slice(2)}`);

      const recovered = recoverTypedSignature({
        data: typedData,
        signature: combined,
        version: SignTypedDataVersion.V4,
      });
      expect(getChecksumAddress(recovered as Hex)).toBe(QR_EMULATOR_ADDRESS);
    });

    it('signs a personal_sign message and recovers QR_EMULATOR_ADDRESS', () => {
      const message = add0x(Buffer.from('Hello QR emulator').toString('hex'));
      const signData = Buffer.from(remove0x(message), 'hex');
      const requestId = randomUUID();
      const ur = buildSignRequest(
        signData,
        DataType.personalMessage,
        FIRST_ADDRESS_PATH,
        requestId,
        undefined,
        QR_EMULATOR_ADDRESS,
      );

      const signature = signRequest(ur, { seed: QR_EMULATOR_SEED });
      const { r, s, v } = extractSignatureParts(signature);
      const combined = add0x(`${r.slice(2)}${s.slice(2)}${v.slice(2)}`);

      const recovered = recoverPersonalSignature({
        data: message,
        signature: combined,
      });
      expect(getChecksumAddress(recovered as Hex)).toBe(QR_EMULATOR_ADDRESS);
    });
  });

  describe('key isolation', () => {
    it('signs with a different key for a different derivation path', () => {
      const message = add0x(Buffer.from('second account').toString('hex'));
      const signData = Buffer.from(remove0x(message), 'hex');
      const ur = buildSignRequest(
        signData,
        DataType.personalMessage,
        OTHER_ADDRESS_PATH,
        randomUUID(),
        undefined,
        OTHER_ADDRESS,
      );

      const signature = signRequest(ur, { seed: QR_EMULATOR_SEED });
      const { r, s, v } = extractSignatureParts(signature);
      const combined = add0x(`${r.slice(2)}${s.slice(2)}${v.slice(2)}`);
      expect(
        getChecksumAddress(
          recoverPersonalSignature({
            data: message,
            signature: combined,
          }) as Hex,
        ),
      ).toBe(OTHER_ADDRESS);
    });
  });

  it('echoes the request id back as a valid uuid', () => {
    const requestId = randomUUID();
    const ur = buildSignRequest(
      Buffer.from('deadbeef', 'hex'),
      DataType.personalMessage,
      FIRST_ADDRESS_PATH,
      requestId,
    );
    const signature = signRequest(ur, { seed: QR_EMULATOR_SEED });
    const ethSignature = ETHSignature.fromCBOR(
      Buffer.from(signature.cbor, 'hex'),
    );
    expect(uuidStringify(ethSignature.getRequestId() as Uint8Array)).toBe(
      requestId,
    );
    expect(uuidParse(requestId)).toBeDefined();
  });
});
