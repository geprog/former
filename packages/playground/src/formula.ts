import { createFormulaEngine, valueSource } from '@former-ui/formula';
import { all, create } from 'mathjs';

export const engine = createFormulaEngine({
  math: create(all),
});

// external values formulas can use besides the fields of the form, e.g. `$playground.vat`
export const playgroundSource = valueSource({
  id: 'playground',
  label: 'Playground',
  namespace: 'playground',
  values: {
    today: new Date().toISOString().slice(0, 10),
    vat: 0.19,
  },
});
