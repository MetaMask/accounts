import type { SnapKeyringInternalOptions } from './options';
import { getDefaultInternalOptions, getInternalOptionsOf } from './options';

describe('options', () => {
  const defaults = getDefaultInternalOptions();

  describe('getInternalOptionsOf', () => {
    it('returns default internal options if none are passed', () => {
      expect(getInternalOptionsOf([])).toStrictEqual(defaults);
    });

    it('supports undefined option objects', () => {
      expect(getInternalOptionsOf([undefined])).toStrictEqual(defaults);
      expect(getInternalOptionsOf([undefined, undefined])).toStrictEqual(
        defaults,
      );
    });

    it('uses the first defined values', () => {
      const input: Required<SnapKeyringInternalOptions> = {
        displayConfirmation: !defaults.displayConfirmation,
        displayAccountNameSuggestion: !defaults.displayAccountNameSuggestion,
        setSelectedAccount: !defaults.setSelectedAccount,
      };

      expect(getInternalOptionsOf([input])).toStrictEqual(input);
    });

    it('uses all defined values from every items', () => {
      const inputs: SnapKeyringInternalOptions[] = [
        {
          displayConfirmation: false,
        },
        {
          displayAccountNameSuggestion: false,
        },
        {
          setSelectedAccount: false,
        },
      ];

      expect(getInternalOptionsOf(inputs)).toStrictEqual({
        ...inputs[0],
        ...inputs[1],
        ...inputs[2],
      });
    });

    it('fallbacks to the default options if one field is still not defined', () => {
      const inputs: SnapKeyringInternalOptions[] = [
        {
          displayConfirmation: false,
        },
        // `displayAccountNameSuggestion` will be undefined
        {
          setSelectedAccount: false,
        },
      ];

      expect(getInternalOptionsOf(inputs)).toStrictEqual({
        ...inputs[0],
        ...inputs[1],
        // This one is defaulting to its default value
        displayAccountNameSuggestion: defaults.displayAccountNameSuggestion,
      });
    });

    /*
    it.each([
      {
        input: [
          {
            displayConfirmation: false,
          },
        ],
        expected: {
          ...defaults,
          displayConfirmation: false,
        },
      },
    ])(
      'supports undefined option object fields',
      ({
        input,
        expected,
      }: {
        input: SnapKeyringInternalOptions[];
        expected: Required<SnapKeyringInternalOptions>;
      }) => {
        expect(getInternalOptionsOf(input)).toStrictEqual(expected);
      },
    );
    */
  });
});
