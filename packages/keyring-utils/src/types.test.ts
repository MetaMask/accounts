import { is } from '@metamask/superstruct';

import { StringNumberStruct } from './types';

describe('StringNumber', () => {
  it.each(['0', '0.0', '0.1', '0.19', '00.19', '0.000000000000000000000'])(
    'validates basic number: %s',
    (input: string) => {
      expect(is(input, StringNumberStruct)).toBe(true);
    },
  );

  it.each(['foobar', 'NaN', '0.123.4', '1e3', undefined, null, 1, true])(
    'fails to validate wrong number: %s',
    (input: any) => {
      expect(is(input, StringNumberStruct)).toBe(false);
    },
  );
});
