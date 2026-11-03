import {
  TREZOR_EMULATOR_SEED,
  TREZOR_DEFAULT_MODEL,
  TREZOR_CONNECT_SRC,
  TREZOR_TRANSPORT_BRIDGE_PORT,
  TREZOR_CONTROLLER_PORT,
  TREZOR_MSG,
} from './constants';

describe('trezor constants', () => {
  it('exposes the SLIP-14 canonical seed', () => {
    expect(TREZOR_EMULATOR_SEED).toBe(
      'all all all all all all all all all all all all',
    );
  });

  it('defaults to Model T (T2T1)', () => {
    expect(TREZOR_DEFAULT_MODEL).toBe('T2T1');
  });

  it('exposes the local connect-web iframe connectSrc', () => {
    expect(TREZOR_CONNECT_SRC).toBe('http://localhost:8088/');
  });

  it('targets @trezor/transport-bridge on port 21328', () => {
    expect(TREZOR_TRANSPORT_BRIDGE_PORT).toBe(21328);
  });

  it('targets the WS controller on 9001', () => {
    expect(TREZOR_CONTROLLER_PORT).toBe(9001);
  });

  it('maps the Ethereum signing protobuf message type ids', () => {
    expect(TREZOR_MSG.EthereumSignTx).toBe(58);
    expect(TREZOR_MSG.EthereumSignMessage).toBe(60);
    expect(TREZOR_MSG.EthereumSignTypedData).toBe(495);
  });
});
