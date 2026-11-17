import type { FormData, Mode, SchemaNode } from '@former-ui/former';
import { Former } from '@former-ui/former';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { nuxtUiStubs } from '../test/nuxtUiStubs';
import { createFormComponents } from './formComponents';

const components = createFormComponents(key => key);

function mountCard(data: FormData, mode: Mode = 'edit') {
  const schema: SchemaNode[] = [
    {
      type: 'card',
      props: { label: 'Contact', help: 'How to reach you' },
      children: [
        { type: 'text', name: 'a' },
      ],
    },
  ];
  return mount(Former, {
    props: { schema, data, components, mode },
    global: { components: nuxtUiStubs },
  });
}

describe('card', () => {
  it('shows its title and description', () => {
    const wrapper = mountCard({});

    expect(wrapper.text()).toContain('Contact');
    expect(wrapper.text()).toContain('How to reach you');
  });

  it('passes the data of its parent to its children', () => {
    const wrapper = mountCard({ a: 'value' });

    expect(wrapper.findComponent({ name: 'UInput' }).attributes('model-value')).toBe('value');
  });

  it('is hidden in read mode when its fields have no value', () => {
    expect(mountCard({ a: null }, 'read').text()).not.toContain('Contact');
    expect(mountCard({ a: 'value' }, 'read').text()).toContain('Contact');
  });
});
