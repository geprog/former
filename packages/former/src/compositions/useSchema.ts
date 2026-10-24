import type { FormComponents, InternalSchemaNode, Validator } from '~/types';
import { computed, type MaybeRefOrGetter, type Ref, toValue } from 'vue';
import { schemaIterator } from '~/utils';

export function isNodeValid(node: InternalSchemaNode, validator: Validator, components: FormComponents) {
  const component = components[node.type];
  // nodes of unknown components (e.g. after switching the components) can't be rendered or validated
  if (!component) {
    return false;
  }
  return component.propsSchema.every(propsNode =>
    validator(propsNode, propsNode.name === '$name' ? node.name : (node.props || {})[propsNode.name || '']) === true);
}

export default function useSchema(schema: Ref<InternalSchemaNode[]>, validator: Validator, components: MaybeRefOrGetter<FormComponents>) {
  const isValid = computed(() => {
    return [...schemaIterator(schema.value)].every(node => isNodeValid(node, validator, toValue(components)));
  });

  return { isValid };
}
