import type { HDKey } from 'ethereum-cryptography/hdkey';

import type { HDKeyProxy } from './HDKeyProxy';

// Automatically convert all HDKey methods to async versions
export type AsyncHDKeyProxy = {
  // Transform all HDKey methods to async, replacing HDKey returns with HDKeyProxy
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- any is safe here for conditional type checking to determine if property is a method
  [K in keyof HDKey as HDKey[K] extends (...args: any[]) => any
    ? K
    : never]: HDKey[K] extends (...args: infer Args) => HDKey
    ? (...args: Args) => Promise<HDKeyProxy> // Methods returning HDKey return HDKeyProxy
    : HDKey[K] extends (...args: infer Args) => infer Return
    ? (...args: Args) => Promise<Return> // Other methods become async
    : never;
} & {
  // Transform all HDKey properties to async getters
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- any is safe here for conditional type checking to determine if property is a method
  [K in keyof HDKey as HDKey[K] extends (...args: any[]) => any
    ? never
    : `get${Capitalize<string & K>}`]: () => Promise<HDKey[K]>;
} & {
  // Additional cleanup method
  dispose(): Promise<void>;
};

// Automatically convert all HDKey methods to async versions
export type AsyncHDKeyInstance = {
  // Transform all HDKey methods to async, replacing HDKey returns with HDKeyProxy
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- any is safe here for conditional type checking to determine if property is a method
  [K in keyof HDKey as HDKey[K] extends (...args: any[]) => any
    ? K
    : never]: HDKey[K] extends (...args: infer Args) => HDKey
    ? (...args: Args) => Promise<AsyncHDKeyInstance> // Methods returning HDKey return HDKeyProxy or HDKey
    : HDKey[K] extends (...args: infer Args) => infer Return
    ? (...args: Args) => Promise<Return> // Other methods become async
    : never;
} & {
  // Transform all HDKey properties to async getters
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- any is safe here for conditional type checking to determine if property is a method
  [K in keyof HDKey as HDKey[K] extends (...args: any[]) => any
    ? never
    : `get${Capitalize<string & K>}`]: () => Promise<HDKey[K]>;
};
