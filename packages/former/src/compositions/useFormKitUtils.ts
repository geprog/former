import { isSugar, type FormKitSchemaComponent, type FormKitSchemaFormKit } from '@formkit/core';

export function isFormKitSchemaNode(node: any): node is FormKitSchemaComponent | FormKitSchemaFormKit {
  return isSugar(node) || (node as FormKitSchemaComponent).$cmp === '$formkit';
}
