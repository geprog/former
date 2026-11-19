import type { ComponentsLike, FormulaValueType, FormulaVariable, FormulaVariableOption, SchemaNodeLike } from './types';

export const DEFAULT_ITEM_SUFFIX = '_item';

/** The types of the values of common component types, see `SchemaVariablesOptions.valueTypes`. */
export const DEFAULT_VALUE_TYPES: Record<string, FormulaValueType> = {
  text: 'string',
  textarea: 'string',
  select: 'string',
  radio_group: 'string',
  combo_box: 'string',
  color: 'string',
  time: 'string',
  date: 'date',
  number: 'number',
  slider: 'number',
  rating: 'number',
  checkbox: 'boolean',
  switch: 'boolean',
  checkbox_group: 'list',
  tags: 'list',
};

export type SchemaVariablesOptions = {
  /** The suffix of the item variable of a list, e.g. `list_item` for the current item of `list`. */
  itemSuffix?: string;
  /** The type of the value of each component type, merged into `DEFAULT_VALUE_TYPES`. */
  valueTypes?: Record<string, FormulaValueType>;
  /** The values a node can take, by default its `options` prop (`{ value, label }[]`). */
  options?: (node: SchemaNodeLike) => FormulaVariableOption[] | undefined;
  /** The label of the variable of a node, by default its `label` prop. */
  label?: (node: SchemaNodeLike) => string | undefined;
  /** Set as `sourceId` of the variables. */
  sourceId?: string;
};

export function nodeChildren(node: SchemaNodeLike): SchemaNodeLike[] {
  if (!node.children) {
    return [];
  }
  return Array.isArray(node.children)
    ? node.children
    : Object.values(node.children).flat();
}

// like `isNodeLayoutComponent` of `@former-ui/former`, which can't be imported here as it would pull in Vue
export function isLayoutNode(node: SchemaNodeLike, components: ComponentsLike): boolean {
  return !(components[node.type]?.propsSchema ?? []).some(prop => prop.name === '$name');
}

/** Whether the data of the node is a list whose items each render its children (e.g. a repeater). */
export function isListNode(node: SchemaNodeLike, components: ComponentsLike): boolean {
  return !!components[node.type]?.isList;
}

function defaultOptions(node: SchemaNodeLike): FormulaVariableOption[] | undefined {
  const options = node.props?.options;
  if (!Array.isArray(options)) {
    return undefined;
  }
  const result = options
    .filter((option): option is { value: unknown; label?: unknown } => !!option && typeof option === 'object')
    .filter(option => option.value !== undefined && option.value !== null && option.value !== '')
    .map(option => ({
      value: String(option.value),
      ...(typeof option.label === 'string'
        ? { label: option.label }
        : {}),
    }));
  return result.length
    ? result
    : undefined;
}

function defaultLabel(node: SchemaNodeLike): string | undefined {
  return typeof node.props?.label === 'string' && node.props.label
    ? node.props.label
    : undefined;
}

/**
 * The variables of the fields of a schema, named by the path of their data, e.g. `group.field` for the field `field`
 * of the group `group`. A list (e.g. a repeater `list`) is a variable of type `list` and its current item is
 * the variable `list_item`, so the fields of the items are `list_item.field`, regardless of where the list is.
 */
export function schemaVariables(schema: ReadonlyArray<SchemaNodeLike>, components: ComponentsLike, options: SchemaVariablesOptions = {}): FormulaVariable[] {
  const itemSuffix = options.itemSuffix ?? DEFAULT_ITEM_SUFFIX;
  const valueTypes = {
    ...DEFAULT_VALUE_TYPES,
    ...options.valueTypes,
  };
  const optionsOf = options.options ?? defaultOptions;
  const labelOf = options.label ?? defaultLabel;
  const source = options.sourceId
    ? { sourceId: options.sourceId }
    : {};

  function walk(nodes: ReadonlyArray<SchemaNodeLike>, parentPath: string[], itemOf: string | undefined): FormulaVariable[] {
    return nodes.flatMap((node) => {
      // layout components (and nodes without name) don't nest the data of their children
      if (isLayoutNode(node, components) || !node.name) {
        return walk(nodeChildren(node), parentPath, itemOf);
      }
      const path = [...parentPath, node.name];
      const children = nodeChildren(node);
      const isList = isListNode(node, components);
      const label = labelOf(node);
      const nodeOptions = optionsOf(node);
      const type: FormulaValueType = isList
        ? 'list'
        : valueTypes[node.type] ?? (children.length
          ? 'object'
          : 'unknown');
      const variable: FormulaVariable = {
        name: path.join('.'),
        type,
        node,
        ...(label
          ? { label }
          : {}),
        ...(nodeOptions
          ? { options: nodeOptions }
          : {}),
        ...(itemOf
          ? { itemOf }
          : {}),
        ...source,
      };
      if (!isList) {
        return [
          variable,
          ...walk(children, path, itemOf),
        ];
      }
      const item = `${node.name}${itemSuffix}`;
      return [
        variable,
        {
          name: item,
          type: 'object',
          node,
          ...(label
            ? { label }
            : {}),
          itemOf: node.name,
          ...source,
        },
        ...walk(children, [item], node.name),
      ];
    });
  }

  return walk(schema, [], undefined);
}

/** The names of the lists around a node (e.g. the repeaters it is in), whose items are in scope of its formulas. */
export function listsAround(path: ReadonlyArray<SchemaNodeLike>, components: ComponentsLike): string[] {
  return path
    .filter(node => node.name && isListNode(node, components))
    .map(node => node.name!);
}

/**
 * The variable of a node, given its parents from the top of the schema (e.g. `list_item.field` for the field `field`
 * of the repeater `list`), or `undefined` for nodes without data.
 */
export function variableNameOfNode(node: SchemaNodeLike, path: ReadonlyArray<SchemaNodeLike>, components: ComponentsLike, itemSuffix = DEFAULT_ITEM_SUFFIX): string | undefined {
  if (!node.name || isLayoutNode(node, components)) {
    return undefined;
  }
  const names = path.reduce<string[]>((names, parent) => {
    if (!parent.name || isLayoutNode(parent, components)) {
      return names;
    }
    return isListNode(parent, components)
      ? [`${parent.name}${itemSuffix}`]
      : [...names, parent.name];
  }, []);
  return [...names, node.name].join('.');
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function typeOfValue(value: unknown): FormulaValueType {
  if (Array.isArray(value)) {
    return 'list';
  }
  if (isPlainObject(value)) {
    return 'object';
  }
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') {
    return typeof value as FormulaValueType;
  }
  return 'unknown';
}

/** Describes the variables of plain data, e.g. `{ group: { field: 1 } }` as `group` (object) and `group.field` (number). */
export function describeValues(values: Record<string, unknown>, parentPath: string[] = [], depth = 5): FormulaVariable[] {
  return Object.entries(values).flatMap(([key, value]) => {
    const path = [...parentPath, key];
    const variable: FormulaVariable = {
      name: path.join('.'),
      type: typeOfValue(value),
    };
    return isPlainObject(value) && depth > 1
      ? [
          variable,
          ...describeValues(value, path, depth - 1),
        ]
      : [variable];
  });
}
