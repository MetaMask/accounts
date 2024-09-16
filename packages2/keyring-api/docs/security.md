# Security

## Guidelines for Account Snaps

Account Snap developers should adhere to the following security considerations.

### Don't add secret information to account objects

Account objects (i.e., `KeyringAccount` instances) are exposed to dapps and
MetaMask. Therefore, it's crucial not to store any secret information within
them.

**:x: DO NOT DO THIS:**

```ts
const account: KeyringAccount = {
  id: uuid(),
  options: {
    privateKey: '0x01234...78', // !!! DO NOT DO THIS !!!
  },
  address,
  methods: [
    EthMethod.PersonalSign,
    EthMethod.Sign,
    EthMethod.SignTransaction,
    EthMethod.SignTypedDataV1,
    EthMethod.SignTypedDataV3,
    EthMethod.SignTypedDataV4,
  ],
  type: EthAccountType.Eoa,
};
```

**:white_check_mark: DO THIS INSTEAD:**

Store any secret information that you need in the Snap's state:

```ts
await snap.request({
  method: 'snap_manageState',
  params: {
    operation: 'update',
    newState: {
      // Your Snap's state here...
      privateKey: '0x01234...78',
    },
  },
});
```

### Limit the methods exposed to dapps

MetaMask enforces the following restrictions based on the origin type of the
caller:

| Method                        |  MetaMask Origin   |    Dapp Origin     |
| :---------------------------- | :----------------: | :----------------: |
| `keyring_listAccounts`        | :white_check_mark: | :white_check_mark: |
| `keyring_getAccount`          | :white_check_mark: | :white_check_mark: |
| `keyring_createAccount`       |        :x:         | :white_check_mark: |
| `keyring_filterAccountChains` | :white_check_mark: | :white_check_mark: |
| `keyring_updateAccount`       |        :x:         | :white_check_mark: |
| `keyring_deleteAccount`       | :white_check_mark: | :white_check_mark: |
| `keyring_exportAccount`       |        :x:         | :white_check_mark: |
| `keyring_listRequests`        | :white_check_mark: | :white_check_mark: |
| `keyring_getRequest`          | :white_check_mark: | :white_check_mark: |
| `keyring_submitRequest`       | :white_check_mark: |        :x:         |
| `keyring_approveRequest`      |        :x:         | :white_check_mark: |
| `keyring_rejectRequest`       | :white_check_mark: | :white_check_mark: |

So, for example, a dapp is not allowed to call the `keyring_submitRequest`
method of your Snap, and MetaMask is not allowed to call the
`keyring_createAccount` method.

MetaMask also enforces that only dapps allowlisted in the Snap's manifest can
call the methods above. For example, if your Snap's manifest contains the
following allowlist:

```jsonc
{
  // Other fields of the manifest...
  "initialPermissions": {
    // Other initial permissions...
    "endowment:keyring": {
      "allowedOrigins": ["https://<dapp domain>"]
    }
  }
}
```

Then only the dapp at `https://<dapp domain>` can call the methods above. If a
dapp hosted in a different domain attempts to call one of these methods, the
request will be rejected by MetaMask.

But Snap developers are advised to further constrain the methods that are
exposed to dapps in accordance with their Snap's functionality. For instance,
if your Snap does not support account deletion via dapps, your Snap should
reject calls to the `keyring_deleteAccount` method originating from dapps.

Your Snap can also impose varying restrictions depending on the calling dapp.
For example, _dapp-1_ may have access to a different set of methods than
_dapp-2_.

The following code snippet provides an example of how to implement such logic:

```ts
const permissions: Record<string, string[]> = {
  'https://<dapp-1 domain>': [
    // List of allowed methods for dapp-1.
  ],
  'https://<dapp-2 domain>': [
    // List of allowed methods for dapp-2.
  ],
};

if (origin !== 'metamask' && !permissions[origin]?.includes(request.method)) {
  // Reject the request.
}
```

Notice, however, that both dapps must be allowlisted in the Snap's manifest.

### Ensure that the redirect URL cannot be manipulated

If your Snap implements the [asynchronous transaction flow][async-flow], ensure
that the redirect URL is valid and cannot be manipulated, otherwise the user
could be redirected to a malicious website.

```ts
async submitRequest(request: KeyringRequest): Promise<SubmitRequestResponse> {
  // Your Snap's custom logic here...
  return {
    pending: true,
    redirect: {
      message: 'Please continue in the Dapp.',
      url: 'https://<dapp domain>/sign?tx=1234', // !!! ENSURE THIS IS A SAFE URL !!!
    },
  };
}
```

> :point_up: **Important:** Only HTTPS URLs are allowed in the `url` field, and
> the provided URL will be checked against a [list of blocked
> domains][eth-phishing-detect]. However, for development purposes, HTTP URLs
> are allowed on Flask.
>
> We also enforce that the redirect URL links to a page within one of the
> allowed origins present in the Snap's manifest.

### Remove all debug code from your production Snap

Ensure that all debug code is removed from your production Snap. This mistake
can lead to multiple security vulnerabilities. For example, secret information
may be logged to the console, or a security check may be bypassed by a
malicious dapp.

### Sanitize errors to remove sensitive information

Ensure that all errors returned by your Snap are sanitized. This mistake can
lead to secrets being exposed to dapps or MetaMask through error messages.

**:x: DO NOT DO THIS:**

```ts
// !!! DO NOT DO THIS !!!
//
// If `inputSecretValue` contains invalid hexadecimal characters, its value
// will be added to the error thrown by `toBuffer`.
const privateKey = toBuffer(inputSecretValue);
// Use `privateKey` here...
```

**:white_check_mark: DO THIS INSTEAD:**

```ts
try {
  const privateKey = toBuffer(inputSecretValue);
  // Use `privateKey` here...
} catch (error) {
  throw new Error('Invalid private key');
}
```

### Don't expose Keyring methods through the `onRpcRequest` export

The `onRpcRequest` export is intended to be a general-purpose export and thus
has no restrictions on the methods that can be called.

Ensure that you only export Keyring methods through the `onKeyringRequest`
export. It has extra security checks in place that are enforced by MetaMask.

**:x: DO NOT DO THIS:**

```ts
export const onRpcRequest: OnRpcRequestHandler = async ({
  //           ~~~           ~~~
  origin,
  request,
}) => {
  return handleKeyringRequest(keyring, request);
};
```

**:white_check_mark: DO THIS INSTEAD:**

```ts
export const onKeyringRequest: OnKeyringRequestHandler = async ({
  //           ~~~~~~~           ~~~~~~~
  origin,
  request,
}) => {
  // Any custom logic or extra security checks here...
  return handleKeyringRequest(keyring, request);
};
```

### Don't fetch remote code from inside your Snap

Your Snap should be self-contained and not fetch code from external sources.
Otherwise a compromised server could use this mechanism to inject malicious
code into your Snap.

[eth-phishing-detect]: https://github.com/MetaMask/eth-phishing-detect
[async-flow]: ./architecture.md#asynchronous-transaction-flow
