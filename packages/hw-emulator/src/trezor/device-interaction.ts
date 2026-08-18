import type { TrezorControllerClient } from './controller-client';
import type { ModelProfile, PressAction } from './model-profiles';

export type DeviceInteraction = {
  approveTransaction(): Promise<void>;
  approveSigning(): Promise<void>;
  rejectTransaction(): Promise<void>;
  /** Dismiss a long transaction summary by scrolling to its end. */
  dismissSummaryScreen(): Promise<void>;
  /**
   * Navigate back to the main menu. Alias of {@link dismissSummaryScreen},
   * retained to satisfy the package-wide `DeviceInteraction` contract in
   * `src/types.ts`.
   *
   * @deprecated Use {@link dismissSummaryScreen} instead.
   */
  navigateToMainMenu(): Promise<void>;
};

export class TrezorDeviceInteraction implements DeviceInteraction {
  readonly #controller: TrezorControllerClient;

  readonly #profile: ModelProfile;

  constructor(controller: TrezorControllerClient, profile: ModelProfile) {
    this.#controller = controller;
    this.#profile = profile;
  }

  async approveTransaction(): Promise<void> {
    await this.#run(this.#profile.confirm);
  }

  async approveSigning(): Promise<void> {
    await this.approveTransaction();
  }

  async rejectTransaction(): Promise<void> {
    await this.#run(this.#profile.reject);
  }

  /**
   * Dismiss a long transaction summary screen.
   *
   * Transaction summaries on touchscreen models can span several screens;
   * scrolling to the end reveals the confirm/reject buttons. Profiles
   * without a configured scroll approach (e.g. button-only models) do
   * nothing here.
   */
  async dismissSummaryScreen(): Promise<void> {
    if (this.#profile.scrollApproach) {
      await this.#controller.swipe(
        this.#profile.scrollApproach === 'swipe-up' ? 'up' : 'down',
      );
    }
  }

  /**
   * Alias of {@link dismissSummaryScreen}, retained for the package-wide
   * `DeviceInteraction` contract.
   *
   * @deprecated Use {@link dismissSummaryScreen} instead.
   */
  async navigateToMainMenu(): Promise<void> {
    await this.dismissSummaryScreen();
  }

  async #run(action: PressAction): Promise<void> {
    if (action === 'press-yes') {
      await this.#controller.pressYes();
      return;
    }
    if (action === 'press-no') {
      await this.#controller.pressNo();
      return;
    }
    await this.#controller.click(action.click);
  }
}
