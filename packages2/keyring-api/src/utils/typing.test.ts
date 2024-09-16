import { expectTrue } from './typing';

describe('expectTrue', () => {
  it('does nothing since expectTrue is an empty function', () => {
    expect(() => expectTrue<true>()).not.toThrow();
  });
});
