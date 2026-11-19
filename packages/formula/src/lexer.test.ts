import { describe, expect, it } from 'vitest';
import { normalizeFormula, stringValue, tokenize } from './lexer';

describe('tokenize', () => {
  it('splits formulas into tokens, also when they are half typed', () => {
    expect(tokenize('$roof.width >= 2.5 and equalText($c, "a\\"b") # done\n$').map(({ type, text }) => [type, text])).toEqual([
      ['variable', '$roof.width'],
      ['whitespace', ' '],
      ['operator', '>='],
      ['whitespace', ' '],
      ['number', '2.5'],
      ['whitespace', ' '],
      ['identifier', 'and'],
      ['whitespace', ' '],
      ['identifier', 'equalText'],
      ['bracket', '('],
      ['variable', '$c'],
      ['separator', ','],
      ['whitespace', ' '],
      ['string', '"a\\"b"'],
      ['bracket', ')'],
      ['whitespace', ' '],
      ['comment', '# done'],
      ['whitespace', '\n'],
      ['variable', '$'],
    ]);
    expect(tokenize('$roof.').map(token => token.text)).toEqual(['$roof.']);
    expect(tokenize('"open').map(token => token.type)).toEqual(['string']);
  });
});

describe('tokenize edge cases', () => {
  it('reads numbers, operators and unknown characters', () => {
    expect(tokenize('1e3 .5 2.5E-2 a<=b ?? c @').filter(token => token.type !== 'whitespace').map(({ type, text }) => [type, text])).toEqual([
      ['number', '1e3'],
      ['number', '.5'],
      ['number', '2.5E-2'],
      ['identifier', 'a'],
      ['operator', '<='],
      ['identifier', 'b'],
      ['operator', '??'],
      ['identifier', 'c'],
      ['unknown', '@'],
    ]);
  });

  it('keeps the positions of the tokens', () => {
    const text = 'max($a, 2)';
    expect(tokenize(text).every(token => text.slice(token.from, token.to) === token.text)).toBe(true);
  });

  it('reads a `$` after a word character as part of the identifier', () => {
    expect(tokenize('a$b').map(({ type, text }) => [type, text])).toEqual([
      ['identifier', 'a$b'],
    ]);
  });
});

describe('normalizeFormula', () => {
  it('replaces comments, line breaks and non-breaking spaces without moving other characters', () => {
    const formula = '1 + # one\n2 # two';
    const normalized = normalizeFormula(formula);
    // `\u00A0# one\n` and ` # two` become as many spaces
    expect(normalized).toBe(`1 +${' '.repeat(7)}2${' '.repeat(6)}`);
    expect(normalized).toHaveLength(formula.length);
  });

  it('keeps `#` and line breaks inside of strings', () => {
    expect(normalizeFormula('equalText($a, "a#b") # comment')).toBe('equalText($a, "a#b")          ');
  });
});

describe('stringValue', () => {
  it('reads the value of a string token without quotes and escapes', () => {
    expect(stringValue(tokenize('"a\\"b"')[0]!)).toBe('a"b');
    expect(stringValue(tokenize('\'single\'')[0]!)).toBe('single');
  });

  it('reads unterminated strings while they are typed', () => {
    expect(stringValue(tokenize('"open')[0]!)).toBe('open');
    expect(stringValue(tokenize('"')[0]!)).toBe('');
  });
});
