import type { Ref } from 'vue';
import type { FieldData, FormComponents, FormData, InternalSchemaNode, InternalShowIfPredicate, Mode, SchemaNode, ShowIfPredicate, Texts } from '~/types';
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, markRaw, nextTick, onBeforeUnmount } from 'vue';
import { z } from 'zod';
import { inject as formerInject } from '~/compositions/injectProvide';
import { toInternalSchema } from '~/utils';

import FormContent from './FormContent.vue';
import Former from './Former.vue';

const DynamicComponent = defineComponent({
  name: 'DynamicComponent',
  props: {
    id: { type: String, required: true },
    mode: { type: String, required: true },
    error: { type: String, default: undefined },
    modelValue: {
      type: [String, Number, Boolean, Object, Array],
      default: undefined,
    },
    custom: { type: String, default: undefined },
  },
  emits: ['update:modelValue'],
  template: '<span data-dynamic />',
});

const COMPONENTS_FIXTURE: FormComponents = {
  text: {
    label: 'Text',
    propsSchema: [
      { type: 'text', name: '$name' },
    ],
    component: markRaw(DynamicComponent),
  },
};

type FormerProbeBundle = {
  schema: Ref<InternalSchemaNode[]>;
  data: Ref<FormData | FieldData>;
  validityMap: Ref<Record<string, boolean | undefined>>;
  selectedNode: Ref<InternalSchemaNode | undefined>;
  selectedNodePath: Ref<InternalSchemaNode[]>;
  mode: Ref<Mode>;
  components: Ref<FormComponents>;
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
      validityMap: formerInject('validityMap'),
      selectedNode: formerInject('selectedNode'),
      selectedNodePath: formerInject('selectedNodePath'),
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

describe('component Former', () => {
  afterEach(() => {
    activeFormerProbe = null;
  });

  describe('default slot', () => {
    it('renders stubbed FormContent when no custom default slot is passed', () => {
      const wrapper = mount(Former, {
        shallow: true,
        attachTo: document.body,
        global: { renderStubDefaultSlot: true },
        props: {
          schema: [],
          data: {},
          components: COMPONENTS_FIXTURE,
          mode: 'edit',
          texts: {},
        },
      });
      const fc = wrapper.findComponent(FormContent);
      expect(fc.exists()).toBe(true);
    });

    it('does not render FormContent stub when default slot is overridden', () => {
      const wrapper = mount(Former, {
        shallow: true,
        attachTo: document.body,
        global: { renderStubDefaultSlot: true },
        props: {
          schema: [],
          data: {},
          components: COMPONENTS_FIXTURE,
          mode: 'edit',
          texts: {},
        },
        slots: {
          default: () => h('div', { 'data-custom-slot': '' }),
        },
      });
      expect(wrapper.findComponent(FormContent).exists()).toBe(false);
      expect(wrapper.find('[data-custom-slot]').exists()).toBe(true);
    });
  });

  describe('scoped slot and selectedNode', () => {
    it('passes reactive selectedNode into the default scoped slot', async () => {
      const wrapper = mount(Former, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          components: { FormerInjectProbe },
          stubs: { FormerInjectProbe: false },
        },
        props: {
          schema: [],
          data: {},
          components: COMPONENTS_FIXTURE,
          mode: 'edit',
          texts: {},
        },
        slots: {
          default: ({ selectedNode }: { selectedNode: InternalSchemaNode | undefined }) =>
            h('div', [
              h('span', {
                'data-scoped-selected': selectedNode
                  ? (selectedNode._id || 'no-id')
                  : 'none',
              }),
              h(FormerInjectProbe),
            ]),
        },
      });
      await nextTick();
      const attr = () => wrapper.get('[data-scoped-selected]').attributes('data-scoped-selected');
      expect(attr()).toBe('none');
      activeFormerProbe!.selectedNode.value = { _id: 'scoped-1', type: 'text', name: 'f' };
      await nextTick();
      expect(attr()).toBe('scoped-1');
    });

    it('passes and provides the path of the selected node, following when it is moved', async () => {
      const schema: SchemaNode[] = [
        {
          type: 'text',
          name: 'group',
          children: [
            {
              type: 'text',
              name: 'repeater',
              children: {
                default: [
                  { type: 'text', name: 'field' },
                ],
              },
            },
          ],
        },
        { type: 'text', name: 'other' },
      ];
      const wrapper = mount(Former, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          components: { FormerInjectProbe },
          stubs: { FormerInjectProbe: false },
        },
        props: {
          'schema': schema,
          'onUpdate:schema': (value: SchemaNode[]) => wrapper.setProps({ schema: value }),
          'components': COMPONENTS_FIXTURE,
        },
        slots: {
          default: ({ selectedNodePath }: { selectedNodePath: InternalSchemaNode[] }) =>
            h('div', [
              h('span', {
                'data-scoped-path': selectedNodePath.map(n => n.name).join('/'),
              }),
              h(FormerInjectProbe),
            ]),
        },
      });
      await nextTick();
      const path = () => wrapper.get('[data-scoped-path]').attributes('data-scoped-path');
      expect(path()).toBe('');

      const internalSchema = activeFormerProbe!.schema;
      const field = (internalSchema.value[0].children as InternalSchemaNode[])[0].children as Record<string, InternalSchemaNode[]>;
      activeFormerProbe!.selectedNode.value = field.default[0];
      await nextTick();
      expect(path()).toBe('group/repeater');
      expect(activeFormerProbe!.selectedNodePath.value.map(n => n.name)).toStrictEqual(['group', 'repeater']);

      // move the selected node to the top of the form
      const moved = field.default.splice(0, 1)[0];
      internalSchema.value.push(moved);
      await nextTick();
      expect(path()).toBe('');

      activeFormerProbe!.selectedNode.value = undefined;
      await nextTick();
      expect(activeFormerProbe!.selectedNodePath.value).toStrictEqual([]);
    });
  });

  describe('injected providers', () => {
    it('exposes mode, components, and merged texts via provide', async () => {
      const wrapper = mount(Former, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          components: { FormerInjectProbe },
          stubs: { FormerInjectProbe: false },
        },
        props: {
          schema: [],
          data: {},
          components: COMPONENTS_FIXTURE,
          mode: 'build',
          texts: { dragHint: 'Custom hint' },
        },
        slots: {
          default: () => h(FormerInjectProbe),
        },
      });
      await nextTick();
      expect(wrapper.findComponent(FormerInjectProbe).exists()).toBe(true);
      expect(activeFormerProbe).not.toBeNull();
      const probe = activeFormerProbe!;
      expect(probe.mode.value).toBe('build');
      expect(probe.components.value).toEqual(COMPONENTS_FIXTURE);
      expect(probe.texts.value.dragHint).toBe('Custom hint');
    });

    it('uses default dragHint when texts prop is empty', async () => {
      mount(Former, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          components: { FormerInjectProbe },
          stubs: { FormerInjectProbe: false },
        },
        props: {
          schema: [],
          data: {},
          components: COMPONENTS_FIXTURE,
          mode: 'edit',
          texts: {},
        },
        slots: {
          default: () => h(FormerInjectProbe),
        },
      });
      await nextTick();
      expect(activeFormerProbe!.texts.value.dragHint).toBe('Here you can drag elements');
      expect(activeFormerProbe!.texts.value.invalidSchema).toBe('Invalid schema');
    });
  });

  describe('schema sync', () => {
    it('syncs parent schema model into injected internal schema', async () => {
      const wrapper = mount(Former, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          components: { FormerInjectProbe },
          stubs: { FormerInjectProbe: false },
        },
        props: {
          schema: [],
          data: {},
          components: COMPONENTS_FIXTURE,
          mode: 'edit',
          texts: {},
        },
        slots: {
          default: () => h(FormerInjectProbe),
        },
      });
      await nextTick();
      expect(activeFormerProbe!.schema.value).toEqual([]);

      await wrapper.setProps({
        schema: [
          { type: 'text', name: 'fieldA' },
        ],
      });
      await nextTick();
      const internal = activeFormerProbe!.schema.value;
      expect(internal).toHaveLength(1);
      expect(internal[0]!.type).toBe('text');
      expect(internal[0]!.name).toBe('fieldA');
      expect(internal[0]!._id).toBeTruthy();
    });

    it('pushes internal schema changes back to the parent model via toSchema', async () => {
      const wrapper = mount(Former, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          components: { FormerInjectProbe },
          stubs: { FormerInjectProbe: false },
        },
        props: {
          schema: [
            { type: 'text', name: 'only' },
          ],
          data: {},
          components: COMPONENTS_FIXTURE,
          mode: 'edit',
          texts: {},
        },
        slots: {
          default: () => h(FormerInjectProbe),
        },
      });
      await nextTick();
      const probe = activeFormerProbe!;
      const nextInternal = toInternalSchema([
        { type: 'text', name: 'replaced' },
      ]);
      probe.schema.value = nextInternal;
      await nextTick();
      const emitted = wrapper.emitted('update:schema');
      expect(emitted?.length).toBeGreaterThan(0);
      const parentSchema = emitted![emitted!.length - 1]![0] as SchemaNode[];
      expect(parentSchema).toHaveLength(1);
      expect(parentSchema[0]!.name).toBe('replaced');
      expect(parentSchema[0]).not.toHaveProperty('_id');
    });
  });

  describe('data sync', () => {
    it('syncs parent data into injected data ref', async () => {
      const wrapper = mount(Former, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          components: { FormerInjectProbe },
          stubs: { FormerInjectProbe: false },
        },
        props: {
          schema: [],
          data: {},
          components: COMPONENTS_FIXTURE,
          mode: 'edit',
          texts: {},
        },
        slots: {
          default: () => h(FormerInjectProbe),
        },
      });
      await nextTick();
      await wrapper.setProps({
        data: {
          a: { nested: 1 },
        },
      });
      await nextTick();
      expect(activeFormerProbe!.data.value).toEqual({
        a: { nested: 1 },
      });
    });

    it('syncs mutations on injected data back to the parent model', async () => {
      const wrapper = mount(Former, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          components: { FormerInjectProbe },
          stubs: { FormerInjectProbe: false },
        },
        props: {
          schema: [],
          data: { x: 1 },
          components: COMPONENTS_FIXTURE,
          mode: 'edit',
          texts: {},
        },
        slots: {
          default: () => h(FormerInjectProbe),
        },
      });
      await nextTick();
      activeFormerProbe!.data.value = {
        x: 2,
        y: { z: 3 },
      };
      await nextTick();
      const emitted = wrapper.emitted('update:data');
      expect(emitted?.length).toBeGreaterThan(0);
      expect(emitted![emitted!.length - 1]![0]).toStrictEqual({
        x: 2,
        y: { z: 3 },
      });
    });
  });

  describe('showIf', () => {
    it('injects a predicate that returns true when showIf prop is omitted', async () => {
      mount(Former, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          components: { FormerInjectProbe },
          stubs: { FormerInjectProbe: false },
        },
        props: {
          schema: [],
          data: {},
          components: COMPONENTS_FIXTURE,
          mode: 'edit',
          texts: {},
        },
        slots: {
          default: () => h(FormerInjectProbe),
        },
      });
      await nextTick();
      const fn = activeFormerProbe!.showIf!;
      expect(fn).toBeTypeOf('function');
      expect(fn({ type: 'text', name: 'n' })).toBe(true);
    });

    it('delegates to the showIf prop with node, data, and schema', async () => {
      const showIf = vi.fn().mockReturnValue(false);
      mount(Former, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          components: { FormerInjectProbe },
          stubs: { FormerInjectProbe: false },
        },
        props: {
          schema: [
            { type: 'text', name: 's1' },
          ],
          data: { foo: 'bar' },
          components: COMPONENTS_FIXTURE,
          mode: 'edit',
          texts: {},
          showIf: showIf as ShowIfPredicate,
        },
        slots: {
          default: () => h(FormerInjectProbe),
        },
      });
      await nextTick();
      const node: SchemaNode = { type: 'text', name: 'n' };
      expect(activeFormerProbe!.showIf?.(node)).toBe(false);
      expect(showIf).toHaveBeenCalledWith(node, { foo: 'bar' }, [
        { type: 'text', name: 's1' },
      ]);
    });
  });

  describe('schemaValid', () => {
    it('emits schemaValid true for an empty schema', async () => {
      const onSchemaValid = vi.fn();
      mount(Former, {
        shallow: true,
        attachTo: document.body,
        global: { renderStubDefaultSlot: true },
        props: {
          schema: [],
          data: {},
          components: COMPONENTS_FIXTURE,
          mode: 'edit',
          texts: {},
          onSchemaValid,
        },
      });
      await nextTick();
      const schemaCalls = onSchemaValid.mock.calls;
      expect(schemaCalls[schemaCalls.length - 1]?.[0]).toBe(true);
    });

    it('emits schemaValid false when the validation of a props component fails', async () => {
      const components: FormComponents = {
        text: {
          ...COMPONENTS_FIXTURE.text,
          validation: ({ required }) => (required
            ? z.string().min(1, 'required')
            : undefined),
          propsSchema: [
            {
              type: 'text',
              name: '$name',
              props: { required: true },
            },
          ],
        },
      };
      const onSchemaValid = vi.fn();
      mount(Former, {
        shallow: true,
        attachTo: document.body,
        global: { renderStubDefaultSlot: true },
        props: {
          schema: [
            { type: 'text', name: '' },
          ],
          data: {},
          components,
          mode: 'edit',
          texts: {},
          onSchemaValid,
        },
      });
      await nextTick();
      expect(onSchemaValid.mock.calls.some(c => c[0] === false)).toBe(true);
    });
  });

  describe('valid emit and validityMap', () => {
    it('emits valid true when validityMap has no false entries', async () => {
      const onValid = vi.fn();
      mount(Former, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          components: { FormerInjectProbe },
          stubs: { FormerInjectProbe: false },
        },
        props: {
          schema: [],
          data: {},
          components: COMPONENTS_FIXTURE,
          mode: 'edit',
          texts: {},
          onValid,
        },
        slots: {
          default: () => h(FormerInjectProbe),
        },
      });
      await nextTick();
      const validCalls = onValid.mock.calls;
      expect(validCalls[validCalls.length - 1]?.[0]).toBe(true);
    });

    it('emits valid false when any validityMap entry is false', async () => {
      const onValid = vi.fn();
      mount(Former, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          components: { FormerInjectProbe },
          stubs: { FormerInjectProbe: false },
        },
        props: {
          schema: [],
          data: {},
          components: COMPONENTS_FIXTURE,
          mode: 'edit',
          texts: {},
          onValid,
        },
        slots: {
          default: () => h(FormerInjectProbe),
        },
      });
      await nextTick();
      onValid.mockClear();
      activeFormerProbe!.validityMap.value = { field1: false };
      await nextTick();
      expect(onValid.mock.calls.some(c => c[0] === false)).toBe(true);
    });
  });
});
