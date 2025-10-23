import type { InputProps } from '@nuxt/ui';
import type { FormComponents, SchemaNode } from 'former-ui';
import Checkbox from '@/components/Checkbox.vue';

import Columns from '@/components/Columns.vue';
import ComboBox from '@/components/ComboBox.vue';
import Group from '@/components/Group.vue';
import Number from '@/components/Number.vue';
import RadioGroup from '@/components/RadioGroup.vue';
import Repeater from '@/components/Repeater.vue';
import Select from '@/components/Select.vue';
import Text from '@/components/Text.vue';
import Textarea from '@/components/Textarea.vue';
import { computed, defineComponent, h, markRaw } from 'vue';

type ClassNameValue = string | string[] | Record<string, boolean>;
type AnyUi = Record<string, ClassNameValue>;
type UIOf<T> = NonNullable<T>;

type StylingConfiguration<Ui = AnyUi> = {
  class?: ClassNameValue;
  ui?: Partial<Ui>;
};

export type PresetStyleConfig = Partial<{
  text: StylingConfiguration<UIOf<InputProps['ui']>>;
  textarea: StylingConfiguration<AnyUi>;
  number: StylingConfiguration<AnyUi>;
  select: StylingConfiguration<AnyUi>;
  checkbox: StylingConfiguration<AnyUi>;
  radio_group: StylingConfiguration<AnyUi>;
  combo_box: StylingConfiguration<AnyUi>;
  columns: StylingConfiguration<AnyUi>;
  group: StylingConfiguration<AnyUi>;
  repeater: StylingConfiguration<AnyUi>;
}>;

function withStyle<Ui = AnyUi>(Comp: any, cfg?: StylingConfiguration<Ui>) {
  return defineComponent({
    name: `Styled(${Comp?.name ?? 'Anon'})`,
    inheritAttrs: true,
    setup(_, { attrs, slots }) {
      const mergedKlass = computed(() => [(attrs as any)?.klass, cfg?.class].filter(Boolean));
      const mergedUi = computed<Partial<Ui>>(() => {
        const fromAttrs = (attrs as any)?.ui as Partial<Ui> | undefined;
        return { ...(cfg?.ui ?? {}), ...(fromAttrs ?? {}) };
      });
      return () =>
        h(
          Comp,
          {
            ...attrs,
            klass: mergedKlass.value,
            ui: mergedUi.value,
          },
          slots,
        );
    },
  });
}

const showIfProp: SchemaNode = {
  type: 'text',
  name: 'showIf',
  props: {
    label: 'Show if',
    placeholder: 'If empty or "hello" then component is visible.',
  },
};

type CommonOpts = { name: boolean; label: boolean; help: boolean; required: boolean; placeholder: boolean };
const defaults: CommonOpts = { name: true, label: true, help: true, required: true, placeholder: true };

function commonSchema(opt: Partial<CommonOpts> = {}): SchemaNode[] {
  const { name, label, help, required, placeholder } = { ...defaults, ...opt };
  const s: SchemaNode[] = [];
  if (name)
    s.push({ type: 'text', name: '$name', props: { label: 'Technical name', required: true } });
  if (label)
    s.push({ type: 'text', name: 'label', props: { label: 'Label' } });
  if (placeholder)
    s.push({ type: 'text', name: 'placeholder', props: { label: 'Placeholder' } });
  if (help)
    s.push({ type: 'text', name: 'help', props: { label: 'Help text' } });
  if (required)
    s.push({ type: 'checkbox', name: 'required', props: { label: 'Is field required?' } });
  return s;
}

export function schemaComponents(style?: PresetStyleConfig): FormComponents {
  const CText = withStyle<UIOf<InputProps['ui']>>(Text, style?.text);
  const CTextarea = withStyle<AnyUi>(Textarea, style?.textarea);
  const CNumber = withStyle<AnyUi>(Number, style?.number);
  const CSelect = withStyle<AnyUi>(Select, style?.select);
  const CCheckbox = withStyle<AnyUi>(Checkbox, style?.checkbox);
  const CRadioGroup = withStyle<AnyUi>(RadioGroup, style?.radio_group);
  const CComboBox = withStyle<AnyUi>(ComboBox, style?.combo_box);
  const CColumns = withStyle<AnyUi>(Columns, style?.columns);
  const CGroup = withStyle<AnyUi>(Group, style?.group);
  const CRepeater = withStyle<AnyUi>(Repeater, style?.repeater);

  return {
    text: {
      label: 'Text',
      component: markRaw(CText),
      propsSchema: [
        ...commonSchema(),
        { type: 'text', name: 'initialValue', props: { label: 'Initial value' } },
        showIfProp,
      ],
    },
    textarea: {
      label: 'Textarea',
      component: markRaw(CTextarea),
      propsSchema: [
        ...commonSchema(),
        { type: 'text', name: 'rows', props: { type: 'number', label: 'Rows', min: 1 } },
        { type: 'checkbox', name: 'autoresize', props: { label: 'Auto resize' } },
        showIfProp,
      ],
    },
    number: {
      label: 'Number',
      component: markRaw(CNumber),
      propsSchema: [
        ...commonSchema({ placeholder: false }),
        { type: 'text', name: 'min', props: { type: 'number', label: 'Min' } },
        { type: 'text', name: 'max', props: { type: 'number', label: 'Max' } },
        { type: 'text', name: 'step', props: { type: 'number', label: 'Step' } },
        showIfProp,
      ],
    },
    select: {
      label: 'Select',
      component: markRaw(CSelect),
      propsSchema: [
        ...commonSchema(),
        {
          type: 'repeater',
          name: 'options',
          children: [
            { type: 'text', name: 'label', props: { label: 'Label' } },
            { type: 'text', name: 'value', props: { label: 'Value' } },
          ],
          props: { label: 'Options' },
        },
        showIfProp,
      ],
    },
    checkbox: {
      label: 'Checkbox',
      component: markRaw(CCheckbox),
      propsSchema: [
        ...commonSchema({ placeholder: false }),
        { type: 'text', name: 'checkboxLabel', props: { label: 'Label next to box' } },
        showIfProp,
      ],
    },
    radio_group: {
      label: 'RadioGroup',
      component: markRaw(CRadioGroup),
      propsSchema: [
        ...commonSchema({ placeholder: false }),
        {
          type: 'repeater',
          name: 'options',
          children: [
            { type: 'text', name: 'label', props: { label: 'Label' } },
            { type: 'text', name: 'value', props: { label: 'Value' } },
          ],
          props: { label: 'Options' },
        },
        showIfProp,
      ],
    },
    combo_box: {
      label: 'Combobox',
      component: markRaw(CComboBox),
      propsSchema: [
        ...commonSchema(),
        {
          type: 'repeater',
          name: 'options',
          children: [
            { type: 'text', name: 'label', props: { label: 'Label' } },
            { type: 'text', name: 'value', props: { label: 'Value' } },
          ],
          props: { label: 'Items' },
        },
        showIfProp,
      ],
    },
    columns: {
      label: 'Columns',
      component: markRaw(CColumns),
      propsSchema: [
        ...commonSchema({ name: false, required: false, placeholder: false }),
        { type: 'text', name: 'cols', props: { type: 'number', label: 'Columns', min: 1 } },
        showIfProp,
      ],
    },
    group: {
      label: 'Group',
      component: markRaw(CGroup),
      propsSchema: [
        { type: 'text', name: '$name', props: { label: 'Technical name', required: true } },
        showIfProp,
        { type: 'checkbox', name: 'border', props: { label: 'Show border' } },
      ],
    },
    repeater: {
      label: 'Repeater',
      component: markRaw(CRepeater),
      propsSchema: [
        ...commonSchema({ help: false, placeholder: false }),
        { type: 'text', name: 'itemLabel', props: { label: 'Item label' } },
        showIfProp,
      ],
    },
  };
}
