import type { FormComponents, InternalSchemaNode } from '~/types';
import { type MaybeRefOrGetter, type Ref, toValue } from 'vue';
import { schemaIterator } from '~/utils';
import { isNodeValid, useMaybeAsync } from '~/validation';

export { isNodeValid };

export default function useSchema(schema: Ref<InternalSchemaNode[]>, components: MaybeRefOrGetter<FormComponents>) {
  const isValid = useMaybeAsync(() => {
    const results = [...schemaIterator(schema.value)].map(node => isNodeValid(node, toValue(components)));
    if (results.some(result => result instanceof Promise)) {
      return Promise.all(results).then(valid => valid.every(Boolean));
    }
    return results.every(Boolean);
  }, true);

  return { isValid };
}
