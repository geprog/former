import type { FormKitSchemaNode } from '@formkit/core';
import { checkbox, textarea } from '@formkit/icons';

export const baseOptions = [
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

export const defaultFormFieldTypes = {
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
  checkbox: {
    label: 'Checkbox',
    icon: checkbox,
    schema: [...baseOptions],
  },
  textarea: {
    label: 'Textarea',
    icon: textarea,
    schema: [
      ...baseOptions,
      {
        $formkit: 'text',
        label: 'Placeholder',
        name: 'placeholder',
      },
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
    ],
  },
} satisfies { [key: string]: FormFieldType };
