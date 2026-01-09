import { KeyringEvent } from '@metamask/keyring-api';

import { SnapManageAccountsMethod } from './methods';
import { emitSnapKeyringEvent, getSelectedAccounts } from './snap-utils';

describe('emitSnapKeyringEvent', () => {
  it('should call snap.request with the correct parameters', async () => {
    const snap = {
      request: jest.fn(),
    };
    const event = KeyringEvent.AccountDeleted;
    const data = { id: 'ffa9836a-8fe4-48a2-8f0f-95d08d8c1e87' };

    await emitSnapKeyringEvent(snap, event, data);

    expect(snap.request).toHaveBeenCalledWith({
      method: 'snap_manageAccounts',
      params: {
        method: event,
        params: data,
      },
    });
  });
});

describe('getSelectedAccounts', () => {
  it('should call snap.request with the correct parameters', async () => {
    const snap = {
      request: jest.fn(),
    };
    snap.request.mockResolvedValue(['ffa9836a-8fe4-48a2-8f0f-95d08d8c1e87']);
    const result = await getSelectedAccounts(snap);
    expect(snap.request).toHaveBeenCalledWith({
      method: 'snap_manageAccounts',
      params: {
        method: SnapManageAccountsMethod.GetSelectedAccounts,
      },
    });
    expect(result).toStrictEqual(['ffa9836a-8fe4-48a2-8f0f-95d08d8c1e87']);
  });
});
