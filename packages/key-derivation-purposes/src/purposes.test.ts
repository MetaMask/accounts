import { MONEY_ACCOUNT_MPC_DEVICE_SHARE_ENCRYPTION_KEY_PURPOSE } from '.';

describe('MONEY_ACCOUNT_MPC_DEVICE_SHARE_ENCRYPTION_KEY_PURPOSE', () => {
  it('preserves the immutable MPC device-share encryption purpose', () => {
    expect(MONEY_ACCOUNT_MPC_DEVICE_SHARE_ENCRYPTION_KEY_PURPOSE).toBe(
      'metamask:money-account:mpc:device-share:encryption-key:v1',
    );
  });
});
