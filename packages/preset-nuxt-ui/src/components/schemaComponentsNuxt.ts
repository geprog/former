import type { FormComponents, SchemaNode } from 'former-ui';
import { markRaw } from 'vue';

import Checkbox from './Checkbox.vue';
import Columns from './Columns.vue';
import ComboBox from './ComboBox.vue';
import Group from './Group.vue';
import Number from './Number.vue';
import RadioGroup from './RadioGroup.vue';
import Repeater from './Repeater.vue';
import Select from './Select.vue';
import Text from './Text.vue';
import Textarea from './Textarea.vue';

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
    s.push({ type: 'checkbox', name: 'required', props: { label: 'Required' } });
  return s;
}

export function schemaComponentsNuxt(): FormComponents {
  return {
    text: {
      label: 'Text',
      component: markRaw(Text),
      propsSchema: [
        ...commonSchema(),
        { type: 'text', name: 'initialValue', props: { label: 'Initial value' } },
      ],
    },
    textarea: {
      label: 'Textarea',
      component: markRaw(Textarea),
      propsSchema: [
        ...commonSchema(),
        { type: 'text', name: 'rows', props: { type: 'number', label: 'Rows', min: 1 } },
        { type: 'checkbox', name: 'autoresize', props: { label: 'Auto resize' } },
      ],
    },
    group: {
      label: 'Group',
      component: markRaw(Group),
      // Für Container keine placeholder/required-Props nötig
      propsSchema: [
        { type: 'text', name: '$name', props: { label: 'Technical name', required: true } },
        { type: 'checkbox', name: 'border', props: { label: 'Show border' } },
      ],
    },
    number: {
      label: 'Number',
      component: markRaw(Number),
      propsSchema: [
        ...commonSchema({ placeholder: false }),
        { type: 'text', name: 'min', props: { type: 'number', label: 'Min' } },
        { type: 'text', name: 'max', props: { type: 'number', label: 'Max' } },
        { type: 'text', name: 'step', props: { type: 'number', label: 'Step' } },
      ],
    },
    checkbox: {
      label: 'Checkbox',
      component: markRaw(Checkbox),
      propsSchema: [
        ...commonSchema({ placeholder: false }),
        { type: 'text', name: 'checkboxLabel', props: { label: 'Label next to box' } },
      ],
    },
    select: {
      label: 'Select',
      component: markRaw(Select),
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
      ],
    },
    radio_group: {
      label: 'Radio group',
      component: markRaw(RadioGroup),
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
      ],
    },
    combo_box: {
      label: 'Combobox',
      component: markRaw(ComboBox),
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
      ],
    },
    columns: {
      label: 'Columns',
      component: markRaw(Columns),
      propsSchema: [
        ...commonSchema({ name: false, required: false, placeholder: false }),
        { type: 'text', name: 'cols', props: { type: 'number', label: 'Columns', min: 1 } },
      ],
    },
    repeater: {
      label: 'Repeater',
      component: markRaw(Repeater),
      propsSchema: [
        ...commonSchema({ help: false, placeholder: false }),
        { type: 'text', name: 'itemLabel', props: { label: 'Item label' } },
      ],
    },
  };
}
