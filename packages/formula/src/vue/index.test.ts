import type { FormComponents, FormData, FormulaPropsMap, SchemaNode, StandardSchemaV1 } from '@former-ui/former';
import type { PropType } from 'vue';
import { FormDataProvider, Former, FormRenderer } from '@former-ui/former';
import { flushPromises, mount } from '@vue/test-utils';
import { all, create } from 'mathjs';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, markRaw, nextTick, ref } from 'vue';
import { createI18n } from 'vue-i18n';
import { createFormulaEngine } from '../engine';
import en from '../locales/en.json' with { type: 'json' };
import { valueSource } from '../sources';
import { FormulaSwitch, provideFormulaEngine, useFormula, useFormulaProps, useFormulaShowIf, withFormulaProps } from './index';

const engine = createFormulaEngine({
  math: create(all),
});

const NumberField = defineComponent({
  props: {
    label: String,
    max: Number,
    modelValue: null,
    error: String,
    mode: String,
    id: String,
  },
  emits: ['update:modelValue'],
  setup(props, { attrs }) {
    return () => h('input', {
      'data-label': props.label,
      'data-max': props.max ?? '',
      'data-error': props.error ?? '',
      'data-attrs': Object.keys(attrs).join(','),
      'value': props.modelValue ?? '',
    });
  },
});

const Repeater = defineComponent({
  props: { modelValue: Array as PropType<FormData[]> },
  setup(props) {
    return () => h('div', (props.modelValue ?? []).map((item, index) =>
      h(FormDataProvider, { data: item, index }, () => h(FormRenderer))));
  },
});

const Calculation = defineComponent({
  props: {
    formula: String,
    id: String,
    mode: String,
    error: String,
    modelValue: null,
  },
  setup(props) {
    const { value } = useFormula(() => props.formula, { expect: 'number' });
    return () => h('output', String(value.value));
  },
});

const FormulaInput = defineComponent({
  props: { modelValue: String },
  setup: props => () => h('textarea', { value: props.modelValue }),
});

// fails above the `max` prop, like the validations of presets
function maxValidation({ max }: { max?: number }): StandardSchemaV1 {
  return {
    '~standard': {
      version: 1,
      vendor: 'test',
      validate: value => (typeof max === 'number' && typeof value === 'number' && value > max
        ? {
            issues: [
              { message: `max ${max}` },
            ],
          }
        : { value }),
    },
  };
}

const components: FormComponents = {
  number: {
    label: 'Number',
    component: markRaw(NumberField),
    validation: maxValidation,
    propsSchema: [
      { type: 'text', name: '$name' },
      { type: 'number', name: 'max' },
      { type: 'text', name: 'label' },
    ],
  },
  text: {
    label: 'Text',
    component: markRaw(NumberField),
    propsSchema: [
      { type: 'text', name: '$name' },
    ],
  },
  repeater: {
    label: 'Repeater',
    component: markRaw(Repeater),
    isList: true,
    propsSchema: [
      { type: 'text', name: '$name' },
    ],
  },
  calculation: {
    label: 'Calculation',
    component: markRaw(Calculation),
    propsSchema: [
      { type: 'text', name: 'formula' },
    ],
  },
};

const formulaProps: FormulaPropsMap = {
  number: { max: 'number' },
};

function mountForm(schema: SchemaNode[], data: FormData, mode: 'edit' | 'build' = 'edit') {
  const dataRef = ref(data);
  const isValid = ref<boolean>();
  const isSchemaValid = ref<boolean>();
  const Host = defineComponent({
    setup() {
      const sources = [
        valueSource({
          id: 'settings',
          values: { rate: 0.19 },
        }),
      ];
      const formComponents = useFormulaProps(components, formulaProps, {
        engine,
        sources,
        editor: { component: FormulaInput },
      });
      const showIf = useFormulaShowIf({ engine, sources, components: formComponents });
      return () => h(Former, {
        'schema': schema,
        'data': dataRef.value,
        'onUpdate:data': (value: FormData) => dataRef.value = value,
        'components': formComponents.value,
        'mode': mode,
        showIf,
        'onValid': (valid: boolean) => isValid.value = valid,
        'onSchemaValid': (valid: boolean) => isSchemaValid.value = valid,
      });
    },
  });
  const i18n = createI18n({
    legacy: false,
    locale: 'en',
    messages: { en },
  });
  return {
    wrapper: mount(Host, {
      global: {
        plugins: [i18n],
      },
    }),
    data: dataRef,
    isValid,
    isSchemaValid,
  };
}

describe('withFormulaProps', () => {
  it('puts the field of a prop and the one of its formula into a switch and adds a show if formula', () => {
    const result = withFormulaProps(components, formulaProps, {
      engine,
      editor: { component: FormulaInput },
    });
    expect(result.number!.propsSchema).toEqual([
      { type: 'text:formula_name', name: '$name' },
      {
        type: 'formula_switch',
        props: {
          prop: 'max',
          formulaProp: 'maxFormula',
          useFormula: 'Use formula',
          useValue: 'Use fixed value',
        },
        children: {
          value: [
            { type: 'number', name: 'max' },
          ],
          formula: [
            {
              type: 'formula',
              name: 'maxFormula',
              props: { label: 'max', expect: 'number' },
            },
          ],
        },
      },
      { type: 'text', name: 'label' },
      {
        type: 'formula',
        name: 'showIf',
        props: { label: 'Show if', expect: 'boolean' },
      },
    ]);
    expect(result.formula).toMatchObject({ internal: true, component: FormulaInput });
    expect(result.formula_switch).toMatchObject({ internal: true, component: FormulaSwitch, propsSchema: [] });
    expect(result['text:formula_name']).toMatchObject({ internal: true, component: NumberField });
  });

  it('labels the formula like the prop and translates the texts', () => {
    const labeled: FormComponents = {
      number: {
        ...components.number!,
        propsSchema: [
          {
            type: 'number',
            name: 'max',
            props: { label: 'Maximum' },
          },
        ],
      },
    };
    const formulaOf = (result: FormComponents) => (result.number!.propsSchema[0]!.children as Record<string, SchemaNode[]>).formula![0]!;
    const english = withFormulaProps(labeled, formulaProps, {
      engine,
      editor: { component: FormulaInput },
    });
    expect(formulaOf(english).props?.label).toBe('Maximum');
    expect(english.number!.propsSchema[0]!.props).toMatchObject({ useFormula: 'Use formula', useValue: 'Use fixed value' });
    expect(english.formula!.label).toBe('Formula');

    const texts: Record<string, string> = {
      formula_use_formula: 'Formel verwenden',
      formula_use_value: 'Festen Wert verwenden',
      formula_show_if: 'Anzeigen wenn',
      formula_editor: 'Formel',
    };
    const german = withFormulaProps(labeled, formulaProps, {
      engine,
      editor: { component: FormulaInput },
      translate: key => texts[key] ?? key,
    });
    expect(german.number!.propsSchema[0]!.props).toMatchObject({ useFormula: 'Formel verwenden', useValue: 'Festen Wert verwenden' });
    expect(german.number!.propsSchema[1]!.props?.label).toBe('Anzeigen wenn');
    expect(german.formula!.label).toBe('Formel');
  });

  it('translates the messages of the formulas in the props form', async () => {
    const translated = withFormulaProps(components, formulaProps, {
      engine,
      editor: { component: FormulaInput },
      sources: () => [
        valueSource({
          id: 'settings',
          values: { rate: 0.19 },
        }),
      ],
      translate: (key, named) => `${key} ${String(named?.variable ?? named?.name ?? '')}`,
    });
    const node = {
      type: 'number',
      name: 'value',
      props: { maxFormula: '$nope' },
    };
    const schema = translated.formula!.validation!({ expect: 'number' }, {
      node: { type: 'formula', name: 'maxFormula' },
      path: ['maxFormula'],
      scopes: [
        { data: node.props, path: [] },
      ],
      editedNode: {
        node,
        path: [],
        schema: [node],
      },
    })!;
    expect(await schema['~standard'].validate('$nope')).toEqual({
      issues: [
        { message: 'formula_unknown_variable "$nope"' },
      ],
    });
    const nameSchema = translated['text:formula_name']!.validation!({}, { node, path: [], scopes: [] })!;
    expect(await nameSchema['~standard'].validate('rate')).toEqual({
      issues: [
        { message: 'formula_reserved_name "$rate"' },
      ],
    });
    expect(await nameSchema['~standard'].validate('field')).toEqual({ value: 'field' });
  });

  it('keeps the identity of the wrapped components', () => {
    const first = withFormulaProps(components, formulaProps, { engine });
    const second = withFormulaProps(components, formulaProps, { engine });
    expect(first.number!.component).toBe(second.number!.component);
  });
});

describe('formulas in a form', () => {
  it('passes the value of a formula prop to the component and its validation', async () => {
    const { wrapper, data, isValid } = mountForm([
      { type: 'number', name: 'limit' },
      {
        type: 'number',
        name: 'value',
        props: { label: 'Value', max: 100, maxFormula: '$limit * 2' },
      },
    ], { limit: 3, value: 7 });
    await flushPromises();
    const input = () => wrapper.find('[data-label="Value"]');
    expect(input().attributes('data-max')).toBe('6');
    expect(input().attributes('data-error')).toBe('max 6');
    // the formulas aren't passed to the component
    expect(input().attributes('data-attrs')).toBe('');
    expect(isValid.value).toBe(false);

    data.value = { limit: 4, value: 7 };
    await flushPromises();
    expect(input().attributes('data-max')).toBe('8');
    expect(input().attributes('data-error')).toBe('');
    expect(isValid.value).toBe(true);
  });

  it.each([
    ['can\'t be evaluated', '$limit +'],
    ['uses a variable without value', '$limit * 2'],
  ])('leaves a prop unset when its formula %s', async (_, maxFormula) => {
    const { wrapper } = mountForm([
      { type: 'number', name: 'limit' },
      {
        type: 'number',
        name: 'value',
        props: { label: 'Value', max: 1, maxFormula },
      },
    ], { value: 7 });
    await flushPromises();
    expect(wrapper.find('[data-label="Value"]').attributes('data-max')).toBe('');
    expect(wrapper.find('[data-label="Value"]').attributes('data-error')).toBe('');
  });

  it('shows nodes by their show if formula, also inside of repeater items', async () => {
    const { wrapper, data } = mountForm([
      { type: 'number', name: 'count' },
      {
        type: 'repeater',
        name: 'list',
        children: [
          { type: 'number', name: 'field' },
          {
            type: 'number',
            name: 'extra',
            props: { label: 'Extra', showIf: '$list_item.field > 2 and $count > 0' },
          },
        ],
      },
    ], {
      count: 1,
      list: [
        { field: 1 },
        { field: 3 },
      ],
    });
    await flushPromises();
    expect(wrapper.findAll('[data-label="Extra"]')).toHaveLength(1);

    data.value = {
      count: 0,
      list: [
        { field: 1 },
        { field: 3 },
      ],
    };
    await flushPromises();
    expect(wrapper.findAll('[data-label="Extra"]')).toHaveLength(0);
  });

  it('evaluates lists without data to an empty list in formula props, components and show if conditions', async () => {
    const { wrapper } = mountForm([
      {
        type: 'repeater',
        name: 'list',
        children: [
          { type: 'number', name: 'field' },
        ],
      },
      {
        type: 'number',
        name: 'value',
        props: { label: 'Value', maxFormula: 'count($list) + 1' },
      },
      {
        type: 'calculation',
        props: { formula: 'sum(map($list, f(x) = 1)) * 10' },
      },
      {
        type: 'number',
        name: 'shown',
        props: { label: 'Shown', showIf: 'sum(map($list, f(x) = 1)) == 0' },
      },
    ], { value: 7 });
    await flushPromises();
    expect(wrapper.find('[data-label="Value"]').attributes('data-max')).toBe('1');
    expect(wrapper.find('[data-label="Value"]').attributes('data-error')).toBe('max 1');
    expect(wrapper.find('output').text()).toBe('0');
    expect(wrapper.find('[data-label="Shown"]').exists()).toBe(true);
  });

  it('evaluates formulas of components in the data of their node', async () => {
    const { wrapper, data } = mountForm([
      {
        type: 'repeater',
        name: 'list',
        children: [
          {
            type: 'calculation',
            props: { formula: 'round($list_item.field * $rate * 100)' },
          },
        ],
      },
    ], {
      list: [
        { field: 1 },
        { field: 2 },
      ],
    });
    await flushPromises();
    expect(wrapper.findAll('output').map(output => output.text())).toEqual(['19', '38']);

    data.value = {
      list: [
        { field: 3 },
      ],
    };
    await nextTick();
    expect(wrapper.findAll('output').map(output => output.text())).toEqual(['57']);
  });

  it('validates the formulas of the props for where the node is in the schema', async () => {
    const schemaWith = (props: Record<string, unknown>, inRepeater = false): SchemaNode[] => {
      const node = { type: 'number', name: 'value', props };
      return [
        { type: 'number', name: 'limit' },
        inRepeater
          ? {
              type: 'repeater',
              name: 'list',
              children: [
                { type: 'number', name: 'field' },
                node,
              ],
            }
          : node,
      ];
    };
    const validity = async (schema: SchemaNode[]) => {
      const { isSchemaValid } = mountForm(schema, {}, 'build');
      await flushPromises();
      return isSchemaValid.value;
    };
    expect(await validity(schemaWith({ maxFormula: '$limit * 2 * $rate' }))).toBe(true);
    expect(await validity(schemaWith({ maxFormula: '$nope * 2' }))).toBe(false);
    expect(await validity(schemaWith({ maxFormula: '$limit +' }))).toBe(false);
    expect(await validity(schemaWith({ showIf: '$list_item.field > 1' }))).toBe(false);
    expect(await validity(schemaWith({ showIf: '$list_item.field > 1' }, true))).toBe(true);
  });

  it('doesn\'t allow names taken by the variables of sources', async () => {
    const { isSchemaValid } = mountForm([
      { type: 'number', name: 'rate' },
    ], {}, 'build');
    await flushPromises();
    expect(isSchemaValid.value).toBe(false);
  });
});

describe('useFormulaProps', () => {
  it('translates the texts with the i18n of the app and follows its locale', async () => {
    const i18n = createI18n({
      legacy: false,
      locale: 'en',
      messages: {
        en,
        de: {
          formula_use_formula: 'Formel verwenden',
          formula_use_value: 'Festen Wert verwenden',
          formula_show_if: 'Anzeigen wenn',
          formula_editor: 'Formel',
        },
      },
    });
    let result: ReturnType<typeof useFormulaProps> | undefined;
    mount(defineComponent({
      setup() {
        result = useFormulaProps(components, formulaProps, {
          engine,
          editor: { component: FormulaInput },
        });
        return () => null;
      },
    }), {
      global: {
        plugins: [i18n],
      },
    });
    const texts = () => result!.value.number!.propsSchema.flatMap(node => [node.props?.useFormula, node.props?.label]).filter(Boolean);
    expect(texts()).toEqual(['Use formula', 'Show if']);

    i18n.global.locale.value = 'de';
    await nextTick();
    expect(texts()).toEqual(['Formel verwenden', 'Anzeigen wenn']);
    expect(result!.value.formula!.label).toBe('Formel');
  });
});

describe('formulaSwitch', () => {
  function mountProps(data: FormData) {
    const formComponents = withFormulaProps(components, formulaProps, {
      engine,
      editor: { component: FormulaInput },
    });
    const dataRef = ref(data);
    const Host = defineComponent({
      setup() {
        provideFormulaEngine(engine);
        return () => h(Former, {
          'schema': formComponents.number!.propsSchema,
          'data': dataRef.value,
          'onUpdate:data': (value: FormData) => dataRef.value = value,
          'components': formComponents,
          'mode': 'edit',
        });
      },
    });
    return {
      wrapper: mount(Host),
      data: dataRef,
    };
  }

  it('shows the field of the fixed value or of the formula, whichever is set', async () => {
    const { wrapper: withValue } = mountProps({ max: 5 });
    await flushPromises();
    expect(withValue.find('[data-formula-switch]').attributes('data-formula-switch')).toBe('value');
    expect(withValue.find('[data-formula-switch] input').exists()).toBe(true);
    expect(withValue.find('[data-formula-switch] textarea').exists()).toBe(false);

    const { wrapper: withFormula } = mountProps({ maxFormula: '$a * 2' });
    await flushPromises();
    expect(withFormula.find('[data-formula-switch]').attributes('data-formula-switch')).toBe('formula');
    expect((withFormula.find('[data-formula-switch] textarea').element as HTMLTextAreaElement).value).toBe('$a * 2');
  });

  it('switches between the fixed value and the formula and clears the other one', async () => {
    const { wrapper, data } = mountProps({ $name: 'value', max: 5 });
    await flushPromises();
    await wrapper.find('[data-formula-switch-toggle]').trigger('click');
    await flushPromises();
    expect(data.value).toEqual({ $name: 'value' });
    expect(wrapper.find('[data-formula-switch]').attributes('data-formula-switch')).toBe('formula');
    const toggle = wrapper.find('[data-formula-switch-toggle]');
    expect(toggle.attributes()).toMatchObject({ 'title': 'Use fixed value', 'aria-label': 'Use fixed value', 'aria-pressed': 'true' });
    expect(toggle.text()).toBe('123');

    data.value = { $name: 'value', maxFormula: '$a' };
    await flushPromises();
    await wrapper.find('[data-formula-switch-toggle]').trigger('click');
    await flushPromises();
    expect(data.value).toEqual({ $name: 'value' });
    expect(wrapper.find('[data-formula-switch]').attributes('data-formula-switch')).toBe('value');
  });
});
