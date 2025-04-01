import { hasProperty } from '@metamask/utils';

import {
  type IFrameMessageResponse,
  IFrameMessageAction,
  LedgerIframeBridge,
} from './ledger-iframe-bridge';
import documentShim from '../test/document.shim';
import windowShim from '../test/window.shim';

global.document = documentShim;
global.window = windowShim;

// eslint-disable-next-line no-restricted-globals
type HTMLIFrameElementShim = HTMLIFrameElement;
// eslint-disable-next-line no-restricted-globals
type WindowShim = Window;

/**
 * Checks if the iframe provided has a valid contentWindow
 * and onload function.
 *
 * @param iframe - The iframe to check.
 * @returns Returns true if the iframe is valid, false otherwise.
 */
function isIFrameValid(
  iframe?: HTMLIFrameElementShim,
): iframe is HTMLIFrameElementShim & { contentWindow: WindowShim } & {
  onload: () => any;
} {
  return (
    iframe !== undefined &&
    hasProperty(iframe, 'contentWindow') &&
    typeof iframe.onload === 'function' &&
    hasProperty(iframe.contentWindow as WindowShim, 'postMessage')
  );
}

const LEDGER_IFRAME_ID = 'LEDGER-IFRAME';
const BRIDGE_URL = 'https://metamask.github.io/eth-ledger-bridge-keyring';
const INVALID_URL_ERROR = 'bridgeURL is not a valid URL';
describe('LedgerIframeBridge', function () {
  let bridge: LedgerIframeBridge;

  /**
   * Stubs the postMessage function of the keyring iframe.
   *
   * @param bridgeInstance - The bridge instance to stub.
   * @param fn - The function to call when the postMessage function is called.
   */
  function stubKeyringIFramePostMessage(
    bridgeInstance: LedgerIframeBridge,
    fn: (message: IFrameMessageResponse) => void,
  ): void {
    if (!isIFrameValid(bridgeInstance.iframe)) {
      throw new Error('the iframe is not valid');
    }

    jest
      .spyOn(bridgeInstance.iframe.contentWindow, 'postMessage')
      .mockImplementation(fn);
  }

  beforeEach(async function () {
    bridge = new LedgerIframeBridge({
      bridgeUrl: BRIDGE_URL,
    });
    await bridge.init();
  });

  afterEach(function () {
    jest.clearAllMocks();
  });

  describe('constructor', function () {
    describe('when configurate not given', function () {
      it('should use the default bridgeUrl', async function () {
        bridge = new LedgerIframeBridge();
        expect(await bridge.getOptions()).toHaveProperty(
          'bridgeUrl',
          BRIDGE_URL,
        );
      });
    });

    describe('when configurate given', function () {
      it('should set the given bridgeUrl', async function () {
        bridge = new LedgerIframeBridge({
          bridgeUrl: 'https://metamask.io',
        });
        expect(await bridge.getOptions()).toHaveProperty(
          'bridgeUrl',
          'https://metamask.io',
        );
      });

      it('should throw error if given url is empty', async function () {
        expect(
          () =>
            new LedgerIframeBridge({
              bridgeUrl: '',
            }),
        ).toThrow(INVALID_URL_ERROR);
      });
    });
  });

  describe('init', function () {
    it('sets up the listener and iframe', async function () {
      bridge = new LedgerIframeBridge();
      const addEventListenerSpy = jest.spyOn(global.window, 'addEventListener');

      await bridge.init();

      expect(addEventListenerSpy).toHaveBeenCalledTimes(1);
      expect(bridge.iframeLoaded).toBe(true);
    });
  });

  describe('destroy', function () {
    it('removes the message event listener', async function () {
      const removeEventListenerSpy = jest.spyOn(
        global.window,
        'removeEventListener',
      );

      await bridge.destroy();

      expect(removeEventListenerSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('attemptMakeApp', function () {
    it('sends and processes a successful ledger-make-app message', async function () {
      stubKeyringIFramePostMessage(bridge, (message) => {
        expect(message).toStrictEqual({
          action: IFrameMessageAction.LedgerMakeApp,
          messageId: 1,
          target: LEDGER_IFRAME_ID,
        });

        bridge.messageCallbacks[message.messageId]?.({
          action: IFrameMessageAction.LedgerMakeApp,
          messageId: 1,
          success: true,
        });
      });

      const result = await bridge.attemptMakeApp();

      expect(result).toBe(true);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(bridge.iframe?.contentWindow?.postMessage).toHaveBeenCalled();
    });

    it('throws an error when a ledger-make-app message is not successful', async function () {
      const errorMessage = 'Ledger Error';

      stubKeyringIFramePostMessage(bridge, (message) => {
        expect(message).toStrictEqual({
          action: IFrameMessageAction.LedgerMakeApp,
          messageId: 1,
          target: LEDGER_IFRAME_ID,
        });

        bridge.messageCallbacks[message.messageId]?.({
          action: IFrameMessageAction.LedgerMakeApp,
          messageId: 1,
          success: false,
          error: new Error(errorMessage),
        });
      });

      await expect(bridge.attemptMakeApp()).rejects.toThrow(errorMessage);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(bridge.iframe?.contentWindow?.postMessage).toHaveBeenCalled();
    });

    it('throws an error when unknown error occur', async function () {
      const errorMessage = 'Unknown error occurred';

      stubKeyringIFramePostMessage(bridge, (message) => {
        expect(message).toStrictEqual({
          action: IFrameMessageAction.LedgerMakeApp,
          messageId: 1,
          target: LEDGER_IFRAME_ID,
        });

        bridge.messageCallbacks[message.messageId]?.({
          action: IFrameMessageAction.LedgerMakeApp,
          messageId: 1,
          success: false,
        });
      });

      await expect(bridge.attemptMakeApp()).rejects.toThrow(errorMessage);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(bridge.iframe?.contentWindow?.postMessage).toHaveBeenCalled();
    });
  });

  describe('updateTransportMethod', function () {
    it('sends and processes a successful ledger-update-transport message', async function () {
      const transportType = 'u2f';

      stubKeyringIFramePostMessage(bridge, (message) => {
        expect(message).toStrictEqual({
          action: IFrameMessageAction.LedgerUpdateTransport,
          messageId: 1,
          target: LEDGER_IFRAME_ID,
          params: { transportType },
        });

        bridge.messageCallbacks[message.messageId]?.({
          action: IFrameMessageAction.LedgerUpdateTransport,
          messageId: 1,
          success: true,
        });
      });

      const result = await bridge.updateTransportMethod(transportType);

      expect(result).toBe(true);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(bridge.iframe?.contentWindow?.postMessage).toHaveBeenCalled();
    });

    it('throws an error when the bridge is not initialized', async function () {
      bridge = new LedgerIframeBridge();

      await expect(bridge.updateTransportMethod('u2f')).rejects.toThrow(
        'The iframe is not loaded yet',
      );
    });

    it('throws an error when a ledger-update-transport message is not successful', async function () {
      bridge.iframeLoaded = true;

      const transportType = 'u2f';

      stubKeyringIFramePostMessage(bridge, (message) => {
        expect(message).toStrictEqual({
          action: 'ledger-update-transport',
          messageId: 1,
          params: { transportType },
          target: LEDGER_IFRAME_ID,
        });

        bridge.messageCallbacks[message.messageId]?.({
          action: IFrameMessageAction.LedgerUpdateTransport,
          messageId: 1,
          success: false,
        });
      });

      await expect(bridge.updateTransportMethod(transportType)).rejects.toThrow(
        'Ledger transport could not be updated',
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(bridge.iframe?.contentWindow?.postMessage).toHaveBeenCalled();
    });
  });

  describe('getPublicKey', function () {
    it('sends and processes a successful ledger-unlock message', async function () {
      const payload = {
        publicKey: '',
        address: '',
        chainCode: '',
      };
      const params = {
        hdPath: "m/44'/60'/0'/0",
      };

      stubKeyringIFramePostMessage(bridge, (message) => {
        expect(message).toStrictEqual({
          action: IFrameMessageAction.LedgerUnlock,
          params,
          messageId: 1,
          target: LEDGER_IFRAME_ID,
        });

        bridge.messageCallbacks[message.messageId]?.({
          action: IFrameMessageAction.LedgerUnlock,
          messageId: 1,
          success: true,
          payload,
        });
      });

      const result = await bridge.getPublicKey(params);

      expect(result).toBe(payload);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(bridge.iframe?.contentWindow?.postMessage).toHaveBeenCalled();
    });

    it('throws an error when a ledger-unlock message is not successful', async function () {
      const errorMessage = 'Ledger Error';
      const params = {
        hdPath: "m/44'/60'/0'/0",
      };

      stubKeyringIFramePostMessage(bridge, (message) => {
        expect(message).toStrictEqual({
          action: IFrameMessageAction.LedgerUnlock,
          messageId: 1,
          target: LEDGER_IFRAME_ID,
          params,
        });

        bridge.messageCallbacks[message.messageId]?.({
          action: IFrameMessageAction.LedgerUnlock,
          messageId: 1,
          success: false,
          payload: { error: new Error(errorMessage) },
        });
      });

      await expect(bridge.getPublicKey(params)).rejects.toThrow(errorMessage);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(bridge.iframe?.contentWindow?.postMessage).toHaveBeenCalled();
    });
  });

  describe('deviceSignTransaction', function () {
    it('sends and processes a successful ledger-sign-transaction message', async function () {
      const payload = {
        v: '',
        r: '',
        s: '',
      };
      const params = {
        hdPath: "m/44'/60'/0'/0",
        tx: '',
      };

      stubKeyringIFramePostMessage(bridge, (message) => {
        expect(message).toStrictEqual({
          action: IFrameMessageAction.LedgerSignTransaction,
          messageId: 1,
          target: LEDGER_IFRAME_ID,
          params,
        });

        bridge.messageCallbacks[message.messageId]?.({
          action: IFrameMessageAction.LedgerSignTransaction,
          messageId: 1,
          success: true,
          payload,
        });
      });

      const result = await bridge.deviceSignTransaction(params);

      expect(result).toBe(payload);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(bridge.iframe?.contentWindow?.postMessage).toHaveBeenCalled();
    });

    it('throws an error when a ledger-sign-transaction message is not successful', async function () {
      const errorMessage = 'Ledger Error';
      const params = { hdPath: "m/44'/60'/0'/0", tx: '' };

      stubKeyringIFramePostMessage(bridge, (message) => {
        expect(message).toStrictEqual({
          action: IFrameMessageAction.LedgerSignTransaction,
          messageId: 1,
          target: LEDGER_IFRAME_ID,
          params,
        });

        bridge.messageCallbacks[message.messageId]?.({
          action: IFrameMessageAction.LedgerSignTransaction,
          messageId: 1,
          success: false,
          payload: { error: new Error(errorMessage) },
        });
      });

      await expect(bridge.deviceSignTransaction(params)).rejects.toThrow(
        errorMessage,
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(bridge.iframe?.contentWindow?.postMessage).toHaveBeenCalled();
    });
  });

  describe('deviceSignMessage', function () {
    it('sends and processes a successful ledger-sign-personal-message message', async function () {
      const payload = {
        v: 0,
        r: '',
        s: '',
      };
      const params = { hdPath: "m/44'/60'/0'/0", message: '' };

      stubKeyringIFramePostMessage(bridge, (message) => {
        expect(message).toStrictEqual({
          action: IFrameMessageAction.LedgerSignPersonalMessage,
          messageId: 1,
          target: LEDGER_IFRAME_ID,
          params,
        });

        bridge.messageCallbacks[message.messageId]?.({
          action: IFrameMessageAction.LedgerSignPersonalMessage,
          messageId: 1,
          success: true,
          payload,
        });
      });

      const result = await bridge.deviceSignMessage(params);

      expect(result).toBe(payload);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(bridge.iframe?.contentWindow?.postMessage).toHaveBeenCalled();
    });

    it('throws an error when a ledger-sign-personal-message message is not successful', async function () {
      const errorMessage = 'Ledger Error';
      const params = { hdPath: "m/44'/60'/0'/0", message: '' };

      stubKeyringIFramePostMessage(bridge, (message) => {
        expect(message).toStrictEqual({
          action: IFrameMessageAction.LedgerSignPersonalMessage,
          messageId: 1,
          target: LEDGER_IFRAME_ID,
          params,
        });

        bridge.messageCallbacks[message.messageId]?.({
          action: IFrameMessageAction.LedgerSignPersonalMessage,
          messageId: 1,
          success: false,
          payload: { error: new Error(errorMessage) },
        });
      });

      await expect(bridge.deviceSignMessage(params)).rejects.toThrow(
        errorMessage,
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(bridge.iframe?.contentWindow?.postMessage).toHaveBeenCalled();
    });
  });

  describe('deviceSignTypedData', function () {
    const params = {
      hdPath: "m/44'/60'/0'/0",
      message: {
        domain: {
          chainId: 1,
          verifyingContract: '0xdsf',
        },
        primaryType: 'string',
        types: {
          EIP712Domain: [],
          string: [],
        },
        message: { test: 'test' },
      },
    };

    it('sends and processes a successful ledger-sign-typed-data message', async function () {
      const payload = {
        v: 0,
        r: '',
        s: '',
      };

      stubKeyringIFramePostMessage(bridge, (message) => {
        expect(message).toStrictEqual({
          action: IFrameMessageAction.LedgerSignTypedData,
          messageId: 1,
          target: LEDGER_IFRAME_ID,
          params,
        });

        bridge.messageCallbacks[message.messageId]?.({
          action: IFrameMessageAction.LedgerSignTypedData,
          messageId: 1,
          success: true,
          payload,
        });
      });

      const result = await bridge.deviceSignTypedData(params);

      expect(result).toBe(payload);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(bridge.iframe?.contentWindow?.postMessage).toHaveBeenCalled();
    });

    it('throws an error when a ledger-sign-typed-data message is not successful', async function () {
      const errorMessage = 'Ledger Error';

      stubKeyringIFramePostMessage(bridge, (message) => {
        expect(message).toStrictEqual({
          action: IFrameMessageAction.LedgerSignTypedData,
          messageId: 1,
          target: LEDGER_IFRAME_ID,
          params,
        });

        bridge.messageCallbacks[message.messageId]?.({
          action: IFrameMessageAction.LedgerSignTypedData,
          messageId: 1,
          success: false,
          payload: { error: new Error(errorMessage) },
        });
      });

      await expect(bridge.deviceSignTypedData(params)).rejects.toThrow(
        errorMessage,
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(bridge.iframe?.contentWindow?.postMessage).toHaveBeenCalled();
    });
  });

  describe('setOption', function () {
    let removeEventListenerSpy: jest.SpyInstance;
    let addEventListenerSpy: jest.SpyInstance;
    const defaultIframeLoadedCounter = 1;

    beforeEach(async () => {
      removeEventListenerSpy = jest.spyOn(global.window, 'removeEventListener');
      addEventListenerSpy = jest.spyOn(global.window, 'addEventListener');
      bridge = new LedgerIframeBridge();
      await bridge.init();
    });

    describe('when configurate bridge url', function () {
      describe('when given bridge url is different with current', function () {
        beforeEach(async () => {
          await bridge.setOptions({ bridgeUrl: 'https://metamask.io' });
        });

        it('should set bridgeUrl correctly', async function () {
          expect(await bridge.getOptions()).toHaveProperty(
            'bridgeUrl',
            'https://metamask.io',
          );
        });

        it('should reload the iframe', async function () {
          expect(addEventListenerSpy).toHaveBeenCalledTimes(
            defaultIframeLoadedCounter + 1,
          );
          expect(removeEventListenerSpy).toHaveBeenCalledTimes(1);
        });
      });

      describe('when given bridge url is same as current', function () {
        beforeEach(async () => {
          await bridge.setOptions({ bridgeUrl: BRIDGE_URL });
        });

        it('should not set bridgeUrl', async function () {
          expect(await bridge.getOptions()).toHaveProperty(
            'bridgeUrl',
            BRIDGE_URL,
          );
        });

        it('should not reload the iframe', async function () {
          expect(addEventListenerSpy).toHaveBeenCalledTimes(
            defaultIframeLoadedCounter,
          );
          expect(removeEventListenerSpy).toHaveBeenCalledTimes(0);
        });
      });

      describe('when given bridge url is empty', function () {
        it('should throw error', async function () {
          await expect(bridge.setOptions({ bridgeUrl: '' })).rejects.toThrow(
            INVALID_URL_ERROR,
          );
        });
      });
    });
  });

  describe('getOption', function () {
    it('return instance options', async function () {
      const result = await bridge.getOptions();
      expect(result).toStrictEqual({
        bridgeUrl: BRIDGE_URL,
      });
    });
  });

  describe('#eventListener', function () {
    let bridgeUrl: string;
    let addEventListenerSpy: jest.SpyInstance;
    let messageEventCallback: (event: MessageEvent) => void;

    beforeEach(async function () {
      bridgeUrl = BRIDGE_URL;

      // Spy on addEventListener to capture the event listener function
      addEventListenerSpy = jest.spyOn(global.window, 'addEventListener');

      // Create a new bridge instance
      bridge = new LedgerIframeBridge({
        bridgeUrl,
      });

      // Initialize the bridge to register the event listener
      await bridge.init();

      // Extract the message event callback that was registered
      const messageEventCallArgs = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === 'message',
      );

      // Verify that we found the message event listener
      if (!messageEventCallArgs) {
        throw new Error('Message event listener not found');
      }

      // Store the callback for later use
      messageEventCallback = messageEventCallArgs[1] as (
        event: MessageEvent,
      ) => void;
    });

    /**
     * Creates a MessageEvent with the given origin and data.
     *
     * @param origin - The origin of the message
     * @param data - The data of the message
     * @returns A MessageEvent object
     */
    function createMessageEvent(origin: string, data: any): MessageEvent {
      return {
        origin,
        data,
        type: 'message',
      } as unknown as MessageEvent;
    }

    it('should ignore messages from different origins', function () {
      // Create a spy on the messageCallbacks
      const callbackSpy = jest.fn();
      bridge.messageCallbacks[1] = callbackSpy;

      // Create a message with a different origin
      const differentOriginEvent = createMessageEvent(
        'https://different-origin.com',
        {
          messageId: 1,
          action: IFrameMessageAction.LedgerUnlock,
          success: true,
          payload: {
            publicKey: 'test-public-key',
            address: 'test-address',
            chainCode: 'test-chain-code',
          },
        },
      );

      // Call the event listener directly
      messageEventCallback(differentOriginEvent);

      // Verify the callback was not called
      expect(callbackSpy).not.toHaveBeenCalled();
    });

    it('should process messages with registered callbacks', function () {
      // Create a spy on the messageCallbacks
      const callbackSpy = jest.fn();
      bridge.messageCallbacks[1] = callbackSpy;

      const messageData = {
        messageId: 1,
        action: IFrameMessageAction.LedgerUnlock,
        success: true,
        payload: {
          publicKey: 'test-public-key',
          address: 'test-address',
          chainCode: 'test-chain-code',
        },
      };

      // Create a message with the correct origin
      const correctOriginEvent = createMessageEvent(
        'https://metamask.github.io',
        messageData,
      );

      // Call the event listener directly
      messageEventCallback(correctOriginEvent);

      // Verify the callback was called with the correct data
      expect(callbackSpy).toHaveBeenCalledWith(messageData);
    });

    it('should update isDeviceConnected for LedgerConnectionChange action', function () {
      // Initial state should be false
      expect(bridge.isDeviceConnected).toBe(false);

      // Create a connection change message
      const connectionChangeEvent = createMessageEvent(
        'https://metamask.github.io',
        {
          messageId: 999, // Using a messageId that doesn't have a registered callback
          action: IFrameMessageAction.LedgerConnectionChange,
          payload: { connected: true },
        },
      );

      // Call the event listener directly
      messageEventCallback(connectionChangeEvent);

      // Verify isDeviceConnected was updated
      expect(bridge.isDeviceConnected).toBe(true);
    });

    it('should do nothing for messages without callbacks or special actions', function () {
      // Initial state
      const initialConnectedState = bridge.isDeviceConnected;

      // Create a message with an action that doesn't have special handling
      const noCallbackEvent = createMessageEvent('https://metamask.github.io', {
        messageId: 999, // Using a messageId that doesn't have a registered callback
        action: IFrameMessageAction.LedgerMakeApp,
        success: true,
      });

      // Call the event listener directly
      messageEventCallback(noCallbackEvent);

      // Connected state should remain unchanged
      expect(bridge.isDeviceConnected).toBe(initialConnectedState);
    });

    it('should do nothing when eventMessage.data is undefined', function () {
      // Create a spy on the messageCallbacks
      const callbackSpy = jest.fn();
      bridge.messageCallbacks[1] = callbackSpy;

      // Create a message without data
      const noDataEvent = createMessageEvent(
        'https://metamask.github.io',
        undefined,
      );

      // Call the event listener directly
      messageEventCallback(noDataEvent);

      // Callback should not have been called
      expect(callbackSpy).not.toHaveBeenCalled();
    });
  });
});
