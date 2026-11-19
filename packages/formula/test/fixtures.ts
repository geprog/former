import type { ComponentsLike, SchemaNodeLike } from '../src/types';

// a schema with a field, a field inside of a layout component, a group and a repeater inside of the group
const named = [
  { name: '$name' },
];
export const components: ComponentsLike = {
  text: { propsSchema: named },
  number: { propsSchema: named },
  select: { propsSchema: named },
  group: { propsSchema: named },
  repeater: { propsSchema: named, isList: true },
  columns: { propsSchema: [] },
};

export const repeater: SchemaNodeLike = {
  type: 'repeater',
  name: 'rows',
  props: { label: 'Rows' },
  children: [
    { type: 'number', name: 'length' },
  ],
};
export const schema: SchemaNodeLike[] = [
  {
    type: 'text',
    name: 'name',
    props: { label: 'Name' },
  },
  {
    type: 'columns',
    children: {
      left: [
        {
          type: 'select',
          name: 'color',
          props: {
            options: [
              { value: 'red', label: 'Red' },
              { value: '' },
            ],
          },
        },
      ],
    },
  },
  {
    type: 'group',
    name: 'roof',
    children: [
      { type: 'number', name: 'height' },
      repeater,
    ],
  },
];
