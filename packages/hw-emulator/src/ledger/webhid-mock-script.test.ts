import { getWebHidMockScript } from './webhid-mock-script';

describe('getWebHidMockScript', () => {
  it('removes pendingExchanges entries on HID_FRAME_ACK', () => {
    const script = getWebHidMockScript(9876);

    const ackHandler = script.match(
      /else if \(response\.type === 'HID_FRAME_ACK'\) \{[\s\S]*?\} else if \(response\.type === 'APDU_ERROR'\)/u,
    )?.[0];

    expect(ackHandler).toBeDefined();
    expect(ackHandler).toContain('pendingExchanges.delete(response.id)');
    expect(ackHandler).toContain('pending.resolve()');
  });

  it('removes pendingExchanges entries on HID_EXCHANGE_COMPLETE and APDU_ERROR', () => {
    const script = getWebHidMockScript(9876);

    expect(script).toMatch(
      /HID_EXCHANGE_COMPLETE[\s\S]*?pendingExchanges\.delete\(response\.id\)/u,
    );
    expect(script).toMatch(
      /APDU_ERROR[\s\S]*?pendingExchanges\.delete\(response\.id\)/u,
    );
  });
});
