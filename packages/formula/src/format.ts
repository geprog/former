import type { FormulaEngine } from './engine';
import { normalizeFormula } from './lexer';

const PRINT_WIDTH = 80;
const INDENTATION = '  ';
const NON_BREAKING_SPACE = '\u00A0';

const WORD_OPERATORS = [
  'and',
  'or',
  'xor',
  'not',
  'mod',
  'to',
  'in',
];
const SYMBOL_OPERATORS = [
  '??',
  '==',
  '!=',
  '<=',
  '>=',
  '<',
  '>',
  '+',
  '-',
  '*',
  '/',
  '^',
  '%',
];
const UNARY_OPERATORS = ['-', '+', 'not'];
const NUMBER_LITERAL = /^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i;
/** mathjs' element-wise operators, which claim the trailing dot of a number literal. */
const ELEMENT_WISE_OPERATOR = /^[*/^]/;
const IDENTIFIER_START = /[\p{L}_$]/u;
const IDENTIFIER_PART = /[\p{L}\p{N}_$]/u;
/** mathjs multiplies two adjacent operands, so a product can be written without its `*`. */
const IMPLICIT_MULTIPLICATION = '';

type TokenType
  = 'number' | 'string' | 'symbol' | 'operator' | 'question' | 'colon' | 'comma' | 'open' | 'close' | 'assign';

type Token = { type: TokenType; text: string };

/** A `#` line comment, remembered with the index of the token it precedes. */
type Comment = { text: string; ownLine: boolean; before: number };

type ChainPart = { operator: string; operand: FormulaNode; leading: Comment[] };

type NodeShape
  = | { kind: 'atom'; text: string }
    | { kind: 'group'; inner: FormulaNode }
    | { kind: 'call'; callee: string; args: FormulaNode[] }
    | { kind: 'chain'; breakable: boolean; first: FormulaNode; parts: ChainPart[] }
    | { kind: 'power'; base: FormulaNode; exponent: FormulaNode }
    | { kind: 'unary'; operator: string; operand: FormulaNode }
    | { kind: 'percent'; operand: FormulaNode }
    | {
      kind: 'ternary';
      condition: FormulaNode;
      whenTrue: FormulaNode;
      whenFalse: FormulaNode;
      trueLeading: Comment[];
      falseLeading: Comment[];
    }
    | { kind: 'assignment'; target: FormulaNode; value: FormulaNode };

type FormulaNode = NodeShape & { leading: Comment[]; trailing?: Comment };

/** Signals syntax the formatter does not fully understand, which makes it keep the formula as it is. */
class UnsupportedFormula extends Error {}

function unsupported(): never {
  throw new UnsupportedFormula();
}

function makeNode<Shape extends NodeShape>(shape: Shape): Shape & { leading: Comment[] } {
  return { ...shape, leading: [] };
}

function readStringLiteral(rest: string): string {
  const quote = rest.charAt(0);
  let end = 1;
  while (end < rest.length && rest.charAt(end) !== quote) {
    end += rest.charAt(end) === '\\'
      ? 2
      : 1;
  }
  if (rest.charAt(end) !== quote)
    unsupported();
  const literal = rest.slice(0, end + 1);
  if (/[\n\r]/.test(literal))
    unsupported();
  return literal;
}

function readSymbol(rest: string): string {
  let end = 1;
  while (IDENTIFIER_PART.test(rest.charAt(end))) end += 1;
  while (rest.charAt(end) === '.' && IDENTIFIER_START.test(rest.charAt(end + 1))) {
    end += 1;
    while (IDENTIFIER_PART.test(rest.charAt(end))) end += 1;
  }
  return rest.slice(0, end);
}

function tokenize(source: string): { tokens: Token[]; comments: Comment[] } {
  const tokens: Token[] = [];
  const comments: Comment[] = [];
  const singleCharacterTokens: Record<string, TokenType> = {
    '(': 'open',
    ')': 'close',
    ',': 'comma',
    '?': 'question',
    ':': 'colon',
    '=': 'assign',
  };
  let position = 0;
  let lineHasCode = false;

  const push = (type: TokenType, text: string) => {
    tokens.push({ type, text });
    position += text.length;
    lineHasCode = true;
  };

  while (position < source.length) {
    const character = source.charAt(position);
    const rest = source.slice(position);

    if (character === '\n' || character === '\r') {
      lineHasCode = false;
      position += 1;
      continue;
    }
    if (character === ' ' || character === '\t' || character === NON_BREAKING_SPACE) {
      position += 1;
      continue;
    }
    if (character === '#') {
      const comment = /^[^\n\r]*/.exec(rest)?.[0] ?? '';
      comments.push({
        text: comment.trimEnd(),
        ownLine: !lineHasCode,
        before: tokens.length,
      });
      position += comment.length;
      continue;
    }
    if (character === '\'' || character === '"') {
      push('string', readStringLiteral(rest));
      continue;
    }

    const number = NUMBER_LITERAL.exec(rest)?.[0];
    if (number !== undefined) {
      // mathjs reads `0.*2` as `0 .* 2`, so re-spacing it to `0. * 2` would drop the element-wise
      // operator. Refuse instead, the same way a spaced `1 .* 2` is refused.
      if (number.endsWith('.') && ELEMENT_WISE_OPERATOR.test(rest.slice(number.length)))
        unsupported();
      push('number', number);
      continue;
    }
    if (IDENTIFIER_START.test(character)) {
      const symbol = readSymbol(rest);
      push(WORD_OPERATORS.includes(symbol)
        ? 'operator'
        : 'symbol', symbol);
      continue;
    }

    const operator = SYMBOL_OPERATORS.find(candidate => rest.startsWith(candidate));
    if (operator !== undefined) {
      push('operator', operator);
      continue;
    }

    const singleCharacterToken = singleCharacterTokens[character];
    if (singleCharacterToken === undefined)
      unsupported();
    push(singleCharacterToken, character);
  }

  return { tokens, comments };
}

/** Token types that can begin an operand, which tells a postfix percent from the modulo operator. */
function startsOperand(token: Token | undefined): boolean {
  if (token === undefined)
    return false;
  if (token.type === 'operator')
    return UNARY_OPERATORS.includes(token.text);
  return ['number', 'string', 'symbol', 'open'].includes(token.type);
}

function parseFormula(tokens: Token[], comments: Comment[]): FormulaNode {
  let index = 0;
  const pendingComments = new Set(comments);

  const current = (): Token | undefined => tokens[index];
  const at = (type: TokenType): boolean => current()?.type === type;
  const atOperator = (operators: string[]): boolean => {
    const token = current();
    return token?.type === 'operator' && operators.includes(token.text);
  };
  const take = (): Token => {
    const token = current();
    if (token === undefined)
      unsupported();
    index += 1;
    return token;
  };
  const expect = (type: TokenType): Token => {
    if (!at(type))
      unsupported();
    return take();
  };

  /**
   * An operand right behind another one, which mathjs multiplies. A leading `-` subtracts instead,
   * and a quote is mathjs' transpose operator once an operand precedes it - never a string literal -
   * so neither continues a product.
   */
  const atAdjacentOperand = (): boolean => {
    const token = current();
    return token !== undefined && ['number', 'symbol', 'open'].includes(token.type);
  };

  const commentsHere = (): Comment[] =>
    comments.filter(comment => comment.before === index && pendingComments.has(comment));

  const takeTrailingComment = (): Comment | undefined => {
    const [first] = commentsHere();
    if (first === undefined || first.ownLine)
      return undefined;
    pendingComments.delete(first);
    return first;
  };

  const takeOwnLineComments = (): Comment[] => {
    const taken: Comment[] = [];
    for (const comment of commentsHere()) {
      if (!comment.ownLine)
        break;
      pendingComments.delete(comment);
      taken.push(comment);
    }
    return taken;
  };

  function parseExpression(): FormulaNode {
    const leading = takeOwnLineComments();
    const node = parseAssignment();
    node.leading.unshift(...leading);
    return node;
  }

  function parseAssignment(): FormulaNode {
    const target = parseTernary();
    if (!at('assign'))
      return target;
    take();
    return makeNode({
      kind: 'assignment',
      target,
      value: parseExpression(),
    });
  }

  function parseTernary(): FormulaNode {
    const condition = parseChain(true, ['or'], () =>
      parseChain(true, ['xor'], () =>
        parseChain(true, ['and'], () =>
          parseChain(false, ['==', '!=', '<=', '>=', '<', '>'], () =>
            parseChain(false, ['to', 'in'], () => parseChain(true, ['+', '-'], parseProduct))))));
    if (!at('question'))
      return condition;
    const trueLeading = takeOwnLineComments();
    take();
    const whenTrue = parseExpression();
    const falseLeading = takeOwnLineComments();
    expect('colon');
    return makeNode({
      kind: 'ternary',
      condition,
      whenTrue,
      whenFalse: parseExpression(),
      trueLeading,
      falseLeading,
    });
  }

  function parseChain(
    breakable: boolean,
    operators: string[],
    parseOperand: () => FormulaNode,
    joinsAdjacentOperands = false,
  ): FormulaNode {
    const continues = () => atOperator(operators) || (joinsAdjacentOperands && atAdjacentOperand());
    const first = parseOperand();
    if (!continues())
      return first;
    const parts: ChainPart[] = [];
    while (continues()) {
      const leading = takeOwnLineComments();
      const operator = atOperator(operators)
        ? take().text
        : IMPLICIT_MULTIPLICATION;
      parts.push({
        leading,
        operator,
        operand: parseOperand(),
      });
    }
    return makeNode({
      kind: 'chain',
      breakable,
      first,
      parts,
    });
  }

  /**
   * A product chain, in which mathjs also multiplies two adjacent operands (`2 (a + b)`, `2 x`).
   * It binds such an omitted sign tighter than a written one, so this flat chain groups differently
   * than mathjs does - which decides nothing but where lines break, because the printer joins the
   * operands with the space they were written with rather than with a `*` of its own.
   */
  function parseProduct(): FormulaNode {
    return parseChain(false, ['*', '/', 'mod', '%'], parseUnary, true);
  }

  function parseUnary(): FormulaNode {
    if (!atOperator(UNARY_OPERATORS))
      return parsePower();
    const operator = take().text;
    return makeNode({
      kind: 'unary',
      operator,
      operand: parseUnary(),
    });
  }

  function parsePower(): FormulaNode {
    const base = parseNullishCoalescing();
    if (!atOperator(['^']))
      return base;
    take();
    return makeNode({
      kind: 'power',
      base,
      exponent: parseUnary(),
    });
  }

  /** mathjs binds `??` tighter than `^` and a unary sign: `$a + $b ?? 0` is `$a + ($b ?? 0)`. */
  function parseNullishCoalescing(): FormulaNode {
    return parseChain(false, ['??'], parsePostfix);
  }

  function parsePostfix(): FormulaNode {
    let node = parsePrimary();
    if (atOperator(['%']) && !startsOperand(tokens[index + 1])) {
      take();
      node = makeNode({ kind: 'percent', operand: node });
    }
    node.trailing = takeTrailingComment();
    return node;
  }

  function parsePrimary(): FormulaNode {
    if (at('open')) {
      take();
      const inner = parseExpression();
      expect('close');
      return makeNode({ kind: 'group', inner });
    }
    if (at('number') || at('string'))
      return makeNode({ kind: 'atom', text: take().text });
    if (!at('symbol'))
      unsupported();

    const name = take().text;
    if (!at('open'))
      return makeNode({ kind: 'atom', text: name });
    take();
    const args: FormulaNode[] = [];
    if (!at('close')) {
      args.push(parseExpression());
      while (at('comma')) {
        take();
        args.push(parseExpression());
      }
    }
    expect('close');
    return makeNode({ kind: 'call', callee: name, args });
  }

  const root = parseExpression();
  // Leftover tokens mean the formula uses syntax outside the supported subset - a range colon, an
  // unbalanced parenthesis - and comments the parser could not attach would have to move across a
  // token to be printed.
  if (index !== tokens.length || pendingComments.size > 0)
    unsupported();
  return root;
}

/** What joins a chain part to what precedes it: an omitted `*` is the space between two operands. */
function chainSeparator(operator: string) {
  return operator === IMPLICIT_MULTIPLICATION
    ? ' '
    : ` ${operator} `;
}

/** The one-line form of a node, or `null` when it contains a comment that has to end a line. */
function flatShape(node: FormulaNode): string | null {
  switch (node.kind) {
    case 'atom':
      return node.text;
    case 'group': {
      const inner = flatText(node.inner);
      return inner === null
        ? null
        : `(${inner})`;
    }
    case 'call': {
      const args = node.args.map(flatText);
      return args.every(argument => argument !== null)
        ? `${node.callee}(${args.join(', ')})`
        : null;
    }
    case 'chain': {
      let text = flatText(node.first);
      for (const part of node.parts) {
        const operand = text === null || part.leading.length > 0
          ? null
          : flatText(part.operand);
        text = operand === null
          ? null
          : `${text}${chainSeparator(part.operator)}${operand}`;
      }
      return text;
    }
    case 'power': {
      const base = flatText(node.base);
      const exponent = flatText(node.exponent);
      return base === null || exponent === null
        ? null
        : `${base} ^ ${exponent}`;
    }
    case 'unary': {
      const operand = flatText(node.operand);
      return operand === null
        ? null
        : `${unaryPrefix(node)}${operand}`;
    }
    case 'percent': {
      const operand = flatText(node.operand);
      return operand === null
        ? null
        : `${operand}%`;
    }
    case 'ternary': {
      const condition = flatText(node.condition);
      const whenTrue = flatText(node.whenTrue);
      const whenFalse = flatText(node.whenFalse);
      if (node.trueLeading.length > 0 || node.falseLeading.length > 0)
        return null;
      if (condition === null || whenTrue === null || whenFalse === null)
        return null;
      return `${condition} ? ${whenTrue} : ${whenFalse}`;
    }
    case 'assignment': {
      const target = flatText(node.target);
      const value = flatText(node.value);
      return target === null || value === null
        ? null
        : `${target} = ${value}`;
    }
  }
}

/** The one-line form a parent can embed: a comment of its own would have to end the line. */
function flatText(node: FormulaNode): string | null {
  return node.trailing || node.leading.length > 0
    ? null
    : flatShape(node);
}

/**
 * `not` reads as a word and needs a space, unless its operand brings its own parenthesis. A stacked
 * unary operator keeps a space too, so that `- -3` does not collapse into a decrement-looking `--3`.
 */
function unaryPrefix(node: NodeShape & { kind: 'unary' }): string {
  if (node.operand.kind === 'unary')
    return `${node.operator} `;
  if (node.operator !== 'not')
    return node.operator;
  return node.operand.kind === 'group'
    ? 'not'
    : 'not ';
}

/**
 * The printed lines of one construct. The first line carries no indentation - the caller writes it
 * behind its own prefix - while every following line is indented already.
 */
type Block = { lines: string[]; startsWithComment: boolean; endsWithComment: boolean };

const indent = (level: number) => INDENTATION.repeat(level);

function oneLine(text: string): Block {
  return {
    lines: [text],
    startsWithComment: false,
    endsWithComment: false,
  };
}

const commentLines = (comments: Comment[], level: number) => comments.map(comment => indent(level) + comment.text);

/** Comment lines whose first one stays unindented, so they can head a block. */
function headingCommentLines(comments: Comment[], level: number) {
  return comments.map((comment, position) => (position === 0
    ? comment.text
    : indent(level) + comment.text));
}

/** Indents a block's first line too, to embed it as a line of its own. */
function place(child: Block, level: number, prefix: string): string[] {
  if (prefix !== '' && child.startsWithComment)
    unsupported();
  const [head = '', ...rest] = child.lines;
  return [indent(level) + prefix + head, ...rest];
}

function appendToLastLine(lines: string[], suffix: string): string[] {
  return [
    ...lines.slice(0, -1),
    (lines.at(-1) ?? '') + suffix,
  ];
}

/** Continues the last line of `lines` with a separator and the block that follows it. */
function continueLine(lines: string[], separator: string, next: Block): string[] {
  if (next.startsWithComment)
    unsupported();
  const [head = '', ...rest] = next.lines;
  return [
    ...appendToLastLine(lines, separator + head),
    ...rest,
  ];
}

/** The column right behind a block, given where its first line starts. */
function endColumn(lines: string[], level: number, prefixColumns: number): number {
  if (lines.length > 1)
    return (lines.at(-1) ?? '').length;
  return indent(level).length + prefixColumns + (lines[0] ?? '').length;
}

function printNode(node: FormulaNode, level: number, prefixColumns: number): Block {
  if (node.leading.length === 0)
    return printWithoutLeadingComments(node, level, prefixColumns);
  // The comments stand on their own lines before the node, so anything the caller has already
  // written on the first line would end up behind them - which reorders the formula.
  if (prefixColumns > 0)
    unsupported();
  const body = printWithoutLeadingComments(node, level, 0);
  return {
    lines: [
      ...headingCommentLines(node.leading, level),
      ...place(body, level, ''),
    ],
    startsWithComment: true,
    endsWithComment: body.endsWithComment,
  };
}

function printWithoutLeadingComments(node: FormulaNode, level: number, prefixColumns: number): Block {
  const trailing = node.trailing
    ? ` ${node.trailing.text}`
    : '';
  const flat = flatShape(node);
  if (flat !== null && indent(level).length + prefixColumns + flat.length <= PRINT_WIDTH) {
    return {
      lines: [flat + trailing],
      startsWithComment: false,
      endsWithComment: trailing !== '',
    };
  }

  const broken = printBroken(node, level, prefixColumns);
  if (trailing === '')
    return broken;
  if (broken.endsWithComment)
    unsupported();
  return {
    ...broken,
    lines: appendToLastLine(broken.lines, trailing),
    endsWithComment: true,
  };
}

function printBroken(node: FormulaNode, level: number, prefixColumns: number): Block {
  switch (node.kind) {
    case 'atom':
      return oneLine(node.text);
    case 'group': {
      const inner = printNode(node.inner, level + 1, 0);
      return {
        lines: [
          '(',
          ...place(inner, level + 1, ''),
          `${indent(level)})`,
        ],
        startsWithComment: false,
        endsWithComment: false,
      };
    }
    case 'call': {
      const lines = [`${node.callee}(`];
      node.args.forEach((argument, position) => {
        const printed = printNode(argument, level + 1, 0);
        // mathjs rejects a trailing comma, so only the arguments before the last one get one.
        const isLast = position === node.args.length - 1;
        if (!isLast && printed.endsWithComment)
          unsupported();
        const placed = place(printed, level + 1, '');
        lines.push(...(isLast
          ? placed
          : appendToLastLine(placed, ',')));
      });
      lines.push(`${indent(level)})`);
      return { lines, startsWithComment: false, endsWithComment: false };
    }
    case 'chain':
      return node.breakable
        ? printBrokenChain(node, level, prefixColumns)
        : printGluedChain(node, level, prefixColumns);
    case 'power': {
      const separator = ' ^ ';
      const base = printNode(node.base, level, prefixColumns);
      if (base.endsWithComment)
        unsupported();
      const exponentColumns = endColumn(base.lines, level, prefixColumns) + separator.length - indent(level).length;
      const exponent = printNode(node.exponent, level, exponentColumns);
      return {
        lines: continueLine(base.lines, separator, exponent),
        startsWithComment: base.startsWithComment,
        endsWithComment: exponent.endsWithComment,
      };
    }
    case 'unary': {
      const prefix = unaryPrefix(node);
      const operand = printNode(node.operand, level, prefixColumns + prefix.length);
      if (operand.startsWithComment)
        unsupported();
      const [head = '', ...rest] = operand.lines;
      return {
        ...operand,
        lines: [prefix + head, ...rest],
        startsWithComment: false,
      };
    }
    case 'percent': {
      const operand = printNode(node.operand, level, prefixColumns);
      if (operand.endsWithComment)
        unsupported();
      return {
        ...operand,
        lines: appendToLastLine(operand.lines, '%'),
      };
    }
    case 'ternary': {
      const condition = printNode(node.condition, level, prefixColumns);
      const whenTrue = printNode(node.whenTrue, level + 1, 2);
      const whenFalse = printNode(node.whenFalse, level + 1, 2);
      return {
        lines: [
          ...condition.lines,
          ...commentLines(node.trueLeading, level + 1),
          ...place(whenTrue, level + 1, '? '),
          ...commentLines(node.falseLeading, level + 1),
          ...place(whenFalse, level + 1, ': '),
        ],
        startsWithComment: condition.startsWithComment,
        endsWithComment: whenFalse.endsWithComment,
      };
    }
    case 'assignment': {
      const target = printNode(node.target, level, prefixColumns);
      if (target.endsWithComment)
        unsupported();
      const value = printNode(node.value, level + 1, 0);
      return {
        lines: [
          ...appendToLastLine(target.lines, ' ='),
          ...place(value, level + 1, ''),
        ],
        startsWithComment: target.startsWithComment,
        endsWithComment: value.endsWithComment,
      };
    }
  }
}

/** A sum or boolean chain: every operand on its own line, opened by the operator that joins it. */
function printBrokenChain(node: NodeShape & { kind: 'chain' }, level: number, prefixColumns: number): Block {
  const first = printNode(node.first, level, prefixColumns);
  const lines = [...first.lines];
  let endsWithComment = first.endsWithComment;
  for (const part of node.parts) {
    const prefix = chainSeparator(part.operator).trimStart();
    const operand = printNode(part.operand, level, prefix.length);
    lines.push(...commentLines(part.leading, level), ...place(operand, level, prefix));
    endsWithComment = operand.endsWithComment;
  }
  return { lines, startsWithComment: first.startsWithComment, endsWithComment };
}

/** A product, comparison or conversion chain: it stays on its line, only its operands may break. */
function printGluedChain(node: NodeShape & { kind: 'chain' }, level: number, prefixColumns: number): Block {
  const first = printNode(node.first, level, prefixColumns);
  let lines = [...first.lines];
  let columns = endColumn(first.lines, level, prefixColumns);
  let endsWithComment = first.endsWithComment;
  for (const part of node.parts) {
    if (endsWithComment || part.leading.length > 0)
      unsupported();
    const separator = chainSeparator(part.operator);
    const operandColumns = columns + separator.length - indent(level).length;
    const operand = printNode(part.operand, level, operandColumns);
    lines = continueLine(lines, separator, operand);
    columns = endColumn(operand.lines, level, operandColumns);
    endsWithComment = operand.endsWithComment;
  }
  return { lines, startsWithComment: first.startsWithComment, endsWithComment };
}

function printFormula(node: FormulaNode): string {
  return printNode(node, 0, 0).lines.join('\n');
}

/**
 * Parses the formula the way the evaluator does: without its comments, line by line, because a comment
 * would otherwise run on into the next line - a comment inside parentheses would swallow the closing one.
 */
function mathjsAccepts(engine: Pick<FormulaEngine, 'math'>, formula: string): boolean {
  try {
    engine.math.parse(normalizeFormula(formula));
    return true;
  }
  catch {
    return false;
  }
}

/** The printed form of a formula, or `null` when the formatter refuses to touch it. */
function printedForm(engine: Pick<FormulaEngine, 'math'>, formula: string): string | null {
  if (!mathjsAccepts(engine, formula))
    return null;
  try {
    const { tokens, comments } = tokenize(formula);
    return printFormula(parseFormula(tokens, comments));
  }
  catch {
    return null;
  }
}

/**
 * Reformats a formula, changing only the whitespace between its tokens: one space around binary
 * operators, and lines broken at 80 columns, with sums and boolean chains one operand per line and
 * the branches of conditions indented. A formula mathjs cannot parse, or one using
 * syntax outside the supported subset, is returned unchanged.
 *
 * A product that omits its `*` (`2 (a + b)`) is laid out like any other, and keeps the sign it was
 * written with: adding one would regroup the product around it - mathjs binds an omitted sign
 * tighter than a written one - and would rewrite a mistyped `$item.quanti ty` into a product that
 * reads deliberate.
 */
export function formatFormula(engine: Pick<FormulaEngine, 'math'>, formula: string): string {
  return printedForm(engine, formula) ?? formula;
}

/**
 * Whether the formatter can print this formula, which tells a formula that is already in printed
 * form from one `formatFormula` refuses - both of which it returns unchanged.
 */
export function canFormatFormula(engine: Pick<FormulaEngine, 'math'>, formula: string): boolean {
  return printedForm(engine, formula) !== null;
}
