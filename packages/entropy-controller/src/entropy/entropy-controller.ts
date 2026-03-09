import type { Entropy, EntropyId, EntropyType } from './entropy';

/**
 * Controller for managing entropy sources.
 */
export type EntropyController = {
  /**
   * Adds a new entropy source.
   *
   * @param entropy - The entropy to add.
   */
  addEntropy(entropy: Entropy): Promise<void>;

  /**
   * Updates an existing entropy source.
   *
   * @param entropy - The new entropy data.
   */
  updateEntropy(entropy: Entropy): Promise<void>;

  /**
   * Removes an entropy source.
   *
   * @param entropyId - The ID of the entropy to remove.
   */
  removeEntropy(entropyId: EntropyId): Promise<void>;

  /**
   * Gets an entropy source by its ID.
   *
   * @param entropyId - The ID of the entropy to retrieve.
   * @returns The matching entropy.
   */
  getEntropyById(entropyId: EntropyId): Promise<Entropy>;

  /**
   * Gets all entropy sources of a given type.
   *
   * @param entropyType - The type of entropy to filter by.
   * @returns The matching entropies.
   */
  getEntropyByType(entropyType: EntropyType): Promise<Entropy[]>;
};
