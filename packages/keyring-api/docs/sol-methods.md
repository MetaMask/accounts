# SOL Methods

Here we document the Solana methods that an account Snap may implement to
support requests originated from dapps.

## [solana:signAndSendTransaction](https://github.com/anza-xyz/wallet-standard/blob/master/packages/core/features/src/signAndSendTransaction.ts#L10)

Signs and sends a transaction to the Solana blockchain.

### [Parameters](https://github.com/anza-xyz/wallet-standard/blob/master/packages/core/features/src/signAndSendTransaction.ts#L42)

- **Transaction intent (required)**
  - Type: `object`
  - Properties:
    - `account` (required)
      - Description: The account to sign the transaction.
      - Type: `object`
      - Properties:
        - `address` (required)
          - Description: The address of the account.
          - Type: `string`
        - `publicKey` (required)
          - Description: The public key of the account.
          - Type: `string`
        - `chains` (required)
          - Description: The chains supported by the account.
          - Type: `array`
          - Items:
            - Type: `string`
            - [Type](https://github.com/wallet-standard/wallet-standard/blob/c6fa5fd7d58e9ea1e6762127d16585fbb56ff88a/packages/core/base/src/identifier.ts#L8): `${namespace}:${reference}`
            - Example: `solana:mainnet`
        - `features` (required)
          - Description: The features supported by the account.
          - Type: `array`
          - Items:
            - Type: `string`
            - [Type](https://github.com/wallet-standard/wallet-standard/blob/c6fa5fd7d58e9ea1e6762127d16585fbb56ff88a/packages/core/base/src/identifier.ts#L8): `${namespace}:${reference}`
            - Example: `solana:signAndSendTransaction`
        - `label` (optional)
          - Description: The label of the account.
          - Type: `string`
        - `icon` (optional)
          - Description: The icon of the account.
          - Type: `string`
    - `transaction` (required)
      - Description: The base64 encoded transaction to sign and send.
      - Type: `string`
    - `chain` (required)
      - Description: The chain ID of the transaction.
      - [Type](https://github.com/wallet-standard/wallet-standard/blob/c6fa5fd7d58e9ea1e6762127d16585fbb56ff88a/packages/core/base/src/identifier.ts#L8): `${namespace}:${reference}`
    - `options` (optional)
      - Description: Transaction options.
      - Type: `object`
      - Properties:
        - `commitment?: 'processed' | 'confirmed' | 'finalized'`: Desired commitment level. If provided, confirm the transaction after sending.
        - `skipPreflight: string`: Disable transaction verification at the RPC.
        - `maxRetries?: number`: Maximum number of times for the RPC node to retry sending the transaction to the leader.

### Returns

- **Transaction signature**
  - Type: `object`
  - Properties:
    - `signature`
      - Description: The transaction signature.
      - Type: `string`

### Examples

**Request:**

```json
{
  "method": "solana:signAndSendTransaction",
  "params": {
    "account": {
      "address": "1234567890",
      "publicKey": "1234567890",
      "chains": ["solana:mainnet"],
      "features": ["solana:signAndSendTransaction"]
    },
    "transaction": "1234567890",
    "chain": "solana:mainnet",
    "options": {
      "commitment": "confirmed",
      "skipPreflight": "true",
      "maxRetries": 3
    }
  }
}
```

**Response:**

```json
{
  "signature": "53de51e2fa75c3cfa51132865f7d430138b1cd92a8f5267ec836ec565b422969"
}
```

## [solana:signTransaction](https://github.com/anza-xyz/wallet-standard/blob/master/packages/core/features/src/signTransaction.ts#L4)

Signs a transaction to the Solana blockchain.

### [Parameters](https://github.com/anza-xyz/wallet-standard/blob/master/packages/core/features/src/signTransaction.ts#L39)

- **Transaction intent (required)**
  - Type: `object`
  - Properties:
    - `account` (required)
      - Description: The account to sign the transaction.
      - Type: `object`
      - Properties:
        - `address` (required)
          - Description: The address of the account.
          - Type: `string`
        - `publicKey` (required)
          - Description: The public key of the account.
          - Type: `string`
        - `chains` (required)
          - Description: The chains supported by the account.
          - Type: `array`
          - Items:
            - Type: `string`
            - [Type](https://github.com/wallet-standard/wallet-standard/blob/c6fa5fd7d58e9ea1e6762127d16585fbb56ff88a/packages/core/base/src/identifier.ts#L8): `${namespace}:${reference}`
            - Example: `solana:mainnet`
        - `features` (required)
          - Description: The features supported by the account.
          - Type: `array`
          - Items:
            - Type: `string`
            - [Type](https://github.com/wallet-standard/wallet-standard/blob/c6fa5fd7d58e9ea1e6762127d16585fbb56ff88a/packages/core/base/src/identifier.ts#L8): `${namespace}:${reference}`
            - Example: `solana:signAndSendTransaction`
        - `label` (optional)
          - Description: The label of the account.
          - Type: `string`
        - `icon` (optional)
          - Description: The icon of the account.
          - Type: `string`
    - `transaction` (required)
      - Description: The base64 encoded transaction to sign.
      - Type: `string`
    - `chain` (optional)
      - Description: The chain ID of the transaction.
    - [Type](https://github.com/wallet-standard/wallet-standard/blob/c6fa5fd7d58e9ea1e6762127d16585fbb56ff88a/packages/core/base/src/identifier.ts#L8): `${namespace}:${reference}`
    - `options` (optional)
      - Description: Transaction options.
      - Type: `object`
      - Properties:
        - `preflightCommitment?: 'processed' | 'confirmed' | 'finalized'`: Preflight commitment level.
        - `minContextSlot: number`: The minimum slot that the request can be evaluated at.

### Returns

- **Transaction signature**
  - Type: `object`
  - Properties:
    - `signedTransaction`
      - Description: The base64 encoded signed transaction.
      - Type: `string`

### Examples

**Request:**

```json
{
  "method": "solana:signTransaction",
  "params": {
    "account": {
      "address": "1234567890",
      "publicKey": "1234567890",
      "chains": ["solana:mainnet"],
      "features": ["solana:signTransaction"]
    },
    "transaction": "1234567890",
    "chain": "solana:mainnet",
    "options": {
      "preflightCommitment": "confirmed",
      "minContextSlot": 100
    }
  }
}
```

**Response:**

```json
{
  "signedTransaction": "1234567890"
}
```

## [solana:signMessage](https://github.com/anza-xyz/wallet-standard/blob/master/packages/core/features/src/signMessage.ts#L4)

Signs a message to the Solana blockchain.

### [Parameters](https://github.com/anza-xyz/wallet-standard/blob/master/packages/core/features/src/signMessage.ts#L27)

- **Message intent (required)**
  - Type: `object`
  - Properties:
    - `account` (required)
      - Description: The account to sign the message.
      - Type: `object`
      - Properties:
        - `address` (required)
          - Description: The address of the account.
          - Type: `string`
        - `publicKey` (required)
          - Description: The public key of the account.
          - Type: `string`
        - `chains` (required)
          - Description: The chains supported by the account.
          - Type: `array`
          - Items:
            - Type: `string`
            - [Type](https://github.com/wallet-standard/wallet-standard/blob/c6fa5fd7d58e9ea1e6762127d16585fbb56ff88a/packages/core/base/src/identifier.ts#L8): `${namespace}:${reference}`
            - Example: `solana:mainnet`
        - `features` (required)
          - Description: The features supported by the account.
          - Type: `array`
          - Items:
            - Type: `string`
            - [Type](https://github.com/wallet-standard/wallet-standard/blob/c6fa5fd7d58e9ea1e6762127d16585fbb56ff88a/packages/core/base/src/identifier.ts#L8): `${namespace}:${reference}`
            - Example: `solana:signMessage`
        - `label` (optional)
          - Description: The label of the account.
          - Type: `string`
        - `icon` (optional)
          - Description: The icon of the account.
          - Type: `string`
    - `message` (required)
      - Description: The base64 encoded message to sign.
      - Type: `string`

### Returns

- **Message signature**
  - Type: `object`
  - Properties:
    - `signature` (required)
      - Description: The base64 encoded message signature.
      - Type: `string`
    - `signedMessage` (required)
      - Description: The base64 encoded signed message.
      - Type: `string`
    - `signatureType` (optional)
      - Description: The type of signature.
      - Type: `string`

### Examples

**Request:**

```json
{
  "method": "solana:signMessage",
  "params": {
    "account": {
      "address": "1234567890",
      "publicKey": "1234567890",
      "chains": ["solana:mainnet"],
      "features": ["solana:signMessage"]
    },
    "message": "1234567890"
  }
}
```

**Response:**

```json
{
  "signature": "1234567890",
  "signedMessage": "1234567890",
  "signatureType": "ed25519"
}
```

## [solana:signAndSendAllTransactions](https://github.com/anza-xyz/wallet-standard/blob/master/packages/core/features/src/signAndSendAllTransactions.ts#L8)

Signs and sends all transactions to the Solana blockchain.

### [Parameters](https://github.com/anza-xyz/wallet-standard/blob/master/packages/core/features/src/signAndSendAllTransactions.ts#L39)

- **Transaction intents (required)**
  - Type: `object`
  - Properties:
    - `transactions` (required)
      - Description: The transactions to sign and send.
      - Type: `array`
      - Items:
        - Type: `object`
          - `account` (required)
            - Description: The account to sign the transaction.
            - Type: `object`
            - Properties:
              - `address` (required)
                - Description: The address of the account.
                - Type: `string`
              - `publicKey` (required)
                - Description: The public key of the account.
                - Type: `string`
              - `chains` (required)
                - Description: The chains supported by the account.
                - Type: `array`
                - Items:
                  - Type: `string`
                  - [Type](https://github.com/wallet-standard/wallet-standard/blob/c6fa5fd7d58e9ea1e6762127d16585fbb56ff88a/packages/core/base/src/identifier.ts#L8): `${namespace}:${reference}`
                  - Example: `solana:mainnet`
              - `features` (required)
                - Description: The features supported by the account.
                - Type: `array`
                - Items:
                  - Type: `string`
                  - [Type](https://github.com/wallet-standard/wallet-standard/blob/c6fa5fd7d58e9ea1e6762127d16585fbb56ff88a/packages/core/base/src/identifier.ts#L8): `${namespace}:${reference}`
                  - Example: `solana:signAndSendTransaction`
              - `label` (optional)
                - Description: The label of the account.
                - Type: `string`
              - `icon` (optional)
                - Description: The icon of the account.
                - Type: `string`
        - `transaction` (required)
          - Description: The base64 encoded transaction to sign and send.
          - Type: `string`
        - `chain` (required)
          - Description: The chain ID of the transaction.
          - [Type](https://github.com/wallet-standard/wallet-standard/blob/c6fa5fd7d58e9ea1e6762127d16585fbb56ff88a/packages/core/base/src/identifier.ts#L8): `${namespace}:${reference}`
    - `options` (optional)
      - Description: Transaction options.
      - Type: `object`
      - Properties:
        - `commitment?: 'processed' | 'confirmed' | 'finalized'`: Desired commitment level. If provided, confirm the transaction after sending.
        - `skipPreflight: string`: Disable transaction verification at the RPC.
        - `maxRetries?: number`: Maximum number of times for the RPC node to retry sending the transaction to the leader.

### Returns

- **Transaction signatures**
  - Type: `array`
  - Items:
    - Type: `object`
    - Properties:
      - `signature` (required)
        - Description: The transaction signature.
        - Type: `string`

### Examples

**Request:**

```json
{
  "method": "solana:signAndSendAllTransactions",
  "params": {
    "transactions": [
      {
        "transaction": "1234567890",
        "chain": "solana:mainnet",
        "account": {
          "address": "1234567890",
          "publicKey": "1234567890",
          "chains": ["solana:mainnet"],
          "features": ["solana:signAndSendTransaction"]
        },
        "options": {
          "commitment": "confirmed",
          "skipPreflight": "true",
          "maxRetries": 3
        }
      }
    ]
  }
}
```

**Response:**

```json
[
  {
    "signature": "1234567890"
  }
]
```

## [solana:signIn](https://github.com/anza-xyz/wallet-standard/blob/master/packages/core/features/src/signIn.ts#L4)

Signs in to the Solana blockchain.

### [Parameters](https://github.com/anza-xyz/wallet-standard/blob/master/packages/core/features/src/signIn.ts#L27)

- **Sign in intent (required)**
  - Type: `object`
  - Properties:
    - `domain` (optional)
      - Description: Optional EIP-4361 Domain. If not provided, the wallet must determine the Domain to include in the message.
      - Type: `string`
    - `address` (optional)
      - Description: Optional EIP-4361 Address. If not provided, the wallet must determine the Address to include in the message.
    - `statement` (optional)
      - Description: Optional EIP-4361 Statement. If not provided, the wallet must not include Statement in the message.
      - Type: `string`
    - `uri` (optional)
      - Description: Optional EIP-4361 URI. If not provided, the wallet must not include URI in the message.
      - Type: `string`
    - `version` (optional)
      - Description: Optional EIP-4361 Version. If not provided, the wallet must not include Version in the message.
      - Type: `string`
    - `chainId` (optional)
      - Description: Optional EIP-4361 Chain ID. If not provided, the wallet must not include Chain ID in the message.
      - Type: `string`
    - `nonce` (optional)
      - Description: Optional EIP-4361 Nonce. If not provided, the wallet must not include Nonce in the message.
      - Type: `string`
    - `issuedAt` (optional)
      - Description: Optional EIP-4361 Issued At. If not provided, the wallet must not include Issued At in the message.
      - Type: `string`
    - `expirationTime` (optional)
      - Description: Optional EIP-4361 Expiration Time. If not provided, the wallet must not include Expiration Time in the message.
      - Type: `string`
    - `notBefore` (optional)
      - Description: Optional EIP-4361 Not Before. If not provided, the wallet must not include Not Before in the message.
      - Type: `string`
    - `requestId` (optional)
      - Description: Optional EIP-4361 Nonce. If not provided, the wallet must not include Request ID in the message.
      - Type: `string`
    - `resources` (optional)
      - Description: Optional EIP-4361 Resources. If not provided, the wallet must not include Resources in the message.
      - Type: `array`
      - Items:
        - Type: `string`

### Returns

- **Message signature**
  - Type: `object`
  - Properties:
    - `account` (required)
      - Description: The account that signed the message.
      - Type: `WalletAccount`
    - `signedMessage` (required)
      - Description: Message bytes that were signed. The wallet may prefix or otherwise modify the message before signing it.
      - Type: `string`
    - `signature` (required)
      - Description: The base64 encoded message signature. If the signature type is provided, the signature must be Ed25519.
      - Type: `string`
    - `signatureType` (optional)
      - Description: The type of signature. If not provided, the signature must be Ed25519.
      - Type: `ed25519`

### Examples

**Request:**

```json
{
  "method": "solana:signIn",
  "params": {
    "domain": "example.com"
  }
}
```

**Response:**

```json
{
  "account": {
    "address": "1234567890",
    "publicKey": "1234567890",
    "chains": ["solana:mainnet"],
    "features": ["solana:signIn"]
  },
  "signedMessage": "1234567890",
  "signature": "1234567890",
  "signatureType": "ed25519"
}
```
