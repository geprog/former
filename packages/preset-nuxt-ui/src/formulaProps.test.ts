import type { FormComponents } from '@former-ui/former';
import { describe, expect, it } from 'vitest';
import { createFormComponents } from './formComponents';
import { formulaProps } from './formulaProps';

describe('formulaProps', () => {
  const components: FormComponents = createFormComponents(key => key);

  it.each(Object.entries(formulaProps))('only lists existing props of %s', (type, props) => {
    const propNames = components[type]!.propsSchema.map(node => node.name);
    expect(propNames).toEqual(expect.arrayContaining(Object.keys(props)));
  });
});
