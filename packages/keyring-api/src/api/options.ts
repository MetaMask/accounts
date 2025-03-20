import { exactOptional, object, UuidStruct } from '@metamask/keyring-utils';
import type { Infer } from '@metamask/superstruct';

export const MetaMaskOptionsStruct = object({
  /**
   * MetaMask internal options. The 'metamask' field will only be set when
   * the keyring API is being used by a MetaMask client.
   */
  metamask: exactOptional(
    object({
      /**
       * Correlation ID that can be passed by MetaMask.
       */
      correlationId: UuidStruct,
    }),
  ),
});

export type MetaMaskOptions = Infer<typeof MetaMaskOptionsStruct>;
