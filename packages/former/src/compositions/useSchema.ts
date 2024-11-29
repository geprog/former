import { cloneDeep } from 'lodash';
import { computed, ref, type Ref, watch } from 'vue';
import type { FieldData, FormData, InternalSchemaNode } from '~/types';
import { isNodeLayoutComponent } from '~/utils';
import { inject } from './injectProvide';

export function prepareSchemaForRenderer(schema: Ref<InternalSchemaNode[]>, data: Ref<FormData>) {
  const components = inject('components');

  function getModelValue(node: InternalSchemaNode): FieldData | FormData {
    if (node.name) {
      return data.value[node.name];
    }
    if (isNodeLayoutComponent(node, components)) {
      return data.value;
    }
    return undefined;
  }

  function unsetDataOfNode(node: InternalSchemaNode, nodeData: FormData): FormData {
    if (node.name) {
      return { ...nodeData, [node.name]: undefined };
    }
    else if (isNodeLayoutComponent(node, components) && node.children) {
      let children = node.children;
      if (!Array.isArray(children)) {
        children = Object.values(children).flatMap(childrenOfCategory => childrenOfCategory);
      }
      return children.reduce<FormData>((updatedData, child) => {
        return unsetDataOfNode(child, updatedData);
      }, nodeData as FormData);
    }
    return nodeData;
  }

  const cachedData = ref(cloneDeep(data.value));
  watch(data, () => {
    cachedData.value = cloneDeep(data.value);
  });

  return computed(() => schema.value.map(node => ({
    node,
    modelValue: getModelValue(node),
    updateData(newData: FieldData | FormData) {
      if (newData === undefined) {
        data.value = unsetDataOfNode(node, cloneDeep(data.value));
        return;
      }
      if (isNodeLayoutComponent(node, components)) {
        data.value = newData as FormData;
        return;
      }

      if (node.name) {
        const updatedData = cachedData.value;
        updatedData[node.name] = newData as FieldData;
        data.value = updatedData;
      }
    },
  })));
}
