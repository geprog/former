import type { FormComponents, FormData, InternalSchemaNode, SchemaNode } from './types';
import { cloneDeep } from 'lodash';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  addNode,
  deleteNode,
  generateFormId,
  getFormIdFromEvent,
  getNode,
  isNodeLayoutComponent,
  nanoid,
  nodePosition,
  replaceNode,
  schemaIterator,
  setDragEventData,
  toInternalSchema,
  toSchema,
  unsetDataOfNode,
} from './utils';

function node(_id: string, overrides: Partial<InternalSchemaNode> = {}): InternalSchemaNode {
  return { _id, type: 'text', ...overrides };
}

function formComponentsFixture(): FormComponents {
  return {
    text: {
      label: 'Text',
      propsSchema: [{ type: 'text', name: '$name' }],
      component: {} as FormComponents['text']['component'],
    },
    layout: {
      label: 'Layout',
      propsSchema: [{ type: 'text', name: 'title' }],
      component: {} as FormComponents['layout']['component'],
    },
    bare: {
      label: 'Bare',
      propsSchema: [],
      component: {} as FormComponents['bare']['component'],
    },
  };
}

describe('schema iterator', () => {
  it('should iterate over a flat array of schema nodes', () => {
    // given
    const schema: InternalSchemaNode[] = [
      { _id: 'a', type: 'text' },
      { _id: 'b', type: 'text' },
      { _id: 'c', type: 'text' },
    ];

    // when
    const iter = schemaIterator(schema);

    // then
    expect([...iter]).toStrictEqual(schema);
  });

  it('should handle empty schema', () => {
    // when
    const iter = schemaIterator([]);

    // then
    expect([...iter]).toStrictEqual([]);
  });

  it('should handle flat children of schema nodes', () => {
    // given
    const schemaNode = {
      _id: 'a',
      type: 'text',
      children: [
        { _id: 'b', type: 'text' },
        { _id: 'c', type: 'text' },
      ],
    };

    // when
    const iter = schemaIterator([schemaNode]);

    // then
    expect([...iter]).toStrictEqual([schemaNode, ...schemaNode.children]);
  });

  it('should handle categorized children of schema nodes', () => {
    // given
    const schemaNode = {
      _id: 'a',
      type: 'text',
      children: {
        category1: [{ _id: 'b', type: 'text' }],
        category2: [{ _id: 'c', type: 'text' }],
      },
    };

    // when
    const iter = schemaIterator([schemaNode]);

    // then
    expect([...iter]).toStrictEqual([schemaNode, ...schemaNode.children.category1, ...schemaNode.children.category2]);
  });

  it('should handle node with children at end', () => {
    // given
    const simpleNode = { _id: 'a', type: 'text' };
    const schemaNode = {
      _id: 'a',
      type: 'text',
      children: [
        { _id: 'b', type: 'text' },
        { _id: 'c', type: 'text' },
      ],
    };

    // when
    const iter = schemaIterator([simpleNode, schemaNode]);

    // then
    expect([...iter]).toStrictEqual([simpleNode, schemaNode, ...schemaNode.children]);
  });

  it('should handle node with children at start', () => {
    // given
    const simpleNode = { _id: 'a', type: 'text' };
    const schemaNode = {
      _id: 'a',
      type: 'text',
      children: [
        { _id: 'b', type: 'text' },
        { _id: 'c', type: 'text' },
      ],
    };

    // when
    const iter = schemaIterator([schemaNode, simpleNode]);

    // then
    expect([...iter]).toStrictEqual([schemaNode, ...schemaNode.children, simpleNode]);
  });

  it('should handle complex schema', () => {
    // given
    const schemaNodeWithFlatChildren = {
      _id: 'a',
      type: 'text',
      children: [
        { _id: 'b', type: 'text' },
        { _id: 'c', type: 'text' },
      ],
    };
    const schemaNodeWithChildrenCategories = {
      _id: 'd',
      type: 'text',
      children: {
        category1: [{ _id: 'e', type: 'text' }],
        category2: [{ _id: 'f', type: 'text' }],
      },
    };
    const schema: InternalSchemaNode[] = [
      { _id: 'x', type: 'text' },
      schemaNodeWithFlatChildren,
      schemaNodeWithChildrenCategories,
    ];

    // when
    const iter = schemaIterator(schema);

    // then
    expect([...iter]).toStrictEqual([
      schema[0],
      schemaNodeWithFlatChildren,
      ...schemaNodeWithFlatChildren.children,
      schemaNodeWithChildrenCategories,
      ...schemaNodeWithChildrenCategories.children.category1,
      ...schemaNodeWithChildrenCategories.children.category2,
    ]);
  });
});

describe('toInternalSchema and toSchema', () => {
  it('assigns _id to root nodes when missing and preserves explicit _id', () => {
    const internal = toInternalSchema([
      { type: 'row' },
      { type: 'col', _id: 'keep-me' } as unknown as SchemaNode,
    ]);
    expect(internal).toHaveLength(2);
    expect(internal[0]!._id).toBeTruthy();
    expect(internal[1]!._id).toBe('keep-me');
  });

  it('adds ids to nested array and categorized children', () => {
    const internal = toInternalSchema([
      {
        type: 'root',
        children: [
          { type: 'a' },
          {
            type: 'b',
            children: { cat: [{ type: 'leaf' }] },
          },
        ],
      },
    ] as SchemaNode[]);
    const root = internal[0]!;
    expect(Array.isArray(root.children)).toBe(true);
    const flat = root.children as InternalSchemaNode[];
    expect(flat[0]!._id).toBeTruthy();
    const cat = (flat[1]!.children as { cat: InternalSchemaNode[] }).cat;
    expect(cat[0]!._id).toBeTruthy();
  });

  it('strips _id at all levels via toSchema and round-trips shape', () => {
    const internal = toInternalSchema([
      {
        type: 'root',
        name: 'r',
        children: [{ type: 'child', name: 'c' }],
      },
    ] as SchemaNode[]);
    const external = toSchema(internal);
    expect(external[0]).not.toHaveProperty('_id');
    const ch = (external[0]!.children as SchemaNode[])[0]!;
    expect(ch).not.toHaveProperty('_id');
    expect(external[0]!.type).toBe('root');
    expect(ch.type).toBe('child');
  });

  it('strips _id when children are a categorized object (not an array)', () => {
    const internal = toInternalSchema([
      {
        type: 'panel',
        children: {
          zoneA: [{ type: 'field', name: 'a' }],
          zoneB: [{ type: 'field', name: 'b' }],
        },
      },
    ] as SchemaNode[]);
    const external = toSchema(internal)[0]!;
    expect(external).not.toHaveProperty('_id');
    const byZone = external.children as Record<string, SchemaNode[]>;
    expect(byZone.zoneA![0]).not.toHaveProperty('_id');
    expect(byZone.zoneB![0]).not.toHaveProperty('_id');
    expect(byZone.zoneA![0]!.name).toBe('a');
    expect(byZone.zoneB![0]!.name).toBe('b');
  });
});

describe('replaceNode', () => {
  it('replaces a node at the root', () => {
    const schema = cloneDeep([node('a'), node('b')]);
    const replacement = node('a', { type: 'number', name: 'n1' });
    replaceNode(schema, replacement);
    expect(schema[0]).toEqual(replacement);
    expect(schema[1]).toEqual(node('b'));
  });

  it('replaces a node nested under array children', () => {
    const schema = cloneDeep([
      node('root', {
        children: [node('inner')],
      }),
    ]);
    replaceNode(schema, node('inner', { type: 'rich' }));
    expect((schema[0]!.children as InternalSchemaNode[])[0]!.type).toBe('rich');
  });

  it('replaces a node under categorized children', () => {
    const schema = cloneDeep([
      node('root', {
        children: { slot: [node('leaf')] },
      }),
    ]);
    replaceNode(schema, node('leaf', { type: 'updated' }));
    const leaf = (schema[0]!.children as { slot: InternalSchemaNode[] }).slot[0]!;
    expect(leaf.type).toBe('updated');
  });

  it('does nothing when _id is not found', () => {
    const schema = cloneDeep([node('only')]);
    const snapshot = cloneDeep(schema);
    replaceNode(schema, node('missing'));
    expect(schema).toStrictEqual(snapshot);
  });
});

describe('deleteNode', () => {
  it('removes a root node by id', () => {
    const schema = cloneDeep([node('a'), node('b')]);
    deleteNode(schema, 'a');
    expect(schema.map(n => n._id)).toStrictEqual(['b']);
  });

  it('removes a node nested in array children', () => {
    const schema = cloneDeep([
      node('root', {
        children: [node('x'), node('y')],
      }),
    ]);
    deleteNode(schema, 'x');
    expect((schema[0]!.children as InternalSchemaNode[]).map(c => c._id)).toStrictEqual(['y']);
  });

  it('removes a node under categorized children', () => {
    const schema = cloneDeep([
      node('root', {
        children: { main: [node('one'), node('two')] },
      }),
    ]);
    deleteNode(schema, 'two');
    const main = (schema[0]!.children as { main: InternalSchemaNode[] }).main;
    expect(main.map(c => c._id)).toStrictEqual(['one']);
  });

  it('leaves schema unchanged when id is missing', () => {
    const schema = cloneDeep([node('a')]);
    const snapshot = cloneDeep(schema);
    deleteNode(schema, 'ghost');
    expect(schema).toStrictEqual(snapshot);
  });
});

describe('getNode', () => {
  const tree = (): InternalSchemaNode[] => [
    node('root', {
      children: [
        node('mid', {
          children: { col: [node('deep')] },
        }),
      ],
    }),
  ];

  it('returns a node from root, nested array, or category', () => {
    const schema = cloneDeep(tree());
    expect(getNode(schema, 'root')?._id).toBe('root');
    expect(getNode(schema, 'mid')?._id).toBe('mid');
    expect(getNode(schema, 'deep')?._id).toBe('deep');
  });

  it('returns null when id is absent', () => {
    expect(getNode(cloneDeep(tree()), 'nope')).toBeNull();
  });
});

describe('nodePosition', () => {
  const linear = (): InternalSchemaNode[] => [node('n0'), node('n1'), node('n2')];

  it('returns above and below indices at the root', () => {
    const schema = cloneDeep(linear());
    expect(nodePosition(schema, 'n1', 'above')).toStrictEqual({
      parentId: null,
      category: null,
      index: 1,
    });
    expect(nodePosition(schema, 'n1', 'below')).toStrictEqual({
      parentId: null,
      category: null,
      index: 2,
    });
  });

  it('returns position inside nested array children with parent id', () => {
    const schema = cloneDeep([node('p', { children: [node('c')] })]);
    expect(nodePosition(schema, 'c', 'above')).toStrictEqual({
      parentId: 'p',
      category: null,
      index: 0,
    });
  });

  it('returns category on categorized children path', () => {
    const schema = cloneDeep([
      node('p', {
        children: { main: [node('leaf')] },
      }),
    ]);
    expect(nodePosition(schema, 'leaf', 'below')).toStrictEqual({
      parentId: 'p',
      category: 'main',
      index: 1,
    });
  });

  it('returns null when the node id does not exist', () => {
    expect(nodePosition(cloneDeep(linear()), 'x', 'above')).toBeNull();
  });
});

describe('addNode', () => {
  it('inserts at the root when parentId is null', () => {
    const schema = cloneDeep([node('a')]);
    addNode(schema, { parentId: null, category: null, index: 0 }, node('new'));
    expect(schema.map(n => n._id)).toStrictEqual(['new', 'a']);
  });

  it('wraps array children under a parent into keyed default and inserts', () => {
    const schema = cloneDeep([
      node('p', {
        children: [node('existing')],
      }),
    ]);
    addNode(
      schema,
      { parentId: 'p', category: null, index: 0 },
      node('inserted'),
    );
    const children = schema[0]!.children as { default: InternalSchemaNode[] };
    expect(Array.isArray(children)).toBe(false);
    expect(children.default.map(n => n._id)).toStrictEqual(['inserted', 'existing']);
  });

  it('creates children object when parent has no children', () => {
    const schema = cloneDeep([node('p')]);
    addNode(schema, { parentId: 'p', category: 'main', index: 0 }, node('child'));
    const children = schema[0]!.children as { main: InternalSchemaNode[] };
    expect(children.main.map(n => n._id)).toStrictEqual(['child']);
  });

  it('recurses to nested parents', () => {
    const schema = cloneDeep([
      node('outer', {
        children: [node('inner', { children: [node('leaf')] })],
      }),
    ]);
    addNode(
      schema,
      { parentId: 'inner', category: null, index: 1 },
      node('buddy'),
    );
    const inner = (schema[0]!.children as InternalSchemaNode[])[0]!;
    const innerChildren = inner.children as { default: InternalSchemaNode[] };
    expect(innerChildren.default.map(n => n._id)).toStrictEqual(['leaf', 'buddy']);
  });

  it('recurses when an ancestor has object-shaped children (not an array)', () => {
    const schema = cloneDeep([
      node('outer', {
        children: {
          col: [node('target', { children: [node('existing')] })],
        },
      }),
    ]);
    addNode(schema, { parentId: 'target', category: null, index: 0 }, node('inserted'));
    const outerChildren = schema[0]!.children as { col: InternalSchemaNode[] };
    const target = outerChildren.col[0]!;
    const targetChildren = target.children as { default: InternalSchemaNode[] };
    expect(targetChildren.default.map(n => n._id)).toStrictEqual(['inserted', 'existing']);
  });
});

describe('isNodeLayoutComponent', () => {
  const components = formComponentsFixture();

  it('is false when propsSchema includes $name', () => {
    expect(isNodeLayoutComponent(node('1', { type: 'text' }), components)).toBe(false);
  });

  it('is true when propsSchema has no $name entry', () => {
    expect(isNodeLayoutComponent(node('1', { type: 'layout' }), components)).toBe(true);
  });

  it('is true for empty propsSchema and for unknown types', () => {
    expect(isNodeLayoutComponent(node('1', { type: 'bare' }), components)).toBe(true);
    expect(isNodeLayoutComponent(node('1', { type: 'unknown-type' }), components)).toBe(true);
  });
});

describe('unsetDataOfNode', () => {
  const components = formComponentsFixture();

  it('returns early when data is undefined, non-object, or an array', () => {
    const n = node('1', { name: 'f' });
    expect(() => unsetDataOfNode(n, undefined, components)).not.toThrow();
    const d1: FormData = { f: 'x' };
    unsetDataOfNode(n, 'string' as unknown as FormData, components);
    expect(d1.f).toBe('x');
    const d2: FormData = { f: 'x' };
    unsetDataOfNode(n, [] as unknown as FormData, components);
    expect(d2.f).toBe('x');
  });

  it('deletes the field matching node.name', () => {
    const data: FormData = { alpha: 1, beta: 2 };
    unsetDataOfNode(node('1', { name: 'alpha', type: 'text' }), data, components);
    expect(data).toStrictEqual({ beta: 2 });
  });

  it('recurses into layout children for flat child arrays', () => {
    const data: FormData = { keep: 1, leaf: 2 };
    const layout = node('L', {
      type: 'bare',
      children: [node('c1', { name: 'leaf', type: 'text' })],
    });
    unsetDataOfNode(layout, data, components);
    expect(data).toStrictEqual({ keep: 1 });
  });

  it('recurses into layout children stored by category', () => {
    const data: FormData = { keep: 1, deep: 2 };
    const layout = node('L', {
      type: 'bare',
      children: { col: [node('c1', { name: 'deep', type: 'text' })] },
    });
    unsetDataOfNode(layout, data, components);
    expect(data).toStrictEqual({ keep: 1 });
  });
});

describe('nanoid and generateFormId', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds a deterministic id when Math.random is fixed', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const id = nanoid();
    expect(id).toBe('u'.repeat(21));
    expect(id).toMatch(/^\w+$/);
  });

  it('respects custom size', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(nanoid(5)).toBe('uuuuu');
  });

  it('returns only lowercase from generateFormId', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const id = generateFormId();
    expect(id).toBe(id.toLowerCase());
    expect(id.length).toBeGreaterThan(0);
  });
});

describe('getFormIdFromEvent', () => {
  it('reads form id from prefixed dataTransfer type', () => {
    const event = {
      dataTransfer: { types: ['text/plain', 'form_id_myForm'] },
    } as unknown as DragEvent;
    expect(getFormIdFromEvent(event)).toBe('myForm');
  });

  it('returns undefined when no matching type', () => {
    const event = { dataTransfer: { types: ['text/plain'] } } as unknown as DragEvent;
    expect(getFormIdFromEvent(event)).toBeUndefined();
  });

  it('returns undefined when dataTransfer is missing', () => {
    expect(getFormIdFromEvent({} as DragEvent)).toBeUndefined();
  });
});

describe('setDragEventData', () => {
  it('returns early when dataTransfer is null without throwing', () => {
    const event = { dataTransfer: null } as unknown as DragEvent;
    expect(() => setDragEventData(event, 'fid', 'node_id', 'nid')).not.toThrow();
  });

  it('sets move flags and serialized payload on dataTransfer', () => {
    const setData = vi.fn();
    const dt = {
      dropEffect: '',
      effectAllowed: '',
      setData,
    };
    const event = { dataTransfer: dt } as unknown as DragEvent;
    setDragEventData(event, 'form-1', 'node_id', 'node-9');
    expect(dt.dropEffect).toBe('move');
    expect(dt.effectAllowed).toBe('move');
    expect(setData).toHaveBeenCalledWith('node_id', 'node-9');
    expect(setData).toHaveBeenCalledWith('form_id', 'form-1');
    expect(setData).toHaveBeenCalledWith('form_id_form-1', 'form-1');
  });
});
