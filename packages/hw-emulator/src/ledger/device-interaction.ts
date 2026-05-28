import type { SpeculosClient } from './client';
import type { DeviceModel } from './constants';

/**
 * Interface for device screen interaction — pressing buttons or tapping the screen
 * to approve, reject, or navigate through on-screen prompts.
 */
export type DeviceInteraction = {
  /** Approve a transaction on the device screen. */
  approveTransaction(): Promise<void>;
  /** Approve a personal message or typed signing request. */
  approveSigning(): Promise<void>;
  /** Reject a transaction on the device screen. */
  rejectTransaction(): Promise<void>;
  /** Approve a blind signing request, scrolling through review screens. */
  approveBlindSigning(scrollCount?: number): Promise<void>;
  /** Enable blind signing in the Ethereum app settings. */
  enableBlindSigning(): Promise<void>;
  /** Navigate back to the main menu. */
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

  /**
   * @param client - The Speculos client for sending button presses.
   */
  constructor(client: SpeculosClient) {
    this.#client = client;
  }

  /**
   * Approve a transaction by scrolling through 6 review screens and confirming.
   */
  async approveTransaction(): Promise<void> {
    for (let step = 0; step < 6; step++) {
      await this.#client.pressButton('right');
      await delay(500);
    }
    await this.#client.pressButton('both');
    await delay(500);
  }

  /**
   * Approve a personal signing request by scrolling through 2 review screens and confirming.
   */
  async approveSigning(): Promise<void> {
    for (let step = 0; step < 2; step++) {
      await this.#client.pressButton('right');
      await delay(500);
    }
    await this.#client.pressButton('both');
    await delay(500);
  }

  /**
   * Approve blind signing by enabling it and scrolling through review screens.
   *
   * @param scrollCount - Number of screens to scroll through (default 4).
   */
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

  /**
   * Reject a transaction by scrolling to the reject option and pressing both buttons.
   */
  async rejectTransaction(): Promise<void> {
    await this.#client.pressButton('right');
    await delay(300);
    await this.#client.pressButton('both');
    await delay(500);
  }

  /**
   * Enable blind signing in the Ethereum app settings via button navigation.
   */
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

  /**
   * Navigate back to the main menu by pressing the left button.
   */
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

  /**
   * @param client - The Speculos client for sending touch events.
   * @param model - The device model with screen and button coordinates.
   */
  constructor(client: SpeculosClient, model: DeviceModel) {
    this.#client = client;
    this.#model = model;
  }

  /**
   * Swipe left on the touchscreen from center to near-center left.
   */
  async swipeLeft(): Promise<void> {
    const { width, height } = this.#model.screenSize;
    const centerX = width / 2;
    const centerY = height / 2;
    await this.#client.fingerSwipe(
      centerX,
      centerY,
      centerX - 10,
      centerY,
      0.5,
    );
    await delay(800);
  }

  /**
   * Tap and hold the review confirm button.
   *
   * @param holdSeconds - Duration to hold the tap in seconds.
   */
  async tapConfirm(holdSeconds = 3.0): Promise<void> {
    if (this.#model.reviewConfirmButton) {
      await this.#client.fingerTap(
        this.#model.reviewConfirmButton.x,
        this.#model.reviewConfirmButton.y,
        holdSeconds,
      );
    }
  }

  /**
   * Tap the review reject button.
   */
  async tapReject(): Promise<void> {
    if (this.#model.reviewRejectButton) {
      await this.#client.fingerTap(
        this.#model.reviewRejectButton.x,
        this.#model.reviewRejectButton.y,
        0.1,
      );
    }
  }

  /**
   * Tap the back button.
   */
  async tapBack(): Promise<void> {
    if (this.#model.backButton) {
      await this.#client.fingerTap(
        this.#model.backButton.x,
        this.#model.backButton.y,
        0.1,
      );
    }
  }

  /**
   * Approve a transaction by swiping through review screens and tapping confirm.
   */
  async approveTransaction(): Promise<void> {
    for (let step = 0; step < 3; step++) {
      await this.swipeLeft();
    }
    await this.tapConfirm();
    await delay(500);
  }

  /**
   * Approve a personal signing request by swiping through review screens and tapping confirm.
   */
  async approveSigning(): Promise<void> {
    for (let step = 0; step < 2; step++) {
      await this.swipeLeft();
    }
    await this.tapConfirm();
    await delay(500);
  }

  /**
   * Approve blind signing by tapping confirm, scrolling, and confirming.
   *
   * @param scrollCount - Number of screens to scroll through (default 4).
   */
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

  /**
   * Reject a transaction by tapping the reject button.
   */
  async rejectTransaction(): Promise<void> {
    await this.tapReject();
    await delay(500);
  }

  /**
   * Enable blind signing (no-op for NBGL devices — pre-enabled via NVRAM).
   */
  async enableBlindSigning(): Promise<void> {
    console.log(
      '[DeviceInteraction] Blind signing pre-enabled via NVRAM for NBGL device',
    );
  }

  /**
   * Navigate back to the main menu by tapping the back button.
   */
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
