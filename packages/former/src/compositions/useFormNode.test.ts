import type { DeepReadonly, PropType } from 'vue';
import type { EditedNode, FormComponents, FormData, SchemaNode, ShowIfContext, ValidationContext } from '~/types';
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h, markRaw } from 'vue';
import FormContent from '~/components/FormContent.vue';
import FormDataProvider from '~/components/FormDataProvider.vue';
import Former from '~/components/Former.vue';
import FormNodeProps from '~/components/FormNodeProps.vue';
import FormRenderer from '~/components/FormRenderer.vue';
import { useEditedNode, useFormNode } from './useFormNode';

const seen: { label?: string; node?: DeepReadonly<ValidationContext>; edited?: DeepReadonly<EditedNode> }[] = [];

const Field = defineComponent({
  props: {
    label: String,
    modelValue: null,
    mode: String,
    id: String,
    error: String,
  },
  setup(props) {
    const node = useFormNode();
    const edited = useEditedNode();
    seen.push({
      label: props.label,
      get node() {
        return node.value;
      },
      get edited() {
        return edited.value;
      },
    });
    return () => h('input', { 'data-label': props.label });
  },
});

const Repeater = defineComponent({
  props: { modelValue: Array as PropType<FormData[]> },
  setup(props) {
    return () => h('div', (props.modelValue ?? []).map((item, index) =>
      h(FormDataProvider, { data: item, index }, () => h(FormRenderer))));
  },
});

const components: FormComponents = {
  text: {
    label: 'Text',
    component: markRaw(Field),
    propsSchema: [
      { type: 'text', name: '$name' },
      {
        type: 'text',
        name: 'label',
        props: { label: 'Label prop' },
      },
    ],
  },
  repeater: {
    label: 'Repeater',
    component: markRaw(Repeater),
    isList: true,
    propsSchema: [
      { type: 'text', name: '$name' },
    ],
  },
};

const schema: SchemaNode[] = [
  {
    type: 'repeater',
    name: 'rows',
    children: [
      {
        type: 'text',
        name: 'title',
        props: { label: 'Title' },
      },
    ],
  },
];

describe('useFormNode', () => {
  it('tells a component the node it is rendered for and where its data is', async () => {
    seen.length = 0;
    mount(Former, {
      props: {
        schema,
        data: {
          rows: [
            { title: 'a' },
            { title: 'b' },
          ],
        },
        components,
      },
    });
    await flushPromises();
    const titles = seen.filter(entry => entry.label === 'Title');
    expect(titles.map(entry => entry.node?.path)).toEqual([
      ['rows', 0, 'title'],
      ['rows', 1, 'title'],
    ]);
    expect(titles[1]!.node?.scopes[0]).toMatchObject({
      data: { title: 'b' },
      path: ['rows', 1],
    });
    expect(titles[1]!.edited).toBeUndefined();
  });

  it('doesn\'t let components change the data or the schema', async () => {
    seen.length = 0;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const data = {
      rows: [
        { title: 'a' },
      ],
    };
    const wrapper = mount(Former, {
      props: { schema, data, components },
    });
    await flushPromises();
    const context = seen.find(entry => entry.label === 'Title')!.node! as ValidationContext;
    (context.scopes[0]!.data as FormData).title = 'changed';
    (context.node.props as Record<string, unknown>).label = 'changed';
    await flushPromises();
    expect(wrapper.emitted('update:data')).toBeUndefined();
    expect(context.scopes[0]!.data).toEqual({ title: 'a' });
    expect(context.node.props).toEqual({ label: 'Title' });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('is undefined outside of a form', () => {
    let context: DeepReadonly<ValidationContext> | undefined = {} as ValidationContext;
    mount(defineComponent({
      setup() {
        context = useFormNode().value;
        return () => null;
      },
    }));
    expect(context).toBeUndefined();
  });
});

describe('useEditedNode', () => {
  it('tells the props form which node it edits', async () => {
    seen.length = 0;
    const wrapper = mount(Former, {
      props: {
        schema,
        data: {
          rows: [
            { title: 'a' },
          ],
        },
        components,
        mode: 'build',
      },
      slots: {
        default: () => [
          h(FormContent),
          h(FormNodeProps),
        ],
      },
      attachTo: document.body,
    });
    await flushPromises();
    await wrapper.find('[data-label="Title"]').trigger('click');
    await flushPromises();

    const labelProp = seen.find(entry => entry.label === 'Label prop')!;
    expect(labelProp.edited?.node).toMatchObject({ type: 'text', name: 'title' });
    expect(labelProp.edited?.path).toMatchObject([
      { type: 'repeater', name: 'rows' },
    ]);
    expect(labelProp.edited?.schema).toMatchObject(schema);
    expect(labelProp.node?.editedNode).toBe(labelProp.edited);
  });
});

describe('showIf', () => {
  it('gets where the node is in the data', async () => {
    const showIf = vi.fn((_node: SchemaNode, _data: FormData, _schema: SchemaNode[], context: ShowIfContext) =>
      context.path.at(-2) !== 1);
    const wrapper = mount(Former, {
      props: {
        schema,
        data: {
          rows: [
            { title: 'a' },
            { title: 'b' },
          ],
        },
        components,
        showIf,
      },
    });
    await flushPromises();
    expect(wrapper.findAll('[data-label="Title"]')).toHaveLength(1);
    const contexts = showIf.mock.calls.filter(([node]) => node.name === 'title').map(([, , , context]) => context);
    expect(contexts).toContainEqual({
      path: ['rows', 1, 'title'],
      scopes: [
        expect.objectContaining({
          data: { title: 'b' },
          path: ['rows', 1],
        }),
        expect.objectContaining({ path: [] }),
      ],
    });
  });
});
