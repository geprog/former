import type { FormData, SchemaNode } from '@former-ui/former';
import type { Component } from 'vue';
import { Former } from '@former-ui/former';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { nuxtUiStubs } from '../test/nuxtUiStubs';
import { formComponents } from './index';

const components = formComponents();
const types = Object.keys(components) as (keyof typeof components)[];

function declaredProps(component: Component) {
  return Object.keys((component as { props?: Record<string, unknown> }).props ?? {});
}

describe('form components', () => {
  it.each(types)('%s declares a prop for each of its settings', (type) => {
    const { component, propsSchema } = components[type];
    const settings = (propsSchema as SchemaNode[]).map(node => node.name).filter(name => name !== '$name');

    expect(declaredProps(component)).toEqual(expect.arrayContaining(settings));
  });

  it.each(types)('%s does not pass props it does not declare to the rendered elements', (type) => {
    const schema: SchemaNode[] = [{ type, name: 'field', props: { appSpecific: 'not-for-the-component' } }];
    const wrapper = mount(Former, {
      props: { schema, data: {} as FormData, components, mode: 'edit' },
      global: { components: nuxtUiStubs },
    });

    expect(wrapper.html()).not.toContain('not-for-the-component');
  });

  it.each([
    ['text', { placeholder: 'Enter text' }, 'UInput', 'placeholder="Enter text"'],
    ['number', { placeholder: 'Enter number' }, 'UInputNumber', 'placeholder="Enter number"'],
    ['select', { placeholder: 'Choose' }, 'USelect', 'placeholder="Choose"'],
    ['combo_box', { placeholder: 'Choose' }, 'UInputMenu', 'placeholder="Choose"'],
    ['textarea', { placeholder: 'Enter text' }, 'UTextarea', 'placeholder="Enter text"'],
    ['textarea', { rows: 5 }, 'UTextarea', 'rows="5"'],
    ['checkbox', { label: 'Accept' }, 'UCheckbox', 'label="Accept"'],
    ['checkbox', { required: true }, 'UCheckbox', 'required="true"'],
    ['switch', { label: 'Enable' }, 'USwitch', 'label="Enable"'],
    ['switch', { required: true }, 'USwitch', 'required="true"'],
    ['radio_group', { required: true }, 'URadioGroup', 'required="true"'],
  ] as const)('%s passes %o to %s', (type, props, stub, attribute) => {
    const schema: SchemaNode[] = [{ type, name: 'field', props }];
    const wrapper = mount(Former, {
      props: { schema, data: {} as FormData, components, mode: 'edit' },
      global: { components: nuxtUiStubs },
    });

    expect(wrapper.find(`[data-stub="${stub}"]`).html()).toContain(attribute);
  });
});
