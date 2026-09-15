import { Buffer } from 'buffer';

/**
 * Minimal structural interface for a Ledger HW Transport instance.
 *
 * @ledgerhq/hw-transport is a CJS-only package with no `exports` field.
 * TypeScript 7 with Node16 module resolution cannot import its default export
 * as a type, so we declare the shape we actually depend on locally and verify
 * assignability via the `.test-d.ts` file.
 */
export type Transport = {
  deviceModel: { id: unknown } | null | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  send: (...args: any[]) => Promise<Buffer>;
  close: () => Promise<void>;
};
