import type { FormComponents, InternalSchemaNode } from '~/types';
import { type MaybeRefOrGetter, type Ref, toValue } from 'vue';
import { schemaIterator } from '~/utils';
import { every, isNodeValid, useMaybeAsync } from '~/validation';

export default function useSchema(schema: Ref<InternalSchemaNode[]>, components: MaybeRefOrGetter<FormComponents>) {
  const isValid = useMaybeAsync(
    () => every([...schemaIterator(schema.value)].map(node => isNodeValid(node, toValue(components))), Boolean),
    true,
  );

  return { isValid };
}
