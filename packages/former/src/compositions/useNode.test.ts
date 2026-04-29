import type { FormComponents, FormData, InternalSchemaNode, Validator } from '~/types';
import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, inject, nextTick, provide, ref, type Ref } from 'vue';
import useNode from './useNode';

const StubLayout = defineComponent({ name: 'StubLayout', template: '<div class="stub-layout" />' });
const StubField = defineComponent({ name: 'StubField', template: '<div class="stub-field" />' });

const LAYOUT_TYPE = 'box';
const FIELD_TYPE = 'textField';
function defaultComponents(): FormComponents {
  return {
    [LAYOUT_TYPE]: {
      label: 'Box',
      propsSchema: [],
      component: StubLayout,
    },
    [FIELD_TYPE]: {
      label: 'Text field',
      propsSchema: [{ type: 'text', name: '$name' }],
      component: StubField,
    },
  };
}

type MountUseNodeOptions = {
  node: Ref<InternalSchemaNode>;
  data?: Ref<FormData | unknown>;
  validityMap?: Ref<Record<string, boolean | undefined>>;
  components?: FormComponents;
  validator?: Validator;
  /** Omit key so `showIf` is not provided. Use `showIf: undefined` to call `provide('showIf', undefined)`. */
  showIf?: ((node: InternalSchemaNode) => boolean) | undefined;
  injectChildValidity?: Record<string, boolean | undefined>;
};

function mountUseNode(options: MountUseNodeOptions) {
  const data = options.data ?? ref<FormData>({});
  const validityMap = options.validityMap ?? ref<Record<string, boolean | undefined>>({});
  const components = options.components ?? defaultComponents();
  const validator = options.validator ?? vi.fn<Validator>(() => true);

  const ValidityInjector = defineComponent({
    name: 'ValidityInjector',
    setup() {
      const childMap = inject<Ref<Record<string, boolean | undefined>>>('validityMap');
      if (options.injectChildValidity && childMap) {
        Object.assign(childMap.value, options.injectChildValidity);
      }
      return () => null;
    },
  });

  let useNodeResult: ReturnType<typeof useNode> | undefined;

  const Harness = defineComponent({
    name: 'UseNodeHarness',
    components: { ValidityInjector },
    template: 'injectChildValidity' in options
      ? '<div><ValidityInjector /></div>'
      : '<div />',
    setup() {
      useNodeResult = useNode(options.node);
      return useNodeResult;
    },
  });

  const Parent = defineComponent({
    name: 'UseNodeParent',
    setup() {
      provide('data', data);
      provide('components', components);
      provide('validityMap', validityMap);
      provide('validator', validator);
      if ('showIf' in options) {
        provide('showIf', options.showIf);
      }
      return () => h(Harness);
    },
  });

  mount(Parent);

  if (!useNodeResult) {
    throw new Error('useNodeResult is undefined');
  }

  return { ...useNodeResult, data, validityMap, validator };
}

describe('useNode', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('component and layout', () => {
    it('resolves component from components[node.type].component', () => {
      const node = ref<InternalSchemaNode>({ _id: 'n1', type: FIELD_TYPE, name: 'a' });
      const { component } = mountUseNode({ node });
      expect(component.value).toBe(StubField);
    });

    it('treats the node as layout when no propsSchema entry has name $name', () => {
      const node = ref<InternalSchemaNode>({ _id: 'n1', type: LAYOUT_TYPE });
      const { isLayoutComponent } = mountUseNode({ node });
      expect(isLayoutComponent.value).toBe(true);
    });

    it('treats the node as a field when some propsSchema has name $name', () => {
      const node = ref<InternalSchemaNode>({ _id: 'n1', type: FIELD_TYPE, name: 'x' });
      const { isLayoutComponent } = mountUseNode({ node });
      expect(isLayoutComponent.value).toBe(false);
    });
  });

  describe('modelValue (getter)', () => {
    it('for a layout node, returns the full form data object', () => {
      const node = ref<InternalSchemaNode>({ _id: 'n1', type: LAYOUT_TYPE });
      const data = ref<FormData>({ a: 1, b: 2 });
      const { modelValue } = mountUseNode({ node, data });
      expect(modelValue.value).toEqual({ a: 1, b: 2 });
    });

    it('for a field node without name, returns undefined', () => {
      const node = ref<InternalSchemaNode>({ _id: 'n1', type: FIELD_TYPE });
      const data = ref<FormData>({ x: 1 });
      const { modelValue } = mountUseNode({ node, data });
      expect(modelValue.value).toBeUndefined();
    });

    it('when data is an array, returns the array as model value (non-field path)', () => {
      const node = ref<InternalSchemaNode>({ _id: 'n1', type: FIELD_TYPE, name: 'items' });
      const data = ref([1, 2] as unknown as FormData);
      const { modelValue } = mountUseNode({ node, data });
      expect(modelValue.value).toEqual([1, 2]);
    });

    it('when data is a non-object (e.g. primitive), returns that value', () => {
      const node = ref<InternalSchemaNode>({ _id: 'n1', type: FIELD_TYPE, name: 'n' });
      const data = ref(42 as unknown as FormData);
      const { modelValue } = mountUseNode({ node, data });
      expect(modelValue.value).toBe(42);
    });

    it('when data is a plain object, returns data[node.name]', () => {
      const node = ref<InternalSchemaNode>({ _id: 'n1', type: FIELD_TYPE, name: 'email' });
      const data = ref<FormData>({ email: 'a@b.c', other: 1 });
      const { modelValue } = mountUseNode({ node, data });
      expect(modelValue.value).toBe('a@b.c');
    });
  });

  describe('modelValue (setter)', () => {
    it('for a layout node, replaces the full data ref', () => {
      const node = ref<InternalSchemaNode>({ _id: 'n1', type: LAYOUT_TYPE });
      const data = ref<FormData>({ a: 1 });
      const { modelValue, data: dataRef } = mountUseNode({ node, data });
      const next = { b: 2 };
      modelValue.value = next;
      expect(dataRef.value).toStrictEqual(next);
    });

    it('for a field without name, does not mutate data', () => {
      const node = ref<InternalSchemaNode>({ _id: 'n1', type: FIELD_TYPE });
      const data = ref<FormData>({ x: 1 });
      const snapshot = { ...data.value };
      const { modelValue } = mountUseNode({ node, data });
      modelValue.value = 'ignored';
      expect(data.value).toEqual(snapshot);
    });

    it('when data is null, a layout node can replace the root value via modelValue', () => {
      const node = ref<InternalSchemaNode>({ _id: 'n1', type: LAYOUT_TYPE });
      const data = ref(null as unknown as FormData);
      const { modelValue, data: dataRef } = mountUseNode({ node, data: data as Ref<FormData> });
      modelValue.value = { x: 1 };
      expect(dataRef.value).toEqual({ x: 1 });
    });

    it('when data is null for a named field, evaluating modelValue throws before setter can run', () => {
      const node = ref<InternalSchemaNode>({ _id: 'n1', type: FIELD_TYPE, name: 'f' });
      const data = ref(null as unknown as FormData);
      expect(() => mountUseNode({ node, data: data as Ref<FormData> })).toThrow();
    });

    it('when data is undefined, initializes an object and sets the field', () => {
      const node = ref<InternalSchemaNode>({ _id: 'n1', type: FIELD_TYPE, name: 'f' });
      const data = ref(undefined as FormData | undefined);
      const { modelValue, data: dataRef } = mountUseNode({ node, data: data as Ref<FormData> });
      modelValue.value = 'v';
      expect(dataRef.value).toEqual({ f: 'v' });
    });

    it('when data is an object, sets data[node.name]', () => {
      const node = ref<InternalSchemaNode>({ _id: 'n1', type: FIELD_TYPE, name: 'f' });
      const data = ref<FormData>({ f: 'old', g: 1 });
      const { modelValue } = mountUseNode({ node, data });
      modelValue.value = 'new';
      expect(data.value.f).toBe('new');
      expect(data.value.g).toBe(1);
    });

    it('when data is an array, does not assign by field name (current no-op behavior)', () => {
      const node = ref<InternalSchemaNode>({ _id: 'n1', type: FIELD_TYPE, name: 'f' });
      const data = ref([1, 2] as unknown as FormData);
      const { modelValue } = mountUseNode({ node, data });
      modelValue.value = 99;
      expect(data.value).toEqual([1, 2]);
    });

    it('when data is anything else (e.g. a symbol), do nothing', () => {
      const node = ref<InternalSchemaNode>({ _id: 'n1', type: FIELD_TYPE, name: 'f' });
      const data = ref(Symbol('data') as unknown as FormData);
      const initialValue = data.value;
      const { modelValue } = mountUseNode({ node, data });
      modelValue.value = 'new';
      expect(data.value).toBe(initialValue);
    });
  });

  describe('error', () => {
    it('is undefined when the validator returns true', () => {
      const node = ref<InternalSchemaNode>({ _id: 'n1', type: FIELD_TYPE, name: 'a' });
      const validator = vi.fn<Validator>(() => true);
      const { error } = mountUseNode({ node, validator });
      expect(error.value).toBeUndefined();
    });

    it('is the string message when the validator returns a string', () => {
      const node = ref<InternalSchemaNode>({ _id: 'n1', type: FIELD_TYPE, name: 'a' });
      const validator: Validator = vi.fn(() => 'bad');
      const { error } = mountUseNode({ node, validator });
      expect(error.value).toBe('bad');
    });
  });

  describe('isShown', () => {
    it('is true when showIf is not provided', () => {
      const node = ref<InternalSchemaNode>({ _id: 'n1', type: FIELD_TYPE, name: 'a' });
      const { isShown } = mountUseNode({ node });
      expect(isShown.value).toBe(true);
    });

    it('is true when showIf is provided but the injected predicate is undefined', () => {
      const node = ref<InternalSchemaNode>({ _id: 'n1', type: FIELD_TYPE, name: 'a' });
      const { isShown } = mountUseNode({ node, showIf: undefined });
      expect(isShown.value).toBe(true);
    });

    it('uses showIf(node) when a predicate is provided', () => {
      const node = ref<InternalSchemaNode>({ _id: 'n1', type: FIELD_TYPE, name: 'a' });
      const showIf = vi.fn(() => false);
      const { isShown } = mountUseNode({ node, showIf });
      expect(isShown.value).toBe(false);
      expect(showIf).toHaveBeenCalledWith(node.value);
    });
  });

  describe('isValid and validityMap', () => {
    it('is invalid when the field error is set', () => {
      const node = ref<InternalSchemaNode>({ _id: 'n1', type: FIELD_TYPE, name: 'a' });
      const validator: Validator = vi.fn(() => 'err');
      const { isValid } = mountUseNode({ node, validator });
      expect(isValid.value).toBe(false);
    });

    it('is invalid when any child entry in the nested validityMap is false', () => {
      const node = ref<InternalSchemaNode>({ _id: 'n1', type: FIELD_TYPE, name: 'a' });
      const { isValid } = mountUseNode({
        node,
        injectChildValidity: { child: false },
      });
      expect(isValid.value).toBe(false);
    });

    it('is valid when shown, no error, and all children are valid or undefined', () => {
      const node = ref<InternalSchemaNode>({ _id: 'n1', type: FIELD_TYPE, name: 'a' });
      const { isValid } = mountUseNode({
        node,
        injectChildValidity: { child: true, other: undefined },
      });
      expect(isValid.value).toBe(true);
    });

    it('mirrors the current isValid to the parent validityMap for this node _id (immediate watch)', () => {
      const node = ref<InternalSchemaNode>({ _id: 'nid', type: FIELD_TYPE, name: 'a' });
      const { isValid, validityMap } = mountUseNode({ node });
      expect(validityMap.value.nid).toBe(isValid.value);
    });
  });

  describe('when visibility toggles (isShown watch)', () => {
    it('clears the node data via unsetDataOfNode when isShown becomes false', async () => {
      const visible = ref(true);
      const showIf = () => visible.value;
      const node = ref<InternalSchemaNode>({ _id: 'n1', type: FIELD_TYPE, name: 'email' });
      const data = ref<FormData>({ email: 'keep@x.y', other: 2 });
      mountUseNode({ node, data, showIf });

      visible.value = false;
      await nextTick();
      expect(data.value.email).toBeUndefined();
      expect(data.value.other).toBe(2);
    });

    it('removes _id from validityMap when isShown becomes false', async () => {
      const visible = ref(true);
      const showIf = () => visible.value;
      const node = ref<InternalSchemaNode>({ _id: 'rm', type: FIELD_TYPE, name: 'a' });
      const data = ref<FormData>({ a: 1 });
      const validityMap = ref<Record<string, boolean | undefined>>({ rm: true });
      mountUseNode({ node, data, validityMap, showIf });

      visible.value = false;
      await nextTick();
      expect(validityMap.value.rm).toBeUndefined();
    });

    it('sets validityMap[_id] to isValid when isShown becomes true', async () => {
      const visible = ref(true);
      const showIf = () => visible.value;
      const node = ref<InternalSchemaNode>({ _id: 'add', type: FIELD_TYPE, name: 'a' });
      const data = ref<FormData>({ a: 1 });
      const validityMap = ref<Record<string, boolean | undefined>>({});
      mountUseNode({ node, data, validityMap, showIf });

      await nextTick();
      expect(validityMap.value.add).toBe(true);

      visible.value = false;
      await nextTick();
      expect(validityMap.value.add).toBeUndefined();

      visible.value = true;
      await nextTick();
      expect(validityMap.value.add).toBe(true);
    });
  });

  describe('missing injection (errors)', () => {
    function mountBrokenParent(provideKeys: Array<'data' | 'components' | 'validityMap' | 'validator'>) {
      const node = ref<InternalSchemaNode>({ _id: 'n1', type: FIELD_TYPE, name: 'a' });
      const data = ref<FormData>({});
      const validityMap = ref<Record<string, boolean | undefined>>({});
      const components = defaultComponents();
      const validator: Validator = () => true;

      const Harness = defineComponent({
        name: 'UseNodeHarness',
        template: '<div />',
        setup() {
          return useNode(node);
        },
      });

      const Parent = defineComponent({
        name: 'BrokenParent',
        setup() {
          if (provideKeys.includes('data')) {
            provide('data', data);
          }
          if (provideKeys.includes('components')) {
            provide('components', components);
          }
          if (provideKeys.includes('validityMap')) {
            provide('validityMap', validityMap);
          }
          if (provideKeys.includes('validator')) {
            provide('validator', validator);
          }
          return () => h(Harness);
        },
      });

      return mount(Parent);
    }

    it('throws when data is not provided (required inject)', () => {
      expect(() =>
        mountBrokenParent(['components', 'validityMap', 'validator']),
      ).toThrow('Please provide a value for data');
    });

    it('throws when components is not provided', () => {
      expect(() =>
        mountBrokenParent(['data', 'validityMap', 'validator']),
      ).toThrow('Please provide a value for components');
    });

    it('throws when validator is not provided', () => {
      expect(() =>
        mountBrokenParent(['data', 'components', 'validityMap']),
      ).toThrow('Please provide a value for validator');
    });

    it('throws when validityMap is not provided', () => {
      expect(() =>
        mountBrokenParent(['data', 'components', 'validator']),
      ).toThrow('Please provide a value for validityMap');
    });
  });
});
