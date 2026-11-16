import type { FormComponents, InternalSchemaNode } from '~/types';
import { computed, type MaybeRefOrGetter, type Ref, toValue } from 'vue';
import { schemaIterator } from '~/utils';
import { isPromiseLike, propsValidityOfNode, useMaybeAsync } from '~/validation';

export type PropsValidity = Record<string, boolean | string>;

export default function useSchema(schema: Ref<InternalSchemaNode[]>, components: MaybeRefOrGetter<FormComponents>) {
  // the validity of the props of each node by its id, or the message of a failing validation,
  // validated once for the whole schema, while the nodes only show their result (see `FormNode`),
  // `undefined` if the validation of the whole schema failed (e.g. a malformed node)
  const { result, isPending } = useMaybeAsync<PropsValidity | undefined>(() => {
    const nodes = [...schemaIterator(schema.value)];
    const results = nodes.map(node => propsValidityOfNode(node, toValue(components)));
    const byId = (resolved: (boolean | string)[]) => Object.fromEntries(nodes.map((node, index) => [node._id, resolved[index]]));
    return results.some(isPromiseLike) ? Promise.all(results).then(byId) : byId(results as (boolean | string)[]);
  }, {}, () => undefined);

  const propsValidity = computed<PropsValidity>(() => result.value ?? {});

  // the schema isn't valid until all of its async validations are done, and never if they failed
  const isValid = computed(() => !isPending.value && result.value !== undefined && Object.values(result.value).every(validity => validity === true));

  return { isValid, propsValidity };
}
