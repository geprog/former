import type { InternalSchemaNode, Mode, Texts } from '~/types';
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { h, nextTick, ref } from 'vue';

import FormDragContainer from './FormDragContainer.vue';

describe('component FormDragContainer', () => {
  it('throws when mode is not provided by an ancestor', () => {
    expect(() =>
      mount(FormDragContainer, {
        attachTo: document.body,
        global: {
          provide: {
            texts: ref<Texts>({ dragHint: 'hint' }),
          },
        },
      }),
    ).toThrow('Please provide a value for mode');
  });

  it('throws when texts is not provided by an ancestor', () => {
    expect(() =>
      mount(FormDragContainer, {
        attachTo: document.body,
        global: {
          provide: {
            mode: ref<Mode>('build'),
          },
        },
      }),
    ).toThrow('Please provide a value for texts');
  });

  it('adds drop-zone classes in build mode and omits them outside build mode', async () => {
    const mode = ref<Mode>('build');
    const texts = ref<Texts>({ dragHint: 'Here you can drag elements' });
    const wrapper = mount(FormDragContainer, {
      attachTo: document.body,
      global: { provide: { mode, texts } },
    });
    let classes = wrapper.element.classList;
    expect(classes).toContain('former-drag-container');
    expect(classes).toContain('border-dashed');
    expect(classes).toContain('min-h-24');

    mode.value = 'read';
    await nextTick();
    classes = wrapper.element.classList;
    expect(classes).not.toContain('former-drag-container');
    expect(classes).not.toContain('border-dashed');
  });

  it('exposes the drag container root as a single div with one slotted element child', () => {
    const mode = ref<Mode>('build');
    const texts = ref<Texts>({ dragHint: 'Here you can drag elements' });
    const wrapper = mount(FormDragContainer, {
      attachTo: document.body,
      global: { provide: { mode, texts } },
      slots: { default: () => h('span', { 'data-slot-mark': '1' }) },
    });
    expect(wrapper.element.childElementCount).toBe(1);
    expect(wrapper.element.tagName).toBe('DIV');
  });

  it('drag container root has a single element child from the default slot', () => {
    const mode = ref<Mode>('build');
    const texts = ref<Texts>({ dragHint: 'Here you can drag elements' });
    const wrapper = mount(FormDragContainer, {
      attachTo: document.body,
      global: { provide: { mode, texts } },
      slots: { default: () => h('span', { 'data-slot-mark': '1' }) },
    });
    expect(wrapper.element.childElementCount).toBe(1);
    expect(wrapper.element.firstElementChild?.getAttribute('data-slot-mark')).toBe('1');
  });

  it('binds data-drag-hint, data-category, and data-parent-node', () => {
    const mode = ref<Mode>('build');
    const texts = ref<Texts>({ dragHint: 'Custom drop hint' });
    const node = ref({ _id: 'schema-root', type: 'group', name: 'g' });
    const wrapper = mount(FormDragContainer, {
      attachTo: document.body,
      props: { category: 'fields' },
      global: { provide: { mode, texts, node } },
    });
    expect(wrapper.element.getAttribute('data-drag-hint')).toBe('Custom drop hint');
    expect(wrapper.element.getAttribute('data-category')).toBe('fields');
    expect(wrapper.element.getAttribute('data-parent-node')).toBe('schema-root');
  });

  it('omits data-parent-node when node is not provided', () => {
    const mode = ref<Mode>('build');
    const texts = ref<Texts>({ dragHint: 'Here you can drag elements' });
    const wrapper = mount(FormDragContainer, {
      attachTo: document.body,
      global: { provide: { mode, texts } },
    });
    expect(wrapper.element.getAttribute('data-parent-node')).toBeNull();
  });

  it('passes undefined category without a data-category attribute', () => {
    const mode = ref<Mode>('build');
    const texts = ref<Texts>({ dragHint: 'Here you can drag elements' });
    const wrapper = mount(FormDragContainer, {
      attachTo: document.body,
      global: { provide: { mode, texts } },
    });
    expect(wrapper.element.getAttribute('data-category')).toBeNull();
  });

  it('renders default slot content inside the root', () => {
    const mode = ref<Mode>('build');
    const texts = ref<Texts>({ dragHint: 'Here you can drag elements' });
    const wrapper = mount(FormDragContainer, {
      attachTo: document.body,
      global: { provide: { mode, texts } },
      slots: { default: () => h('span', { 'data-slot-mark': '1' }) },
    });
    expect(wrapper.find('[data-slot-mark]').exists()).toBe(true);
  });
});
