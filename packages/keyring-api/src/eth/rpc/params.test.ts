import { assert } from '@metamask/superstruct';

import {
  EthDecryptParamsStruct,
  EthEip7702AuthorizationStruct,
  EthEncryptedDataStruct,
  EthGetAppKeyAddressParamsStruct,
  EthPersonalSignParamsStruct,
  EthSignEip7702AuthorizationParamsStruct,
  EthSignParamsStruct,
  EthSignTransactionParamsStruct,
  EthSignTypedDataParamsStruct,
  EthSignTypedDataV1ParamsStruct,
  EthTransactionDataStruct,
  EthTypedDataV1Struct,
  EthTypedMessageStruct,
} from './params';

describe('EthTransactionDataStruct', () => {
  it('validates a minimal transaction', () => {
    const tx = {
      to: '0x1234567890123456789012345678901234567890',
    };
    expect(() => assert(tx, EthTransactionDataStruct)).not.toThrow();
  });

  it('validates a full transaction', () => {
    const tx = {
      to: '0x1234567890123456789012345678901234567890',
      from: '0xabcdef0123456789abcdef0123456789abcdef01',
      nonce: '0x1',
      value: '0x0',
      data: '0x',
      gas: '0x5208',
      gasPrice: '0x3b9aca00',
      chainId: 1,
      type: 2,
    };
    expect(() => assert(tx, EthTransactionDataStruct)).not.toThrow();
  });

  it('validates EIP-1559 transaction', () => {
    const tx = {
      to: '0x1234567890123456789012345678901234567890',
      maxFeePerGas: '0x3b9aca00',
      maxPriorityFeePerGas: '0x3b9aca00',
      type: 2,
    };
    expect(() => assert(tx, EthTransactionDataStruct)).not.toThrow();
  });

  it('validates transaction with access list', () => {
    const tx = {
      to: '0x1234567890123456789012345678901234567890',
      accessList: [
        {
          address: '0xabcdef0123456789abcdef0123456789abcdef01',
          storageKeys: [
            '0x0000000000000000000000000000000000000000000000000000000000000001',
          ],
        },
      ],
    };
    expect(() => assert(tx, EthTransactionDataStruct)).not.toThrow();
  });

  it('rejects invalid address', () => {
    const tx = {
      to: 'invalid-address',
    };
    expect(() => assert(tx, EthTransactionDataStruct)).toThrow(
      expect.any(Error),
    );
  });
});

describe('EthTypedDataV1Struct', () => {
  it('validates TypedDataV1 format', () => {
    const data = [
      { type: 'string', name: 'Message', value: 'Hello!' },
      { type: 'uint256', name: 'Amount', value: 100 },
    ];
    expect(() => assert(data, EthTypedDataV1Struct)).not.toThrow();
  });

  it('rejects invalid TypedDataV1', () => {
    const data = [{ type: 'string', value: 'Message' }]; // missing name
    expect(() => assert(data, EthTypedDataV1Struct)).toThrow(expect.any(Error));
  });
});

describe('EthTypedMessageStruct', () => {
  it('validates EIP-712 typed message', () => {
    const data = {
      types: {
        EIP712Domain: [
          { name: 'name', type: 'string' },
          { name: 'version', type: 'string' },
          { name: 'chainId', type: 'uint256' },
        ],
        Message: [{ name: 'content', type: 'string' }],
      },
      primaryType: 'Message',
      domain: {
        name: 'Test',
        version: '1',
        chainId: 1,
      },
      message: {
        content: 'Hello!',
      },
    };
    expect(() => assert(data, EthTypedMessageStruct)).not.toThrow();
  });

  it('rejects invalid typed message', () => {
    const data = {
      types: {},
      // missing primaryType, domain, message
    };
    expect(() => assert(data, EthTypedMessageStruct)).toThrow(
      expect.any(Error),
    );
  });
});

describe('EthEncryptedDataStruct', () => {
  it('validates encrypted data', () => {
    const data = {
      version: 'x25519-xsalsa20-poly1305',
      nonce: 'base64nonce',
      ephemPublicKey: 'base64key',
      ciphertext: 'base64ciphertext',
    };
    expect(() => assert(data, EthEncryptedDataStruct)).not.toThrow();
  });

  it('rejects wrong version', () => {
    const data = {
      version: 'unsupported-version',
      nonce: 'base64nonce',
      ephemPublicKey: 'base64key',
      ciphertext: 'base64ciphertext',
    };
    expect(() => assert(data, EthEncryptedDataStruct)).toThrow(
      expect.any(Error),
    );
  });

  it('rejects missing fields', () => {
    const data = {
      version: 'x25519-xsalsa20-poly1305',
      // missing nonce, ephemPublicKey, ciphertext
    };
    expect(() => assert(data, EthEncryptedDataStruct)).toThrow(
      expect.any(Error),
    );
  });
});

describe('EthEip7702AuthorizationStruct', () => {
  it('validates authorization tuple with numbers', () => {
    const auth = [1, '0x1234567890123456789012345678901234567890', 0];
    expect(() => assert(auth, EthEip7702AuthorizationStruct)).not.toThrow();
  });

  it('validates authorization tuple with string chainId', () => {
    const auth = ['0x1', '0x1234567890123456789012345678901234567890', '0x0'];
    expect(() => assert(auth, EthEip7702AuthorizationStruct)).not.toThrow();
  });

  it('rejects invalid address', () => {
    const auth = [1, 'invalid-address', 0];
    expect(() => assert(auth, EthEip7702AuthorizationStruct)).toThrow(
      expect.any(Error),
    );
  });

  it('rejects wrong tuple length', () => {
    const auth = [1, '0x1234567890123456789012345678901234567890'];
    expect(() => assert(auth, EthEip7702AuthorizationStruct)).toThrow(
      expect.any(Error),
    );
  });
});

describe('EthSignTransactionParamsStruct', () => {
  it('validates sign transaction params', () => {
    const params = [
      {
        to: '0x1234567890123456789012345678901234567890',
        value: '0x1',
      },
    ];
    expect(() => assert(params, EthSignTransactionParamsStruct)).not.toThrow();
  });

  it('rejects empty params', () => {
    const params: unknown[] = [];
    expect(() => assert(params, EthSignTransactionParamsStruct)).toThrow(
      expect.any(Error),
    );
  });
});

describe('EthSignParamsStruct', () => {
  it('validates eth_sign params', () => {
    const params = ['0x1234567890123456789012345678901234567890', '0xdeadbeef'];
    expect(() => assert(params, EthSignParamsStruct)).not.toThrow();
  });

  it('rejects missing data', () => {
    const params = ['0x1234567890123456789012345678901234567890'];
    expect(() => assert(params, EthSignParamsStruct)).toThrow(
      expect.any(Error),
    );
  });

  it('rejects invalid address', () => {
    const params = ['invalid', '0xdeadbeef'];
    expect(() => assert(params, EthSignParamsStruct)).toThrow(
      expect.any(Error),
    );
  });
});

describe('EthPersonalSignParamsStruct', () => {
  it('validates personal_sign params with data only', () => {
    const params = ['0xdeadbeef'];
    expect(() => assert(params, EthPersonalSignParamsStruct)).not.toThrow();
  });

  it('validates personal_sign params with data and address', () => {
    const params = ['0xdeadbeef', '0x1234567890123456789012345678901234567890'];
    expect(() => assert(params, EthPersonalSignParamsStruct)).not.toThrow();
  });

  it('rejects empty params', () => {
    const params: unknown[] = [];
    expect(() => assert(params, EthPersonalSignParamsStruct)).toThrow(
      expect.any(Error),
    );
  });
});

describe('EthSignTypedDataV1ParamsStruct', () => {
  it('validates signTypedData_v1 params', () => {
    const params = [
      '0x1234567890123456789012345678901234567890',
      [{ type: 'string', name: 'Message', value: 'Hello!' }],
    ];
    expect(() => assert(params, EthSignTypedDataV1ParamsStruct)).not.toThrow(
      expect.any(Error),
    );
  });

  it('rejects missing typed data', () => {
    const params = ['0x1234567890123456789012345678901234567890'];
    expect(() => assert(params, EthSignTypedDataV1ParamsStruct)).toThrow(
      expect.any(Error),
    );
  });
});

describe('EthSignTypedDataParamsStruct', () => {
  const validTypedMessage = {
    types: {
      EIP712Domain: [{ name: 'name', type: 'string' }],
      Message: [{ name: 'content', type: 'string' }],
    },
    primaryType: 'Message',
    domain: { name: 'Test' },
    message: { content: 'Hello!' },
  };

  it('validates signTypedData_v3/v4 params', () => {
    const params = [
      '0x1234567890123456789012345678901234567890',
      validTypedMessage,
    ];
    expect(() => assert(params, EthSignTypedDataParamsStruct)).not.toThrow();
  });

  it('rejects missing typed message', () => {
    const params = ['0x1234567890123456789012345678901234567890'];
    expect(() => assert(params, EthSignTypedDataParamsStruct)).toThrow(
      expect.any(Error),
    );
  });
});

describe('EthDecryptParamsStruct', () => {
  it('validates eth_decrypt params', () => {
    const params = [
      {
        version: 'x25519-xsalsa20-poly1305',
        nonce: 'nonce',
        ephemPublicKey: 'key',
        ciphertext: 'cipher',
      },
    ];
    expect(() => assert(params, EthDecryptParamsStruct)).not.toThrow();
  });

  it('rejects empty params', () => {
    const params: unknown[] = [];
    expect(() => assert(params, EthDecryptParamsStruct)).toThrow(
      expect.any(Error),
    );
  });
});

describe('EthGetAppKeyAddressParamsStruct', () => {
  it('validates eth_getAppKeyAddress params', () => {
    const params = ['https://example.com'];
    expect(() => assert(params, EthGetAppKeyAddressParamsStruct)).not.toThrow();
  });

  it('rejects empty params', () => {
    const params: unknown[] = [];
    expect(() => assert(params, EthGetAppKeyAddressParamsStruct)).toThrow(
      expect.any(Error),
    );
  });
});

describe('EthSignEip7702AuthorizationParamsStruct', () => {
  it('validates eth_signEip7702Authorization params', () => {
    const params = [[1, '0x1234567890123456789012345678901234567890', 0]];
    expect(() =>
      assert(params, EthSignEip7702AuthorizationParamsStruct),
    ).not.toThrow();
  });

  it('rejects empty params', () => {
    const params: unknown[] = [];
    expect(() =>
      assert(params, EthSignEip7702AuthorizationParamsStruct),
    ).toThrow(expect.any(Error));
  });
});
