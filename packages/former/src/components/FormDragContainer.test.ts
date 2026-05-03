import type { InternalSchemaNode, Mode, Texts } from '~/types';
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref, type Ref } from 'vue';
import { provide } from '~/compositions/injectProvide';

import FormDragContainer from './FormDragContainer.vue';

const mountedWrappers: Array<ReturnType<typeof mount>> = [];

function createNode(overrides: Partial<InternalSchemaNode> = {}): InternalSchemaNode {
  return {
    _id: 'parent-node-1',
    type: 'group',
    name: 'g',
    ...overrides,
  };
}

function mountFormDragContainer(options?: {
  mode?: Ref<Mode>;
  texts?: Ref<Texts>;
  node?: Ref<InternalSchemaNode>;
  category?: string;
}) {
  const mode = options?.mode ?? ref<Mode>('build');
  const texts = options?.texts ?? ref<Texts>({ dragHint: 'Here you can drag elements' });
  const node = options?.node;

  const Parent = defineComponent({
    setup() {
      provide('mode', mode);
      provide('texts', texts);
      if (node) {
        provide('node', node);
      }
      const dragProps
        = options?.category !== undefined ? { category: options.category } : {};
      return () =>
        h(FormDragContainer, dragProps, {
          default: () => h('span', { 'data-slot-mark': '1' }),
        });
    },
  });

  const wrapper = mount(Parent, { attachTo: document.body });
  mountedWrappers.push(wrapper);
  return { wrapper, mode, texts, node };
}

/** Mount host has a single child: the FormDragContainer root element. */
function getDragContainerRoot(wrapper: ReturnType<typeof mount>) {
  return wrapper.element as HTMLElement;
}

function rootClasses(wrapper: ReturnType<typeof mount>) {
  return Array.from(getDragContainerRoot(wrapper).classList);
}

describe('component FormDragContainer', () => {
  afterEach(() => {
    for (const w of mountedWrappers.splice(0)) {
      w.unmount();
    }
  });

  it('throws when mode is not provided by an ancestor', () => {
    const Parent = defineComponent({
      setup() {
        provide('texts', ref<Texts>({ dragHint: 'hint' }));
        return () => h(FormDragContainer);
      },
    });
    expect(() => mount(Parent, { attachTo: document.body })).toThrowError('Please provide a value for mode');
  });

  it('throws when texts is not provided by an ancestor', () => {
    const Parent = defineComponent({
      setup() {
        provide('mode', ref<Mode>('build'));
        return () => h(FormDragContainer);
      },
    });
    expect(() => mount(Parent, { attachTo: document.body })).toThrowError('Please provide a value for texts');
  });

  it('adds drop-zone classes in build mode and omits them outside build mode', async () => {
    const mode = ref<Mode>('build');
    const { wrapper } = mountFormDragContainer({ mode });
    let classes = rootClasses(wrapper);
    expect(classes).toContain('former-drag-container');
    expect(classes).toContain('border-dashed');
    expect(classes).toContain('min-h-24');

    mode.value = 'read';
    await nextTick();
    classes = rootClasses(wrapper);
    expect(classes).not.toContain('former-drag-container');
    expect(classes).not.toContain('border-dashed');
  });

  it('mount host exposes the drag container as its only element child', () => {
    const { wrapper } = mountFormDragContainer();
    expect(wrapper.element.childElementCount).toBe(1);
    expect(getDragContainerRoot(wrapper).tagName).toBe('DIV');
  });

  it('drag container root has a single element child from the default slot', () => {
    const { wrapper } = mountFormDragContainer();
    const root = getDragContainerRoot(wrapper);
    expect(root.childElementCount).toBe(1);
    expect(root.firstElementChild?.getAttribute('data-slot-mark')).toBe('1');
  });

  it('binds data-drag-hint, data-category, and data-parent-node', () => {
    const texts = ref<Texts>({ dragHint: 'Custom drop hint' });
    const node = ref(createNode({ _id: 'schema-root' }));
    const { wrapper } = mountFormDragContainer({
      texts,
      node,
      category: 'fields',
    });
    const root = getDragContainerRoot(wrapper);
    expect(root.getAttribute('data-drag-hint')).toBe('Custom drop hint');
    expect(root.getAttribute('data-category')).toBe('fields');
    expect(root.getAttribute('data-parent-node')).toBe('schema-root');
  });

  it('omits data-parent-node when node is not provided', () => {
    const { wrapper } = mountFormDragContainer();
    const root = getDragContainerRoot(wrapper);
    expect(root.getAttribute('data-parent-node')).toBeNull();
  });

  it('passes undefined category without a data-category attribute', () => {
    const { wrapper } = mountFormDragContainer();
    expect(getDragContainerRoot(wrapper).getAttribute('data-category')).toBeNull();
  });

  it('renders default slot content inside the root', () => {
    const { wrapper } = mountFormDragContainer();
    expect(wrapper.find('[data-slot-mark]').exists()).toBe(true);
  });
});
