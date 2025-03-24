/**
 * Internal options that can be used alongside some Snap keyring flow.
 *
 * They can be used to omit/skip some steps during flows.
 */
export type SnapKeyringInternalOptions = {
  /**
   * Instructs MetaMask to display the add account confirmation dialog in the UI.
   */
  displayConfirmation?: boolean;

  /**
   * Instructs MetaMask to display the name confirmation dialog in the UI.
   * Otherwise, the account will be added with the suggested name, if it's not
   * already in use; if it is, a suffix will be appended to the name to make it
   * unique.
   */
  displayAccountNameSuggestion?: boolean;

  /**
   * Instructs MetaMask to not select the account at the end of a create account
   * flow.
   */
  setSelectedAccount?: boolean;
};

/**
 * Get the default internal options.
 *
 * @returns The default internal options.
 */
export function getDefaultInternalOptions(): Required<SnapKeyringInternalOptions> {
  return {
    displayAccountNameSuggestion: true,
    displayConfirmation: true,
    setSelectedAccount: true,
  };
}

/**
 * Makes any field potentially `undefined`.
 */
export type PotentiallyUndefined<Type> = {
  [Key in keyof Type]: Type[Key] | undefined;
};

/**
 * Combine multiple internal options together. The internal options
 * in the list will be merged in the order they are provided. The first
 * appearance of a key is used, and the following are ignored. If some options
 * are still not defined, it will fallback to the default ones.
 *
 * @param internalOptions - List of internal options to combine.
 * @returns Computed internal options.
 */
export function getInternalOptionsOf(
  internalOptions: PotentiallyUndefined<SnapKeyringInternalOptions>[],
): Required<SnapKeyringInternalOptions> {
  const combined: PotentiallyUndefined<SnapKeyringInternalOptions> = {};

  const defaults: Required<SnapKeyringInternalOptions> =
    getDefaultInternalOptions();

  const keys = Object.keys(defaults) as (keyof SnapKeyringInternalOptions)[];
  for (const key of keys) {
    // We start off with `undefined` and check every option in the list. If
    // we find any that is defined, we use it. In the end, we will fallback
    // to the default ones that are guaranteed to be defined (thanks to the
    // use of `Required`).
    combined[key] = undefined;

    // We use `defaults` as the last element, so we are guaranteed to have
    // a defined value.
    for (const options of [...internalOptions, defaults]) {
      if (options[key] !== undefined && combined[key] === undefined) {
        combined[key] = options[key];
      }
    }
  }

  // Again, this is safe, see comment above.
  return combined as Required<SnapKeyringInternalOptions>;
}
