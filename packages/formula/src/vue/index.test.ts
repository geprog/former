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
import { useFormula, useFormulaProps, useFormulaShowIf, withFormulaProps } from './index';

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
          values: { vat: 0.19 },
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
  it('adds the formulas of the props after them and a show if formula', () => {
    const result = withFormulaProps(components, formulaProps, {
      engine,
      editor: { component: FormulaInput },
    });
    expect(result.number!.propsSchema).toEqual([
      { type: 'text:formula_name', name: '$name' },
      { type: 'number', name: 'max' },
      {
        type: 'formula',
        name: 'maxFormula',
        props: { label: 'max (formula)', expect: 'number' },
      },
      { type: 'text', name: 'label' },
      {
        type: 'formula',
        name: 'showIf',
        props: { label: 'Show if', expect: 'boolean' },
      },
    ]);
    expect(result.formula).toMatchObject({ internal: true, component: FormulaInput });
    expect(result['text:formula_name']).toMatchObject({ internal: true, component: NumberField });
  });

  it('names the formula of a prop after the label of the prop and translates the texts', () => {
    const labeled: FormComponents = {
      number: {
        ...components.number!,
        propsSchema: [
          { type: 'text', name: '$name' },
          {
            type: 'number',
            name: 'max',
            props: { label: 'Maximum' },
          },
        ],
      },
    };
    const english = withFormulaProps(labeled, formulaProps, {
      engine,
      editor: { component: FormulaInput },
    });
    expect(english.number!.propsSchema.map(node => node.props?.label)).toEqual([
      undefined,
      'Maximum',
      'Maximum (formula)',
      'Show if',
    ]);
    expect(english.formula!.label).toBe('Formula');

    const german = withFormulaProps(labeled, formulaProps, {
      engine,
      editor: { component: FormulaInput },
      translate: (key, named) => ({ formula_prop: `${String(named?.label)} (Formel)`, formula_show_if: 'Anzeigen wenn', formula_editor: 'Formel' })[key] ?? key,
    });
    expect(german.number!.propsSchema.map(node => node.props?.label)).toEqual([
      undefined,
      'Maximum',
      'Maximum (Formel)',
      'Anzeigen wenn',
    ]);
    expect(german.formula!.label).toBe('Formel');
  });

  it('translates the messages of the formulas in the props form', async () => {
    const translated = withFormulaProps(components, formulaProps, {
      engine,
      editor: { component: FormulaInput },
      sources: () => [
        valueSource({
          id: 'settings',
          values: { vat: 0.19 },
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
    expect(await nameSchema['~standard'].validate('vat')).toEqual({
      issues: [
        { message: 'formula_reserved_name "$vat"' },
      ],
    });
    expect(await nameSchema['~standard'].validate('width')).toEqual({ value: 'width' });
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
        name: 'rows',
        children: [
          { type: 'number', name: 'width' },
          {
            type: 'number',
            name: 'extra',
            props: { label: 'Extra', showIf: '$rows_item.width > 2 and $count > 0' },
          },
        ],
      },
    ], {
      count: 1,
      rows: [
        { width: 1 },
        { width: 3 },
      ],
    });
    await flushPromises();
    expect(wrapper.findAll('[data-label="Extra"]')).toHaveLength(1);

    data.value = {
      count: 0,
      rows: [
        { width: 1 },
        { width: 3 },
      ],
    };
    await flushPromises();
    expect(wrapper.findAll('[data-label="Extra"]')).toHaveLength(0);
  });

  it('evaluates formulas of components in the data of their node', async () => {
    const { wrapper, data } = mountForm([
      {
        type: 'repeater',
        name: 'rows',
        children: [
          {
            type: 'calculation',
            props: { formula: 'round($rows_item.width * $vat * 100)' },
          },
        ],
      },
    ], {
      rows: [
        { width: 1 },
        { width: 2 },
      ],
    });
    await flushPromises();
    expect(wrapper.findAll('output').map(output => output.text())).toEqual(['19', '38']);

    data.value = {
      rows: [
        { width: 3 },
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
              name: 'rows',
              children: [
                { type: 'number', name: 'width' },
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
    expect(await validity(schemaWith({ maxFormula: '$limit * 2 * $vat' }))).toBe(true);
    expect(await validity(schemaWith({ maxFormula: '$nope * 2' }))).toBe(false);
    expect(await validity(schemaWith({ maxFormula: '$limit +' }))).toBe(false);
    expect(await validity(schemaWith({ showIf: '$rows_item.width > 1' }))).toBe(false);
    expect(await validity(schemaWith({ showIf: '$rows_item.width > 1' }, true))).toBe(true);
  });

  it('doesn\'t allow names taken by the variables of sources', async () => {
    const { isSchemaValid } = mountForm([
      { type: 'number', name: 'vat' },
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
        de: { formula_prop: '{label} (Formel)', formula_show_if: 'Anzeigen wenn', formula_editor: 'Formel' },
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
    const labels = () => result!.value.number!.propsSchema.map(node => node.props?.label).filter(Boolean);
    expect(labels()).toEqual(['max (formula)', 'Show if']);

    i18n.global.locale.value = 'de';
    await nextTick();
    expect(labels()).toEqual(['max (Formel)', 'Anzeigen wenn']);
    expect(result!.value.formula!.label).toBe('Formel');
  });
});
