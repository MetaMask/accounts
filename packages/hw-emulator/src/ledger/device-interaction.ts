import type { SpeculosClient } from './client';
import type { DeviceModel } from './constants';

export type DeviceInteraction = {
  approveTransaction(): Promise<void>;
  approveSigning(): Promise<void>;
  rejectTransaction(): Promise<void>;
  approveBlindSigning(scrollCount?: number): Promise<void>;
  enableBlindSigning(): Promise<void>;
  navigateToMainMenu(): Promise<void>;
};

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Device interaction handler for Nano S+ and Nano X (button-based).
 */
export class NanoInteraction implements DeviceInteraction {
  readonly #client: SpeculosClient;

  constructor(client: SpeculosClient) {
    this.#client = client;
  }

  async approveTransaction(): Promise<void> {
    for (let step = 0; step < 6; step++) {
      await this.#client.pressButton('right');
      await delay(500);
    }
    await this.#client.pressButton('both');
    await delay(500);
  }

  async approveSigning(): Promise<void> {
    for (let step = 0; step < 2; step++) {
      await this.#client.pressButton('right');
      await delay(500);
    }
    await this.#client.pressButton('both');
    await delay(500);
  }

  async approveBlindSigning(scrollCount = 4): Promise<void> {
    await this.#client.pressButton('both');
    await delay(800);
    for (let step = 0; step < scrollCount; step++) {
      await this.#client.pressButton('right');
      await delay(500);
    }
    await this.#client.pressButton('both');
    await delay(500);
  }

  async rejectTransaction(): Promise<void> {
    await this.#client.pressButton('right');
    await delay(300);
    await this.#client.pressButton('both');
    await delay(500);
  }

  async enableBlindSigning(): Promise<void> {
    await this.#client.pressButton('both');
    await delay(800);
    await this.#client.pressButton('right');
    await delay(400);
    await this.#client.pressButton('both');
    await delay(800);
    await this.#client.pressButton('both');
    await delay(800);
    for (let step = 0; step < 6; step++) {
      await this.#client.pressButton('right');
      await delay(200);
    }
    await this.#client.pressButton('both');
    await delay(500);
    await this.#client.pressButton('left');
    await delay(400);
  }

  async navigateToMainMenu(): Promise<void> {
    await this.#client.pressButton('left');
    await delay(400);
  }
}

/**
 * Device interaction handler for Stax and Flex (touch-based).
 */
export class TouchInteraction implements DeviceInteraction {
  readonly #client: SpeculosClient;

  readonly #model: DeviceModel;

  constructor(client: SpeculosClient, model: DeviceModel) {
    this.#client = client;
    this.#model = model;
  }

  async swipeLeft(): Promise<void> {
    const { width, height } = this.#model.screenSize;
    const centerX = width / 2;
    const centerY = height / 2;
    await this.#client.fingerSwipe(centerX, centerY, centerX - 10, centerY, 0.5);
    await delay(800);
  }

  async tapConfirm(holdSeconds = 3.0): Promise<void> {
    if (this.#model.reviewConfirmButton) {
      await this.#client.fingerTap(
        this.#model.reviewConfirmButton.x,
        this.#model.reviewConfirmButton.y,
        holdSeconds,
      );
    }
  }

  async tapReject(): Promise<void> {
    if (this.#model.reviewRejectButton) {
      await this.#client.fingerTap(
        this.#model.reviewRejectButton.x,
        this.#model.reviewRejectButton.y,
        0.1,
      );
    }
  }

  async tapBack(): Promise<void> {
    if (this.#model.backButton) {
      await this.#client.fingerTap(
        this.#model.backButton.x,
        this.#model.backButton.y,
        0.1,
      );
    }
  }

  async approveTransaction(): Promise<void> {
    for (let step = 0; step < 3; step++) {
      await this.swipeLeft();
    }
    await this.tapConfirm();
    await delay(500);
  }

  async approveSigning(): Promise<void> {
    for (let step = 0; step < 2; step++) {
      await this.swipeLeft();
    }
    await this.tapConfirm();
    await delay(500);
  }

  async approveBlindSigning(scrollCount = 4): Promise<void> {
    await this.#client.fingerTap(
      this.#model.confirmButton?.x ?? 240,
      this.#model.confirmButton?.y ?? 530,
      0.1,
    );
    await delay(800);

    for (let step = 0; step < scrollCount; step++) {
      await this.swipeLeft();
      await delay(300);
    }
    await this.tapConfirm();
    await delay(500);
  }

  async rejectTransaction(): Promise<void> {
    await this.tapReject();
    await delay(500);
  }

  async enableBlindSigning(): Promise<void> {
    console.log(
      '[DeviceInteraction] Blind signing pre-enabled via NVRAM for NBGL device',
    );
  }

  async navigateToMainMenu(): Promise<void> {
    await this.tapBack();
    await delay(400);
  }
}

/**
 * Create the appropriate device interaction handler based on the device model.
 *
 * @param client - The Speculos client.
 * @param model - The device model configuration.
 * @returns A DeviceInteraction instance.
 */
export function createDeviceInteraction(
  client: SpeculosClient,
  model: DeviceModel,
): DeviceInteraction {
  if (model.interactionType === 'touch') {
    return new TouchInteraction(client, model);
  }
  return new NanoInteraction(client);
}
