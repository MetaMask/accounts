import { Purpose } from '.';

describe('Purpose', () => {
  it('preserves the immutable MPC device-share wrapping purpose', () => {
    expect(Purpose.MoneyAccountMpcDeviceShareWrappingKey).toBe(
      'metamask:money-account:mpc:device-share:wrapping-key:v1',
    );
  });
});
