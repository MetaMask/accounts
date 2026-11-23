import { MONEY_ACCOUNT_MFA_ENCRYPTION_KEY_PURPOSE } from '.';

describe('MONEY_ACCOUNT_MFA_ENCRYPTION_KEY_PURPOSE', () => {
  it('preserves the immutable MFA encryption purpose', () => {
    expect(MONEY_ACCOUNT_MFA_ENCRYPTION_KEY_PURPOSE).toBe(
      'metamask:money-account:mfa:encryption-key:v1',
    );
  });
});
