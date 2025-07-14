import React, { useRef, useEffect } from 'react';
import { WebView, WebViewMessageEvent } from '@metamask/react-native-webview';
import { View } from 'react-native';
import { WebViewManager } from './WebviewManager';

const WEBVIEW_STYLE = {
  position: 'absolute',
  top: -1000,
  left: -1000,
  width: 1,
  height: 1,
} as const;

interface CryptoWebviewProps {
  onMessage: (message: string) => void;
  onReady: () => void;
}

interface CryptoWebviewHandle {
  postMessage: (message: string) => void;
}

const CryptoWebview = React.forwardRef<CryptoWebviewHandle, CryptoWebviewProps>(
  ({ onMessage, onReady }, ref) => {
    const webViewRef = useRef<WebView>(null);

    useEffect(() => {
      if (ref && typeof ref === 'object') {
        ref.current = {
          postMessage: (message: string) => {
            // Use proper JSON encoding to prevent injection issues
            // The message is already a JSON string, so we need to properly encode it
            const encodedMessage = JSON.stringify(message);
            const m = `
              window.dispatchEvent(new MessageEvent('message', { data: ${encodedMessage} }));
              true;
            `;
            console.log('sending message', m);
            webViewRef.current?.injectJavaScript(m);
          },
        };
      }
    }, [ref]);

    const handleMessage = (event: WebViewMessageEvent) => {
      const message = event.nativeEvent.data;
      onMessage(message);
    };

    const handleLoadEnd = () => {
      onReady();
    };

    return (
      <View style={WEBVIEW_STYLE}>
        <WebView
          ref={webViewRef}
          source={require('../srcWebview/webviewCrypto.html')}
          onMessage={handleMessage}
          onLoadEnd={handleLoadEnd}
          javaScriptEnabled
          domStorageEnabled
        />
      </View>
    );
  },
);

CryptoWebview.displayName = 'CryptoWebview';

// WebView component creator
export const CreateCryptoWebView = () => {
  const manager = WebViewManager.getInstance();
  const webViewRef = React.useRef<{ postMessage: (message: string) => void }>(
    null,
  );

  React.useEffect(() => {
    manager.setWebViewRef(webViewRef);
  }, [manager]);

  const handleMessage = React.useCallback(
    (message: string) => {
      manager.onMessage(message);
    },
    [manager],
  );

  const handleReady = React.useCallback(() => {
    manager.onReady();
  }, [manager]);

  return React.createElement(CryptoWebview, {
    ref: webViewRef,
    onMessage: handleMessage,
    onReady: handleReady,
  });
};
