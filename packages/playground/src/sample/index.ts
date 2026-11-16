import type { FieldData, FormComponents, FormData } from '@former-ui/former';
import { hasValue } from '@former-ui/former';
import { markRaw } from 'vue';
import { z } from 'zod';
import Checkbox from './Checkbox.vue';
import Columns from './Columns.vue';
import Group from './Group.vue';
import Repeater from './Repeater.vue';
import Select from './Select.vue';
import TextInput from './TextInput.vue';

// validates the `required` prop of the nodes, including the props of the nodes in build mode
const requiredValidation: FormComponents[string]['validation'] = ({ required }) =>
  (required ? z.custom(value => hasValue(value as FieldData | FormData), 'Value is required') : undefined);

export const sampleFormComponents: FormComponents = {
  text: {
    label: 'Text',
    component: markRaw(TextInput),
    validation: requiredValidation,
    propsSchema: [
      {
        type: 'text',
        name: '$name',
        props: {
          label: 'Name',
          placeholder: 'Enter the name of the data field',
          required: true,
        },
      },
      {
        type: 'text',
        name: 'label',
        props: {
          label: 'Label',
          placeholder: 'Enter a label',
        },
      },
      {
        type: 'text',
        name: 'placeholder',
        props: {
          label: 'Placeholder',
          placeholder: 'Enter a placeholder',
        },
      },
      {
        type: 'text',
        name: 'initialValue',
        props: {
          label: 'Initial value',
          placeholder: 'Enter an initial value here',
        },
      },
      {
        type: 'checkbox',
        name: 'required',
        props: {
          label: 'Is field required?',
        },
      },
    ],
  },
  group: {
    label: 'Group',
    component: markRaw(Group),
    validation: requiredValidation,
    propsSchema: [
      {
        type: 'text',
        name: '$name',
        props: {
          label: 'Name',
          placeholder: 'Enter the name of the data field',
          required: true,
        },
      },
    ],
  },
  columns: {
    label: 'Columns',
    component: markRaw(Columns),
    propsSchema: [],
  },
  repeater: {
    label: 'Repeater',
    component: markRaw(Repeater),
    validation: requiredValidation,
    isList: true,
    propsSchema: [
      {
        type: 'text',
        name: '$name',
        props: {
          label: 'Name',
          placeholder: 'Enter the name of the data field',
          required: true,
        },
      },
      {
        type: 'text',
        name: 'label',
        props: {
          label: 'Label',
          placeholder: 'Enter a label',
        },
      },
    ],
  },
  select: {
    label: 'Select',
    component: markRaw(Select),
    validation: requiredValidation,
    propsSchema: [
      {
        type: 'text',
        name: '$name',
        props: {
          label: 'Name',
          placeholder: 'Enter the name of the data field',
          required: true,
        },
      },
      {
        type: 'text',
        name: 'label',
        props: {
          label: 'Label',
          placeholder: 'Enter a label',
        },
      },
      {
        type: 'repeater',
        name: 'options',
        children: [
          {
            type: 'text',
            name: 'label',
            props: {
              type: 'text',
              label: 'Label',
              placeholder: 'Enter a label',
            },
          },
          {
            type: 'text',
            name: 'value',
            props: {
              type: 'text',
              label: 'Value',
              placeholder: 'Enter a value',
            },
          },
        ],
        props: {
          label: 'Options',
        },
      },
    ],
  },
  checkbox: {
    label: 'Checkbox',
    component: markRaw(Checkbox),
    validation: requiredValidation,
    propsSchema: [
      {
        type: 'text',
        name: '$name',
        props: {
          label: 'Name',
          placeholder: 'Enter the name of the data field',
          required: true,
        },
      },
      {
        type: 'text',
        name: 'label',
        props: {
          label: 'Label',
          placeholder: 'Enter a label',
        },
      },
    ],
  },
};
