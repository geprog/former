import type { DataScope, InternalSchemaNode, ValidationContext } from '~/types';
import { computed, onBeforeUnmount, ref, type Ref, watch } from 'vue';
import { dataOfNode, dataPathOfNode, dataScopesOfChildren, isNodeLayoutComponent, unsetDataOfNode } from '~/utils';
import { errorMessage, useMaybeAsync, validateComponent } from '~/validation';
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
      return dataOfNode(node.value, data.value, components.value);
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
  const dataPath = computed(() => dataPathOfNode(node.value, dataScopes.value, components.value));
  // the items of lists (e.g. repeaters) provide their scopes themselves (see `FormDataProvider`)
  provide('dataScopes', computed(() => dataScopesOfChildren(node.value, data.value, dataScopes.value, components.value)));

  const validationContext = computed<ValidationContext>(() => ({
    node: node.value,
    path: dataPath.value,
    scopes: dataScopes.value,
  }));

  const showIf = inject('showIf', false);
  const isShown = computed(() => {
    if (showIf) {
      // only evaluate showIf when we are not building up the form
      // but in edit mode we still want to show the component but highlighted
      return showIf(node.value);
    }
    return true;
  });

  // hidden nodes aren't validated
  const { result: error, isPending: isValidating } = useMaybeAsync(
    () => (isShown.value ? validateComponent(components.value, node.value, modelValue.value, validationContext.value) : undefined),
    undefined,
    errorMessage,
  );

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

  // the node isn't valid until its async validation is done
  const isValid = computed(() => !isShown.value || (error.value === undefined && !isValidating.value && areChildrenValid.value));

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

  // a removed node (e.g. deleted or moved to another parent) mustn't keep its parent invalid,
  // removed before unmounting, as a node with the same id may already be mounted at its new place
  onBeforeUnmount(() => {
    delete validityMap.value[node.value._id];
  });

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
