---
sip: XX
title: endowment:keyring.keyringApiVersion
status: Draft
discussions-to: https://github.com/MetaMask/SIPs/discussions/XX
author: Charly Chevalier (@ccharly), Daniel Rocha (@danroc)
created: 2025-04-07
---

## Abstract

This proposal introduces a new field, `keyringApiVersion`, within the existing configuration object used by the `endowment:keyring`. This field will allow the versioning of the keyring API, providing the flexibility to define the current API version being used. By declaring the version in the configuration, we can implement conditional behavior in the API based on the selected version. This will allow us to modify or add new functionality in the API without breaking backward compatibility.

## Motivation

The current `endowment:keyring` configuration does not support versioning, which limits our ability to introduce breaking changes or new functionality that may require changes in behavior. Adding the `keyringApiVersion` field allows us to version the API and define distinct behaviors based on the declared version. This is particularly useful as we want to add new fields and features that should only apply to specific versions of the API, ensuring that existing implementations relying on previous versions continue to work without modification.

For example, we plan to modify the `submitRequest(request)` method by adding a new `origin` field to the `request` parameter, but only for version `'v2'` and higher. We won't forward this `origin` field for requests made with version `'v1'`.

```json
{
  "jsonrpc": "2.0",
  "id": "7c507ff0-365f-4de0-8cd5-eb83c30ebda4",
  "method": "keyring_submitRequest",
  "params": {
    "id": "c555de37-cf4b-4ff2-8273-39db7fb58f1c",
    "scope": "eip155:1",
    "account": "4abdd17e-8b0f-4d06-a017-947a64823b3d",
    "request": {
      "method": "eth_method",
      "params": [1, 2, 3]
    },
    "origin": "someOrigin"
  }
}
```

This system will allow us to introduce future versions in a flexible way, avoiding the need for breaking changes when new features are added.

## Specification

### Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" written in uppercase in this document are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt).

### Proposed implementation

1. **Add `keyringApiVersion` to the `endowment:keyring` configuration object.**
   The field will be a string that can take any version string, such as `'v1'`, `'v2'`, and future versions like `'v3'`, `'v4'`, etc. The default value for `keyringApiVersion` will be `'v1'` to maintain compatibility with existing implementations.

   Example of the updated configuration object:
   ```json
   {
     "endowment:keyring": {
       "allowedOrigins": [],
       "keyringApiVersion": "v2"
     }
   }
   ```

2. **Modify API methods to conditionally behave based on the `keyringApiVersion`.**
   - When `keyringApiVersion` is set to `'v1'`, the API will behave as it currently does, with no additional fields in the request.
   - When `keyringApiVersion` is set to `'v2'`, the API will allow new fields, such as the `origin` field, to be included in the request.
   - Future versions will allow additional features or fields to be introduced, with conditional logic to ensure backward compatibility.

3. **Example of conditional behavior in `submitRequest(request)`:**
   - If the `keyringApiVersion` is `'v1'`, the request will not include the `origin` field.
   - If the `keyringApiVersion` is `'v2'`, the `origin` field will be added to the request.

   Example of a request for `'v2'`:

4. **Backward compatibility:**
   - Systems using the `'v1'` configuration will continue to function without modification.
   - New functionality, such as the `origin` field, will only be enabled for systems that declare `'v2'`.
   - As more versions (e.g., `'v3'`, `'v4'`) are introduced, each will have its own set of features or modifications, ensuring that older versions continue to operate as expected.

## Copyright

Copyright and related rights waived via [CC0](../LICENSE).

