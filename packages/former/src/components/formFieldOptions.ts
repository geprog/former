import type { FormKitSchemaNode } from '@formkit/core';

export const availableFieldTypes = ['text', 'number'];

const baseOptions  = [    {
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
}]

export const formFieldOptionSchemas: Record<string, FormKitSchemaNode[]> = {
  text: [
    ...baseOptions
  ],  
  number: [
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
      options: {  float: 'float', integer: 'integer' }, 
    },

  ],
};
