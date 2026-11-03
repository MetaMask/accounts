export type TrezorModel = 'T1B1' | 'T2T1' | 'T3B1' | 'T3T1' | 'T3W1';
export type Interaction = 'button' | 'touch';

export type PressAction =
  | 'press-yes'
  | 'press-no'
  | { click: { x: number; y: number } };

export type ModelProfile = {
  model: TrezorModel;
  interaction: Interaction;
  layout: 'oled-128x64' | 'touch-240x280';
  confirm: PressAction;
  reject: PressAction;
  /** Swipe direction used to scroll through long transaction summaries. */
  scrollApproach?: 'swipe-up' | 'swipe-down';
};

/**
 * X coordinate of the centered confirm/reject button column on the
 * 240×280 touchscreen (the screen's horizontal midpoint).
 */
const TOUCH_CONFIRM_X = 240 / 2;

/** Y coordinate of the lower confirm button on the 240×280 touchscreen. */
const TOUCH_CONFIRM_Y = 200;

/** Y coordinate of the upper reject button on the 240×280 touchscreen. */
const TOUCH_REJECT_Y = 40;

/**
 * Per-model device-interaction config.
 *
 * Touchscreen confirm/reject coordinates are firmware-layout-dependent.
 * T2T1 (Model T) values are validated against trezor-user-env; the Safe 5
 * family (T3*) coords are best-effort and may need tuning if a firmware
 * bump shifts the confirm button (see spec §12.2 R2).
 */
export const MODEL_PROFILES: Record<TrezorModel, ModelProfile> = {
  T1B1: {
    model: 'T1B1',
    interaction: 'button',
    layout: 'oled-128x64',
    confirm: 'press-yes',
    reject: 'press-no',
  },
  T2T1: {
    model: 'T2T1',
    interaction: 'touch',
    layout: 'touch-240x280',
    confirm: { click: { x: TOUCH_CONFIRM_X, y: TOUCH_CONFIRM_Y } },
    reject: { click: { x: TOUCH_CONFIRM_X, y: TOUCH_REJECT_Y } },
    scrollApproach: 'swipe-up',
  },
  T3B1: {
    model: 'T3B1',
    interaction: 'touch',
    layout: 'touch-240x280',
    confirm: { click: { x: TOUCH_CONFIRM_X, y: TOUCH_CONFIRM_Y } },
    reject: { click: { x: TOUCH_CONFIRM_X, y: TOUCH_REJECT_Y } },
    scrollApproach: 'swipe-up',
  },
  T3T1: {
    model: 'T3T1',
    interaction: 'touch',
    layout: 'touch-240x280',
    confirm: { click: { x: TOUCH_CONFIRM_X, y: TOUCH_CONFIRM_Y } },
    reject: { click: { x: TOUCH_CONFIRM_X, y: TOUCH_REJECT_Y } },
    scrollApproach: 'swipe-up',
  },
  T3W1: {
    model: 'T3W1',
    interaction: 'touch',
    layout: 'touch-240x280',
    confirm: { click: { x: TOUCH_CONFIRM_X, y: TOUCH_CONFIRM_Y } },
    reject: { click: { x: TOUCH_CONFIRM_X, y: TOUCH_REJECT_Y } },
    scrollApproach: 'swipe-up',
  },
};
