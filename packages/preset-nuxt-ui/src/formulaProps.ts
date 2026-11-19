import type { FormulaPropsMap } from '@former-ui/former';

/**
 * The props of the components of the preset that may be calculated by a formula, e.g. with `withFormulaProps`
 * of `@former-ui/formula`, which adds a `<prop>Formula` setting for each of them.
 */
export const formulaProps: FormulaPropsMap = {
  text: { minLength: 'number', maxLength: 'number', preset: 'string' },
  textarea: { minLength: 'number', maxLength: 'number', preset: 'string' },
  number: {
    min: 'number',
    max: 'number',
    stepSize: 'number',
    preset: 'number',
  },
  slider: {
    min: 'number',
    max: 'number',
    stepSize: 'number',
    preset: 'number',
  },
  rating: { preset: 'number' },
  checkbox: { preset: 'boolean' },
  switch: { preset: 'boolean' },
  date: { min: 'date', max: 'date', preset: 'date' },
  date_range: { min: 'date', max: 'date' },
  time: { min: 'string', max: 'string', preset: 'string' },
  color: { preset: 'string' },
  tags: { minItems: 'number', maxItems: 'number' },
  repeater: { minItems: 'number', maxItems: 'number' },
};
