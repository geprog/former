import type { FormKitSchemaNode } from '@formkit/core';
import textSchema from '~/../../input-schemas/schemas/text.json';

export const formFieldOptionSchemas = {
  text: textSchema as FormKitSchemaNode[],
};
