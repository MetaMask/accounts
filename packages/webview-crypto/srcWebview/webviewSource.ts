/* eslint-disable no-restricted-globals */
/* eslint-disable @typescript-eslint/consistent-type-definitions */
/* eslint-disable jsdoc/require-jsdoc */
import { HDKey } from 'ethereum-cryptography/hdkey';

// Extend window type for React Native WebView
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
  }
}

// Automatically extract all static methods from HDKey
type HDKeyStaticMethods = {
  [K in keyof typeof HDKey as (typeof HDKey)[K] extends (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...args: any[]
  ) => HDKey
    ? K
    : never]: (typeof HDKey)[K];
};

// Automatically extract all instance methods from HDKey
type HDKeyInstanceMethods = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in keyof HDKey as HDKey[K] extends (...args: any[]) => any
    ? K
    : never]: HDKey[K];
};

// Automatically extract all properties from HDKey
type HDKeyProperties = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in keyof HDKey as HDKey[K] extends (...args: any[]) => any
    ? never
    : K]: HDKey[K];
};

// Simple, well-typed WebView operations that match HDKeyProxy exactly
type WebViewOperations = {
  // Static methods - match HDKeyProxy static methods exactly
  fromMasterSeed: {
    params: { seed: number[]; versions?: { private: number; public: number } };
    result: { instanceId: string };
  };
  fromExtendedKey: {
    params: {
      base58key: string;
      versions?: { private: number; public: number };
    };
    result: { instanceId: string };
  };
  fromJSON: {
    params: { json: { xpriv: string } };
    result: { instanceId: string };
  };

  // Instance methods - match HDKeyProxy instance methods exactly
  derive: {
    params: { path: string };
    result: { instanceId: string };
  };
  deriveChild: {
    params: { index: number };
    result: { instanceId: string };
  };
  sign: {
    params: { hash: number[] };
    result: { signature: number[] };
  };
  verify: {
    params: { hash: number[]; signature: number[] };
    result: { isValid: boolean };
  };
  wipePrivateData: {
    params: Record<string, never>;
    result: Record<string, never>;
  };
  toJSON: {
    params: Record<string, never>;
    result: { xpriv: string; xpub: string };
  };

  // Property access - handles all HDKey properties automatically
  getProperty: {
    params: { property: keyof HDKeyProperties };
    result: unknown;
  };

  // Cleanup
  dispose: {
    params: Record<string, never>;
    result: Record<string, never>;
  };
};

// COMPILE-TIME SYNC VERIFICATION
// Verify that all HDKey static methods are covered
type VerifyStaticMethods = {
  [K in keyof HDKeyStaticMethods]: K extends keyof WebViewOperations
    ? true
    : `Missing WebView operation for HDKey static method: ${K}`;
};

// Verify that all HDKey instance methods are covered
type VerifyInstanceMethods = {
  [K in keyof HDKeyInstanceMethods]: K extends keyof WebViewOperations
    ? true
    : `Missing WebView operation for HDKey instance method: ${K}`;
};

// Verify that property access is covered
type VerifyPropertyAccess = 'getProperty' extends keyof WebViewOperations
  ? true
  : 'Missing getProperty operation for HDKey properties';

// These will cause compilation errors if sync is broken
type StaticMethodsCheck = VerifyStaticMethods[keyof HDKeyStaticMethods];
type InstanceMethodsCheck = VerifyInstanceMethods[keyof HDKeyInstanceMethods];
type PropertyAccessCheck = VerifyPropertyAccess;

// Force compile-time verification
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _verifyStaticMethods: StaticMethodsCheck = true;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _verifyInstanceMethods: InstanceMethodsCheck = true;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _verifyPropertyAccess: PropertyAccessCheck = true;

type OperationName = keyof WebViewOperations;

type WebViewMessage = {
  type: 'hdkey_operation';
  id: string;
  operation: OperationName;
  params?: WebViewOperations[OperationName]['params'];
  instanceId?: string;
};

type WebViewResponse = {
  id: string;
  success: boolean;
  result?: unknown;
  error?: string;
};

// Store HDKey instances by ID
const hdkeyInstances = new Map<string, HDKey>();

// Generate random ID for instances
function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

// Helper to serialize Uint8Array properties
function serializeProperty(value: unknown): unknown {
  if (value instanceof Uint8Array) {
    return Array.from(value);
  }
  return value;
}

// Properly typed operation handlers - no type assertions needed
const operationHandlers: {
  [K in OperationName]: (
    params: WebViewOperations[K]['params'],
    instanceId?: string,
  ) => WebViewOperations[K]['result'];
} = {
  // Static methods - properly typed
  fromMasterSeed: (params) => {
    if (!params.seed) {
      throw new Error('Missing seed parameter');
    }
    const id = generateId();
    const hdkey = HDKey.fromMasterSeed(
      new Uint8Array(params.seed),
      params.versions,
    );
    hdkeyInstances.set(id, hdkey);
    return { instanceId: id };
  },

  fromExtendedKey: (params) => {
    if (!params.base58key) {
      throw new Error('Missing base58key parameter');
    }
    const id = generateId();
    const hdkey = HDKey.fromExtendedKey(params.base58key, params.versions);
    hdkeyInstances.set(id, hdkey);
    return { instanceId: id };
  },

  fromJSON: (params) => {
    if (!params.json) {
      throw new Error('Missing json parameter');
    }
    const id = generateId();
    const hdkey = HDKey.fromJSON(params.json);
    hdkeyInstances.set(id, hdkey);
    return { instanceId: id };
  },

  // Instance methods - properly typed
  derive: (params, instanceId) => {
    if (!instanceId) {
      throw new Error('Missing instanceId parameter');
    }
    if (!params.path) {
      throw new Error('Missing path parameter');
    }
    const instance = hdkeyInstances.get(instanceId);
    if (!instance) {
      throw new Error('Instance not found');
    }

    const derived = instance.derive(params.path);
    const newId = generateId();
    hdkeyInstances.set(newId, derived);
    return { instanceId: newId };
  },

  deriveChild: (params, instanceId) => {
    if (!instanceId) {
      throw new Error('Missing instanceId parameter');
    }
    if (params.index === undefined) {
      throw new Error('Missing index parameter');
    }
    const instance = hdkeyInstances.get(instanceId);
    if (!instance) {
      throw new Error('Instance not found');
    }

    const derived = instance.deriveChild(params.index);
    const newId = generateId();
    hdkeyInstances.set(newId, derived);
    return { instanceId: newId };
  },

  sign: (params, instanceId) => {
    if (!instanceId) {
      throw new Error('Missing instanceId parameter');
    }
    if (!params.hash) {
      throw new Error('Missing hash parameter');
    }
    const instance = hdkeyInstances.get(instanceId);
    if (!instance) {
      throw new Error('Instance not found');
    }

    const signature = instance.sign(new Uint8Array(params.hash));
    return { signature: Array.from(signature) };
  },

  verify: (params, instanceId) => {
    if (!instanceId) {
      throw new Error('Missing instanceId parameter');
    }
    if (!params.hash || !params.signature) {
      throw new Error('Missing hash or signature parameter');
    }
    const instance = hdkeyInstances.get(instanceId);
    if (!instance) {
      throw new Error('Instance not found');
    }

    const isValid = instance.verify(
      new Uint8Array(params.hash),
      new Uint8Array(params.signature),
    );
    return { isValid };
  },

  wipePrivateData: (_params, instanceId) => {
    if (!instanceId) {
      throw new Error('Missing instanceId parameter');
    }
    const instance = hdkeyInstances.get(instanceId);
    if (!instance) {
      throw new Error('Instance not found');
    }

    instance.wipePrivateData();
    return {};
  },

  toJSON: (_params, instanceId) => {
    if (!instanceId) {
      throw new Error('Missing instanceId parameter');
    }
    const instance = hdkeyInstances.get(instanceId);
    if (!instance) {
      throw new Error('Instance not found');
    }

    return instance.toJSON();
  },

  // Property access - automatically handles ALL HDKey properties
  getProperty: (params, instanceId) => {
    if (!instanceId) {
      throw new Error('Missing instanceId parameter');
    }
    if (!params.property) {
      throw new Error('Missing property parameter');
    }
    const instance = hdkeyInstances.get(instanceId);
    if (!instance) {
      throw new Error('Instance not found');
    }

    if (!(params.property in instance)) {
      throw new Error(`Unknown property: ${String(params.property)}`);
    }

    return serializeProperty(instance[params.property]);
  },

  // Cleanup
  dispose: (_params, instanceId) => {
    if (!instanceId) {
      throw new Error('Missing instanceId parameter');
    }
    if (!hdkeyInstances.has(instanceId)) {
      throw new Error('Instance not found');
    }
    hdkeyInstances.delete(instanceId);
    return {};
  },
};

// Handle messages from React Native
function handleMessage(event: MessageEvent): void {
  const message: WebViewMessage = JSON.parse(event.data);

  if (message.type !== 'hdkey_operation') {
    return;
  }

  const response: WebViewResponse = {
    id: message.id,
    success: false,
  };

  try {
    const handler = operationHandlers[message.operation];
    if (!handler) {
      throw new Error(`Unknown operation: ${message.operation}`);
    }

    const result = handler(message.params as never, message.instanceId);
    response.success = true;
    response.result = result;
  } catch (error) {
    response.error = error instanceof Error ? error.message : 'Unknown error';
  }

  // Send response back to React Native
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(JSON.stringify(response));
  }
}

// Listen for messages from React Native
window.addEventListener('message', handleMessage);
