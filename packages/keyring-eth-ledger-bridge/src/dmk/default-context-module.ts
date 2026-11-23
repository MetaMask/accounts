import {
  ContextModuleBuilder,
  ContextModuleChainID,
} from '@ledgerhq/context-module';
import type { ContextModule } from '@ledgerhq/context-module';

/**
 * Build an Ethereum context module that never reports to Ledger.
 *
 * The signer kit calls `ContextModule.report()` after every signature, and
 * Ledger's implementation posts the target address, device model, app version
 * and a signature id to `blind-signing.api.ledger.com`. The clear-signing
 * lookups are forwarded; `report()` is dropped.
 *
 * Wrapping the module rather than passing a custom `BlindSigningReporter` to
 * the builder keeps `purify-ts` (the reporter's `Either` type) out of our
 * dependencies.
 *
 * @returns A context module with blind-signing reporting disabled.
 */
export function createDefaultContextModule(): ContextModule {
  const contextModule = new ContextModuleBuilder({})
    .setChain(ContextModuleChainID.Ethereum)
    .build();

  return {
    getContexts: async (input, expectedTypes) =>
      contextModule.getContexts(input, expectedTypes),
    getFieldContext: async (field, expectedType) =>
      contextModule.getFieldContext(field, expectedType),
    getTypedDataFilters: async (typedData) =>
      contextModule.getTypedDataFilters(typedData),
    report: async () => undefined,
  };
}
