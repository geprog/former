import type { FormulaContext, FormulaVariable } from './types';
import { all, create } from 'mathjs';
import { describe, expect, it } from 'vitest';
import { createFormulaEngine } from './engine';
import { complete, functionDoc, hover, signatureHelp, variableAt } from './languageService';
import { valueSource } from './sources';

const engine = createFormulaEngine({
  math: create(all),
});

const variables: FormulaVariable[] = [
  { name: 'number', type: 'number', label: 'Number' },
  { name: 'flag', type: 'boolean' },
  {
    name: 'choice',
    type: 'string',
    options: [
      { value: 'red', label: 'Red' },
      { value: 'blue' },
    ],
  },
  { name: 'group', type: 'object' },
  { name: 'group.field', type: 'number' },
  { name: 'list', type: 'list' },
  { name: 'list_item', type: 'object', itemOf: 'list' },
  { name: 'list_item.field', type: 'number', itemOf: 'list' },
];
const context: FormulaContext = { variables };

// the formula with `|` as the position
function at(formula: string): [string, number] {
  return [
    formula.replace('|', ''),
    formula.indexOf('|'),
  ];
}

function labels(formula: string, completionContext: FormulaContext = context, explicit = false) {
  const [text, offset] = at(formula);
  return complete(engine, text, offset, completionContext, { explicit })?.items.map(item => item.label);
}

describe('complete', () => {
  it('offers the variables matching what is typed after the prefix, without the items of lists out of scope', () => {
    expect(labels('$|')).toEqual([
      '$number',
      '$flag',
      '$choice',
      '$group',
      '$group.field',
      '$list',
    ]);
    expect(labels('$gr|')).toEqual(['$group', '$group.field']);
    expect(labels('$group.|')).toEqual(['$group.field']);
    expect(labels('sum(map($list, f($list_item) = $list_item.|')).toEqual(['$list_item.field']);
    expect(labels('$list_|', {
      ...context,
      loopScopes: ['list'],
    })).toEqual(['$list_item', '$list_item.field']);
  });

  it('replaces the whole variable', () => {
    const [text, offset] = at('$gr|oup + 1');
    expect(complete(engine, text, offset, context)).toMatchObject({ from: 0, to: 6 });
  });

  it('offers the variables of the expected type first', () => {
    expect(labels('$|', { ...context, expect: 'boolean' })![0]).toBe('$flag');
  });

  it('offers functions, constants, keywords and variables without prefix after letters', () => {
    const [text, offset] = at('1 + su|');
    const completion = complete(engine, text, offset, context)!;
    expect(completion).toMatchObject({ from: 4, to: 6 });
    expect(completion.items.find(item => item.label === 'sum')).toMatchObject({
      insert: 'sum()',
      cursor: 4,
      kind: 'function',
      detail: 'sum(a, b, c, ...)',
    });
    expect(labels('p|')).toContain('pi');
    expect(labels('an|')).toEqual(['and']);
    // the variable first, then the functions of mathjs, e.g. `num` (the numerator) and `number`
    expect(labels('num|')).toEqual(['$number', 'num', 'number', 'numeric']);
  });

  it('doesn\'t offer disabled functions, but the functions of sources', () => {
    expect(labels('eval|')).toEqual([]);
    const sources = [
      {
        ...valueSource({ id: 'x', values: {} }),
        functions: {
          formatMoney: {
            fn: () => '',
            syntax: ['formatMoney(value)'],
          },
        },
      },
    ];
    const [text, offset] = at('formatM|');
    expect(complete(engine, text, offset, context, { sources })?.items).toEqual([
      {
        label: 'formatMoney',
        insert: 'formatMoney()',
        cursor: 12,
        kind: 'function',
        detail: 'formatMoney(value)',
      },
    ]);
  });

  it('offers the options of a variable compared as text', () => {
    const [text, offset] = at('equalText($choice, "r|")');
    expect(complete(engine, text, offset, context)).toEqual({
      from: 20,
      to: 21,
      items: [
        {
          label: 'red',
          insert: 'red',
          kind: 'option',
          detail: 'Red',
        },
      ],
    });
    expect(labels('equalText("|", $choice)')).toEqual(['red', 'blue']);
    expect(labels('equalText($number, "|")')).toBeUndefined();
    expect(labels('"|"')).toBeUndefined();
  });

  it('offers nothing in comments and without anything typed, unless asked for explicitly', () => {
    expect(labels('1 # su|')).toBeUndefined();
    expect(labels('1 + |')).toBeUndefined();
    expect(labels('1 + |', context, true)).toEqual(expect.arrayContaining(['$number', 'sum', 'and']));
  });
});

describe('hover', () => {
  it('describes variables', () => {
    const [text, offset] = at('1 + $num|ber');
    expect(hover(engine, text, offset, context)).toEqual({
      from: 4,
      to: 11,
      kind: 'variable',
      variable: variables[0],
    });
    expect(hover(engine, '$unknown', 1, context)).toBeUndefined();
  });

  it('documents functions and constants', () => {
    expect(hover(engine, 'sum(1)', 1, context)).toMatchObject({
      from: 0,
      to: 3,
      kind: 'function',
      doc: {
        name: 'sum',
        syntax: expect.arrayContaining(['sum(a, b, c, ...)']),
      },
    });
    expect(hover(engine, '2 * pi', 5, context)).toMatchObject({
      kind: 'constant',
      doc: { name: 'pi' },
    });
    expect(hover(engine, '1 + 2', 2, context)).toBeUndefined();
  });
});

describe('signatureHelp', () => {
  it('tells the function and the argument at a position', () => {
    const [text, offset] = at('1 + max($number, |');
    expect(signatureHelp(engine, text, offset)).toMatchObject({
      from: 4,
      argument: 1,
      doc: { name: 'max' },
    });
    expect(signatureHelp(engine, ...at('max(sum(1, 2|), 3)'))).toMatchObject({
      argument: 1,
      doc: { name: 'sum' },
    });
    expect(signatureHelp(engine, ...at('max(sum(1, 2), |3)'))).toMatchObject({
      argument: 1,
      doc: { name: 'max' },
    });
    expect(signatureHelp(engine, ...at('max([1, 2|])'))).toBeUndefined();
    expect(signatureHelp(engine, ...at('max(1)|'))).toBeUndefined();
  });

  it('counts commas in strings as part of the string', () => {
    expect(signatureHelp(engine, ...at('equalText("a, b", |'))).toMatchObject({
      argument: 1,
      doc: { name: 'equalText' },
    });
  });
});

describe('functionDoc', () => {
  it('documents the functions of mathjs and of sources, not disabled ones', () => {
    expect(functionDoc(engine, 'sqrt')).toMatchObject({
      name: 'sqrt',
      description: expect.any(String),
    });
    expect(functionDoc(engine, 'evaluate')).toBeUndefined();
    expect(functionDoc(engine, 'nope')).toBeUndefined();
  });
});

describe('variableAt', () => {
  it('tells the variable at a position, or the closest one it is a part of', () => {
    expect(variableAt(engine, ...at('1 + $gr|oup.field'), context)).toBe(variables[4]);
    expect(variableAt(engine, ...at('$group.unk|nown'), context)).toBe(variables[3]);
    expect(variableAt(engine, ...at('$nope| + 1'), context)).toBeUndefined();
    expect(variableAt(engine, ...at('sum|(1)'), context)).toBeUndefined();
  });
});
