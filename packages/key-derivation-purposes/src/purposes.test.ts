import { MONEY_ACCOUNT_MPC_DEVICE_SHARE_WRAPPING_KEY_PURPOSE } from '.';

describe('MONEY_ACCOUNT_MPC_DEVICE_SHARE_WRAPPING_KEY_PURPOSE', () => {
  it('preserves the immutable MFA encryption purpose', () => {
    expect(MONEY_ACCOUNT_MPC_DEVICE_SHARE_WRAPPING_KEY_PURPOSE).toBe(
      'metamask:money-account:mpc:device-share:wrapping-key:v1',
    );
  });
});
