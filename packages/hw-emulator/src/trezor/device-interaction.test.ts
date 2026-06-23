import { TrezorDeviceInteraction } from './device-interaction';
import { TrezorControllerClient } from './controller-client';
import { MODEL_PROFILES } from './model-profiles';

class FakeController extends TrezorControllerClient {
  calls: string[] = [];
  constructor() {
    super({});
  }

  override pressYes() {
    this.calls.push('press-yes');
    return Promise.resolve({});
  }
  override pressNo() {
    this.calls.push('press-no');
    return Promise.resolve({});
  }
  override click(p: { x: number; y: number }) {
    this.calls.push(`click:${p.x},${p.y}`);
    return Promise.resolve({});
  }
  override swipe(d: 'up' | 'down' | 'left' | 'right') {
    this.calls.push(`swipe:${d}`);
    return Promise.resolve({});
  }
}

describe('TrezorDeviceInteraction', () => {
  it('T1B1 approve dispatches press-yes', async () => {
    const ctl = new FakeController();
    const ix = new TrezorDeviceInteraction(ctl, MODEL_PROFILES.T1B1);
    await ix.approveTransaction();
    expect(ctl.calls).toEqual(['press-yes']);
  });

  it('T2T1 approve dispatches click at the profile confirm coords', async () => {
    const ctl = new FakeController();
    const ix = new TrezorDeviceInteraction(ctl, MODEL_PROFILES.T2T1);
    await ix.approveTransaction();
    expect(ctl.calls).toEqual(['click:120,200']);
  });

  it('reject dispatches the profile reject action', async () => {
    const ctl = new FakeController();
    const ix = new TrezorDeviceInteraction(ctl, MODEL_PROFILES.T1B1);
    await ix.rejectTransaction();
    expect(ctl.calls).toEqual(['press-no']);
  });

  it('approveSigning is a semantic alias of approveTransaction', async () => {
    const ctl = new FakeController();
    const ix = new TrezorDeviceInteraction(ctl, MODEL_PROFILES.T2T1);
    await ix.approveSigning();
    expect(ctl.calls).toEqual(['click:120,200']);
  });
});
