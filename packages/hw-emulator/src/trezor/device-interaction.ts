import type { TrezorControllerClient } from './controller-client';
import type { ModelProfile, PressAction } from './model-profiles';

export interface DeviceInteraction {
  approveTransaction(): Promise<void>;
  approveSigning(): Promise<void>;
  rejectTransaction(): Promise<void>;
  navigateToMainMenu(): Promise<void>;
}

export class TrezorDeviceInteraction implements DeviceInteraction {
  constructor(
    private readonly controller: TrezorControllerClient,
    private readonly profile: ModelProfile,
  ) {}

  async approveTransaction(): Promise<void> {
    await this.#run(this.profile.confirm);
  }
  async approveSigning(): Promise<void> {
    await this.approveTransaction();
  }
  async rejectTransaction(): Promise<void> {
    await this.#run(this.profile.reject);
  }

  async navigateToMainMenu(): Promise<void> {
    if (this.profile.scrollApproach) {
      await this.controller.swipe(
        this.profile.scrollApproach === 'swipe-up' ? 'up' : 'down',
      );
    }
  }

  async #run(action: PressAction): Promise<void> {
    if (action === 'press-yes') {
      await this.controller.pressYes();
      return;
    }
    if (action === 'press-no') {
      await this.controller.pressNo();
      return;
    }
    await this.controller.click(action.click);
  }
}
