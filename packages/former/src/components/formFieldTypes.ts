import type { FormKitSchemaFormKit, FormKitSchemaNode } from '@formkit/core';
import { checkbox, radio, textarea } from '@formkit/icons';

const baseOptions = [
  {
    $formkit: 'text',
    label: 'Label',
    name: 'label',
    required: true,
  },
  {
    $formkit: 'text',
    label: 'Name',
    name: 'name',
    required: true,
  },
  {
    $formkit: 'text',
    label: 'Placeholder',
    name: 'placeholder',
  },
  {
    $formkit: 'text',
    label: 'Help Text',
    name: 'help',
  },
];

export type FormFieldType = {
  label: string;
  icon?: string;
  schema: FormKitSchemaNode[];
};

const createList = ({
  name,
  value,
  label,
  children,
}: {
  name: string;
  label?: string;
  value?: string;
  children: FormKitSchemaNode[];
}): FormKitSchemaNode => {
  return {
    $formkit: 'list',
    name,
    value: value || [''], // 👈 Starts with an empty item
    dynamic: true,
    children: [
      {
        $cmp: 'div',
        for: ['item', 'index', '$items'], // 👈 $items is in the slot’s scope
        key: '$item', // 👈 Use $item as the key
        index: '$index', // 👈 Pass the $index to the FormKit component
        children,
      },
      {
        $formkit: 'button',
        onClick: '$addItem($node)', // 👈 Call $addItem from data
        children: 'Add a link',
      },
    ],
  };
};

export const formFieldTypes = {
  text: {
    label: 'Text',
    schema: [...baseOptions],
  },
  number: {
    label: 'Number',
    schema: [
      ...baseOptions,
      {
        $formkit: 'number',
        label: 'Minimum value',
        name: 'min',
      },
      {
        $formkit: 'number',
        label: 'Maximum value',
        name: 'max',
      },
      {
        $formkit: 'number',
        label: 'Step size',
        name: 'step',
      },
      {
        $formkit: 'select',
        label: 'Number',
        name: 'number',
        options: { float: 'float', integer: 'integer' },
      },
    ],
  },
  select: {
    label: 'Select',
    schema: [
      ...baseOptions,
      createList({
        name: 'options',
        label: 'Options',
        children: [
          {
            $formkit: 'text',
            label: 'Value',
            name: 'value',
          },
          {
            $formkit: 'text',
            label: 'Label',
            name: 'label',
          },
        ],
      }),
      {
        $formkit: 'checkbox',
        label: 'Multiple',
        name: 'multiple',
      },
    ],
  },
  checkbox: {
    label: 'Checkbox',
    icon: checkbox,
    schema: [
      ...baseOptions,
      {
        $formkit: 'options',
        label: 'Options',
        name: 'options',
        options: {},
      },
    ],
  },
  radio: {
    label: 'Radio',
    icon: radio,
    schema: [
      ...baseOptions,
      {
        $formkit: 'options',
        label: 'Options',
        name: 'options',
        options: {},
      },
    ],
  },
  textarea: {
    label: 'Textarea',
    icon: textarea,
    schema: [
      ...baseOptions,
      {
        $formkit: 'number',
        label: 'Rows',
        name: 'rows',
      },
      {
        $formkit: 'number',
        label: 'Columns',
        name: 'cols',
      },
      {
        $formkit: 'number',
        label: 'Minimum length',
        name: 'minLength',
      },
      {
        $formkit: 'number',
        label: 'Maximum length',
        name: 'maxLength',
      },
    ],
  },
  date: {
    label: 'Date',
    schema: [
      ...baseOptions,
      {
        $formkit: 'date',
        label: 'Minimum date',
        name: 'min',
      },
      {
        $formkit: 'date',
        label: 'Maximum date',
        name: 'max',
      },
      {
        $formkit: 'number',
        label: 'Step size',
        name: 'step',
        help: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/date#step',
      },
    ],
  },
} satisfies { [key: string]: FormFieldType };
