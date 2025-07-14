/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable no-restricted-syntax */
type WebViewMessage = {
  type: 'hdkey_operation';
  id: string;
  operation: string;
  params?: unknown;
  instanceId?: string | undefined;
};

type WebViewResponse = {
  id: string;
  success: boolean;
  result?: unknown;
  error?: string;
};

// Singleton WebView manager
export class WebViewManager {
  private static instance: WebViewManager;

  private webViewRef: {
    current: { postMessage: (message: string) => void } | null;
  } = { current: null };

  private readonly pendingRequests = new Map<
    string,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
      timeoutId: ReturnType<typeof setTimeout>;
    }
  >();

  private readonly messageQueue: {
    message: WebViewMessage;
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
  }[] = [];

  private isReady = false;

  private readonly readyPromise: Promise<void>;

  private resolveReady: (() => void) | null = null;

  private rejectReady: ((error: Error) => void) | null = null;

  private initTimeoutId: ReturnType<typeof setTimeout> | null = null;

  private constructor() {
    this.readyPromise = new Promise((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });

    // Set timeout for WebView initialization
    this.initTimeoutId = setTimeout(() => {
      if (!this.isReady && this.rejectReady) {
        const error = new Error(
          'WebView failed to initialize within 10 seconds',
        );
        this.rejectReady(error);

        // Reject all queued messages
        while (this.messageQueue.length > 0) {
          const queuedItem = this.messageQueue.shift();
          if (queuedItem) {
            queuedItem.reject(error);
          }
        }
      }
    }, 10000); // 10 seconds
  }

  static getInstance(): WebViewManager {
    if (!WebViewManager.instance) {
      WebViewManager.instance = new WebViewManager();
    }
    return WebViewManager.instance;
  }

  setWebViewRef(ref: {
    current: { postMessage: (message: string) => void } | null;
  }) {
    this.webViewRef = ref;

    // If WebView is ready and we have a ref, process any queued messages
    if (
      this.isReady &&
      this.webViewRef.current &&
      this.messageQueue.length > 0
    ) {
      this.processMessageQueue();
    }
  }

  onReady() {
    // eslint-disable-next-line no-console
    console.log(
      `[HDKeyProxy] WebView is ready, processing ${this.messageQueue.length} queued messages`,
    );
    const startTime = Date.now();

    this.isReady = true;

    // Clear the initialization timeout
    if (this.initTimeoutId) {
      clearTimeout(this.initTimeoutId);
      this.initTimeoutId = null;
    }

    if (this.resolveReady) {
      this.resolveReady();
    }
    // Process queued messages
    this.processMessageQueue();

    const duration = Date.now() - startTime;
    // eslint-disable-next-line no-console
    console.log(
      `[HDKeyProxy] WebView ready processing completed in ${duration}ms`,
    );
  }

  private processMessageQueue(): void {
    const startTime = Date.now();
    const initialQueueSize = this.messageQueue.length;

    while (this.messageQueue.length > 0) {
      const queuedItem = this.messageQueue.shift();
      if (queuedItem && this.webViewRef.current) {
        // Set up timeout for this message
        const timeoutId = setTimeout(() => {
          const error = new Error(
            `Message operation timed out after 10 seconds`,
          );
          queuedItem.reject(error);
          this.pendingRequests.delete(queuedItem.message.id);
        }, 10000);

        // Add to pending requests
        this.pendingRequests.set(queuedItem.message.id, {
          resolve: queuedItem.resolve,
          reject: queuedItem.reject,
          timeoutId,
        });

        // Send the message
        this.webViewRef.current.postMessage(JSON.stringify(queuedItem.message));
      }
    }

    if (initialQueueSize > 0) {
      const duration = Date.now() - startTime;
      // eslint-disable-next-line no-console
      console.log(
        `[HDKeyProxy] Processed ${initialQueueSize} queued messages in ${duration}ms`,
      );
    }
  }

  onMessage(message: string): void {
    try {
      const response: WebViewResponse = JSON.parse(message);
      const pending = this.pendingRequests.get(response.id);
      if (pending) {
        // Clear the timeout
        clearTimeout(pending.timeoutId);

        this.pendingRequests.delete(response.id);
        if (response.success) {
          pending.resolve(response.result);
        } else {
          pending.reject(new Error(response.error ?? 'Unknown error'));
        }
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  }

  async sendMessage(
    operation: string,
    params?: unknown,
    instanceId?: string,
  ): Promise<unknown> {
    const id = Math.random().toString(36).substr(2, 9);
    const message: WebViewMessage = {
      type: 'hdkey_operation',
      id,
      operation,
      params,
      instanceId,
    };

    const startTime = Date.now();
    // eslint-disable-next-line no-console
    console.log(`[HDKeyProxy] Starting ${operation} operation (ID: ${id})`);

    return new Promise((resolve, reject) => {
      const originalResolve = resolve;
      const originalReject = reject;

      const wrappedResolve = (value: unknown) => {
        const duration = Date.now() - startTime;
        // eslint-disable-next-line no-console
        console.log(
          `[HDKeyProxy] Completed ${operation} operation (ID: ${id}) in ${duration}ms`,
        );
        originalResolve(value);
      };

      const wrappedReject = (error: Error) => {
        const duration = Date.now() - startTime;
        // eslint-disable-next-line no-console
        console.log(
          `[HDKeyProxy] Failed ${operation} operation (ID: ${id}) after ${duration}ms - Error: ${error.message}`,
        );
        originalReject(error);
      };

      if (this.isReady && this.webViewRef.current) {
        // WebView is ready, send immediately
        const timeoutId = setTimeout(() => {
          const error = new Error(
            `${operation} operation timed out after 10 seconds`,
          );
          wrappedReject(error);
          this.pendingRequests.delete(id);
        }, 10000);

        this.pendingRequests.set(id, {
          resolve: wrappedResolve,
          reject: wrappedReject,
          timeoutId,
        });
        this.webViewRef.current.postMessage(JSON.stringify(message));
      } else {
        // Queue the message until WebView is ready
        this.messageQueue.push({
          message,
          resolve: wrappedResolve,
          reject: wrappedReject,
        });
      }
    });
  }

  isWebViewReady(): boolean {
    return this.isReady;
  }

  getQueueSize(): number {
    return this.messageQueue.length;
  }
}
