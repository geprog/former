<template>
  <div :id class="flex w-full flex-col gap-1" data-formula-editor>
    <label v-if="label" :id="labelId" class="block text-sm font-medium" @click="editor?.commands.focus()">
      {{ label }}<span v-if="required" class="ms-0.5 text-red-600 dark:text-red-400">*</span>
    </label>
    <p v-if="help" class="text-sm text-zinc-500">
      {{ help }}
    </p>
    <div
      class="relative w-full"
      :class="{ 'cursor-pointer [&_[data-token=variable]:hover]:underline': linkable }"
      @mousemove="showTooltip"
      @mouseleave="tooltip = undefined; linkable = false"
      @mousedown.capture="openVariableAt"
    >
      <EditorContent
        :editor
        class="w-full rounded-md border bg-white py-2 pl-3 pr-10 font-mono text-sm dark:bg-zinc-900 focus-within:border-primary [&_.ProseMirror]:min-h-[1.25rem] [&_.ProseMirror]:whitespace-pre-wrap [&_.ProseMirror]:outline-none [&_p]:m-0 [&_p.is-editor-empty:first-child]:before:pointer-events-none [&_p.is-editor-empty:first-child]:before:float-left [&_p.is-editor-empty:first-child]:before:h-0 [&_p.is-editor-empty:first-child]:before:text-zinc-400 [&_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]"
        :class="[error ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-600', { 'opacity-75': mode === 'read' }]"
      />
      <button
        v-if="mode !== 'read' && text.trim()"
        type="button"
        class="absolute right-1 top-1 flex size-7 cursor-pointer items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-primary dark:text-zinc-400 dark:hover:bg-zinc-800"
        :title="t('formula_format')"
        :aria-label="t('formula_format')"
        data-formula-format
        @mousedown.prevent="editor && format(editor)"
      >
        <!-- the sparkles icon of Heroicons (MIT, https://heroicons.com) -->
        <svg class="size-5" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09m8.445-7.188L18 9.75l-.259-1.035a3.38 3.38 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.38 3.38 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.38 3.38 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.38 3.38 0 0 0-2.456 2.456m-1.365 11.852L16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183l.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394l-1.183.394a2.25 2.25 0 0 0-1.423 1.423" />
        </svg>
      </button>

      <!-- in the body, so that no container of the editor cuts them off -->
      <Teleport to="body">
        <div
          v-if="completion && popupAnchor"
          ref="completionPopup"
          class="fixed z-50 flex max-h-72 w-80 max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-md border border-zinc-200 bg-white text-sm shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
          :style="completionStyle"
          role="listbox"
          data-formula-completion
        >
          <div class="overflow-y-auto">
            <button
              v-for="(item, index) in completion.items"
              :key="`${item.kind}:${item.label}`"
              type="button"
              role="option"
              :aria-selected="index === selected"
              class="flex w-full items-baseline gap-2 px-2 py-1 text-left"
              :class="index === selected ? 'bg-zinc-100 dark:bg-zinc-800' : ''"
              :data-selected="index === selected || undefined"
              @mousedown.prevent="accept(editor, index)"
              @mouseenter="selected = index"
            >
              <span class="w-4 shrink-0 text-center font-mono text-xs text-zinc-400">{{ KIND_SYMBOLS[item.kind] }}</span>
              <span class="font-mono" :class="TOKEN_CLASSES[item.kind === 'variable' ? 'variable' : 'identifier']">{{ item.label }}</span>
              <span v-if="item.detail" class="ml-auto truncate text-xs text-zinc-500">{{ item.detail }}</span>
            </button>
          </div>
          <div v-if="completion.items[selected]?.description" class="border-t border-zinc-200 px-2 py-1 text-xs text-zinc-500 dark:border-zinc-700">
            {{ completion.items[selected]?.description }}
          </div>
        </div>

        <div
          v-else-if="signature && popupAnchor"
          ref="signaturePopup"
          class="fixed z-40 max-w-[min(32rem,calc(100vw-1rem))] rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs shadow dark:border-zinc-700 dark:bg-zinc-900"
          :style="signatureStyle"
          data-formula-signature
        >
          <div class="font-mono">
            <span
              v-for="(part, index) in syntaxParts(signature.doc.syntax[0] ?? signature.doc.name, signature.argument)"
              :key="index"
              :class="{ 'font-bold text-primary': part.active }"
            >{{ part.text }}</span>
          </div>
          <div v-if="signature.doc.description" class="mt-1 text-zinc-500">
            {{ signature.doc.description }}
          </div>
        </div>

        <div
          v-if="tooltip"
          ref="tooltipPopup"
          class="pointer-events-none fixed z-50 max-w-sm rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs shadow dark:border-zinc-700 dark:bg-zinc-900"
          :style="tooltipStyle"
          data-formula-tooltip
        >
          <div v-for="(message, index) in tooltip.messages" :key="index" :class="message.severity === 'error' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'">
            {{ message.text }}
          </div>
          <template v-if="tooltip.info?.kind === 'variable'">
            <div class="font-mono" :class="TOKEN_CLASSES.variable">
              {{ engine.prefix }}{{ tooltip.info.variable.name }}
            </div>
            <div v-if="tooltip.info.variable.label">
              {{ tooltip.info.variable.label }}
            </div>
            <div v-if="tooltip.info.variable.description" class="text-zinc-500">
              {{ tooltip.info.variable.description }}
            </div>
            <div v-if="tooltip.info.variable.options?.length" class="text-zinc-500">
              {{ tooltip.info.variable.options.map(option => option.value).join(', ') }}
            </div>
            <div v-if="canOpen(tooltip.info.variable)" class="mt-1 text-zinc-400" data-formula-go-to-definition>
              {{ t('formula_go_to_definition', { key: isMac ? 'Cmd' : 'Ctrl' }) }}
            </div>
          </template>
          <template v-else-if="tooltip.info">
            <div v-for="syntax in tooltip.info.doc.syntax" :key="syntax" class="font-mono">
              {{ syntax }}
            </div>
            <div v-if="tooltip.info.doc.description" class="mt-1 text-zinc-500">
              {{ tooltip.info.doc.description }}
            </div>
          </template>
        </div>
      </Teleport>
    </div>
    <p v-if="formatRefused" class="text-xs text-zinc-500" data-formula-format-refused>
      {{ t('formula_format_refused') }}
    </p>
    <p v-if="error" class="text-sm text-red-600 dark:text-red-400" data-formula-error>
      {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
import type { VirtualElement } from '@floating-ui/dom';
import type { SchemaNode } from '@former-ui/former';
import type { Completion, CompletionKind, ExpectedType, FormulaVariable, HoverInfo, SignatureHelp } from '@former-ui/formula';
import type { Editor } from '@tiptap/core';
import { canFormatFormula, complete, diagnosticMessage, formatFormula, hover, signatureHelp, variableAt } from '@former-ui/formula';
import { useFormulaEditorContext } from '@former-ui/formula/vue';
import { Extension } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { Placeholder, UndoRedo } from '@tiptap/extensions';
import { Fragment, Slice } from '@tiptap/pm/model';
import { TextSelection } from '@tiptap/pm/state';
import { EditorContent, useEditor } from '@tiptap/vue-3';
import { computed, ref, shallowRef, useTemplateRef, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { FormulaDecorations, formulaDecorationsKey, REFRESH_DECORATIONS, TOKEN_CLASSES } from './decorations';
import { anchor, useFloating } from './floating';
import { docToText, offsetToPos, posToOffset, textToContent } from './text';

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  modelValue?: string | null;
  /** The type the formula has to evaluate to, e.g. `boolean` for a show if condition. */
  expect?: ExpectedType;
  placeholder?: string;
  mode?: string;
  id?: string;
  label?: string;
  help?: string;
  required?: boolean;
  /** The message of an invalid formula, e.g. of its validation in the form. */
  error?: string;
  /**
   * Opens the definition of a variable on Ctrl+click (Cmd+click on macOS), by default the field of a variable is
   * selected in the builder and the `href` of other variables is opened in a new tab.
   */
  onOpenVariable?: (variable: FormulaVariable) => void;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string | undefined];
}>();

const KIND_SYMBOLS: Record<CompletionKind, string> = {
  variable: '$',
  function: 'ƒ',
  constant: 'π',
  keyword: '⋯',
  option: '"',
};

const { t } = useI18n();
const { engine, sources, context, editedNode } = useFormulaEditorContext(() => props.expect);

const labelId = computed(() => `${props.id ?? 'formula'}-label`);
const text = ref(props.modelValue ?? '');
const analysis = computed(() => engine.analyze(text.value, context.value, { sources: sources.value }));

const completion = shallowRef<Completion>();
const selected = ref(0);
const signature = shallowRef<SignatureHelp>();
// where the completion or the signature is shown, at the cursor
const popupAnchor = shallowRef<VirtualElement>();
const completionStyle = useFloating(popupAnchor, useTemplateRef('completionPopup'));
const signatureStyle = useFloating(popupAnchor, useTemplateRef('signaturePopup'));
// whether the formula couldn't be formatted, until it changes
const formatRefused = ref(false);
const tooltip = shallowRef<{ messages: { severity: string; text: string }[]; info?: HoverInfo }>();
// the tooltip is shown below the mouse
const tooltipAnchor = shallowRef<VirtualElement>();
const tooltipStyle = useFloating(tooltipAnchor, useTemplateRef('tooltipPopup'), 16);
// accepting a completion changes the text, which mustn't open the completion for the inserted text again
let skipCompletion = false;
// the texts emitted as model value, which haven't come back as model value yet
const emitted: string[] = [];

/** The parts of the syntax of a function, e.g. `max(a, b)`, with the argument at `argument` marked as active. */
function syntaxParts(syntax: string, argument: number): { text: string; active: boolean }[] {
  const open = syntax.indexOf('(');
  const close = syntax.lastIndexOf(')');
  if (open === -1 || close < open) {
    return [
      { text: syntax, active: false },
    ];
  }
  const args = syntax.slice(open + 1, close).split(',');
  return [
    {
      text: syntax.slice(0, open + 1),
      active: false,
    },
    ...args.flatMap((arg, index) => [
      ...(index > 0
        ? [
            { text: ',', active: false },
          ]
        : []),
      { text: arg, active: index === Math.min(argument, args.length - 1) },
    ]),
    {
      text: syntax.slice(close),
      active: false,
    },
  ];
}

function cursorOffset(editor: Editor): number | undefined {
  const { selection, doc } = editor.state;
  return selection.empty
    ? posToOffset(doc, selection.from)
    : undefined;
}

// an anchor at a position of the text, which follows it while the page scrolls
function anchorAt(editor: Editor, pos: number): VirtualElement {
  const dom = editor.view.dom;
  return anchor(() => {
    try {
      if (!editor.isDestroyed) {
        const coords = editor.view.coordsAtPos(pos);
        return { left: coords.left, top: coords.top, height: coords.bottom - coords.top };
      }
    }
    catch {
      // e.g. while the editor isn't rendered, below the editor then
    }
    const rect = dom.getBoundingClientRect();
    return { left: rect.left, top: rect.bottom };
  }, dom);
}

function updateCompletion(editor: Editor, explicit = false) {
  const offset = cursorOffset(editor);
  const result = offset === undefined
    ? undefined
    : complete(engine, text.value, offset, context.value, { sources: sources.value, explicit });
  completion.value = result?.items.length
    ? result
    : undefined;
  selected.value = 0;
  if (completion.value) {
    popupAnchor.value = anchorAt(editor, offsetToPos(editor.state.doc, completion.value.from));
  }
}

function updateSignature(editor: Editor) {
  const offset = cursorOffset(editor);
  signature.value = offset === undefined
    ? undefined
    : signatureHelp(engine, text.value, offset, { sources: sources.value });
  if (signature.value && !completion.value) {
    popupAnchor.value = anchorAt(editor, editor.state.selection.from);
  }
}

const nonWhitespaceLength = (value: string) => value.replace(/\s/g, '').length;

/** Formatting only moves whitespace, so the cursor keeps its place among the other characters. */
function caretAfterFormatting(formatted: string, nonWhitespaceBefore: number): number {
  if (nonWhitespaceBefore === 0) {
    return 0;
  }
  let passed = 0;
  for (let index = 0; index < formatted.length; index++) {
    if (!/\s/.test(formatted.charAt(index))) {
      passed++;
      if (passed === nonWhitespaceBefore) {
        return index + 1;
      }
    }
  }
  return formatted.length;
}

/** Formats the formula as one change, which can be undone at once, or tells that it can't be formatted. */
function format(instance: Editor): boolean {
  const formula = text.value;
  if (!formula.trim()) {
    return false;
  }
  if (!canFormatFormula(engine, formula)) {
    formatRefused.value = true;
    return true;
  }
  const formatted = formatFormula(engine, formula);
  if (formatted !== formula) {
    const caret = caretAfterFormatting(formatted, nonWhitespaceLength(formula.slice(0, cursorOffset(instance) ?? formula.length)));
    const { schema, doc } = instance.state;
    const paragraphs = (textToContent(formatted).content ?? []).map(paragraph => schema.nodeFromJSON(paragraph));
    const tr = instance.state.tr.replaceWith(0, doc.content.size, paragraphs);
    tr.setSelection(TextSelection.create(tr.doc, offsetToPos(tr.doc, caret)));
    skipCompletion = true;
    instance.view.dispatch(tr);
  }
  instance.commands.focus();
  return true;
}

function accept(instance: Editor | undefined, index = selected.value) {
  const item = completion.value?.items[index];
  if (!instance || !item || !completion.value) {
    return false;
  }
  const { doc } = instance.state;
  const from = offsetToPos(doc, completion.value.from);
  const to = offsetToPos(doc, completion.value.to);
  const tr = instance.state.tr.insertText(item.insert, from, to);
  tr.setSelection(TextSelection.create(tr.doc, from + (item.cursor ?? item.insert.length)));
  skipCompletion = true;
  instance.view.dispatch(tr);
  instance.commands.focus();
  completion.value = undefined;
  return true;
}

// the keys navigating the completion while it is open, Ctrl+Space opens it
const CompletionKeys = Extension.create({
  name: 'formulaCompletionKeys',
  addKeyboardShortcuts() {
    const move = (step: number) => () => {
      const items = completion.value?.items.length;
      if (!items) {
        return false;
      }
      selected.value = (selected.value + step + items) % items;
      return true;
    };
    return {
      'ArrowDown': move(1),
      'ArrowUp': move(-1),
      'Enter': ({ editor: instance }) => !!completion.value && accept(instance),
      'Tab': ({ editor: instance }) => !!completion.value && accept(instance),
      'Escape': () => {
        if (!completion.value) {
          return false;
        }
        completion.value = undefined;
        return true;
      },
      'Alt-Shift-f': ({ editor: instance }) => format(instance),
      'Ctrl-Space': ({ editor: instance }) => {
        updateCompletion(instance, true);
        return true;
      },
    };
  },
});

const editor = useEditor({
  content: textToContent(text.value),
  editable: props.mode !== 'read',
  extensions: [
    Document,
    Paragraph,
    Text,
    UndoRedo,
    Placeholder.configure({
      placeholder: () => props.placeholder ?? '',
    }),
    // analyzes the text of the transaction, `text` is only updated after it
    FormulaDecorations.configure({
      analyze: value => engine.analyze(value, context.value, { sources: sources.value }),
    }),
    CompletionKeys,
  ],
  editorProps: {
    attributes: () => ({
      'spellcheck': 'false',
      'role': 'textbox',
      'aria-multiline': 'true',
      ...(props.label
        ? { 'aria-labelledby': labelId.value }
        : {}),
      ...(props.error
        ? { 'aria-invalid': 'true' }
        : {}),
      'data-formula-input': '',
    }),
    // pasted text is inserted as text, a paragraph per line
    handlePaste: (view, event) => {
      const pasted = event.clipboardData?.getData('text/plain');
      if (pasted === undefined) {
        return false;
      }
      const { schema } = view.state;
      const paragraphs = pasted.split(/\r?\n/).map(line => schema.nodes.paragraph!.create(null, line
        ? schema.text(line)
        : null));
      // open on both sides, so that the first and the last line join the lines around the selection
      view.dispatch(view.state.tr.replaceSelection(new Slice(Fragment.from(paragraphs), 1, 1)));
      return true;
    },
  },
  onUpdate: ({ editor: instance }) => {
    text.value = docToText(instance.state.doc);
    formatRefused.value = false;
    emitted.push(text.value);
    emit('update:modelValue', text.value === ''
      ? undefined
      : text.value);
    if (skipCompletion) {
      skipCompletion = false;
    }
    else {
      updateCompletion(instance);
    }
    updateSignature(instance);
  },
  onSelectionUpdate: ({ editor: instance, transaction }) => {
    if (!transaction.docChanged) {
      completion.value = undefined;
    }
    updateSignature(instance);
  },
  onBlur: () => {
    completion.value = undefined;
    signature.value = undefined;
  },
});

// the decorations are computed by the plugin from `analysis`, which also changes with the variables of the context
watch(analysis, () => {
  const instance = editor.value;
  if (instance && !instance.isDestroyed) {
    instance.view.dispatch(instance.state.tr.setMeta(formulaDecorationsKey, REFRESH_DECORATIONS));
  }
});

watch(() => props.modelValue, (value) => {
  const instance = editor.value;
  const newText = value ?? '';
  // the model value can come back after the text changed again (e.g. through the watchers of the form),
  // such an echo of an emitted text mustn't replace the current text
  const echo = emitted.indexOf(newText);
  if (echo !== -1) {
    emitted.splice(0, echo + 1);
    return;
  }
  if (instance && newText !== text.value) {
    text.value = newText;
    instance.commands.setContent(textToContent(text.value), { emitUpdate: false });
  }
});

// the attributes of the input (e.g. `aria-invalid`) are only read when the view is updated
watch(() => [props.error, props.label], () => {
  editor.value?.view.setProps({});
});

watch(() => props.mode, (mode) => {
  editor.value?.setEditable(mode !== 'read');
});

const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);
// whether the variable under the mouse can be opened with the pressed Ctrl (or Cmd) key
const linkable = ref(false);

function canOpen(variable: FormulaVariable): boolean {
  return !!props.onOpenVariable || !!(variable.node && editedNode.value?.select) || !!variable.href;
}

function openVariable(variable: FormulaVariable) {
  if (props.onOpenVariable) {
    props.onOpenVariable(variable);
  }
  else if (variable.node && editedNode.value?.select) {
    editedNode.value.select(variable.node as SchemaNode);
  }
  else if (variable.href) {
    window.open(variable.href, '_blank', 'noopener');
  }
}

/** The variable under the mouse, which can be opened. */
function openableVariableAt(event: MouseEvent): FormulaVariable | undefined {
  const instance = editor.value;
  const pos = instance?.view.posAtCoords({ left: event.clientX, top: event.clientY });
  if (!instance || !pos) {
    return undefined;
  }
  const variable = variableAt(engine, text.value, posToOffset(instance.state.doc, pos.pos), context.value);
  return variable && canOpen(variable)
    ? variable
    : undefined;
}

function openVariableAt(event: MouseEvent) {
  if (!event.ctrlKey && !event.metaKey) {
    return;
  }
  const variable = openableVariableAt(event);
  if (variable) {
    event.preventDefault();
    event.stopPropagation();
    openVariable(variable);
  }
}

function showTooltip(event: MouseEvent) {
  linkable.value = (event.ctrlKey || event.metaKey) && !!openableVariableAt(event);
  const instance = editor.value;
  const pos = instance?.view.posAtCoords({ left: event.clientX, top: event.clientY });
  if (!instance || !pos) {
    tooltip.value = undefined;
    return;
  }
  const offset = posToOffset(instance.state.doc, pos.pos);
  const messages = analysis.value.diagnostics
    .filter(diagnostic => diagnostic.from <= offset && offset < diagnostic.to)
    .map(diagnostic => ({
      severity: diagnostic.severity,
      text: diagnosticMessage(diagnostic, engine, (key, named) => t(key, named ?? {})),
    }));
  const info = hover(engine, text.value, offset, context.value, { sources: sources.value });
  const { clientX, clientY } = event;
  tooltipAnchor.value = anchor(() => ({ left: clientX, top: clientY }));
  tooltip.value = messages.length || info
    ? {
        messages,
        ...(info
          ? { info }
          : {}),
      }
    : undefined;
}

defineExpose({ editor });
</script>
