import { all, create } from 'mathjs';
import { expect, it } from 'vitest';
import { createFormulaEngine } from './engine';
import { formatFormula as format } from './format';
import { normalizeFormula } from './lexer';

const math = create(all);
const engine = createFormulaEngine({ math });
const formatFormula = (formula: string) => format(engine, formula);

const lines = (...parts: string[]) => parts.join('\n');

/** Formulas of every shape the formatter prints, the mutations start from. */
const CORPUS = [
  '$a + $b * 2 - $c / 4',
  `${'$'}${'a'.repeat(40)} + ${'$'}${'b'.repeat(40)} + $c`,
  'equalText($choice, \'red\') or equalText($choice, \'blue\') ? $a * 2 : $b',
  `${'$'}${'a'.repeat(76)} ? 1 : $b ? 2 : 3`,
  'sum(map($list, h($list_item) = $list_item.field ?? 0)) > 0 and not $flag',
  lines('$a # the base', '+ $b', '# the extra', '+ ($c * 2)'),
  'round(($a + $b) * 1.19, 2) - 10% + 5 % 3',
  '- -3 + not($a) xor $b and $c',
  '2 (0.98 + 1.30) + sqrt(4) 2',
  `f(g(${'$'}${'a'.repeat(39)} + ${'$'}${'b'.repeat(39)}), $c, 'x, y')`,
  '$café_area + $naïve_area ^ 2 mod 3',
  lines('max(', '  $a,', '  $b', ')', '+ min($c, $d) == 3'),
];

/**
 * The formatter is a hand-written tokenizer, parser and printer, so its risk is not the formulas
 * authors do write but the ones they mistype on the way there. Mutating the formulas of the corpus
 * reaches token sequences no hand-written case would think of, and every one of them must come out
 * of `formatFormula` as either the untouched input or the same formula re-spaced - never a formula
 * that means something else, and never an exception.
 */

/** Deliberately independent of the formatter's own tokenizer, so a tokenizer bug cannot hide here. */
function skeleton(source: string): string {
  let out = '';
  let quote: string | undefined;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]!;
    if (quote !== undefined) {
      out += character;
      if (character === '\\') {
        out += source[index + 1] ?? '';
        index += 1;
      }
      else if (character === quote) {
        quote = undefined;
      }
      continue;
    }
    if (character === '\'' || character === '"') {
      quote = character;
      out += character;
      continue;
    }
    if (/\s/u.test(character) || character === ' ') {
      continue;
    }
    out += character;
  }
  return out;
}

/**
 * `parenthesis: 'all'` prints how the operands are grouped, not only the parentheses the source
 * carries, so a formula regrouped by an added or dropped operator fails this - including the
 * associativity of `*`, which `'keep'` would print away.
 */
function syntaxTreeOf(formula: string) {
  return math.parse(normalizeFormula(formula)).toString({ parenthesis: 'all', implicit: 'show' });
}

/** Seeded so that a failing case is reproducible rather than a flake. */
let seed = 20260907;
function random() {
  seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF;
  return seed / 0x7FFFFFFF;
}
const pick = <T>(values: T[]): T => values[Math.floor(random() * values.length)]!;

const JUNK = [
  '(',
  ')',
  '+',
  '*',
  '?',
  ':',
  ';',
  '#',
  '\'',
  '"',
  '{',
  '}',
  '[',
  ']',
  '%',
  ',',
  '=',
  '-',
  'and',
  'not',
  '\n',
  ' ',
  '$',
  '.',
  'ß',
  ' ',
];

function mutations(corpus: string[], count: number): string[] {
  const cases: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const base = pick(corpus);
    switch (index % 4) {
      case 0:
        cases.push(base.slice(0, Math.floor(random() * base.length)));
        break;
      case 1: {
        const at = Math.floor(random() * (base.length + 1));
        cases.push(base.slice(0, at) + pick(JUNK) + base.slice(at));
        break;
      }
      case 2: {
        const at = Math.floor(random() * base.length);
        cases.push(base.slice(0, at) + base.slice(at + 1));
        break;
      }
      default:
        cases.push(pick(JUNK).repeat(1 + Math.floor(random() * 5)) + base.slice(0, Math.floor(random() * 40)));
    }
  }
  return cases;
}

/** Shapes that would blow a recursive printer or a naive scanner rather than merely confuse it. */
const PATHOLOGICAL = [
  `${'('.repeat(200)}1${')'.repeat(200)}`,
  // longer sums still format, but overflow the stack of the test worker in the recursive `toString` of mathjs
  `1${' + 1'.repeat(1000)}`,
  `$a${' ? 1 : $a'.repeat(300)} ? 1 : 0`,
  '',
  ' ',
  '\n\n',
  '#',
  '# only a comment',
  '\'unterminated',
  '$a #',
  ' ',
];

it('every mutated formula comes back either untouched or only re-spaced', () => {
  const cases = [
    ...mutations(
      CORPUS,
      4000,
    ),
    ...PATHOLOGICAL,
  ];

  const threw: string[] = [];
  const notWhitespaceOnly: string[] = [];
  const syntaxTreeChanged: string[] = [];
  const notIdempotent: string[] = [];
  let unchanged = 0;
  let reformatted = 0;

  for (const input of cases) {
    let output: string;
    try {
      output = formatFormula(input);
    }
    catch (error) {
      threw.push(`${JSON.stringify(input)} -> ${error}`);
      continue;
    }

    // Whether the input was refused or was already printed is not observable here, and asserting
    // that `canFormatFormula` agrees would assert nothing: both read the same `printedForm`.
    if (output === input) {
      unchanged += 1;
      continue;
    }

    reformatted += 1;
    if (skeleton(output) !== skeleton(input)) {
      notWhitespaceOnly.push(JSON.stringify(input));
    }
    try {
      if (syntaxTreeOf(output) !== syntaxTreeOf(input)) {
        syntaxTreeChanged.push(JSON.stringify(input));
      }
    }
    catch (error) {
      syntaxTreeChanged.push(`${JSON.stringify(input)} no longer parses: ${error}`);
    }
    if (formatFormula(output) !== output) {
      notIdempotent.push(JSON.stringify(input));
    }
  }

  expect(threw).toStrictEqual([]);
  expect(notWhitespaceOnly).toStrictEqual([]);
  expect(syntaxTreeChanged).toStrictEqual([]);
  expect(notIdempotent).toStrictEqual([]);

  // Guards the fuzz itself: a corpus that stopped reaching both outcomes would assert nothing.
  expect(unchanged).toBeGreaterThan(cases.length / 10);
  expect(reformatted).toBeGreaterThan(cases.length / 10);
}, 30_000);
