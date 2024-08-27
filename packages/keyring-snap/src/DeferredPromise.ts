/**
 * A deferred promise can be resolved by a caller different from the one who
 * created it.
 *
 * Example:
 * - "A" creates a deferred promise "P", adds it to a list, and awaits it
 * - "B" gets "P" from the list and resolves it
 * - "A" gets the resolved value
 */
export class DeferredPromise<Type> {
  promise: Promise<Type>;

  resolve: (value: Type | PromiseLike<Type>) => void = undefined as any;

  reject: (reason?: any) => void = undefined as any;

  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });

    // This is a sanity check to make sure that the promise constructor
    // actually set the `resolve` and `reject` functions.
    /* istanbul ignore next */
    if (!this.resolve || !this.reject) {
      throw new Error('Promise constructor failed');
    }
  }
}
