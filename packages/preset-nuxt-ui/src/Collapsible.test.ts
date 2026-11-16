import type { FormData, Mode, SchemaNode } from '@former-ui/former';
import { Former } from '@former-ui/former';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { nuxtUiStubs } from '../test/nuxtUiStubs';
import { createFormComponents } from './formComponents';

const components = createFormComponents(key => key);

function mountCollapsible(data: FormData, mode: Mode, props: SchemaNode['props'] = {}) {
  const schema: SchemaNode[] = [{ type: 'collapsible', props: { label: 'More', ...props }, children: [{ type: 'text', name: 'a' }] }];
  return mount(Former, {
    props: { schema, data, components, mode },
    global: { components: nuxtUiStubs },
  });
}

describe('collapsible section', () => {
  it('passes the data of its parent to its children', () => {
    const wrapper = mountCollapsible({ a: 'value' }, 'edit');

    expect(wrapper.findComponent({ name: 'UInput' }).attributes('model-value')).toBe('value');
  });

  it.each([
    ['edit', {}, 'false'],
    ['edit', { defaultOpen: true }, 'true'],
    ['read', {}, 'true'],
  ] as const)('in %s mode with %o is open: %s', (mode, props, open) => {
    const wrapper = mountCollapsible({ a: 'value' }, mode, props);

    expect(wrapper.find('[data-open]').attributes('data-open')).toBe(open);
  });

  it('is hidden in read mode when its fields have no value', () => {
    expect(mountCollapsible({ a: null }, 'read').find('[data-label="More"]').exists()).toBe(false);
    expect(mountCollapsible({ a: 'value' }, 'read').find('[data-label="More"]').exists()).toBe(true);
  });
});
