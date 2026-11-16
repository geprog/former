import type { FormData, Mode, SchemaNode } from '@former-ui/former';
import { Former } from '@former-ui/former';
import UTabs from '@nuxt/ui/components/Tabs.vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { nuxtUiStubs } from '../test/nuxtUiStubs';
import { createFormComponents } from './formComponents';

// icons are loaded from the network, which isn't needed here
vi.mock('@nuxt/ui/runtime/vue/components/Icon.vue', async () => {
  const { defineComponent, h } = await import('vue');
  return { default: defineComponent(() => () => h('span')) };
});

const components = createFormComponents(key => key);

const tabsNode: SchemaNode = {
  type: 'tabs',
  props: { label: 'Tabs', tabs: [{ label: 'Person' }, { label: '' }] },
  children: {
    'tab-0': [{ type: 'text', name: 'name', props: { label: 'Name' } }],
    'tab-1': [{ type: 'text', name: 'city', props: { label: 'City', required: true, preset: 'Berlin' } }],
  },
};

// renders the real tabs to check that the fields of all tabs are rendered
function mountTabs(data: FormData, mode: Mode = 'edit', node = tabsNode) {
  return mount(Former, {
    props: { schema: [node], data, components, mode },
    global: { components: { ...nuxtUiStubs, UTabs } },
  });
}

describe('tabs', () => {
  it('shows the labels of the tabs, numbering the ones without', () => {
    const wrapper = mountTabs({});
    const triggers = wrapper.findAll('[role="tab"]').map(tab => tab.text());

    expect(triggers).toStrictEqual(['Person', 'Tab 2']);
  });

  it('opens the first tab', () => {
    const wrapper = mountTabs({});

    expect(wrapper.find('[role="tab"][data-state="active"]').text()).toBe('Person');
  });

  it('shows two tabs before tabs were set', () => {
    const wrapper = mountTabs({}, 'edit', { ...tabsNode, props: {} });

    expect(wrapper.findAll('[role="tab"]')).toHaveLength(2);
  });

  it('keeps the fields of hidden tabs mounted, so their presets are applied', async () => {
    let data: FormData = {};
    mount(Former, {
      props: { 'schema': [tabsNode], data, components, 'mode': 'edit', 'onUpdate:data': (value: FormData) => (data = value) },
      global: { components: { ...nuxtUiStubs, UTabs } },
    });
    await nextTick();

    expect(data).toStrictEqual({ city: 'Berlin' });
  });

  it('validates the fields of hidden tabs', async () => {
    let valid: boolean | undefined;
    mount(Former, {
      props: { schema: [tabsNode], data: { city: null }, components, mode: 'edit', onValid: (value: boolean) => (valid = value) },
      global: { components: { ...nuxtUiStubs, UTabs } },
    });
    await nextTick();

    expect(valid).toBe(false);
  });

  it('are hidden in read mode when their fields have no value', () => {
    expect(mountTabs({ name: null }, 'read').find('[data-label="Tabs"]').exists()).toBe(false);
    expect(mountTabs({ city: 'Berlin' }, 'read').find('[data-label="Tabs"]').exists()).toBe(true);
  });

  it('ignore children of removed tabs', () => {
    const withRemovedTab = { ...tabsNode, props: { label: 'Tabs', tabs: [{ label: 'Person' }] } };

    expect(mountTabs({ city: 'Berlin' }, 'read', withRemovedTab).find('[data-label="Tabs"]').exists()).toBe(false);
  });
});
