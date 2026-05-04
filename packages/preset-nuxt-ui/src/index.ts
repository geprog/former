import type { FormComponents, SchemaNode } from '@former-ui/former';
import { markRaw } from 'vue';
import Checkbox from './Checkbox.vue';
import Columns from './Columns.vue';
import Group from './Group.vue';
import Repeater from './Repeater.vue';
import Select from './Select.vue';
import Text from './Text.vue';

const showIfProp: SchemaNode = {
  type: 'text',
  name: 'showIf',
  props: {
    label: 'Show if',
    placeholder: 'If empty or "hello" then component is visible.',
  },
};

export const formComponents = {
  text: {
    label: 'Text',
    component: markRaw(Text),
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
      showIfProp,
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
      showIfProp,
    ],
  },
  columns: {
    label: 'Columns',
    component: markRaw(Columns),
    propsSchema: [
      showIfProp,
    ],
  },
  repeater: {
    label: 'Repeater',
    component: markRaw(Repeater),
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
      showIfProp,
    ],
  },
  select: {
    label: 'Select',
    component: markRaw(Select),
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
      showIfProp,
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
      showIfProp,
    ],
  },
} satisfies FormComponents;
