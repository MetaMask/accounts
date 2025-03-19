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
  };
}
