import type { Token, TokenType } from './types';

// a variable may be half typed while editing, e.g. `$` or `$roof.` at the end of the formula
const VARIABLE = /\$[\p{L}\p{N}_]*(?:\.[\p{L}\p{N}_]+)*(?:\.$)?/uy;
const IDENTIFIER = /[\p{L}_][\p{L}\p{N}_$]*/uy;
const NUMBER = /(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/iy;
const WHITESPACE = /\s+/uy;
const OPERATORS = [
  '>>>',
  '==',
  '!=',
  '<=',
  '>=',
  '??',
  '.*',
  './',
  '.^',
  '<<',
  '>>',
  '+',
  '-',
  '*',
  '/',
  '^',
  '%',
  '!',
  '=',
  '<',
  '>',
  '?',
  ':',
  '&',
  '|',
  '~',
  '.',
];

function match(pattern: RegExp, text: string, index: number): string | undefined {
  pattern.lastIndex = index;
  return pattern.exec(text)?.[0] || undefined;
}

function stringEnd(text: string, start: number): number {
  const quote = text[start];
  let index = start + 1;
  while (index < text.length && text[index] !== quote) {
    index += text[index] === '\\'
      ? 2
      : 1;
  }
  // an unterminated string (e.g. while typing) reaches to the end
  return Math.min(index + 1, text.length);
}

/**
 * Splits a formula into tokens with their position. Works on half typed formulas too, as it doesn't parse them,
 * e.g. to highlight them or to find the variables they reference.
 */
export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  const push = (type: TokenType, to: number) => {
    tokens.push({
      type,
      text: text.slice(index, to),
      from: index,
      to,
    });
    index = to;
  };

  while (index < text.length) {
    const character = text[index]!;
    if (character === '\'' || character === '"') {
      push('string', stringEnd(text, index));
      continue;
    }
    if (character === '#') {
      const end = text.slice(index).search(/[\n\r]/);
      push('comment', end === -1
        ? text.length
        : index + end);
      continue;
    }
    if (character === '(' || character === ')' || character === '[' || character === ']' || character === '{' || character === '}') {
      push('bracket', index + 1);
      continue;
    }
    if (character === ',' || character === ';') {
      push('separator', index + 1);
      continue;
    }
    const whitespace = match(WHITESPACE, text, index);
    if (whitespace) {
      push('whitespace', index + whitespace.length);
      continue;
    }
    if (character === '$') {
      push('variable', index + match(VARIABLE, text, index)!.length);
      continue;
    }
    const identifier = match(IDENTIFIER, text, index);
    if (identifier) {
      push('identifier', index + identifier.length);
      continue;
    }
    const number = match(NUMBER, text, index);
    if (number) {
      push('number', index + number.length);
      continue;
    }
    const operator = OPERATORS.find(operator => text.startsWith(operator, index));
    push(operator
      ? 'operator'
      : 'unknown', index + (operator?.length ?? 1));
  }
  return tokens;
}

/**
 * Prepares a formula for mathjs without moving any character, so that positions reported by mathjs
 * are positions in the original formula: comments and line breaks (which would separate statements)
 * become spaces, as do non-breaking spaces.
 */
export function normalizeFormula(text: string): string {
  return tokenize(text)
    .map(token => (token.type === 'comment' || token.type === 'whitespace'
      ? ' '.repeat(token.text.length)
      : token.text))
    .join('');
}

/** The value of a string token without its quotes and escapes. */
export function stringValue(token: Token): string {
  const quote = token.text[0];
  const closed = token.text.length > 1 && token.text.endsWith(quote!);
  return token.text
    .slice(1, closed
      ? -1
      : undefined)
    .replace(/\\(.)/g, '$1');
}
