import type { FormComponents, FormData, Mode, SchemaNode } from '@former-ui/former';
import { Former } from '@former-ui/former';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, markRaw, nextTick, ref } from 'vue';
import { nuxtUiStubs } from '../test/nuxtUiStubs';
import { createFormComponents } from './formComponents';

// keeps the value it was mounted with, like components with local state do
const MountedValue = defineComponent({
  props: { modelValue: { type: String, default: undefined } },
  setup(props) {
    const mountedValue = props.modelValue;
    return () => h('span', { 'data-mounted-value': '' }, mountedValue);
  },
});

const components: FormComponents = {
  repeater: createFormComponents(key => key).repeater,
  mounted_value: {
    label: 'Mounted value',
    propsSchema: [{ type: 'text', name: '$name' }],
    component: markRaw(MountedValue),
  },
};

const schema: SchemaNode[] = [
  { type: 'repeater', name: 'items', children: [{ type: 'mounted_value', name: 'value' }] },
];

function mountRepeater(initialData: FormData, mode: Mode = 'edit') {
  const data = ref<FormData>(initialData);
  const wrapper = mount(Former, {
    props: {
      schema,
      'data': data.value,
      'onUpdate:data': (value: FormData) => (data.value = value),
      components,
      mode,
    },
    global: { components: nuxtUiStubs },
  });
  return { wrapper, data };
}

function mountedValues(wrapper: ReturnType<typeof mountRepeater>['wrapper']) {
  return wrapper.findAll('[data-mounted-value]').map(element => element.text());
}

function deleteButtons(wrapper: ReturnType<typeof mountRepeater>['wrapper']) {
  return wrapper.findAll('button').filter(button => button.attributes('data-icon') === 'i-heroicons-trash');
}

describe('repeater', () => {
  it('renders an item for each entry', () => {
    const { wrapper } = mountRepeater({ items: [{ value: 'a' }, { value: 'b' }] });

    expect(mountedValues(wrapper)).toStrictEqual(['a', 'b']);
  });

  it('adds an empty item', async () => {
    const { wrapper, data } = mountRepeater({ items: [{ value: 'a' }] });

    await wrapper.find('button[data-label="Add Item"]').trigger('click');
    await nextTick();

    expect(data.value.items).toStrictEqual([{ value: 'a' }, {}]);
  });

  it('adds an item when the repeater was cleared', async () => {
    const { wrapper, data } = mountRepeater({ items: null });

    await wrapper.find('button[data-label="Add Item"]').trigger('click');
    await nextTick();

    expect(data.value.items).toStrictEqual([{}]);
  });

  it('deletes the clicked item', async () => {
    const { wrapper, data } = mountRepeater({ items: [{ value: 'a' }, { value: 'b' }, { value: 'c' }] });

    await deleteButtons(wrapper)[1]!.trigger('click');
    await nextTick();

    expect(data.value.items).toStrictEqual([{ value: 'a' }, { value: 'c' }]);
  });

  it('keeps the components of the remaining items when an item is deleted', async () => {
    const { wrapper } = mountRepeater({ items: [{ value: 'a' }, { value: 'b' }, { value: 'c' }] });

    await deleteButtons(wrapper)[0]!.trigger('click');
    await nextTick();

    expect(mountedValues(wrapper)).toStrictEqual(['b', 'c']);
  });

  it('hides the add and delete buttons in read mode', () => {
    const { wrapper } = mountRepeater({ items: [{ value: 'a' }] }, 'read');

    expect(wrapper.findAll('button')).toHaveLength(0);
  });

  it('is hidden in read mode when it has no items', () => {
    const { wrapper } = mountRepeater({ items: [] }, 'read');

    expect(wrapper.find('[data-label="Add Item"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Item');
  });

  it('keeps items without content in read mode', () => {
    const { wrapper } = mountRepeater({ items: [{}, { value: 'b' }] }, 'read');

    expect(wrapper.text()).toContain('Item 1');
    expect(wrapper.text()).toContain('Item 2');
  });

  it('prefers the item label of the repeater', () => {
    const wrapper = mount(Former, {
      props: {
        schema: [{ ...schema[0]!, props: { itemLabel: 'Room' } }],
        data: { items: [{ value: 'a' }] },
        components,
        mode: 'edit',
      },
      global: { components: nuxtUiStubs },
    });

    expect(wrapper.text()).toContain('Room 1');
    expect(wrapper.find('button[data-label="Add Room"]').exists()).toBe(true);
  });
});
