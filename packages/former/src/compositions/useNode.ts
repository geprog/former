import type { DataPath, DataScope, InternalSchemaNode, ValidationContext } from '~/types';
import { computed, ref, type Ref, watch } from 'vue';
import { isNodeLayoutComponent, unsetDataOfNode } from '~/utils';
import { useMaybeAsync, validateComponent } from '~/validation';
import { inject, provide } from './injectProvide';
import { useHasContent } from './useHasContent';

export default function useNode(node: Ref<InternalSchemaNode>) {
  const data = inject('data');
  const components = inject('components');
  const validityMap = inject('validityMap');

  const component = computed(() => components.value[node.value.type]?.component);
  const isLayoutComponent = computed(() => isNodeLayoutComponent(node.value, components.value));

  const modelValue = computed({
    get() {
      if (isLayoutComponent.value) {
        return data.value;
      }
      if (!node.value.name) {
        return undefined;
      }
      if (data.value === null || Array.isArray(data.value) || typeof data.value !== 'object') {
        return data.value;
      }
      return data.value[node.value.name];
    },
    set(newValue) {
      if (isLayoutComponent.value) {
        data.value = newValue;
      }
      if (!node.value.name) {
        return;
      }
      // a cleared field is stored as `null` so that its key survives JSON serialization,
      // otherwise e.g. its preset would be re-applied after the data was saved and loaded again
      const value = newValue === undefined ? null : newValue;
      if (data.value === undefined || data.value === null) {
        data.value = { [node.value.name]: value };
      }
      else if (Array.isArray(data.value)) {
        // Nothing to do for now
      }
      else if (typeof data.value === 'object') {
        data.value[node.value.name] = value;
      }
    },
  });

  provide('data', modelValue);

  // whether the node's key exists in the data, regardless of its value (used e.g. for presets)
  const hasDataKey = computed(() => {
    if (!node.value.name || data.value === null || typeof data.value !== 'object' || Array.isArray(data.value)) {
      return false;
    }
    return node.value.name in data.value;
  });
  provide('hasDataKey', hasDataKey);

  const parentDataScopes = inject('dataScopes', false);
  const dataScopes = computed<DataScope[]>(() => parentDataScopes?.value ?? [{ data: data.value, path: [] }]);
  // the data of a node is always in the closest scope, as only scopes (e.g. groups) contain nested data,
  // while layout components pass the data of their parent through
  const dataPath = computed<DataPath>(() => {
    const path = dataScopes.value[0].path;
    return isLayoutComponent.value || !node.value.name ? path : [...path, node.value.name];
  });
  // the data of a named node with children (e.g. a group) is the scope of its children,
  // while the items of lists (e.g. repeaters) provide their scopes themselves (see `FormDataProvider`)
  provide('dataScopes', computed(() => {
    if (isLayoutComponent.value || !node.value.name || !node.value.children || components.value[node.value.type]?.isList) {
      return dataScopes.value;
    }
    return [{ node: node.value, data: modelValue.value, path: dataPath.value }, ...dataScopes.value];
  }));

  const validationContext = computed<ValidationContext>(() => ({
    node: node.value,
    path: dataPath.value,
    scopes: dataScopes.value,
  }));

  const error = useMaybeAsync(
    () => validateComponent(components.value, node.value, modelValue.value, validationContext.value),
    undefined,
  );

  const showIf = inject('showIf', false);
  const isShown = computed(() => {
    if (showIf) {
      // only evaluate showIf when we are not building up the form
      // but in edit mode we still want to show the component but highlighted
      return showIf(node.value);
    }
    return true;
  });

  // whether the node and all its parents are shown (e.g. hidden nodes stay mounted in build mode)
  const parentIsShown = inject('isShown', false);
  provide('isShown', computed(() => isShown.value && (parentIsShown?.value ?? true)));

  // whether the node shows something in read mode, e.g. not a field without value or a group with only such fields
  const hasContent = useHasContent(() => [node.value], data);

  const childrenValidityMap = ref<Record<string, boolean | undefined>>({});
  provide('validityMap', childrenValidityMap);

  const areChildrenValid = computed(() => {
    return Object.values(childrenValidityMap.value).every(
      validFlag => validFlag !== false,
    );
  });

  const isValid = computed(() => !isShown.value || (error.value === undefined && areChildrenValid.value));

  watch(isShown, () => {
    if (!isShown.value) {
      unsetDataOfNode(node.value, data.value, components.value);
      delete validityMap.value[node.value._id];
    }
    else {
      validityMap.value[node.value._id] = isValid.value;
    }
  });

  watch(
    isValid,
    () => {
      validityMap.value[node.value._id] = isValid.value;
    },
    { immediate: true },
  );

  return {
    component,
    isLayoutComponent,
    modelValue,
    error,
    isShown,
    isValid,
    validityMap,
    hasDataKey,
    hasContent,
  };
}
