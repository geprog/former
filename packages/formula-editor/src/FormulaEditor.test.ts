import { createFormulaEngine, valueSource } from '@former-ui/formula';
import formulaEn from '@former-ui/formula/en.json';
import { provideFormulaEngine, provideFormulaSources } from '@former-ui/formula/vue';
import { DOMWrapper, flushPromises, mount } from '@vue/test-utils';
import { all, create } from 'mathjs';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { createI18n } from 'vue-i18n';
import FormulaEditor from './FormulaEditor.vue';

const engine = createFormulaEngine({
  math: create(all),
});

// the popups are rendered in the body
const body = () => new DOMWrapper(document.body);

function mountEditor(initial: string, variables: Record<string, unknown> = { number: 1, choice: 'red' }, fieldProps: Record<string, unknown> = {}) {
  const value = ref<string | undefined>(initial);
  const editorRef = ref<InstanceType<typeof FormulaEditor>>();
  const Host = defineComponent({
    setup() {
      provideFormulaEngine(engine);
      provideFormulaSources([
        valueSource({ id: 'values', values: variables }),
      ]);
      return () => h(FormulaEditor, {
        ...fieldProps,
        'ref': editorRef,
        'modelValue': value.value,
        'onUpdate:modelValue': (newValue: string | undefined) => value.value = newValue,
      });
    },
  });
  const i18n = createI18n({
    legacy: false,
    locale: 'en',
    messages: { en: formulaEn },
  });
  const wrapper = mount(Host, {
    global: {
      plugins: [i18n],
    },
    attachTo: document.body,
  });
  const editor = () => editorRef.value!.editor!;
  return { wrapper, value, editor };
}

describe('formulaEditor', () => {
  it('highlights the tokens and underlines errors', async () => {
    const { wrapper } = mountEditor('$number + nope(1)');
    await flushPromises();
    expect(wrapper.find('[data-token="variable"]').text()).toBe('$number');
    expect(wrapper.find('[data-token="number"]').text()).toBe('1');
    expect(wrapper.find('[data-diagnostic="error"]').text()).toBe('nope');
    wrapper.unmount();
  });

  it('keeps the text and the model value in sync, with a paragraph per line', async () => {
    const { wrapper, value, editor } = mountEditor('1 +\n2');
    await flushPromises();
    expect(wrapper.findAll('[data-formula-input] p').map(p => p.text())).toEqual(['1 +', '2']);

    editor().commands.insertContentAt(editor().state.doc.content.size - 1, ' + $number');
    await nextTick();
    expect(value.value).toBe('1 +\n2 + $number');

    value.value = '$choice';
    await nextTick();
    expect(wrapper.find('[data-formula-input]').text()).toBe('$choice');

    editor().commands.clearContent(true);
    await nextTick();
    expect(value.value).toBeUndefined();
    wrapper.unmount();
  });

  it('completes variables while typing and inserts the selected one', async () => {
    const { wrapper, value, editor } = mountEditor('');
    await flushPromises();
    editor().commands.focus();
    editor().commands.insertContent('$ch');
    await nextTick();
    // the options show the kind of the item (`$` for variables) before its label
    expect(body().findAll('[data-formula-completion] [role="option"] .font-mono:nth-child(2)').map(option => option.text())).toEqual(['$choice']);

    await body().find('[data-formula-completion] [role="option"]').trigger('mousedown');
    await nextTick();
    expect(value.value).toBe('$choice');
    expect(body().find('[data-formula-completion]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('completes functions and puts the cursor between their brackets', async () => {
    const { wrapper, value, editor } = mountEditor('');
    await flushPromises();
    editor().commands.focus();
    editor().commands.insertContent('sq');
    await nextTick();
    const sqrt = body().findAll('[data-formula-completion] [role="option"]').find(option => option.text().includes('sqrt('));
    await sqrt!.trigger('mousedown');
    await nextTick();
    expect(value.value).toBe('sqrt()');
    expect(editor().state.selection.from).toBe(6);
    // the signature of the function is shown while the cursor is in its arguments
    expect(body().find('[data-formula-signature]').text()).toContain('sqrt(x)');
    wrapper.unmount();
  });
});

describe('formulaEditor paste', () => {
  it('pastes text as text, a line per paragraph', async () => {
    const { wrapper, value, editor } = mountEditor('a + ');
    await flushPromises();
    editor().commands.focus('end');
    const event = new Event('paste', { bubbles: true, cancelable: true }) as ClipboardEvent;
    Object.defineProperty(event, 'clipboardData', {
      value: {
        getData: (type: string) => (type === 'text/plain'
          ? '<b>1</b>\n2'
          : ''),
      },
    });
    editor().view.dom.dispatchEvent(event);
    await nextTick();
    expect(value.value).toBe('a + <b>1</b>\n2');
    wrapper.unmount();
  });
});

describe('formulaEditor model value', () => {
  it('ignores model values coming back after the text changed again', async () => {
    const { wrapper, value, editor } = mountEditor('');
    await flushPromises();
    editor().commands.focus();
    editor().commands.insertContent('a');
    editor().commands.insertContent('b');
    expect(value.value).toBe('ab');
    // the echo of the first change arrives late
    value.value = 'a';
    await nextTick();
    value.value = 'ab';
    await nextTick();
    expect(editor().getText()).toBe('ab');
    expect(editor().state.selection.from).toBe(3);

    // a change from outside still replaces the text
    value.value = 'c';
    await nextTick();
    expect(editor().getText()).toBe('c');
    wrapper.unmount();
  });
});

describe('formulaEditor decorations', () => {
  it('decorates the text of the change itself, not the one before', async () => {
    const { wrapper, editor } = mountEditor('1 + ');
    await flushPromises();
    editor().commands.focus('end');
    editor().commands.insertContent('m');
    // right after the change, before any update of the component
    expect(wrapper.find('[data-token="identifier"]').text()).toBe('m');
    wrapper.unmount();
  });
});

describe('formulaEditor field', () => {
  it('renders the label, help text and error of the field', async () => {
    const { wrapper, editor } = mountEditor('', {}, {
      id: 'max',
      label: 'Maximum',
      help: 'The largest value',
      required: true,
      error: 'Unknown variable',
    });
    await flushPromises();
    expect(wrapper.find('label').text()).toBe('Maximum*');
    expect(wrapper.find('[data-formula-editor]').text()).toContain('The largest value');
    expect(wrapper.find('[data-formula-error]').text()).toBe('Unknown variable');
    expect(wrapper.find('[data-formula-input]').attributes()).toMatchObject({
      'role': 'textbox',
      'aria-labelledby': 'max-label',
      'aria-invalid': 'true',
    });

    await wrapper.find('label').trigger('click');
    // tiptap focuses in the next frame
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(document.activeElement).toBe(editor().view.dom);
    wrapper.unmount();
  });

  it('renders only the input without label and error', async () => {
    const { wrapper } = mountEditor('');
    await flushPromises();
    expect(wrapper.find('label').exists()).toBe(false);
    expect(wrapper.find('[data-formula-error]').exists()).toBe(false);
    expect(wrapper.find('[data-formula-input]').attributes('aria-invalid')).toBeUndefined();
    wrapper.unmount();
  });
});

describe('formulaEditor formatting', () => {
  it('formats the formula, keeps the cursor among the same characters and undoes it at once', async () => {
    const { wrapper, value, editor } = mountEditor('$number+max( 1,2 )');
    await flushPromises();
    // the cursor after `max(`
    editor().commands.setTextSelection(13);
    await wrapper.find('[data-formula-format]').trigger('mousedown');
    await nextTick();
    expect(value.value).toBe('$number + max(1, 2)');
    expect(editor().state.selection.from).toBe(15);

    editor().commands.undo();
    await nextTick();
    expect(value.value).toBe('$number+max( 1,2 )');
    wrapper.unmount();
  });

  it('breaks long formulas into lines', async () => {
    const long = `${'$'}${'a'.repeat(40)} + ${'$'}${'b'.repeat(40)}`;
    const { wrapper, value, editor } = mountEditor(long);
    await flushPromises();
    editor().commands.focus();
    editor().view.dom.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'F',
      code: 'KeyF',
      keyCode: 70,
      altKey: true,
      shiftKey: true,
      bubbles: true,
    }));
    await nextTick();
    expect(value.value).toBe(`${'$'}${'a'.repeat(40)}\n+ ${'$'}${'b'.repeat(40)}`);
    expect(wrapper.findAll('[data-formula-input] p')).toHaveLength(2);
    wrapper.unmount();
  });

  it('tells when the formula can\'t be formatted until it changes', async () => {
    const { wrapper, value, editor } = mountEditor('$number +');
    await flushPromises();
    await wrapper.find('[data-formula-format]').trigger('mousedown');
    await nextTick();
    expect(value.value).toBe('$number +');
    expect(wrapper.find('[data-formula-format-refused]').text()).toBe('The formula can\'t be formatted');

    editor().commands.insertContentAt(editor().state.doc.content.size - 1, ' 1');
    await nextTick();
    expect(wrapper.find('[data-formula-format-refused]').exists()).toBe(false);
    wrapper.unmount();
  });
});

describe('formulaEditor go to definition', () => {
  // happy-dom has no layout, so the position under the mouse is given
  function stubPosition(editor: ReturnType<ReturnType<typeof mountEditor>['editor']>, pos: number) {
    editor.view.posAtCoords = () => ({ pos, inside: -1 });
  }

  it('opens the variable under the mouse on Ctrl+click', async () => {
    const opened: unknown[] = [];
    const { wrapper, editor } = mountEditor('1 + $number', { number: 1 }, {
      onOpenVariable: (variable: unknown) => opened.push(variable),
    });
    await flushPromises();
    stubPosition(editor(), 7);
    const root = wrapper.find('[data-formula-editor] > div.relative');
    await root.trigger('mousedown', { ctrlKey: true });
    expect(opened).toMatchObject([
      { name: 'number' },
    ]);

    // without Ctrl, a click places the cursor as usual
    await root.trigger('mousedown');
    expect(opened).toHaveLength(1);

    // the hint is shown when hovering it
    await root.trigger('mousemove', { ctrlKey: true });
    expect(body().find('[data-formula-go-to-definition]').text()).toMatch(/^(Ctrl|Cmd)\+click to go to its definition$/);
    expect(root.classes()).toContain('cursor-pointer');
    wrapper.unmount();
  });

  it('opens the href of a variable in a new tab without handler', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    const value = ref<string | undefined>('$docs');
    const editorRef = ref<InstanceType<typeof FormulaEditor>>();
    const Host = defineComponent({
      setup() {
        provideFormulaEngine(engine);
        provideFormulaSources([
          valueSource({
            id: 'docs',
            values: { docs: 1 },
            variables: [
              { name: 'docs', type: 'number', href: 'https://example.com/docs' },
            ],
          }),
        ]);
        return () => h(FormulaEditor, {
          'ref': editorRef,
          'modelValue': value.value,
          'onUpdate:modelValue': (newValue: string | undefined) => value.value = newValue,
        });
      },
    });
    const wrapper = mount(Host, {
      global: {
        plugins: [
          createI18n({
            legacy: false,
            locale: 'en',
            messages: { en: formulaEn },
          }),
        ],
      },
      attachTo: document.body,
    });
    await flushPromises();
    editorRef.value!.editor!.view.posAtCoords = () => ({ pos: 2, inside: -1 });
    await wrapper.find('[data-formula-editor] > div.relative').trigger('mousedown', { metaKey: true });
    expect(open).toHaveBeenCalledWith('https://example.com/docs', '_blank', 'noopener');
    open.mockRestore();
    wrapper.unmount();
  });
});

describe('formulaEditor accessibility', () => {
  it('tells screen readers about the completion and the option selected with the keys', async () => {
    const { wrapper, editor } = mountEditor('', { number: 1, choice: 'red' }, { id: 'max' });
    await flushPromises();
    const input = () => wrapper.find('[data-formula-input]');
    expect(input().attributes()).toMatchObject({ 'role': 'textbox', 'aria-autocomplete': 'list' });
    expect(input().attributes('aria-activedescendant')).toBeUndefined();

    editor().commands.focus();
    editor().commands.insertContent('$');
    await nextTick();
    expect(body().find('[data-formula-completion]').attributes('id')).toBe('max-completion');
    expect(input().attributes()).toMatchObject({ 'aria-controls': 'max-completion', 'aria-activedescendant': 'max-option-0' });

    editor().view.dom.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await nextTick();
    expect(input().attributes('aria-activedescendant')).toBe('max-option-1');
    expect(body().find('#max-option-1').attributes('aria-selected')).toBe('true');
    expect(body().find('#max-option-1').attributes('tabindex')).toBe('-1');

    editor().view.dom.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await nextTick();
    expect(input().attributes('aria-activedescendant')).toBeUndefined();
    wrapper.unmount();
  });

  it('describes the input with the signature of the function it is in', async () => {
    const { wrapper, editor } = mountEditor('max(1, ', {}, { id: 'max' });
    await flushPromises();
    editor().commands.focus('end');
    await nextTick();
    expect(body().find('[data-formula-signature]').attributes('id')).toBe('max-signature');
    expect(wrapper.find('[data-formula-input]').attributes('aria-describedby')).toBe('max-signature');
    wrapper.unmount();
  });
});
