import type { FormKitSchemaNode } from '@formkit/core';

export const formFieldOptionSchemas: Record<string, FormKitSchemaNode[]> = {
  text: [
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
  ],
};
