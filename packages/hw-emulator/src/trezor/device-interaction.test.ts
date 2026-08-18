import { TrezorControllerClient } from './controller-client';
import { TrezorDeviceInteraction } from './device-interaction';
import { MODEL_PROFILES } from './model-profiles';

class FakeController extends TrezorControllerClient {
  calls: string[] = [];

  constructor() {
    super({});
  }

  override async pressYes(): Promise<unknown> {
    this.calls.push('press-yes');
    return Promise.resolve({});
  }

  override async pressNo(): Promise<unknown> {
    this.calls.push('press-no');
    return Promise.resolve({});
  }

  override async click(params: { x: number; y: number }): Promise<unknown> {
    this.calls.push(`click:${params.x},${params.y}`);
    return Promise.resolve({});
  }

  override async swipe(
    direction: 'up' | 'down' | 'left' | 'right',
  ): Promise<unknown> {
    this.calls.push(`swipe:${direction}`);
    return Promise.resolve({});
  }
}

describe('TrezorDeviceInteraction', () => {
  it('t1B1 approve dispatches press-yes', async () => {
    const ctl = new FakeController();
    const ix = new TrezorDeviceInteraction(ctl, MODEL_PROFILES.T1B1);
    await ix.approveTransaction();
    expect(ctl.calls).toStrictEqual(['press-yes']);
  });

  it('t2T1 approve dispatches click at the profile confirm coords', async () => {
    const ctl = new FakeController();
    const ix = new TrezorDeviceInteraction(ctl, MODEL_PROFILES.T2T1);
    await ix.approveTransaction();
    expect(ctl.calls).toStrictEqual(['click:120,200']);
  });

  it('reject dispatches the profile reject action', async () => {
    const ctl = new FakeController();
    const ix = new TrezorDeviceInteraction(ctl, MODEL_PROFILES.T1B1);
    await ix.rejectTransaction();
    expect(ctl.calls).toStrictEqual(['press-no']);
  });

  it('approveSigning is a semantic alias of approveTransaction', async () => {
    const ctl = new FakeController();
    const ix = new TrezorDeviceInteraction(ctl, MODEL_PROFILES.T2T1);
    await ix.approveSigning();
    expect(ctl.calls).toStrictEqual(['click:120,200']);
  });

  it('dismissSummaryScreen swipes per the profile scroll approach', async () => {
    const ctl = new FakeController();
    const ix = new TrezorDeviceInteraction(ctl, MODEL_PROFILES.T2T1);
    await ix.dismissSummaryScreen();
    expect(ctl.calls).toStrictEqual(['swipe:up']);
  });

  it('dismissSummaryScreen does nothing without a scroll approach', async () => {
    const ctl = new FakeController();
    const ix = new TrezorDeviceInteraction(ctl, MODEL_PROFILES.T1B1);
    await ix.dismissSummaryScreen();
    expect(ctl.calls).toStrictEqual([]);
  });
});
