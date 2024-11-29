import { computed, ref, type Ref, watch } from 'vue';
import type { FormData, InternalSchemaNode } from '~/types';
import { isNodeLayoutComponent, unsetDataOfNode } from '~/utils';
import { inject, provide } from './injectProvide';

export default function useNode(node: Ref<InternalSchemaNode>, repeatedFormIdentifier: Ref<string | number | undefined> = ref()) {
  const data = inject('data');
  const components = inject('components');

  const component = computed(() => components[node.value.type]?.component);
  const isLayoutComponent = computed(() => isNodeLayoutComponent(node.value, components));

  const modelValue = computed({
    get() {
      if (isLayoutComponent.value) {
        return data.value;
      }
      if (!node.value.name) {
        return undefined;
      }
      if (Array.isArray(data.value) || typeof data.value !== 'object') {
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
      if (data.value === undefined || data.value === null) {
        data.value = { [node.value.name]: newValue };
      }
      else if (Array.isArray(data.value)) {
        // Nothing to do for now
      }
      else if (typeof data.value === 'object') {
        data.value[node.value.name] = newValue;
      }
    },
  });

  provide('data', modelValue);

  const validator = inject('validator', true);
  const error = computed(() => {
    const message = validator(node.value, modelValue.value);
    if (message === true) {
      return undefined;
    }
    return message;
  });

  const showIf = inject('showIf', false);
  const isShown = computed(() => {
    if (showIf) {
      // only evaluate showIf when we are not building up the form
      // but in edit mode we still want to show the component but highlighted
      return showIf(node.value);
    }
    return true;
  });

  const nodeIdForValidation = computed(() => {
    if (repeatedFormIdentifier.value !== undefined) {
      return `${node.value._id}.${repeatedFormIdentifier.value}`;
    }
    return node.value._id;
  });

  const validityMap = inject('validityMap');

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
      unsetDataOfNode(node.value, data.value, components);
      delete validityMap.value[nodeIdForValidation.value];
    }
    else {
      validityMap.value[nodeIdForValidation.value] = isValid.value;
    }
  });

  watch(
    isValid,
    () => {
      validityMap.value[nodeIdForValidation.value] = isValid.value;
    },
    { immediate: true },
  );

  return {
    component,
    isLayoutComponent,
    modelValue,
    error,
    isShown,
  };
}
