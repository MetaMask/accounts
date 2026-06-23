import {
  MODEL_PROFILES,
  type TrezorModel,
  type ModelProfile,
} from './model-profiles';

const ALL_MODELS: TrezorModel[] = [
  'T1B1',
  'T2T1',
  'T3B1',
  'T3T1',
  'T3W1',
];

describe('MODEL_PROFILES', () => {
  it('has a profile for every supported model', () => {
    for (const model of ALL_MODELS) {
      expect(MODEL_PROFILES[model]).toBeDefined();
    }
  });

  it('T1B1 uses physical buttons (press-yes/press-no)', () => {
    expect(MODEL_PROFILES.T1B1.interaction).toBe('button');
    expect(MODEL_PROFILES.T1B1.confirm).toBe('press-yes');
    expect(MODEL_PROFILES.T1B1.reject).toBe('press-no');
    expect(MODEL_PROFILES.T1B1.layout).toBe('oled-128x64');
  });

  it('touchscreen models use click coordinates', () => {
    for (const model of ['T2T1', 'T3B1', 'T3T1', 'T3W1'] as TrezorModel[]) {
      const p = MODEL_PROFILES[model];
      expect(p.interaction).toBe('touch');
      expect(p.layout).toBe('touch-240x280');
      expect(typeof p.confirm).toBe('object');
      expect(
        (p.confirm as { click: { x: number; y: number } }).click,
      ).toBeDefined();
    }
  });

  it('every profile has confirm + reject actions matching its interaction paradigm', () => {
    for (const model of ALL_MODELS) {
      const p: ModelProfile = MODEL_PROFILES[model];
      if (p.interaction === 'button') {
        expect(p.confirm).toBe('press-yes');
        expect(p.reject).toBe('press-no');
      } else {
        expect((p.confirm as { click: unknown }).click).toBeDefined();
        expect((p.reject as { click: unknown }).click).toBeDefined();
      }
    }
  });
});
