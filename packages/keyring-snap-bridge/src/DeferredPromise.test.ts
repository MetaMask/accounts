import { DeferredPromise } from './DeferredPromise';
import { ensureDefined } from './util';

describe('DeferredPromise', () => {
  it('should not fail to create a DeferredPromise', () => {
    expect(() => new DeferredPromise()).not.toThrow();
  });

  it('should define resolve and reject fields', () => {
    const promise = new DeferredPromise();
    expect(promise.resolve).toBeDefined();
    expect(promise.reject).toBeDefined();
  });

  it('resolves with the correct value', async () => {
    const deferred = new DeferredPromise<string>();
    ensureDefined(deferred.resolve);
    deferred.resolve('hello');
    expect(await deferred.promise).toBe('hello');
  });

  it('rejects with the correct reason', async () => {
    const deferred = new DeferredPromise<string>();
    ensureDefined(deferred.reject);
    deferred.reject('error');
    await expect(deferred.promise).rejects.toBe('error');
  });
});
