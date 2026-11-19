import { all, create } from 'mathjs';
import { describe, expect, it } from 'vitest';
import { createFormulaEngine } from './engine';
import { canFormatFormula as canFormat, formatFormula as format } from './format';
import { normalizeFormula } from './lexer';

const math = create(all);
const engine = createFormulaEngine({ math });
const formatFormula = (formula: string) => format(engine, formula);
const canFormatFormula = (formula: string) => canFormat(engine, formula);

/** Keeps the multi-line fixtures readable and free of the test file's own indentation. */
const lines = (...parts: string[]) => parts.join('\n');

/** A `$…` symbol of exactly `length` characters, to pin the print width down to the column. */
const symbolOfLength = (letter: string, length: number) => `$${letter.repeat(length - 1)}`;

/**
 * Fully parenthesised, so that a regrouped product fails this rather than printing the same. Parsed like the
 * evaluator does, without the comments: flattened, a comment would swallow the rest of the formula.
 */
function astOf(formula: string) {
  return math.parse(normalizeFormula(formula)).toString({ parenthesis: 'all', implicit: 'show' });
}

function withoutWhitespace(formula: string) {
  return formula.replace(/('[^']*'|"[^"]*")|\s+/g, (_match, stringLiteral: string | undefined) => stringLiteral ?? '');
}

type FormatCase = { name: string; input: string; expected: string };

const a40 = symbolOfLength('a', 40);
const b40 = symbolOfLength('b', 40);

const a30 = symbolOfLength('a', 30);
const b30 = symbolOfLength('b', 30);
const c30 = symbolOfLength('c', 30);

const spacingCases: FormatCase[] = [
  { name: 'puts one space around a binary operator', input: '$a+$b', expected: '$a + $b' },
  { name: 'collapses a run of spaces', input: '$a  +   $b', expected: '$a + $b' },
  { name: 'turns a non-breaking space into a normal space', input: '$a\u00A0+\u00A0$b', expected: '$a + $b' },
  { name: 'removes the space before a comma and after a parenthesis', input: 'f( $a , $b )', expected: 'f($a, $b)' },
  { name: 'removes the space between a function name and its parenthesis', input: 'sum ($a)', expected: 'sum($a)' },
  { name: 'spaces an inline question mark and colon', input: '$a?1:0', expected: '$a ? 1 : 0' },
  { name: 'glues a unary minus to its operand', input: '$a * - 30', expected: '$a * -30' },
  { name: 'keeps a binary minus spaced next to a unary one', input: '-$a - -$b', expected: '-$a - -$b' },
  { name: 'glues a unary plus to its operand', input: '$a + + 30', expected: '$a + +30' },
  { name: 'follows the not operator with one space', input: 'not  $a', expected: 'not $a' },
  { name: 'glues the not operator to a parenthesised operand', input: 'not  ($a)', expected: 'not($a)' },
  { name: 'removes leading and trailing whitespace', input: '  $a + $b  ', expected: '$a + $b' },
  { name: 'removes a blank line inside a formula', input: '$a\n\n+ $b', expected: '$a + $b' },
  { name: 'removes leading and trailing blank lines', input: '\n\n$a + $b\n\n', expected: '$a + $b' },
  { name: 'joins a formula that was broken up needlessly', input: '$a\n+ $b', expected: '$a + $b' },
];

const breakingCases: FormatCase[] = [
  {
    name: 'keeps a sum of exactly 80 columns on one line',
    input: `${symbolOfLength('a', 38)} + ${symbolOfLength('b', 39)}`,
    expected: `${symbolOfLength('a', 38)} + ${symbolOfLength('b', 39)}`,
  },
  {
    name: 'breaks a sum of 81 columns',
    input: `${symbolOfLength('a', 39)} + ${symbolOfLength('b', 39)}`,
    expected: lines(symbolOfLength('a', 39), `+ ${symbolOfLength('b', 39)}`),
  },
  {
    name: 'breaks every summand of a broken sum onto its own line',
    input: `$a + $b + ${symbolOfLength('c', 76)}`,
    expected: lines('$a', '+ $b', `+ ${symbolOfLength('c', 76)}`),
  },
  {
    name: 'counts the indentation towards the print width',
    input: `zzz(${symbolOfLength('a', 38)} + ${symbolOfLength('b', 38)})`,
    expected: lines('zzz(', `  ${symbolOfLength('a', 38)}`, `  + ${symbolOfLength('b', 38)}`, ')'),
  },
  {
    name: 'keeps a construct on one line when it fits at its own indentation',
    input: `zzz(${symbolOfLength('a', 37)} + ${symbolOfLength('b', 37)})`,
    expected: lines('zzz(', `  ${symbolOfLength('a', 37)} + ${symbolOfLength('b', 37)}`, ')'),
  },
  {
    name: 'indents two spaces per nesting level',
    input: `f(g(${a40} + ${b40}))`,
    expected: lines('f(', '  g(', `    ${a40}`, `    + ${b40}`, '  )', ')'),
  },
  {
    name: 'breaks a boolean and chain with the operator opening the line',
    input: `$a and $b and ${symbolOfLength('c', 70)}`,
    expected: lines('$a', 'and $b', `and ${symbolOfLength('c', 70)}`),
  },
  {
    name: 'breaks a boolean or chain with the operator opening the line',
    input: `$a or $b or ${symbolOfLength('c', 70)}`,
    expected: lines('$a', 'or $b', `or ${symbolOfLength('c', 70)}`),
  },
  {
    name: 'breaks a boolean xor chain with the operator opening the line',
    input: `$a xor $b xor ${symbolOfLength('c', 70)}`,
    expected: lines('$a', 'xor $b', `xor ${symbolOfLength('c', 70)}`),
  },
  {
    name: 'keeps the opening parenthesis of a broken group on the introducing line',
    input: `($a + ${symbolOfLength('b', 78)}) + $c`,
    expected: lines('(', '  $a', `  + ${symbolOfLength('b', 78)}`, ')', '+ $c'),
  },
  {
    name: 'indents the content of a broken group one level below the line that opened it',
    input: `$c + ($a + ${symbolOfLength('b', 72)})`,
    expected: lines('$c', '+ (', `  $a + ${symbolOfLength('b', 72)}`, ')'),
  },
  {
    name: 'puts the branches of a broken ternary one level deeper',
    input: `${symbolOfLength('a', 76)} ? $b : $c`,
    expected: lines(symbolOfLength('a', 76), '  ? $b', '  : $c'),
  },
  {
    name: 'hoists a ternary in the else branch onto the colon line',
    input: `${symbolOfLength('a', 76)} ? 1 : $b ? 2 : 3`,
    expected: lines(symbolOfLength('a', 76), '  ? 1', '  : $b ? 2 : 3'),
  },
  {
    name: 'puts the branches of a hoisted ternary one level further',
    input: `${symbolOfLength('a', 76)} ? 1 : ${symbolOfLength('b', 76)} ? 2 : 3`,
    expected: lines(symbolOfLength('a', 76), '  ? 1', `  : ${symbolOfLength('b', 76)}`, '    ? 2', '    : 3'),
  },
  {
    name: 'ends every argument line of a broken call but the last with a comma',
    input: `f(${a40}, ${b40})`,
    expected: lines('f(', `  ${a40},`, `  ${b40}`, ')'),
  },
  {
    name: 'starts the body of a broken function-assignment argument on the next line',
    input: `map($a, h($i) = ${symbolOfLength('b', 35)} + ${symbolOfLength('c', 36)})`,
    expected: lines('map(', '  $a,', '  h($i) =', `    ${symbolOfLength('b', 35)} + ${symbolOfLength('c', 36)}`, ')'),
  },
];

const nonBreakingOperators = [
  '*',
  '/',
  '==',
  '!=',
  '<',
  '>',
  '<=',
  '>=',
  '^',
  'mod',
  'to',
  'in',
  '??',
];

/**
 * mathjs accepts any Unicode letter in a symbol name, so the tokenizer has to as well. Were it
 * narrowed to ASCII these formulas would not tokenize at all and would come back unformatted.
 */
const nonAsciiIdentifierCases: FormatCase[] = [
  { name: 'reads an acute accent as part of an identifier', input: '$café_area+$b', expected: '$café_area + $b' },
  { name: 'reads a diaeresis as part of an identifier', input: 'f( $naïve_area )', expected: 'f($naïve_area)' },
];

/**
 * A unary operator glues to its operand, but a second unary operator is not an operand: `--3` reads
 * like a decrement, so stacked unary operators keep one space between them.
 */
const unaryCases: FormatCase[] = [
  { name: 'separates two stacked unary minuses', input: '- -3', expected: '- -3' },
  { name: 'separates two unary minuses that were glued together', input: '--3', expected: '- -3' },
  { name: 'separates a run of three unary minuses', input: '- - -3', expected: '- - -3' },
  { name: 'separates stacked unary minuses inside a sum', input: '$a + - -3', expected: '$a + - -3' },
  { name: 'separates a unary minus from a unary plus', input: '-+3', expected: '- +3' },
  { name: 'separates a unary minus from a following not', input: '- not $a', expected: '- not $a' },
  {
    name: 'separates a unary minus from a not that owns a parenthesis',
    input: '- not($a)',
    expected: '- not($a)',
  },
  { name: 'keeps stacked not operators separated', input: 'not not $a', expected: 'not not $a' },
];

/**
 * A `%` is a postfix percentage when nothing that could start an operand follows it, and the binary
 * modulo operator when something does - which is what decides whether it is glued or spaced.
 */
const percentCases: FormatCase[] = [
  { name: 'glues a postfix percent before a multiplication', input: '5 % * 2', expected: '5% * 2' },
  { name: 'glues a postfix percent before a division', input: '5 % / 2', expected: '5% / 2' },
  { name: 'glues a postfix percent before a comparison', input: '5 % == 3', expected: '5% == 3' },
  { name: 'glues a postfix percent before a word operator', input: '5 % and $b', expected: '5% and $b' },
  { name: 'glues a postfix percent before a ternary', input: '5 % ? 1 : 0', expected: '5% ? 1 : 0' },
  { name: 'glues a postfix percent that closes an argument list', input: 'f(5 %)', expected: 'f(5%)' },
  { name: 'glues a postfix percent that ends the formula', input: '$a * 5 %', expected: '$a * 5%' },
  { name: 'spaces a modulo before a number', input: '5%3', expected: '5 % 3' },
  { name: 'spaces a modulo before a symbol', input: '$a%$b', expected: '$a % $b' },
  { name: 'spaces a modulo before a string', input: '5%\'x\'', expected: '5 % \'x\'' },
  { name: 'spaces a modulo before a function call', input: '5%f($a)', expected: '5 % f($a)' },
  { name: 'spaces a modulo before a parenthesis', input: '5%(1 + 2)', expected: '5 % (1 + 2)' },
  { name: 'spaces a modulo before a unary minus', input: '5%-3', expected: '5 % -3' },
  { name: 'spaces a modulo before a not', input: '5%not $b', expected: '5 % not $b' },
  {
    // Reads like a percentage plus twenty, but mathjs computes `50 mod (+20)`: the `+` starts an
    // operand, so the `%` in front of it is the modulo operator. The spacing follows the meaning.
    name: 'spaces a modulo whose right operand carries a leading plus',
    input: '50% + 20',
    expected: '50 % +20',
  },
  { name: 'leaves a bare postfix percent alone', input: '50%', expected: '50%' },
  { name: 'leaves a postfix percent inside a subtraction alone', input: '100 - 10%', expected: '100 - 10%' },
  { name: 'leaves a postfix percent after a parenthesised group alone', input: '(50)%', expected: '(50)%' },
  { name: 'leaves a chain of modulo operators alone', input: '10 % 3 % 2', expected: '10 % 3 % 2' },
];

/**
 * mathjs binds `and` tighter than `xor`, and `xor` tighter than `or`. Where the line breaks is the
 * only thing that shows a reader how the operands group, so it has to follow that same order.
 */
const booleanPrecedenceCases: FormatCase[] = [
  {
    name: 'keeps the tighter and together when breaking an and/or chain',
    input: `${a30} and ${b30} or ${c30}`,
    expected: lines(`${a30} and ${b30}`, `or ${c30}`),
  },
  {
    name: 'keeps the trailing and together when breaking an or/and chain',
    input: `${a30} or ${b30} and ${c30}`,
    expected: lines(a30, `or ${b30} and ${c30}`),
  },
  {
    name: 'keeps the tighter and together when breaking an and/xor chain',
    input: `${a30} and ${b30} xor ${c30}`,
    expected: lines(`${a30} and ${b30}`, `xor ${c30}`),
  },
  {
    name: 'keeps the trailing and together when breaking an xor/and chain',
    input: `${a30} xor ${b30} and ${c30}`,
    expected: lines(a30, `xor ${b30} and ${c30}`),
  },
  {
    name: 'keeps the tighter xor together when breaking an xor/or chain',
    input: `${a30} xor ${b30} or ${c30}`,
    expected: lines(`${a30} xor ${b30}`, `or ${c30}`),
  },
  {
    name: 'keeps the trailing xor together when breaking an or/xor chain',
    input: `${a30} or ${b30} xor ${c30}`,
    expected: lines(a30, `or ${b30} xor ${c30}`),
  },
  {
    name: 'breaks before a parenthesised or that an and applies to',
    input: `${a30} and (${b30} or ${c30})`,
    expected: lines(a30, `and (${b30} or ${c30})`),
  },
  {
    name: 'breaks after a parenthesised or that an and applies to',
    input: `(${a30} or ${b30}) and ${c30}`,
    expected: lines(`(${a30} or ${b30})`, `and ${c30}`),
  },
];

const commentCases: FormatCase[] = [
  {
    name: 'keeps a comment that follows code at the end of its line',
    input: '$a  # the base area\n+ $b',
    expected: lines('$a # the base area', '+ $b'),
  },
  {
    name: 'keeps a comment that stands on its own line on its own line',
    input: '$a\n# the base area\n+ $b',
    expected: lines('$a', '# the base area', '+ $b'),
  },
  {
    name: 'breaks a sum that contains a comment even though it would fit',
    input: '$a + $b # the sum',
    expected: lines('$a', '+ $b # the sum'),
  },
  {
    name: 'keeps a formula whose only comment trails the whole expression on one line',
    input: '$a  # the base area',
    expected: '$a # the base area',
  },
  {
    name: 'keeps a comment that opens a parenthesised group',
    input: '(\n  # the base\n  $a * 2\n  + $b\n) / 10',
    expected: lines('(', '  # the base', '  $a * 2 + $b', ') / 10'),
  },
  {
    name: 'keeps a comment before an operator inside a parenthesised group',
    input: '(\n  $a * 2\n  # the extra\n  + $b\n) / 10',
    expected: lines('(', '  $a * 2', '  # the extra', '  + $b', ') / 10'),
  },
  {
    name: 'keeps a comment that follows code inside a parenthesised group',
    input: '($a  # the base\n+ $b) / 10',
    expected: lines('(', '  $a # the base', '  + $b', ') / 10'),
  },
  {
    name: 'keeps a comment that opens the argument of a function call',
    input: 'round(\n  # the base\n  $a  +  $b\n)',
    expected: lines('round(', '  # the base', '  $a + $b', ')'),
  },
];

/**
 * A comment the parser cannot attach to any token: printing it would have to move it across one, so
 * the whole formula is kept as it is. Dropping the note instead would be silent data loss.
 */
const detachedCommentCases: { name: string; input: string }[] = [
  {
    name: 'an own-line comment behind a whole sum',
    input: lines('$a + $b', '# note'),
  },
  {
    name: 'an own-line comment behind a whole product',
    input: lines('$a * $b', '# note'),
  },
  {
    name: 'an own-line comment behind a whole boolean chain',
    input: lines('$a and $b', '# note'),
  },
  {
    name: 'an own-line comment behind a whole function call',
    input: lines('f($a, $b)', '# note'),
  },
  {
    name: 'an own-line comment behind a whole ternary',
    input: lines('$a ? 1 : 0', '# note'),
  },
  {
    name: 'an own-line comment behind a lone symbol',
    input: lines('$a', '# note'),
  },
  {
    name: 'an own-line comment before the equals sign of an assignment',
    input: lines('h($i)', '# note', '= $i + 1'),
  },
];

/**
 * mathjs multiplies two adjacent operands, so a formula that omits the `*` is valid and only looks
 * like a typo. It is laid out like any other product and keeps the sign it was written with.
 */
const implicitMultiplicationCases: FormatCase[] = [
  {
    name: 'lays out an implicit multiplication before a group',
    input: '2  (0.98 + 1.30)',
    expected: '2 (0.98 + 1.30)',
  },
  { name: 'lays out an implicit multiplication before a symbol', input: '2  $a', expected: '2 $a' },
  { name: 'lays out an implicit multiplication after a group', input: '(1)  (2)', expected: '(1) (2)' },
  { name: 'lays out an implicit multiplication after a function call', input: 'sqrt(4)  2', expected: 'sqrt(4) 2' },
  { name: 'lays out a chain of implicit multiplications', input: '2  (1)  3', expected: '2 (1) 3' },
  { name: 'lays out an implicit multiplication behind an explicit one', input: '$a*2  (3)', expected: '$a * 2 (3)' },
  { name: 'lays out an implicit multiplication behind a division', input: '4/$a  2', expected: '4 / $a 2' },
  { name: 'lays out an implicit multiplication behind a modulo', input: '4 mod 3  $a', expected: '4 mod 3 $a' },
  { name: 'keeps the power that follows an implicit multiplication', input: '4  (2)^2', expected: '4 (2) ^ 2' },
  { name: 'keeps the division that follows an implicit multiplication', input: '2  $a/4', expected: '2 $a / 4' },
  {
    name: 'keeps reading a symbol in front of a parenthesis as a function call',
    input: 'sum ($a)',
    expected: 'sum($a)',
  },
  {
    name: 'a sum whose lines skip the multiplication sign twice',
    input: lines(
      '$panelA72_130 * 2 * (0.72 + 1.30)',
      '+ $panelB98_130 * 2 (0.98 + 1.30)',
      '+ $panelC122_130 * 2 (1.22 + 1.30)',
    ),
    expected: lines(
      '$panelA72_130 * 2 * (0.72 + 1.30)',
      '+ $panelB98_130 * 2 (0.98 + 1.30)',
      '+ $panelC122_130 * 2 (1.22 + 1.30)',
    ),
  },
];

// mathjs binds `??` tighter than `^` and a unary sign, so `$a + $b ?? 0` is `$a + ($b ?? 0)`.
const nullishCoalescingCases: FormatCase[] = [
  { name: 'spaces the nullish coalescing operator', input: '$a??0', expected: '$a ?? 0' },
  { name: 'chains the nullish coalescing operator', input: '$a ??$b?? 0', expected: '$a ?? $b ?? 0' },
  { name: 'keeps a nullish coalescing operand of a sum', input: '$a+$b ??0', expected: '$a + $b ?? 0' },
  { name: 'keeps a nullish coalescing base of a power', input: '$a ??2^ 3', expected: '$a ?? 2 ^ 3' },
  { name: 'keeps a nullish coalescing condition', input: '$a ?? false?1:0', expected: '$a ?? false ? 1 : 0' },
  {
    name: 'formats a map whose item fields fall back to a default',
    input:
      'sum( map($groupedLists.entries, h($entries_item) = equalText(($entries_item.entryLabel ?? \'\'), \'standard option\') ? ($entries_item.quantity ?? 0) : 0 ))',
    expected: lines(
      'sum(',
      '  map(',
      '    $groupedLists.entries,',
      '    h($entries_item) =',
      '      equalText(($entries_item.entryLabel ?? \'\'), \'standard option\')',
      '        ? ($entries_item.quantity ?? 0)',
      '        : 0',
      '  )',
      ')',
    ),
  },
  {
    name: 'formats a sum whose item field falls back to a default',
    input: lines(
      'count($settings.extraServices) > 0',
      '  ? sum(map($settings.extraServices, h($extraServices_item) = $extraServices_item.price ?? 0))',
      '  : 0',
    ),
    expected: lines(
      'count($settings.extraServices) > 0',
      '  ? sum(',
      '    map(',
      '      $settings.extraServices,',
      '      h($extraServices_item) = $extraServices_item.price ?? 0',
      '    )',
      '  )',
      '  : 0',
    ),
  },
];

const allCases = [
  ...spacingCases,
  ...breakingCases,
  ...nonAsciiIdentifierCases,
  ...unaryCases,
  ...percentCases,
  ...booleanPrecedenceCases,
  ...commentCases,
  ...implicitMultiplicationCases,
  ...nullishCoalescingCases,
];

describe('formatFormula', () => {
  describe('whitespace', () => {
    it.each(spacingCases)('$name', ({ input, expected }) => {
      expect(formatFormula(input)).toBe(expected);
    });
  });

  describe('line breaking', () => {
    it.each(breakingCases)('$name', ({ input, expected }) => {
      expect(formatFormula(input)).toBe(expected);
    });

    it.each(nonBreakingOperators)('never breaks a %s chain', (operator) => {
      const formula = `${a40} ${operator} ${b40}`;

      expect(formatFormula(formula)).toBe(formula);
    });
  });

  describe('non-ASCII identifiers', () => {
    it.each(nonAsciiIdentifierCases)('$name', ({ input, expected }) => {
      expect(formatFormula(input)).toBe(expected);
    });
  });

  describe('stacked unary operators', () => {
    it.each(unaryCases)('$name', ({ input, expected }) => {
      expect(formatFormula(input)).toBe(expected);
    });
  });

  describe('percent and modulo', () => {
    it.each(percentCases)('$name', ({ input, expected }) => {
      expect(formatFormula(input)).toBe(expected);
    });

    // Most of these are already in printed form, so `formatFormula` handing the input back is also
    // what a refusal looks like. Only the predicate tells the two apart - and it is what decides
    // whether the field offers to format or shows "cannot be formatted".
    it.each(percentCases)('$name is formatted rather than refused', ({ input }) => {
      expect(canFormatFormula(input)).toBe(true);
    });
  });

  describe('boolean operator precedence', () => {
    it.each(booleanPrecedenceCases)('$name', ({ input, expected }) => {
      expect(formatFormula(input)).toBe(expected);
    });
  });

  describe('comments', () => {
    it.each(commentCases)('$name', ({ input, expected }) => {
      expect(formatFormula(input)).toBe(expected);
    });

    it.each(commentCases)('$name is formatted rather than refused', ({ input }) => {
      expect(canFormatFormula(input)).toBe(true);
    });

    it.each(detachedCommentCases)('keeps a formula with $name unchanged', ({ input }) => {
      expect(formatFormula(input)).toBe(input);
    });

    it.each(detachedCommentCases)('never drops $name', ({ input }) => {
      expect(formatFormula(input)).toContain('# note');
    });
  });

  describe('implicit multiplication', () => {
    it.each(implicitMultiplicationCases)('$name', ({ input, expected }) => {
      expect(formatFormula(input)).toBe(expected);
    });

    it.each(implicitMultiplicationCases)('$name is formatted rather than refused', ({ input }) => {
      expect(canFormatFormula(input)).toBe(true);
    });

    // Adding the sign would regroup the product: mathjs binds an omitted `*` tighter than a
    // written one, so `$a * 2 (3)` is `$a * (2 * 3)` while `$a * 2 * (3)` is `($a * 2) * 3`.
    it('keeps the grouping mathjs reads, which a written-out sign would change', () => {
      const input = '$a * 2 (3)';

      expect(astOf(formatFormula(input))).toBe('$a * (2 * 3)');
    });

    // Multiplication of doubles is not associative, so that regrouping would be observable in a
    // result: `$a * 0.1 * (0.2 + 0.5)` yields 0.875 at `$a = 12.5`, the formula as written does not.
    it('computes what it computed before, to the last bit', () => {
      const formula = '$a * 0.1 (0.2 + 0.5)';
      const scope = { $a: 12.5 };

      const after = math.evaluate(normalizeFormula(formatFormula(formula)), scope) as number;

      expect(after).toBe(math.evaluate(normalizeFormula(formula), scope));
      expect(after).toBe(0.8749999999999999);
    });
  });

  describe('nullish coalescing', () => {
    it.each(nullishCoalescingCases)('$name', ({ input, expected }) => {
      expect(formatFormula(input)).toBe(expected);
    });

    it.each(nullishCoalescingCases)('$name is formatted rather than refused', ({ input }) => {
      expect(canFormatFormula(input)).toBe(true);
    });
  });

  describe('refuses to format', () => {
    it.each([
      { name: 'a formula with a syntax error', input: '$a + ' },
      { name: 'a matrix', input: '$a  + [1, 2]' },
      { name: 'an object', input: '$a  + {b: 1}' },
      { name: 'a statement separator', input: '$a  + 1; $b' },
      { name: 'a range colon', input: '$a  + sum(1:3)' },
      { name: 'a string literal behind an operand, which mathjs reads as a transpose', input: '2  \'x\'' },
      { name: 'an unterminated string', input: '$a  + \'x' },
      { name: 'an operator the tokenizer does not know', input: '$a  & $b' },
      { name: 'an element-wise operator', input: '$a  .* $b' },
      { name: 'an element-wise operator glued to a trailing decimal point', input: '$a  + 0.*2' },
      { name: 'an element-wise division glued to a trailing decimal point', input: '$a  + 4./2' },
      { name: 'an element-wise power glued to a trailing decimal point', input: '$a  + 2.^3' },
      { name: 'a factorial', input: '5!  + 1' },
      { name: 'a comment the printer cannot place', input: '$a  # the base area\n* $b' },
      { name: 'a formula that is only whitespace', input: '   ' },
      { name: 'a formula that is only a comment', input: '# the base area   ' },
    ])('$name', ({ input }) => {
      expect(formatFormula(input)).toBe(input);
    });
  });

  describe('invariants', () => {
    it.each(allCases)('$name keeps the mathjs syntax tree', ({ input }) => {
      expect(astOf(formatFormula(input))).toBe(astOf(input));
    });

    it.each(allCases)('$name only changes whitespace', ({ input }) => {
      expect(withoutWhitespace(formatFormula(input))).toBe(withoutWhitespace(input));
    });

    it.each(allCases)('$name formatting is idempotent', ({ input }) => {
      const formatted = formatFormula(input);

      expect(formatFormula(formatted)).toBe(formatted);
    });
  });
});
