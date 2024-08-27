import type { SnapId } from '@metamask/snaps-sdk';

import { CaseInsensitiveMap } from './CaseInsensitiveMap';

/**
 * Error thrown when an invalid Snap ID is encountered.
 */
export class InvalidSnapIdError extends Error {
  /**
   * The ID of the Snap that caused the error.
   */
  snapId: SnapId;

  /**
   * The key of the element that caused the error.
   */
  key: string;

  /**
   * Creates an instance of `InvalidSnapIdError`.
   *
   * @param snapId - The invalid Snap ID.
   * @param key - The key associated with the invalid Snap ID.
   */
  constructor(snapId: SnapId, key: string) {
    super(`Snap "${snapId}" is not allowed to set "${key}"`);
    this.name = 'InvalidSnapIdError';
    this.snapId = snapId;
    this.key = key;
  }
}

/**
 * A map that associates a string key with a value that has a `snapId`
 * property. Note that the key is case-insensitive.
 *
 * The `snapId` property is used to ensure that only the Snap that added an
 * item to the map can modify or delete it.
 */
export class SnapIdMap<Value extends { snapId: SnapId }> {
  #map: CaseInsensitiveMap<Value>;

  /**
   * Creates a new `SnapIdMap` object.
   *
   * Example:
   *
   * ```ts
   * const items = [
   *   ['foo', { snapId: '1', name: 'foo' }],
   *   ['bar', { snapId: '1', name: 'bar' }],
   * ];
   * const map = new SnapIdMap(items);
   * ```
   *
   * @param iterable - An iterable object whose elements are key-value pairs.
   * Each key-value pair will be added to the new map.
   */
  constructor(iterable?: Iterable<readonly [string, Value]>) {
    this.#map = new CaseInsensitiveMap(iterable);
  }

  /**
   * Returns a plain object with the same key-value pairs as this map.
   *
   * Example:
   *
   * ```ts
   * const items = [
   *   ['foo', { snapId: '1', name: 'foo' }],
   *   ['bar', { snapId: '1', name: 'bar' }],
   * ];
   * const map = new SnapIdMap(items);
   * map.toObject();
   * // Returns
   * // {
   * //   foo: { snapId: '1', name: 'foo' },
   * //   bar: { snapId: '1', name: 'bar' },
   * // }
   * ```
   *
   * @returns A plain object with the same key-value pairs as this map.
   */
  toObject(): Record<string, Value> {
    return this.#map.toObject();
  }

  /**
   * Returns a new `SnapIdMap` object from an plain object.
   *
   * Example:
   *
   * ```ts
   * const obj = {
   *   foo: { snapId: '1', name: 'foo' },
   *   bar: { snapId: '1', name: 'bar' },
   * };
   * const map = SnapIdMap.fromObject(obj);
   * ```
   *
   * @param obj - A plain object whose elements will be added to the new map.
   * @returns A new `SnapIdMap` containing the elements of the given object.
   */
  static fromObject<Value extends { snapId: SnapId }>(
    obj: Record<string, Value>,
  ): SnapIdMap<Value> {
    return new SnapIdMap(Object.entries(obj));
  }

  /**
   * Gets a value from the map.
   *
   * If the given key is not present in the map or the Snap ID of the value is
   * different from the given Snap ID, returns `undefined`.
   *
   * Example:
   *
   * ```ts
   * const map = new SnapIdMap();
   * map.set('foo', { snapId: '1', name: 'foo' });
   * map.get('1', 'foo'); // Returns { snapId: '1', name: 'foo' }
   * map.get('2', 'foo'); // Returns `undefined`
   * map.get('1', 'bar'); // Returns `undefined`
   * ```
   *
   * @param snapId - Snap ID present in the value to get.
   * @param key - Key of the element to get.
   * @returns The value associated with the given key and Snap ID.
   */
  get(snapId: SnapId, key: string): Value | undefined {
    const value = this.#map.get(key);
    return value?.snapId === snapId ? value : undefined;
  }

  /**
   * Checks if a key is present in the map.
   *
   * If the given key is not present in the map or the Snap ID of the value is
   * different from the given Snap ID, returns `false`.
   *
   * Example:
   *
   * ```ts
   * const map = new SnapIdMap();
   * map.set('foo', { snapId: '1', name: 'foo' });
   * map.has('1', 'foo'); // Returns `true`
   * map.has('2', 'foo'); // Returns `false`
   * map.has('1', 'bar'); // Returns `false`
   * ```
   *
   * @param snapId - Snap ID present in the value to check.
   * @param key - Key of the element to check.
   * @returns `true` if the key is present in the map and the Snap ID of the
   * value is equal to the given Snap ID, `false` otherwise.
   */
  has(snapId: SnapId, key: string): boolean {
    return this.get(snapId, key) !== undefined;
  }

  /**
   * Deletes a key from the map.
   *
   * If the given key is not present in the map or the Snap IDs don't match,
   * returns `false` and does nothing.
   *
   * Example:
   *
   * ```ts
   * const map = new SnapIdMap();
   * map.set('foo', { snapId: '1', name: 'foo' });
   * map.delete('2', 'foo'); // Returns `false`
   * map.delete('1', 'bar'); // Returns `false`
   * map.delete('1', 'foo'); // Returns `true`
   * ```
   *
   * @param snapId - Snap ID present in the value to delete.
   * @param key - Key of the element to delete.
   * @returns `true` if the key was present in the map and the Snap ID of the
   * value was equal to the given Snap ID, `false` otherwise.
   */
  delete(snapId: SnapId, key: string): boolean {
    return this.has(snapId, key) && this.#map.delete(key);
  }

  /* eslint-disable jsdoc/check-indentation */
  /**
   * Adds or updates a key-value pair in the map.
   *
   * Note that this method has a different behavior from the `Map.set`.
   *
   * - If the given key is not already present in the map, this method adds the
   *   key-value pair to the map.
   *
   * - If the given key is already present in the map and the Snap IDs match,
   *   this method updates the value associated with the key.
   *
   * - However, if the given key is already present in the map but the Snap IDs
   *   do not match, this method throws an error.
   *
   * @param key - Key of the element to add or update.
   * @param value - Value of the element to add or update.
   * @returns The map itself.
   */
  /* eslint-enable jsdoc/check-indentation */
  set(key: string, value: Value): this {
    // If the key is present in the map but isn't associated with the given
    // Snap ID, it means that the item was added to the map by a different
    // Snap. In this case, throw an error.
    if (this.#map.has(key) && !this.has(value.snapId, key)) {
      throw new InvalidSnapIdError(value.snapId, key);
    }
    this.#map.set(key, value);
    return this;
  }

  /**
   * Returns an iterable of the values in the map.
   *
   * Example:
   *
   * ```ts
   * const map = new SnapIdMap([
   *   ['foo', { snapId: '1', name: 'foo' }],
   *   ['bar', { snapId: '1', name: 'bar' }],
   * ]);
   * const values = [...map.values()];
   * // Returns
   * // [
   * //   { snapId: '1', name: 'foo' },
   * //   { snapId: '1', name: 'bar' },
   * // ]
   * ```
   *
   * @returns An iterable of the values in the map.
   */
  values(): IterableIterator<Value> {
    return this.#map.values();
  }

  /**
   * Returns the number of key-value pairs in the map.
   *
   * @returns The number of key-value pairs in the map.
   */
  get size(): number {
    return this.#map.size;
  }
}
