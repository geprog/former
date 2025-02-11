import type { FormComponents, InternalSchemaNode, Validator } from '~/types';
import { computed, type Ref } from 'vue';
import { schemaIterator } from '~/utils';
import { inject } from './injectProvide';

export function isNodeValid(node: InternalSchemaNode, validator: Validator, components: FormComponents) {
  const propsSchema = components[node.type].propsSchema;
  return propsSchema.every(propsNode =>
    validator(propsNode, propsNode.name === '$name' ? node.name : (node.props || {})[propsNode.name || '']) === true);
}

export default function useSchema(schema: Ref<InternalSchemaNode[]>, validator: Validator, components: FormComponents) {
  const isValid = computed(() => {
    return [...schemaIterator(schema.value)].every(node => isNodeValid(node, validator, components));
  });

  return { isValid };
}
