import type { FormComponents, InternalSchemaNode } from '~/types';
import { computed, type MaybeRefOrGetter, type Ref, toValue } from 'vue';
import { schemaIterator } from '~/utils';
import { isPromiseLike, propsValidityOfNode, useMaybeAsync } from '~/validation';

export type PropsValidity = Record<string, boolean | string>;

export default function useSchema(schema: Ref<InternalSchemaNode[]>, components: MaybeRefOrGetter<FormComponents>) {
  // the validity of the props of each node by its id, or the message of a failing validation,
  // validated once for the whole schema, while the nodes only show their result (see `FormNode`)
  const { result: propsValidity, isPending } = useMaybeAsync<PropsValidity>(() => {
    const nodes = [...schemaIterator(schema.value)];
    const results = nodes.map(node => propsValidityOfNode(node, toValue(components)));
    const byId = (resolved: (boolean | string)[]) => Object.fromEntries(nodes.map((node, index) => [node._id, resolved[index]]));
    return results.some(isPromiseLike) ? Promise.all(results).then(byId) : byId(results as (boolean | string)[]);
  }, {}, () => ({}));

  // the schema isn't valid until all of its async validations are done
  const isValid = computed(() => !isPending.value && Object.values(propsValidity.value).every(validity => validity === true));

  return { isValid, propsValidity };
}
