export type TrezorModel =
  | 'T1B1'
  | 'T2T1'
  | 'T3B1'
  | 'T3T1'
  | 'T3W1';
export type Interaction = 'button' | 'touch';

export type PressAction =
  | 'press-yes'
  | 'press-no'
  | { click: { x: number; y: number } };

export interface ModelProfile {
  model: TrezorModel;
  interaction: Interaction;
  layout: 'oled-128x64' | 'touch-240x280';
  confirm: PressAction;
  reject: PressAction;
  /** Swipe direction used to scroll through long transaction summaries. */
  scrollApproach?: 'swipe-up' | 'swipe-down';
}

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
    confirm: { click: { x: 120, y: 200 } },
    reject: { click: { x: 120, y: 40 } },
    scrollApproach: 'swipe-up',
  },
  T3B1: {
    model: 'T3B1',
    interaction: 'touch',
    layout: 'touch-240x280',
    confirm: { click: { x: 120, y: 200 } },
    reject: { click: { x: 120, y: 40 } },
    scrollApproach: 'swipe-up',
  },
  T3T1: {
    model: 'T3T1',
    interaction: 'touch',
    layout: 'touch-240x280',
    confirm: { click: { x: 120, y: 200 } },
    reject: { click: { x: 120, y: 40 } },
    scrollApproach: 'swipe-up',
  },
  T3W1: {
    model: 'T3W1',
    interaction: 'touch',
    layout: 'touch-240x280',
    confirm: { click: { x: 120, y: 200 } },
    reject: { click: { x: 120, y: 40 } },
    scrollApproach: 'swipe-up',
  },
};
