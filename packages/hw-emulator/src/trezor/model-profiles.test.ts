import { MODEL_PROFILES } from './model-profiles';
import type { ModelProfile, TrezorModel } from './model-profiles';

const ALL_MODELS: TrezorModel[] = ['T1B1', 'T2T1', 'T3B1', 'T3T1', 'T3W1'];

describe('MODEL_PROFILES', () => {
  it('has a profile for every supported model', () => {
    for (const model of ALL_MODELS) {
      expect(MODEL_PROFILES[model]).toBeDefined();
    }
  });

  it('t1B1 uses physical buttons (press-yes/press-no)', () => {
    expect(MODEL_PROFILES.T1B1.interaction).toBe('button');
    expect(MODEL_PROFILES.T1B1.confirm).toBe('press-yes');
    expect(MODEL_PROFILES.T1B1.reject).toBe('press-no');
    expect(MODEL_PROFILES.T1B1.layout).toBe('oled-128x64');
  });

  it('touchscreen models use click coordinates', () => {
    for (const model of ['T2T1', 'T3B1', 'T3T1', 'T3W1'] as TrezorModel[]) {
      const profile = MODEL_PROFILES[model];
      expect(profile.interaction).toBe('touch');
      expect(profile.layout).toBe('touch-240x280');
      expect(typeof profile.confirm).toBe('object');
      expect(
        (profile.confirm as { click: { x: number; y: number } }).click,
      ).toBeDefined();
    }
  });

  it('every profile has confirm + reject actions matching its interaction paradigm', () => {
    const confirmActions = ALL_MODELS.map((model) => {
      const profile: ModelProfile = MODEL_PROFILES[model];
      return profile.interaction === 'button'
        ? profile.confirm
        : (profile.confirm as { click: unknown }).click;
    });
    const rejectActions = ALL_MODELS.map((model) => {
      const profile: ModelProfile = MODEL_PROFILES[model];
      return profile.interaction === 'button'
        ? profile.reject
        : (profile.reject as { click: unknown }).click;
    });

    for (const confirm of confirmActions) {
      expect(confirm).toBeDefined();
    }
    for (const reject of rejectActions) {
      expect(reject).toBeDefined();
    }
  });
});
