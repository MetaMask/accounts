# SOL Methods

Here we document the Solana methods that an account Snap may implement to
support requests originated from dapps.

## [signAndSendTransaction](https://github.com/anza-xyz/wallet-standard/blob/master/packages/core/features/src/signAndSendTransaction.ts#L10)

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
    - `transaction` (required)
      - Description: The base64 encoded transaction to sign and send.
      - Type: `string`
    - `scope` (required)
      - Description: The scope of the transaction.
      - Type: `Caip2String`
      - Example: `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp`
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
      - Description: The base58 encoded transaction signature.
      - Type: `string`

### Examples

**Request:**

```json
{
  "method": "signAndSendTransaction",
  "params": {
    "account": {
      "address": "GM4iccdbdSF1qN3Bqmdksfk7iuxYhWzC8T3XbizStAdE"
    },
    "transaction": "MTIzNDU2Nzg5MDIzMzQzNDM1NDM=",
    "scope": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
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

## [signTransaction](https://github.com/anza-xyz/wallet-standard/blob/master/packages/core/features/src/signTransaction.ts#L4)

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
    - `transaction` (required)
      - Description: The base64 encoded transaction to sign.
      - Type: `string`
    - `scope` (required)
      - Description: The scope of the transaction.
      - Type: `Caip2String`
      - Example: `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp`
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
  "method": "signTransaction",
  "params": {
    "account": {
      "address": "GM4iccdbdSF1qN3Bqmdksfk7iuxYhWzC8T3XbizStAdE"
    },
    "transaction": "MTIzNDU2Nzg5MDIzMzQzNDM1NDM=",
    "scope": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
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
  "signedTransaction": "MTIzNDU2Nzg5MDIzMzQzNDM1NDM2NDU2NTM0"
}
```

## [signMessage](https://github.com/anza-xyz/wallet-standard/blob/master/packages/core/features/src/signMessage.ts#L4)

Signs the provided base64 encoded message using the provided account's private key.

It signs the base64 encoded message, **NOT** the original message, meaning that the signature must be verified using the base64 encoded message as well.

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
    - `message` (required)
      - Description: The base64 encoded message to sign.
      - Type: `string`

### Returns

- **Message signature**
  - Type: `object`
  - Properties:
    - `signature` (required)
      - Description: The base58 encoded message signature.
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
  "method": "signMessage",
  "params": {
    "account": {
      "address": "GM4iccdbdSF1qN3Bqmdksfk7iuxYhWzC8T3XbizStAdE"
    },
    "message": "SGVsbG8sIHdvcmxkIQ==", // "Hello, world!" in base64
  }
}
```

**Response:**

```json
{
   "signature":
    "2n1rfebBmxvRd6MMdDdV5V9Hyy34FRBgVc6EFGjH78fNUW2Fz6RgkMwpHwLGFVQS2BBDkHV38FuKdavSF2GTo5gq",
  "signedMessage": "SGVsbG8sIHdvcmxkIQ==", // "Hello, world!" in base64
  "signatureType": "ed25519"
}
```

## [signIn](https://github.com/anza-xyz/wallet-standard/blob/master/packages/core/features/src/signIn.ts#L4)

Signs in to the Solana blockchain. Receives a sign in intent object that contains data like domain, or uri, then converts it into a message using `JSON.stringify()`, then signs the message.

Signature verification must be done against the JSON.

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
      - Type: `object`
      - Properties:
        - `address` (required)
          - Description: The address of the account.
          - Type: `string`
    - `signedMessage` (required)
      - Description: The provided intent object that was JSON.stringified and base64 encoded. Perform signature verifications against this string.
      - Type: `string`
    - `signature` (required)
      - Description: The base58 encoded message signature. If the signature type is provided, the signature must be Ed25519.
      - Type: `string`
    - `signatureType` (optional)
      - Description: The type of signature. If not provided, the signature must be Ed25519.
      - Type: `ed25519`

### Examples

**Request:**

```json
{
  "method": "signIn",
  "params": {
    "address": "27h6cm6S9ag5y4ASi1a1vbTSKEsQMjEdfvZ6atPjmbuD",
    "domain": "example.com",
    "statement": "I accept the terms of service",
    "uri": "https://example.com",
    "version": "1",
    "chainId": "solana:101",
    "nonce": "123",
  }
}
```

**Response:**

```json
{
  "account": {
    "address": "27h6cm6S9ag5y4ASi1a1vbTSKEsQMjEdfvZ6atPjmbuD"
  },
  "signedMessage":
    "eyJhZGRyZXNzIjoiMjdoNmNtNlM5YWc1eTRBU2kxYTF2YlRTS0VzUU1qRWRmdlo2YXRQam1idUQiLCJkb21haW4iOiJleGFtcGxlLmNvbSIsInN0YXRlbWVudCI6IkkgYWNjZXB0IHRoZSB0ZXJtcyBvZiBzZXJ2aWNlIiwidXJpIjoiaHR0cHM6Ly9leGFtcGxlLmNvbSIsInZlcnNpb24iOiIxIiwiY2hhaW5JZCI6InNvbGFuYToxMDEiLCJub25jZSI6IjEyMyJ9",
  "signature":
    "3WiRaNnVAbrYWd4MT7rkq8oBC52HrbLZDst1K2ErAUiXswJu9aBZUMgKZpm581VV8Df6BDmgYGLRP7GcWE8mxMD9",
  "signatureType": "ed25519"
}
```
