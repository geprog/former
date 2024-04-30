import type { FormKitSchemaNode } from '@formkit/core';

const baseOptions = [
  {
    $formkit: 'text',
    label: 'Name',
    name: 'name',
    required: true,
  },
  {
    $formkit: 'text',
    label: 'Label',
    name: 'label',
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
        label: 'minimum value',
        name: 'min',
      },
      {
        $formkit: 'number',
        label: 'maximum value',
        name: 'max',
      },
      {
        $formkit: 'number',
        label: 'step size',
        name: 'step',
      },
      {
        $formkit: 'select',
        label: 'number',
        name: 'number',
        options: { float: 'float', integer: 'integer' },
      },
    ],
  },
};
