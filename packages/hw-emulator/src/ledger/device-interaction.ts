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

// ---- Shared review-flow constants ----

/** Default number of review screens scrolled before confirming blind signing. */
const DEFAULT_BLIND_SIGNING_SCROLL_COUNT = 4;

// ---- Button-based (Nano S+/Nano X) interaction constants ----

/** Review screens scrolled when approving a transaction on button devices. */
const TX_REVIEW_SCREEN_COUNT = 6;

/** Review screens scrolled when approving a message on button devices. */
const SIGNING_REVIEW_SCREEN_COUNT = 2;

/** Settings entries scrolled when enabling blind signing on button devices. */
const BLIND_SIGNING_SETTINGS_SCREEN_COUNT = 6;

/** Delay after a regular button press, in milliseconds. */
const BUTTON_PRESS_DELAY_MS = 500;

/** Delay after a button press that triggers a screen transition, in milliseconds. */
const BUTTON_TRANSITION_DELAY_MS = 800;

/** Delay after the button press that navigates toward the reject option, in milliseconds. */
const REJECT_NAVIGATION_DELAY_MS = 300;

/** Delay between scrolls in the settings menu, in milliseconds. */
const SETTINGS_SCROLL_DELAY_MS = 200;

/** Delay after a navigation press, in milliseconds. */
const NAVIGATION_DELAY_MS = 400;

// ---- Touch-based (Stax/Flex) interaction constants ----

/** Review swipes when approving a transaction on touch devices. */
const TOUCH_TX_REVIEW_SWIPE_COUNT = 3;

/** Review swipes when approving a message on touch devices. */
const TOUCH_SIGNING_REVIEW_SWIPE_COUNT = 2;

/** Horizontal distance of a review swipe, in pixels. */
const SWIPE_DISTANCE_PX = 10;

/** Duration of a swipe gesture, in seconds. */
const SWIPE_DURATION_SECONDS = 0.5;

/** Delay after a swipe or screen-changing tap, in milliseconds. */
const TOUCH_TRANSITION_DELAY_MS = 800;

/** Delay between blind-signing review swipes, in milliseconds. */
const BLIND_SIGNING_SWIPE_DELAY_MS = 300;

/** Delay letting a confirm/reject tap settle, in milliseconds. */
const TAP_SETTLE_DELAY_MS = 500;

/** Duration of a short tap, in seconds. */
const TAP_DURATION_SECONDS = 0.1;

/** Duration the review-confirm button is held, in seconds. */
const CONFIRM_HOLD_SECONDS = 3.0;

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
    for (let step = 0; step < TX_REVIEW_SCREEN_COUNT; step++) {
      await this.#client.pressButton('right');
      await delay(BUTTON_PRESS_DELAY_MS);
    }
    await this.#client.pressButton('both');
    await delay(BUTTON_PRESS_DELAY_MS);
  }

  /**
   * Approve a personal signing request by scrolling through 2 review screens and confirming.
   */
  async approveSigning(): Promise<void> {
    for (let step = 0; step < SIGNING_REVIEW_SCREEN_COUNT; step++) {
      await this.#client.pressButton('right');
      await delay(BUTTON_PRESS_DELAY_MS);
    }
    await this.#client.pressButton('both');
    await delay(BUTTON_PRESS_DELAY_MS);
  }

  /**
   * Approve blind signing by enabling it and scrolling through review screens.
   *
   * @param scrollCount - Number of screens to scroll through (default 4).
   */
  async approveBlindSigning(
    scrollCount = DEFAULT_BLIND_SIGNING_SCROLL_COUNT,
  ): Promise<void> {
    await this.#client.pressButton('both');
    await delay(BUTTON_TRANSITION_DELAY_MS);
    for (let step = 0; step < scrollCount; step++) {
      await this.#client.pressButton('right');
      await delay(BUTTON_PRESS_DELAY_MS);
    }
    await this.#client.pressButton('both');
    await delay(BUTTON_PRESS_DELAY_MS);
  }

  /**
   * Reject a transaction by scrolling to the reject option and pressing both buttons.
   */
  async rejectTransaction(): Promise<void> {
    await this.#client.pressButton('right');
    await delay(REJECT_NAVIGATION_DELAY_MS);
    await this.#client.pressButton('both');
    await delay(BUTTON_PRESS_DELAY_MS);
  }

  /**
   * Enable blind signing in the Ethereum app settings via button navigation.
   */
  async enableBlindSigning(): Promise<void> {
    await this.#client.pressButton('both');
    await delay(BUTTON_TRANSITION_DELAY_MS);
    await this.#client.pressButton('right');
    await delay(NAVIGATION_DELAY_MS);
    await this.#client.pressButton('both');
    await delay(BUTTON_TRANSITION_DELAY_MS);
    await this.#client.pressButton('both');
    await delay(BUTTON_TRANSITION_DELAY_MS);
    for (let step = 0; step < BLIND_SIGNING_SETTINGS_SCREEN_COUNT; step++) {
      await this.#client.pressButton('right');
      await delay(SETTINGS_SCROLL_DELAY_MS);
    }
    await this.#client.pressButton('both');
    await delay(BUTTON_PRESS_DELAY_MS);
    await this.#client.pressButton('left');
    await delay(NAVIGATION_DELAY_MS);
  }

  /**
   * Navigate back to the main menu by pressing the left button.
   */
  async navigateToMainMenu(): Promise<void> {
    await this.#client.pressButton('left');
    await delay(NAVIGATION_DELAY_MS);
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
      centerX - SWIPE_DISTANCE_PX,
      centerY,
      SWIPE_DURATION_SECONDS,
    );
    await delay(TOUCH_TRANSITION_DELAY_MS);
  }

  /**
   * Tap and hold the review confirm button.
   *
   * @param holdSeconds - Duration to hold the tap in seconds.
   * @throws If the device model does not define reviewConfirmButton coordinates.
   */
  async tapConfirm(holdSeconds = CONFIRM_HOLD_SECONDS): Promise<void> {
    const button = this.#model.reviewConfirmButton;
    if (!button) {
      throw new Error(
        `Device model "${this.#model.id}" does not define reviewConfirmButton coordinates`,
      );
    }
    await this.#client.fingerTap(button.x, button.y, holdSeconds);
  }

  /**
   * Tap the review reject button.
   *
   * @throws If the device model does not define reviewRejectButton coordinates.
   */
  async tapReject(): Promise<void> {
    const button = this.#model.reviewRejectButton;
    if (!button) {
      throw new Error(
        `Device model "${this.#model.id}" does not define reviewRejectButton coordinates`,
      );
    }
    await this.#client.fingerTap(button.x, button.y, TAP_DURATION_SECONDS);
  }

  /**
   * Tap the back button.
   *
   * @throws If the device model does not define backButton coordinates.
   */
  async tapBack(): Promise<void> {
    const button = this.#model.backButton;
    if (!button) {
      throw new Error(
        `Device model "${this.#model.id}" does not define backButton coordinates`,
      );
    }
    await this.#client.fingerTap(button.x, button.y, TAP_DURATION_SECONDS);
  }

  /**
   * Approve a transaction by swiping through review screens and tapping confirm.
   */
  async approveTransaction(): Promise<void> {
    for (let step = 0; step < TOUCH_TX_REVIEW_SWIPE_COUNT; step++) {
      await this.swipeLeft();
    }
    await this.tapConfirm();
    await delay(TAP_SETTLE_DELAY_MS);
  }

  /**
   * Approve a personal signing request by swiping through review screens and tapping confirm.
   */
  async approveSigning(): Promise<void> {
    for (let step = 0; step < TOUCH_SIGNING_REVIEW_SWIPE_COUNT; step++) {
      await this.swipeLeft();
    }
    await this.tapConfirm();
    await delay(TAP_SETTLE_DELAY_MS);
  }

  /**
   * Approve blind signing by tapping confirm, scrolling, and confirming.
   *
   * @param scrollCount - Number of screens to scroll through (default 4).
   * @throws If the device model does not define confirmButton coordinates.
   */
  async approveBlindSigning(
    scrollCount = DEFAULT_BLIND_SIGNING_SCROLL_COUNT,
  ): Promise<void> {
    const button = this.#model.confirmButton;
    if (!button) {
      throw new Error(
        `Device model "${this.#model.id}" does not define confirmButton coordinates`,
      );
    }
    await this.#client.fingerTap(button.x, button.y, TAP_DURATION_SECONDS);
    await delay(TOUCH_TRANSITION_DELAY_MS);

    for (let step = 0; step < scrollCount; step++) {
      await this.swipeLeft();
      await delay(BLIND_SIGNING_SWIPE_DELAY_MS);
    }
    await this.tapConfirm();
    await delay(TAP_SETTLE_DELAY_MS);
  }

  /**
   * Reject a transaction by tapping the reject button.
   */
  async rejectTransaction(): Promise<void> {
    await this.tapReject();
    await delay(TAP_SETTLE_DELAY_MS);
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
    await delay(NAVIGATION_DELAY_MS);
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
