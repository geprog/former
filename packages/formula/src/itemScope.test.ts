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
    expect(listsOfVariables('$a + sum(map($group.list, f($list_item) = $list_item.field)) + $b')).toEqual([
      ['$a', []],
      ['$group.list', []],
      [
        '$list_item',
        ['list'],
      ],
      [
        '$list_item.field',
        ['list'],
      ],
      ['$b', []],
    ]);
  });

  it('nests the lists of nested callbacks and knows `filter` and `forEach`', () => {
    expect(listsOfVariables('map($list, f($list_item) = filter($list_item.sub, f($sub_item) = $sub_item.ok))').at(-1)).toEqual([
      '$sub_item.ok',
      ['list', 'sub'],
    ]);
    expect(listsOfVariables('forEach($list, f($list_item) = $list_item)').at(-1)).toEqual([
      '$list_item',
      ['list'],
    ]);
  });

  it('includes the lists around the formula', () => {
    expect(listsOfVariables('$list_item.field', ['list'])).toEqual([
      [
        '$list_item.field',
        ['list'],
      ],
    ]);
  });

  it('allows any item when the iterated list is not a plain variable', () => {
    expect(listsOfVariables('map(concat($a, $b), f(x) = $x_item)').at(-1)).toEqual([
      '$x_item',
      [ANY_LIST],
    ]);
    expect(listsOfVariables('map($list[1], f(x) = $x_item)').at(-1)).toEqual([
      '$x_item',
      [ANY_LIST],
    ]);
  });

  it('ignores other functions and brackets', () => {
    expect(listsOfVariables('max($list, (f($list_item) = 1), [$list_item])').at(-1)).toEqual(['$list_item', []]);
    expect(listsOfVariables('mapping($list, $list_item)').at(-1)).toEqual(['$list_item', []]);
  });

  it('ignores variables in strings and comments', () => {
    expect(listsOfVariables('equalText($a, "$b") # $c')).toEqual([
      ['$a', []],
    ]);
  });

  it('tells the lists in scope at the end of a half typed formula', () => {
    expect(listsAtEnd('sum(map($list, f($list_item) = $')).toEqual(['list']);
    expect(listsAtEnd('sum(map($list, ')).toEqual(['list']);
    expect(listsAtEnd('sum(map($list')).toEqual([]);
    expect(listsAtEnd('sum(map($list, f($list_item) = 1)) + ', ['sub'])).toEqual(['sub']);
  });
});

describe('isListInScope', () => {
  it('accepts the lists in scope and any list', () => {
    expect(isListInScope('list', ['list'])).toBe(true);
    expect(isListInScope('list', ['sub'])).toBe(false);
    expect(isListInScope('list', [ANY_LIST])).toBe(true);
  });
});
