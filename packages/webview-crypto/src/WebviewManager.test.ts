import { WebViewManager } from './WebviewManager';

// Use fake timers globally to prevent real timeouts
jest.useFakeTimers();

describe('WebViewManager', () => {
  let manager: WebViewManager;
  let mockWebViewRef: {
    current: { postMessage: jest.Mock } | null;
  };

  beforeEach(() => {
    // Reset the singleton instance
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (WebViewManager as any).instance = undefined;
    manager = WebViewManager.getInstance();

    // Create mock WebView ref
    mockWebViewRef = {
      current: {
        postMessage: jest.fn(),
      },
    };

    // Mock console.log to reduce test noise
    jest.spyOn(console, 'log').mockImplementation(() => {
      // Do nothing
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance when called multiple times', () => {
      const instance1 = WebViewManager.getInstance();
      const instance2 = WebViewManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Ready State Management', () => {
    it('should be initially not ready', () => {
      expect(manager.isWebViewReady()).toBe(false);
    });

    it('should become ready when onReady is called', () => {
      manager.onReady();
      expect(manager.isWebViewReady()).toBe(true);
    });
  });

  describe('Message Sending - Ready State', () => {
    beforeEach(() => {
      manager.setWebViewRef(mockWebViewRef);
      manager.onReady();
    });

    it('sends message immediately when WebView is ready', async () => {
      // Arrange
      const operation = 'test_operation';
      const params = { test: 'data' };

      // Act
      const messagePromise = manager.sendMessage(operation, params);

      // Assert
      expect(mockWebViewRef.current?.postMessage).toHaveBeenCalledWith(
        expect.stringContaining('"type":"hdkey_operation"'),
      );

      const sentMessage = JSON.parse(
        mockWebViewRef.current?.postMessage.mock.calls[0][0],
      );
      expect(sentMessage.operation).toBe(operation);
      expect(sentMessage.params).toStrictEqual(params);

      // Simulate successful response
      manager.onMessage(
        JSON.stringify({
          id: sentMessage.id,
          success: true,
          result: { success: true },
        }),
      );

      expect(await messagePromise).toStrictEqual({ success: true });
    });

    it('rejects promise when WebView returns error response', async () => {
      // Arrange
      const operation = 'test_operation';

      // Act
      const messagePromise = manager.sendMessage(operation);

      const sentMessage = JSON.parse(
        mockWebViewRef.current?.postMessage.mock.calls[0][0],
      );

      // Simulate error response
      manager.onMessage(
        JSON.stringify({
          id: sentMessage.id,
          success: false,
          error: 'Test error',
        }),
      );

      // Assert
      await expect(messagePromise).rejects.toThrow('Test error');
    });

    it('times out message after 10 seconds without response', async () => {
      // Arrange
      const operation = 'test_operation';

      // Act
      const messagePromise = manager.sendMessage(operation);
      jest.advanceTimersByTime(10000);

      // Flush microtask queue
      await Promise.resolve();
      await Promise.resolve();

      // Assert
      await expect(messagePromise).rejects.toThrow(
        'test_operation operation timed out after 10 seconds',
      );
    });
  });

  describe('Message Queuing - Not Ready State', () => {
    beforeEach(() => {
      manager.setWebViewRef(mockWebViewRef);
    });

    it('queues messages when WebView is not ready', () => {
      // Arrange
      expect(manager.getQueueSize()).toBe(0);

      // Act
      manager.sendMessage('test_operation').catch(() => {
        // Expected to not resolve in this test
      });

      // Assert
      expect(manager.getQueueSize()).toBe(1);
      expect(mockWebViewRef.current?.postMessage).not.toHaveBeenCalled();
    });

    it('processes all queued messages when WebView becomes ready', async () => {
      // Arrange
      const operation1 = 'operation1';
      const operation2 = 'operation2';

      // Queue multiple messages
      const promise1 = manager.sendMessage(operation1);
      const promise2 = manager.sendMessage(operation2);

      expect(manager.getQueueSize()).toBe(2);

      // Act
      manager.onReady();

      // Assert
      expect(manager.getQueueSize()).toBe(0);
      expect(mockWebViewRef.current?.postMessage).toHaveBeenCalledTimes(2);

      // Verify messages were sent correctly
      const message1 = JSON.parse(
        mockWebViewRef.current?.postMessage.mock.calls[0][0],
      );
      const message2 = JSON.parse(
        mockWebViewRef.current?.postMessage.mock.calls[1][0],
      );

      expect(message1.operation).toBe(operation1);
      expect(message2.operation).toBe(operation2);

      // Simulate responses
      manager.onMessage(
        JSON.stringify({
          id: message1.id,
          success: true,
          result: 'result1',
        }),
      );

      manager.onMessage(
        JSON.stringify({
          id: message2.id,
          success: true,
          result: 'result2',
        }),
      );

      expect(await promise1).toBe('result1');
      expect(await promise2).toBe('result2');
    });

    it('times out queued messages after 10 seconds', async () => {
      // Arrange
      const operation = 'test_operation';
      const messagePromise = manager.sendMessage(operation);

      // Act
      manager.onReady(); // Process queue
      jest.advanceTimersByTime(10000); // Trigger timeout

      // Flush microtask queue
      await Promise.resolve();
      await Promise.resolve();

      // Assert
      await expect(messagePromise).rejects.toThrow(
        'Message operation timed out after 10 seconds',
      );
    });
  });

  describe('Message Response Handling', () => {
    beforeEach(() => {
      manager.setWebViewRef(mockWebViewRef);
      manager.onReady();
    });

    it('should handle invalid JSON responses gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      manager.onMessage('invalid json');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error parsing WebView message:',
        expect.any(SyntaxError),
      );
      consoleSpy.mockRestore();
    });

    it('should ignore responses for unknown message IDs', () => {
      // Should not throw or cause issues
      manager.onMessage(
        JSON.stringify({
          id: 'unknown_id',
          success: true,
          result: 'test',
        }),
      );
    });
  });

  describe('Edge Cases', () => {
    it('includes instanceId in message when provided', async () => {
      // Arrange
      manager.setWebViewRef(mockWebViewRef);
      manager.onReady();
      const instanceId = 'test_instance';

      // Act
      const messagePromise = manager.sendMessage(
        'test_operation',
        {},
        instanceId,
      );

      // Assert
      const sentMessage = JSON.parse(
        mockWebViewRef.current?.postMessage.mock.calls[0][0],
      );
      expect(sentMessage.instanceId).toBe(instanceId);

      // Simulate response
      manager.onMessage(
        JSON.stringify({
          id: sentMessage.id,
          success: true,
          result: 'success',
        }),
      );

      expect(await messagePromise).toBe('success');
    });

    it('queues messages when WebView reference is null', () => {
      // Arrange
      manager.setWebViewRef({ current: null });
      manager.onReady();

      // Act
      manager.sendMessage('test_operation').catch(() => {
        // Expected to not resolve in this test
      });

      // Assert - message should be queued since WebView ref is null
      expect(manager.getQueueSize()).toBe(1);
    });

    it('processes queued messages when WebView reference is set after being ready', async () => {
      // Arrange
      manager.setWebViewRef({ current: null });
      manager.onReady();

      // Queue a message while ref is null
      const messagePromise = manager.sendMessage('test_operation');
      expect(manager.getQueueSize()).toBe(1);

      // Act - set the ref, should trigger processing
      manager.setWebViewRef(mockWebViewRef);

      // Assert - message should be sent
      expect(manager.getQueueSize()).toBe(0);
      expect(mockWebViewRef.current?.postMessage).toHaveBeenCalled();

      // Complete the message
      const sentMessage = JSON.parse(
        mockWebViewRef.current?.postMessage.mock.calls[0][0],
      );
      manager.onMessage(
        JSON.stringify({
          id: sentMessage.id,
          success: true,
          result: { success: true },
        }),
      );

      expect(await messagePromise).toStrictEqual({ success: true });
    });

    it('uses default error message when WebView error response is empty', async () => {
      // Arrange
      manager.setWebViewRef(mockWebViewRef);
      manager.onReady();

      // Act
      const messagePromise = manager.sendMessage('test_operation');

      const sentMessage = JSON.parse(
        mockWebViewRef.current?.postMessage.mock.calls[0][0],
      );

      // Simulate error response without error message
      manager.onMessage(
        JSON.stringify({
          id: sentMessage.id,
          success: false,
        }),
      );

      // Assert
      await expect(messagePromise).rejects.toThrow('Unknown error');
    });
  });
});
