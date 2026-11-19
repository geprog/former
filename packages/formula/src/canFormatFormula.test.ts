import { all, create } from 'mathjs';
import { describe, expect, it } from 'vitest';
import { createFormulaEngine } from './engine';
import { canFormatFormula as canFormat, formatFormula as format } from './format';

const engine = createFormulaEngine({
  math: create(all),
});
const formatFormula = (formula: string) => format(engine, formula);
const canFormatFormula = (formula: string) => canFormat(engine, formula);

describe('canFormatFormula', () => {
  it('accepts a formula the formatter reprints', () => {
    const formula = '$a+$b';

    const canFormat = canFormatFormula(formula);

    expect(canFormat).toBe(true);
  });

  it('accepts a formula that is already in printed form', () => {
    const formula = 'max($a, $b) * 2';

    const canFormat = canFormatFormula(formula);

    expect(canFormat).toBe(true);
  });

  it('tells an already printed formula apart from one it refuses', () => {
    const printed = 'max($a, $b) * 2';
    const refused = '$a[1:2]';

    const bothUnchanged = formatFormula(printed) === printed && formatFormula(refused) === refused;

    expect(bothUnchanged).toBe(true);
    expect([
      canFormatFormula(printed),
      canFormatFormula(refused),
    ]).toEqual([true, false]);
  });

  it('accepts a formula the formatter has broken across lines', () => {
    const formula = formatFormula(`${'$'}${'a'.repeat(50)} + ${'$'}${'b'.repeat(50)}`);

    const canFormat = canFormatFormula(formula);

    expect(formula).toContain('\n');
    expect(canFormat).toBe(true);
  });

  // mathjs reads two adjacent operands as a product, so this formula is valid and gets laid out.
  it('accepts a formula that multiplies implicitly', () => {
    const formula = '2 $b';

    const canFormat = canFormatFormula(formula);

    expect(canFormat).toBe(true);
  });

  it('rejects a formula mathjs cannot parse', () => {
    const formula = '$a +';

    const canFormat = canFormatFormula(formula);

    expect(canFormat).toBe(false);
  });

  it.each([
    { name: 'an object literal', formula: '{a: 1}' },
    { name: 'an array literal', formula: '[1, 2]' },
    { name: 'several statements', formula: '1 + 2; 3' },
    { name: 'a range index', formula: '$a[1:2]' },
  ])('rejects $name', ({ formula }) => {
    const canFormat = canFormatFormula(formula);

    expect(canFormat).toBe(false);
  });

  // An empty field holds no expression to print, so `formatFormula` returns it unchanged through its
  // refusal path - reporting `true` would promise a formatting that never happens.
  it('rejects an empty formula', () => {
    const formula = '';

    const canFormat = canFormatFormula(formula);

    expect(canFormat).toBe(false);
  });

  it('rejects a formula that is only a comment', () => {
    const formula = '# the base area';

    const canFormat = canFormatFormula(formula);

    expect(canFormat).toBe(false);
  });
});
