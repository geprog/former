import type { Ref } from 'vue';
import type { FieldData, FormComponents, FormData, InternalSchemaNode, InternalShowIfPredicate, Mode, SchemaNode, ShowIfPredicate, Texts, Validator } from '~/types';
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { inject as formerInject } from '~/compositions/injectProvide';
import { toInternalSchema } from '~/utils';

import Former from './Former.vue';

vi.mock('./FormContent.vue', () => ({
  default: defineComponent({
    name: 'FormContentStub',
    template: '<div data-form-content-stub />',
  }),
}));

const DynamicComponent = defineComponent({
  name: 'DynamicComponent',
  props: {
    id: { type: String, required: true },
    mode: { type: String, required: true },
    error: { type: String, default: undefined },
    modelValue: { type: [String, Number, Boolean, Object, Array], default: undefined },
    custom: { type: String, default: undefined },
  },
  emits: ['update:modelValue'],
  template: '<span data-dynamic />',
});

function createComponentsFixture(): FormComponents {
  return {
    text: {
      label: 'Text',
      propsSchema: [{ type: 'text', name: '$name' }],
      component: DynamicComponent,
    },
  };
}

type FormerProbeBundle = {
  schema: Ref<InternalSchemaNode[]>;
  data: Ref<FormData | FieldData>;
  rootSchema: Ref<SchemaNode[]>;
  validityMap: Ref<Record<string, boolean | undefined>>;
  selectedNode: Ref<InternalSchemaNode | undefined>;
  formerIsUpdating: Ref<boolean>;
  mode: Ref<Mode>;
  components: FormComponents;
  texts: Ref<Texts>;
  showIf: InternalShowIfPredicate | undefined;
};

let activeFormerProbe: FormerProbeBundle | null = null;

const FormerInjectProbe = defineComponent({
  name: 'FormerInjectProbe',
  setup() {
    const bundle = {
      schema: formerInject('schema'),
      data: formerInject('data'),
      rootSchema: formerInject('rootSchema'),
      validityMap: formerInject('validityMap'),
      selectedNode: formerInject('selectedNode'),
      formerIsUpdating: formerInject('formerIsUpdating'),
      mode: formerInject('mode'),
      components: formerInject('components'),
      texts: formerInject('texts'),
      showIf: formerInject('showIf'),
    } satisfies FormerProbeBundle;
    activeFormerProbe = bundle;
    onBeforeUnmount(() => {
      activeFormerProbe = null;
    });
    return {};
  },
  template: '<div data-former-inject-probe />',
});

const SelectedNodeMutator = defineComponent({
  name: 'SelectedNodeMutator',
  setup() {
    const selectedNode = formerInject('selectedNode');
    onMounted(async () => {
      await nextTick();
      selectedNode.value = { _id: 'scoped-1', type: 'text', name: 'f' };
    });
    return () => null;
  },
});

const mountedWrappers: Array<ReturnType<typeof mount>> = [];

interface MountFormerOptions {
  initialSchema?: SchemaNode[];
  initialData?: FormData;
  mode?: Mode;
  texts?: Partial<Texts>;
  isUpdating?: boolean;
  showIf?: ShowIfPredicate;
  validator?: Validator;
  components?: FormComponents;
  /** When true, render inject probe in default slot instead of built-in FormContent stub */
  withInjectProbe?: boolean;
  /** Custom default slot: `custom` renders a marker div; `scoped` exercises selectedNode slot props */
  slotOverride?: 'custom' | 'scoped';
}

function mountFormer(options?: MountFormerOptions) {
  const schema = ref<SchemaNode[]>(options?.initialSchema ?? []);
  const data = ref<FormData>(options?.initialData ?? {});
  const isUpdatingRef = ref(options?.isUpdating ?? false);
  const onValid = vi.fn();
  const onSchemaValid = vi.fn();
  const components = options?.components ?? createComponentsFixture();
  const mode = ref<Mode>(options?.mode ?? 'edit');
  const textsProp = ref<Partial<Texts>>(options?.texts ?? {});
  const showIfFn = options?.showIf;
  const validatorFn = options?.validator;

  const slotKind
    = options?.slotOverride === 'custom'
      ? 'custom'
      : options?.slotOverride === 'scoped'
        ? 'scoped'
        : options?.withInjectProbe
          ? 'inject'
          : 'none';

  function buildParentTemplate(kind: typeof slotKind): string {
    const head = `
      <Former
        :schema="schema"
        :data="data"
        :components="components"
        :mode="mode"
        :texts="textsProp"
        :is-updating="isUpdating"
        :show-if="showIfFn"
        :validator="validatorFn"
        @update:schema="schema = $event"
        @update:data="data = $event"
        @valid="onValid"
        @schema-valid="onSchemaValid"
      >`;
    if (kind === 'none') {
      return `${head}</Former>`;
    }
    if (kind === 'inject') {
      return `${head}<FormerInjectProbe /></Former>`;
    }
    if (kind === 'custom') {
      return `${head}<div data-custom-slot /></Former>`;
    }
    return `${head}<template #default="{ selectedNode }"><span :data-scoped-selected="selectedNode ? (selectedNode._id || 'no-id') : 'none'"></span><SelectedNodeMutator /></template></Former>`;
  }

  const Parent = defineComponent({
    components: { Former, FormerInjectProbe, SelectedNodeMutator },
    setup() {
      return {
        schema,
        data,
        components,
        mode,
        textsProp,
        isUpdating: isUpdatingRef,
        showIfFn,
        validatorFn,
        onValid,
        onSchemaValid,
      };
    },
    template: buildParentTemplate(slotKind),
  });

  const wrapper = mount(Parent, { attachTo: document.body });
  mountedWrappers.push(wrapper);

  function getProbe(): FormerProbeBundle {
    expect(wrapper.findComponent(FormerInjectProbe).exists()).toBe(true);
    expect(activeFormerProbe).not.toBeNull();
    return activeFormerProbe!;
  }

  return {
    wrapper,
    schema,
    data,
    isUpdatingRef,
    onValid,
    onSchemaValid,
    getProbe,
  };
}

afterEach(() => {
  while (mountedWrappers.length) {
    const w = mountedWrappers.pop()!;
    if (w.exists()) {
      w.unmount();
    }
  }
  activeFormerProbe = null;
});

describe('component Former', () => {
  describe('default slot', () => {
    it('renders stubbed FormContent when no custom default slot is passed', () => {
      const { wrapper } = mountFormer();
      expect(wrapper.find('[data-form-content-stub]').exists()).toBe(true);
    });

    it('does not render FormContent stub when default slot is overridden', () => {
      const { wrapper } = mountFormer({ slotOverride: 'custom' });
      expect(wrapper.find('[data-form-content-stub]').exists()).toBe(false);
      expect(wrapper.find('[data-custom-slot]').exists()).toBe(true);
    });
  });

  describe('scoped slot and selectedNode', () => {
    it('passes reactive selectedNode into the default scoped slot', async () => {
      const { wrapper } = mountFormer({ slotOverride: 'scoped' });
      const attr = () => wrapper.get('[data-scoped-selected]').attributes('data-scoped-selected');
      expect(attr()).toBe('none');
      await flushPromises();
      await nextTick();
      expect(attr()).toBe('scoped-1');
    });
  });

  describe('injected providers', () => {
    it('exposes mode, components, formerIsUpdating, and merged texts via provide', async () => {
      const { getProbe } = mountFormer({
        withInjectProbe: true,
        mode: 'build',
        texts: { dragHint: 'Custom hint' },
        isUpdating: true,
      });
      await nextTick();
      const probe = getProbe();
      expect(probe).not.toBeNull();
      expect(probe!.mode.value).toBe('build');
      expect(probe!.components).toEqual(createComponentsFixture());
      expect(probe!.formerIsUpdating.value).toBe(true);
      expect(probe!.texts.value.dragHint).toBe('Custom hint');
    });

    it('uses default dragHint when texts prop is empty', async () => {
      const { getProbe } = mountFormer({ withInjectProbe: true, texts: {} });
      await nextTick();
      expect(getProbe()!.texts.value.dragHint).toBe('Here you can drag elements');
    });

    it('reflects isUpdating prop changes on formerIsUpdating', async () => {
      const { getProbe, isUpdatingRef } = mountFormer({
        withInjectProbe: true,
        isUpdating: false,
      });
      await nextTick();
      expect(getProbe()!.formerIsUpdating.value).toBe(false);
      isUpdatingRef.value = true;
      await nextTick();
      expect(getProbe()!.formerIsUpdating.value).toBe(true);
    });
  });

  describe('schema sync', () => {
    it('syncs parent schema model into injected internal schema', async () => {
      const { schema, getProbe } = mountFormer({
        withInjectProbe: true,
        initialSchema: [],
      });
      await nextTick();
      expect(getProbe()!.schema.value).toEqual([]);

      schema.value = [{ type: 'text', name: 'fieldA' }];
      await nextTick();
      const internal = getProbe()!.schema.value;
      expect(internal).toHaveLength(1);
      expect(internal[0]!.type).toBe('text');
      expect(internal[0]!.name).toBe('fieldA');
      expect(internal[0]!._id).toBeTruthy();
    });

    it('pushes internal schema changes back to the parent model via toSchema', async () => {
      const { schema, getProbe } = mountFormer({
        withInjectProbe: true,
        initialSchema: [{ type: 'text', name: 'only' }],
      });
      await nextTick();
      const probe = getProbe()!;
      const nextInternal = toInternalSchema([{ type: 'text', name: 'replaced' }]);
      probe.schema.value = nextInternal;
      await nextTick();
      expect(schema.value).toHaveLength(1);
      expect(schema.value[0]!.name).toBe('replaced');
      expect(schema.value[0]).not.toHaveProperty('_id');
    });
  });

  describe('data sync', () => {
    it('syncs parent data into injected data ref', async () => {
      const { data, getProbe } = mountFormer({
        withInjectProbe: true,
        initialData: {},
      });
      await nextTick();
      data.value = { a: { nested: 1 } };
      await nextTick();
      expect(getProbe()!.data.value).toEqual({ a: { nested: 1 } });
    });

    it('syncs mutations on injected data back to the parent model', async () => {
      const { data, getProbe } = mountFormer({
        withInjectProbe: true,
        initialData: { x: 1 },
      });
      await nextTick();
      getProbe()!.data.value = { x: 2, y: { z: 3 } };
      await nextTick();
      expect(data.value).toEqual({ x: 2, y: { z: 3 } });
    });
  });

  describe('showIf', () => {
    it('injects a predicate that returns true when showIf prop is omitted', async () => {
      const { getProbe } = mountFormer({ withInjectProbe: true });
      await nextTick();
      const fn = getProbe().showIf!;
      expect(fn).toBeTypeOf('function');
      expect(fn({ type: 'text', name: 'n' })).toBe(true);
    });

    it('delegates to the showIf prop with node, data, and schema', async () => {
      const showIf = vi.fn().mockReturnValue(false);
      const { getProbe, schema, data } = mountFormer({
        withInjectProbe: true,
        initialSchema: [{ type: 'text', name: 's1' }],
        initialData: { foo: 'bar' },
        showIf,
      });
      await nextTick();
      const node: SchemaNode = { type: 'text', name: 'n' };
      expect(getProbe().showIf?.(node)).toBe(false);
      expect(showIf).toHaveBeenCalledWith(node, data.value, schema.value);
    });
  });

  describe('validator and schemaValid', () => {
    it('emits schemaValid true for an empty schema with default validator', async () => {
      const { onSchemaValid } = mountFormer({ initialSchema: [] });
      await nextTick();
      const schemaCalls = onSchemaValid.mock.calls;
      expect(schemaCalls[schemaCalls.length - 1]?.[0]).toBe(true);
    });

    it('emits schemaValid false when validator returns an error string', async () => {
      const validator: Validator = (propsNode, value) =>
        propsNode.name === '$name' && value === '' ? 'required' : true;
      const { onSchemaValid } = mountFormer({
        initialSchema: [{ type: 'text', name: '' }],
        validator,
      });
      await nextTick();
      expect(onSchemaValid.mock.calls.some(c => c[0] === false)).toBe(true);
    });
  });

  describe('valid emit and validityMap', () => {
    it('emits valid true when validityMap has no false entries', async () => {
      const { onValid } = mountFormer({ withInjectProbe: true });
      await nextTick();
      const validCalls = onValid.mock.calls;
      expect(validCalls[validCalls.length - 1]?.[0]).toBe(true);
    });

    it('emits valid false when any validityMap entry is false', async () => {
      const { onValid, getProbe } = mountFormer({ withInjectProbe: true });
      await nextTick();
      onValid.mockClear();
      getProbe()!.validityMap.value = { field1: false };
      await nextTick();
      expect(onValid.mock.calls.some(c => c[0] === false)).toBe(true);
    });
  });
});
