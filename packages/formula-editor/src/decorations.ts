import type { Analysis, Diagnostic, TokenType } from '@former-ui/formula';
import type { Node } from '@tiptap/pm/model';
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { docToText, offsetToPos } from './text';

/** The classes of the tokens of a formula, the ones without a class aren't highlighted. */
export const TOKEN_CLASSES: Partial<Record<TokenType, string>> = {
  variable: 'text-primary font-medium',
  identifier: 'text-sky-700 dark:text-sky-400',
  number: 'text-amber-700 dark:text-amber-400',
  string: 'text-emerald-700 dark:text-emerald-400',
  comment: 'text-zinc-400 italic',
  operator: 'text-zinc-500',
};

export const DIAGNOSTIC_CLASSES: Record<Diagnostic['severity'], string> = {
  error: 'underline decoration-wavy decoration-red-500 underline-offset-4',
  warning: 'underline decoration-wavy decoration-amber-500 underline-offset-4',
};

/** The decorations of the tokens and diagnostics of the analysis of the text of the document. */
export function formulaDecorations(doc: Node, analysis: Analysis): DecorationSet {
  const decorations: Decoration[] = [];
  const inline = (from: number, to: number, attrs: Record<string, string>) => {
    if (to > from) {
      // ranges spanning line breaks are split into the paragraphs by ProseMirror
      decorations.push(Decoration.inline(offsetToPos(doc, from), offsetToPos(doc, to), attrs));
    }
  };
  for (const token of analysis.tokens) {
    const tokenClass = TOKEN_CLASSES[token.type];
    if (tokenClass) {
      inline(token.from, token.to, { 'class': tokenClass, 'data-token': token.type });
    }
  }
  for (const diagnostic of analysis.diagnostics) {
    inline(diagnostic.from, diagnostic.to, { 'class': DIAGNOSTIC_CLASSES[diagnostic.severity], 'data-diagnostic': diagnostic.severity });
  }
  return DecorationSet.create(doc, decorations);
}

export const formulaDecorationsKey = new PluginKey<DecorationSet>('formulaDecorations');

/** Meta of a transaction to decorate the formula again, e.g. after its variables changed. */
export const REFRESH_DECORATIONS = 'refresh';

export type FormulaDecorationsOptions = {
  analyze: (text: string) => Analysis;
};

/** Highlights the tokens of the formula and underlines its errors and warnings. */
export const FormulaDecorations = Extension.create<FormulaDecorationsOptions>({
  name: 'formulaDecorations',

  addOptions() {
    return {
      analyze: () => ({
        ok: true,
        tokens: [],
        references: [],
        diagnostics: [],
        inferredType: 'unknown',
      }),
    };
  },

  addProseMirrorPlugins() {
    const decorate = (doc: Node) => formulaDecorations(doc, this.options.analyze(docToText(doc)));
    return [
      new Plugin<DecorationSet>({
        key: formulaDecorationsKey,
        state: {
          init: (_, state) => decorate(state.doc),
          apply: (tr, decorations, _, state) => (tr.docChanged || tr.getMeta(formulaDecorationsKey) === REFRESH_DECORATIONS
            ? decorate(state.doc)
            : decorations),
        },
        props: {
          decorations: state => formulaDecorationsKey.getState(state),
        },
      }),
    ];
  },
});
