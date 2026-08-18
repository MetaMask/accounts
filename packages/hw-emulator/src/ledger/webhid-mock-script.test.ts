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

  it('wraps JSON.parse in try/catch', () => {
    const script = getWebHidMockScript(9876);

    expect(script).toMatch(
      /try \{[\s\S]*?JSON\.parse\(event\.data\)[\s\S]*?\} catch \(parseError\)/u,
    );
  });

  it('rejects all pending exchanges on ws.onclose and ws.onerror', () => {
    const script = getWebHidMockScript(9876);

    expect(script).toMatch(/const failAllPending = function\(message\)/u);
    expect(script).toMatch(/pendingExchanges\.forEach[\s\S]*?pending\.reject/u);
    expect(script).toMatch(/pendingExchanges\.clear\(\)/u);
    // Both close and error paths invoke failAllPending.
    const onclose = script.match(
      /ws\.onclose = function\(\) \{[\s\S]*?\};/u,
    )?.[0];
    const onerror = script.match(/ws\.onerror = function[\s\S]*?\};/u)?.[0];
    expect(onclose).toContain('failAllPending(');
    expect(onerror).toContain('failAllPending(');
  });

  it('produces syntactically valid JavaScript for injection', () => {
    const script = getWebHidMockScript(9876);

    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    expect(() => new Function(script)).not.toThrow();
  });
});
