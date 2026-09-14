import { TrezorKeyring } from './trezor-keyring.js';

const oneKeyKeyringType = 'OneKey Hardware';

export class OneKeyKeyring extends TrezorKeyring {
  static type: string = oneKeyKeyringType;

  readonly type: string = oneKeyKeyringType;
}
