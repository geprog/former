import type { ComponentsLike, FormulaFunction, FormulaSource, FormulaValueType, FormulaVariable, SchemaNodeLike } from './types';
import type { SchemaVariablesOptions } from './variables';
import { FormulaError } from './types';
import { describeValues, schemaVariables } from './variables';

type MaybeGetter<T> = T | (() => T);

function get<T>(value: MaybeGetter<T>): T {
  return typeof value === 'function'
    ? (value as () => T)()
    : value;
}

function withNamespace(namespace: string | undefined, variables: FormulaVariable[], label?: string): FormulaVariable[] {
  if (!namespace) {
    return variables;
  }
  return [
    {
      name: namespace,
      type: 'object',
      ...(label
        ? { label }
        : {}),
    },
    ...variables.map(variable => ({ ...variable, name: `${namespace}.${variable.name}` })),
  ];
}

type CommonSourceOptions = {
  id: string;
  /** Shown as group of its variables, e.g. in the completion. */
  label?: string;
  /** The first segment of all its variables, e.g. `namespace` for `$namespace.name`, otherwise its variables are top-level. */
  namespace?: string;
  functions?: Record<string, FormulaFunction>;
  /** While `true` (e.g. its data is still loading), its values are missing. */
  pending?: () => boolean;
};

function common(options: CommonSourceOptions) {
  return {
    id: options.id,
    ...(options.label
      ? { label: options.label }
      : {}),
    ...(options.functions
      ? { functions: options.functions }
      : {}),
    ...(options.pending
      ? { pending: options.pending }
      : {}),
  };
}

export type ValueSourceOptions = CommonSourceOptions & {
  /** The values by variable name (relative to the namespace), a getter is read on each evaluation (e.g. of a ref). */
  values: MaybeGetter<Record<string, unknown>>;
  /** Describes the variables, by default they are described by the current values. */
  variables?: MaybeGetter<FormulaVariable[]>;
};

/** Provides plain values, e.g. `{ name: 1, group: { field: 2 } }` as `$name` and `$group.field`. */
export function valueSource(options: ValueSourceOptions): FormulaSource {
  const variables = () => (options.variables
    ? get(options.variables)
    : describeValues(get(options.values)));
  return {
    ...common(options),
    roots: () => (options.namespace
      ? [options.namespace]
      : [
          ...new Set([
            ...Object.keys(get(options.values)),
            ...variables().map(variable => variable.name.split('.')[0]!),
          ]),
        ]),
    resolve: root => (options.namespace
      ? get(options.values)
      : get(options.values)[root]),
    variables: () => withNamespace(options.namespace, variables(), options.label),
  };
}

export type SchemaSourceOptions = CommonSourceOptions & Omit<SchemaVariablesOptions, 'itemSuffix' | 'sourceId'> & {
  /** The schema of the form, e.g. of another module. */
  schema: MaybeGetter<ReadonlyArray<SchemaNodeLike>>;
  /** The data of the form. */
  data: MaybeGetter<unknown>;
  components: MaybeGetter<ComponentsLike>;
};

/**
 * Provides the data of another form by its schema, e.g. `$namespace.group.field` of a form the formula isn't part of.
 * The items of its lists are used like the ones of the form, e.g. `map($namespace.list, f($list_item) = $list_item.field)`.
 */
export function schemaSource(options: SchemaSourceOptions): FormulaSource {
  const data = (): Record<string, unknown> => {
    const value = get(options.data);
    return value !== null && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  };
  const fieldVariables = (itemSuffix: string) => schemaVariables(get(options.schema), get(options.components), {
    ...options,
    itemSuffix,
  });
  return {
    ...common(options),
    roots: () => (options.namespace
      ? [options.namespace]
      : [
          ...new Set(fieldVariables('_item').filter(variable => !variable.itemOf && !variable.name.includes('.')).map(variable => variable.name)),
        ]),
    resolve: root => (options.namespace
      ? data()
      : data()[root]),
    variables: ({ itemSuffix }) => {
      const variables = fieldVariables(itemSuffix);
      // the item variables are never namespaced, they are named after their list wherever it is
      const isItemVariable = (variable: FormulaVariable) => !!variable.itemOf || variable.name.split('.')[0]!.endsWith(itemSuffix);
      return [
        ...withNamespace(options.namespace, variables.filter(variable => !isItemVariable(variable)), options.label),
        ...variables.filter(isItemVariable),
      ];
    },
  };
}

export type NamedFormula = string | {
  formula: string;
  label?: string;
  description?: string;
  /** The type of its result, otherwise it is inferred from the formula. */
  type?: FormulaValueType;
};

export type FormulaSourceOptions = CommonSourceOptions & {
  /** The formulas by name, e.g. `{ name: '$a * $b' }` for `$name`. */
  formulas: MaybeGetter<Record<string, NamedFormula>>;
};

function formulaOf(named: NamedFormula): string {
  return typeof named === 'string'
    ? named
    : named.formula;
}

/**
 * Provides named formulas, which other formulas reference like variables, e.g. `$name`.
 * They are evaluated when they are used, once per evaluation, in the same data as the formula using them.
 * A formula referencing itself (also through others) fails to evaluate.
 */
export function formulaSource(options: FormulaSourceOptions): FormulaSource {
  return {
    ...common(options),
    roots: () => (options.namespace
      ? [options.namespace]
      : Object.keys(get(options.formulas))),
    resolve: (root, { evaluate }) => {
      const formulas = get(options.formulas);
      if (!options.namespace) {
        const named = formulas[root];
        return named === undefined
          ? undefined
          : evaluate(formulaOf(named));
      }
      // the formulas of a namespace are evaluated when their property is read
      const values = new Map<string, unknown>();
      const inProgress = new Set<string>();
      const namespace: Record<string, unknown> = {};
      Object.entries(formulas).forEach(([name, named]) => {
        Object.defineProperty(namespace, name, {
          enumerable: true,
          get: () => {
            if (!values.has(name)) {
              if (inProgress.has(name)) {
                throw new FormulaError('cycle', `${options.namespace}.${name} references itself`);
              }
              inProgress.add(name);
              try {
                values.set(name, evaluate(formulaOf(named)));
              }
              finally {
                inProgress.delete(name);
              }
            }
            return values.get(name);
          },
        });
      });
      return namespace;
    },
    variables: engine => withNamespace(options.namespace, Object.entries(get(options.formulas)).map(([name, named]) => {
      const details: Exclude<NamedFormula, string> = typeof named === 'string'
        ? { formula: named }
        : named;
      return {
        name,
        type: details.type ?? (engine as Partial<{ analyze: (formula: string) => { inferredType: FormulaValueType } }>).analyze?.(formulaOf(named)).inferredType ?? 'unknown',
        ...(details.label
          ? { label: details.label }
          : {}),
        ...(details.description
          ? { description: details.description }
          : {}),
      };
    }), options.label),
  };
}
