import type { FormComponents, InternalSchemaNode } from '~/types';
import { computed, type MaybeRefOrGetter, type Ref, toValue } from 'vue';
import { schemaIterator } from '~/utils';
import { every, isNodeValid, useMaybeAsync } from '~/validation';

export default function useSchema(schema: Ref<InternalSchemaNode[]>, components: MaybeRefOrGetter<FormComponents>) {
  const { result, isPending } = useMaybeAsync(
    () => every([...schemaIterator(schema.value)].map(node => isNodeValid(node, toValue(components))), Boolean),
    true,
    () => false,
  );
  // the schema isn't valid until all of its async validations are done
  const isValid = computed(() => result.value && !isPending.value);

  return { isValid };
}
