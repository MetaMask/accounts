import { KeyringEvent } from './events';
import { emitSnapKeyringEvent } from './snap-utils';

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
