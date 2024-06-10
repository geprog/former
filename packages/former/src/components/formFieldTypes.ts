import type { FormKitSchemaNode } from '@formkit/core';
import { checkbox, textarea } from '@formkit/icons';

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
    schema: [
      ...baseOptions,
      {
        $formkit: 'text',
        label: 'Placeholder',
        name: 'placeholder',
      },
    ],
  },
  number: {
    label: 'Number',
    schema: [
      ...baseOptions,
      {
        $formkit: 'text',
        label: 'Placeholder',
        name: 'placeholder',
      },
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
    ],
  },
} satisfies { [key: string]: FormFieldType };
