import type { Token } from './types';

/** Stands for "any list", e.g. inside a `map` over something that isn't a plain variable. */
export const ANY_LIST = '*';

// functions calling their callback (the arguments after the first) for each item of the list in their first argument
const ITERATING_FUNCTIONS = ['map', 'filter', 'forEach'];

type Frame = { iterates: boolean; argIndex: number; firstArg: Token[] };

export type ScopedToken = { token: Token; lists: string[] };

/** The list a variable path iterates is named by its last segment: `$roof.rows` and `$parts_item.rows` both iterate `rows`. */
function iteratedList(firstArg: Token[], prefix: string): string {
  const meaningful = firstArg.filter(token => token.type !== 'whitespace' && token.type !== 'comment');
  const variable = meaningful[0];
  if (meaningful.length !== 1 || variable?.type !== 'variable' || variable.text.endsWith('.')) {
    return ANY_LIST;
  }
  return variable.text.slice(prefix.length).split('.').at(-1)!;
}

function previousMeaningful(tokens: Token[], index: number): Token | undefined {
  for (let i = index - 1; i >= 0; i--) {
    if (tokens[i]!.type !== 'whitespace' && tokens[i]!.type !== 'comment') {
      return tokens[i];
    }
  }
  return undefined;
}

/**
 * Walks the tokens of a (possibly half typed) formula and tells for each variable token, and for the end,
 * which lists have their item in scope there: the `loopLists` around the formula and the lists of the
 * `map` (and similar) callbacks the token is in.
 */
export function scanItemScopes(tokens: Token[], prefix: string, loopLists: ReadonlyArray<string> = []): { variables: ScopedToken[]; listsAtEnd: string[] } {
  const frames: Frame[] = [];
  const variables: ScopedToken[] = [];

  const currentLists = () => [
    ...new Set([
      ...loopLists,
      ...frames
        .filter(frame => frame.iterates && frame.argIndex >= 1)
        .map(frame => iteratedList(frame.firstArg, prefix)),
    ]),
  ];

  tokens.forEach((token, index) => {
    const frame = frames.at(-1);
    if (frame && frame.argIndex === 0 && !(token.type === 'separator' && token.text === ',') && !(token.type === 'bracket' && /[)\]}]/.test(token.text))) {
      frame.firstArg.push(token);
    }
    if (token.type === 'variable') {
      variables.push({
        token,
        lists: currentLists(),
      });
    }
    else if (token.type === 'bracket' && /[([{]/.test(token.text)) {
      const before = previousMeaningful(tokens, index);
      const iterates = token.text === '(' && before?.type === 'identifier' && ITERATING_FUNCTIONS.includes(before.text);
      frames.push({ iterates, argIndex: 0, firstArg: [] });
    }
    else if (token.type === 'bracket') {
      frames.pop();
    }
    else if (token.type === 'separator' && token.text === ',' && frame) {
      frame.argIndex += 1;
    }
  });

  return {
    variables,
    listsAtEnd: currentLists(),
  };
}

export function isListInScope(list: string, lists: ReadonlyArray<string>): boolean {
  return lists.includes(list) || lists.includes(ANY_LIST);
}
