import { describe, expect, it } from 'vitest';
import { ANY_LIST, isListInScope, scanItemScopes } from './itemScope';
import { tokenize } from './lexer';

function listsOfVariables(formula: string, loopLists: string[] = []) {
  return scanItemScopes(tokenize(formula), '$', loopLists).variables.map(({ token, lists }) => [token.text, lists]);
}

function listsAtEnd(formula: string, loopLists: string[] = []) {
  return scanItemScopes(tokenize(formula), '$', loopLists).listsAtEnd;
}

describe('scanItemScopes', () => {
  it('has the item of the iterated list in scope of the callback only', () => {
    expect(listsOfVariables('$a + sum(map($roof.rows, f($rows_item) = $rows_item.width)) + $b')).toEqual([
      ['$a', []],
      ['$roof.rows', []],
      [
        '$rows_item',
        ['rows'],
      ],
      [
        '$rows_item.width',
        ['rows'],
      ],
      ['$b', []],
    ]);
  });

  it('nests the lists of nested callbacks and knows `filter` and `forEach`', () => {
    expect(listsOfVariables('map($rows, f($rows_item) = filter($rows_item.parts, f($parts_item) = $parts_item.ok))').at(-1)).toEqual([
      '$parts_item.ok',
      ['rows', 'parts'],
    ]);
    expect(listsOfVariables('forEach($rows, f($rows_item) = $rows_item)').at(-1)).toEqual([
      '$rows_item',
      ['rows'],
    ]);
  });

  it('includes the lists around the formula', () => {
    expect(listsOfVariables('$rows_item.width', ['rows'])).toEqual([
      [
        '$rows_item.width',
        ['rows'],
      ],
    ]);
  });

  it('allows any item when the iterated list is not a plain variable', () => {
    expect(listsOfVariables('map(concat($a, $b), f(x) = $x_item)').at(-1)).toEqual([
      '$x_item',
      [ANY_LIST],
    ]);
    expect(listsOfVariables('map($rows[1], f(x) = $x_item)').at(-1)).toEqual([
      '$x_item',
      [ANY_LIST],
    ]);
  });

  it('ignores other functions and brackets', () => {
    expect(listsOfVariables('max($rows, (f($rows_item) = 1), [$rows_item])').at(-1)).toEqual(['$rows_item', []]);
    expect(listsOfVariables('mapping($rows, $rows_item)').at(-1)).toEqual(['$rows_item', []]);
  });

  it('ignores variables in strings and comments', () => {
    expect(listsOfVariables('equalText($a, "$b") # $c')).toEqual([
      ['$a', []],
    ]);
  });

  it('tells the lists in scope at the end of a half typed formula', () => {
    expect(listsAtEnd('sum(map($rows, f($rows_item) = $')).toEqual(['rows']);
    expect(listsAtEnd('sum(map($rows, ')).toEqual(['rows']);
    expect(listsAtEnd('sum(map($rows')).toEqual([]);
    expect(listsAtEnd('sum(map($rows, f($rows_item) = 1)) + ', ['parts'])).toEqual(['parts']);
  });
});

describe('isListInScope', () => {
  it('accepts the lists in scope and any list', () => {
    expect(isListInScope('rows', ['rows'])).toBe(true);
    expect(isListInScope('rows', ['parts'])).toBe(false);
    expect(isListInScope('rows', [ANY_LIST])).toBe(true);
  });
});
