import type {
  EditedNode,
  FormComponents,
  FormFieldType,
  FormulaPropsMap,
  FormulaPropType,
  SchemaNode,
  ShowIfPredicate,
  StandardSchemaV1,
  ValidationContext,
} from '@former-ui/former';
import type { Component, ComputedRef, DeepReadonly, InjectionKey, MaybeRefOrGetter } from 'vue';
import type { FormulaEngine } from '../engine';
import type { Translate } from '../messages';
import type { Diagnostic, EvaluationResult, ExpectedType, FormulaContext, FormulaSource, FormulaVariable } from '../types';
import { useEditedNode, useFormNode } from '@former-ui/former';
import { computed, defineComponent, h, inject, markRaw, provide, toRaw, toValue } from 'vue';
import { useI18n } from 'vue-i18n';
import { diagnosticMessage, reservedNameMessage, translateToEnglish } from '../messages';
import { listsAround, variableNameOfNode } from '../variables';
import { FormulaCalculation } from './FormulaCalculation';
import { FormulaSwitch } from './FormulaSwitch';

export { FormulaCalculation, FormulaSwitch };

const ENGINE_KEY: InjectionKey<FormulaEngine> = Symbol('formulaEngine');
const SOURCES_KEY: InjectionKey<ComputedRef<FormulaSource[]>> = Symbol('formulaSources');
const COMPONENTS_KEY: InjectionKey<ComputedRef<FormComponents>> = Symbol('formulaComponents');

// the variables of the schemas of forms by their components, which are derived once per schema
const variablesOfSchemas = new WeakMap<object, WeakMap<object, FormulaVariable[]>>();

/**
 * The variables of the fields of a form, so that e.g. its lists without data evaluate to `[]`,
 * `undefined` without schema or components.
 */
export function formVariables(engine: FormulaEngine, schema: ReadonlyArray<unknown> | undefined, components: FormComponents | undefined): FormulaVariable[] | undefined {
  if (!schema || !components) {
    return undefined;
  }
  const rawSchema = toRaw(schema) as SchemaNode[];
  const bySchema = variablesOfSchemas.get(components) ?? new WeakMap<object, FormulaVariable[]>();
  variablesOfSchemas.set(components, bySchema);
  let variables = bySchema.get(rawSchema);
  if (!variables) {
    variables = engine.schemaVariables(rawSchema, components);
    bySchema.set(rawSchema, variables);
  }
  return variables;
}

/** Provides the engine to the formulas of the components below, e.g. of a form. */
export function provideFormulaEngine(engine: FormulaEngine): void {
  provide(ENGINE_KEY, engine);
}

/** The engine provided by a parent component. */
export function useFormulaEngine(): FormulaEngine {
  const engine = inject(ENGINE_KEY, undefined);
  if (!engine) {
    throw new Error('No formula engine provided, use provideFormulaEngine (or pass the engine) in a parent component');
  }
  return engine;
}

/**
 * Provides sources to the formulas of the components below, in addition to the ones of parent components,
 * e.g. the data of other forms. Returns all sources available below.
 */
export function provideFormulaSources(sources: MaybeRefOrGetter<ReadonlyArray<FormulaSource>>): ComputedRef<FormulaSource[]> {
  const parent = inject(SOURCES_KEY, undefined);
  const all = computed(() => [
    ...toValue(sources),
    ...(parent?.value ?? []),
  ]);
  provide(SOURCES_KEY, all);
  return all;
}

/** The sources provided by parent components (the ones of the engine are always available). */
export function useFormulaSources(): ComputedRef<FormulaSource[]> {
  const sources = inject(SOURCES_KEY, undefined);
  return computed(() => sources?.value ?? []);
}

/** Where the engine and the sources come from, by default they are injected from parent components. */
export type FormulaSetupOptions = {
  engine?: FormulaEngine;
  /** Sources in addition to the provided ones. */
  sources?: MaybeRefOrGetter<ReadonlyArray<FormulaSource>>;
};

function useSetup(options: FormulaSetupOptions) {
  const engine = options.engine ?? useFormulaEngine();
  const provided = useFormulaSources();
  const sources = computed(() => [
    ...(toValue(options.sources) ?? []),
    ...provided.value,
  ]);
  return { engine, sources };
}

export type UseFormulaOptions = FormulaSetupOptions & {
  expect?: ExpectedType;
  /** The variables of the form, so that e.g. lists without data evaluate to `[]`. */
  variables?: MaybeRefOrGetter<ReadonlyArray<FormulaVariable>>;
};

/**
 * Evaluates a formula reactively in the data of the form node the component is rendered for, e.g. its repeater item.
 * It is evaluated again whenever a value it references changes.
 */
export function useFormula(formula: MaybeRefOrGetter<string | null | undefined>, options: UseFormulaOptions = {}) {
  const { engine, sources } = useSetup(options);
  const nodeContext = useFormNode();
  const components = inject(COMPONENTS_KEY, undefined);
  const result = computed<EvaluationResult | undefined>(() => {
    const text = toValue(formula);
    if (typeof text !== 'string' || !text.trim()) {
      return undefined;
    }
    return engine.evaluateDetailed(text, {
      scopes: nodeContext.value?.scopes,
      sources: sources.value,
      variables: toValue(options.variables) ?? formVariables(engine, nodeContext.value?.schema, components?.value),
      expect: options.expect,
    });
  });
  return {
    /** The value, `undefined` without formula or if it can't be evaluated. */
    value: computed(() => (result.value?.ok
      ? result.value.value
      : undefined)),
    result,
    /** Whether a source the formula uses is still pending (e.g. loading). */
    pending: computed(() => result.value?.pending ?? false),
  };
}

export type UseFormulaShowIfOptions = FormulaSetupOptions & {
  /** The prop of the nodes holding their condition. */
  prop?: string;
  /** The components of the form, so that e.g. lists without data evaluate to `[]`. */
  components?: MaybeRefOrGetter<FormComponents>;
};

/**
 * A show if predicate for `<Former :show-if>` evaluating the formula in the `showIf` prop of the nodes.
 * Nodes without condition are shown, nodes whose condition fails or doesn't evaluate to a boolean are hidden.
 * Must be called in the `setup` of a component, e.g. the one rendering the form.
 */
export function useFormulaShowIf(options: UseFormulaShowIfOptions = {}): ShowIfPredicate {
  const { engine, sources } = useSetup(options);
  const prop = options.prop ?? 'showIf';

  return (node, data, schema, context) => {
    const formula = node.props?.[prop];
    if (typeof formula !== 'string' || !formula.trim()) {
      return true;
    }
    const variables = formVariables(engine, schema, toValue(options.components));
    const result = engine.evaluateDetailed(formula, {
      scopes: context?.scopes ?? [
        { data, path: [] },
      ],
      sources: sources.value,
      variables,
      expect: 'boolean',
    });
    return result.ok && result.value === true;
  };
}

export type WithFormulaPropsOptions = {
  engine: FormulaEngine;
  /** The sources available to the formulas, in addition to the ones of the engine. */
  sources?: () => ReadonlyArray<FormulaSource>;
  /** Whether every component gets a `showIf` formula (see `useFormulaShowIf`), by default it does. */
  showIf?: boolean;
  /** The component editing formulas in the props form, it is added as internal component of the type `type`. */
  editor?: { type?: string; component?: Component };
  /** The layout component switching between the field of a prop and the one of its formula (see `FormulaSwitch`). */
  switch?: { type?: string; component?: Component };
  /**
   * Translates the texts (labels and messages), e.g. `(key, named) => t(key, named ?? {})` of vue-i18n with the
   * texts of `@former-ui/formula/en.json`, by default they are english.
   */
  translate?: Translate;
  /** Whether the props forms report names taken by the variables of sources, by default they do. */
  checkReservedNames?: boolean;
  /**
   * Adds a field showing the result of a formula (see `FormulaCalculation`), as component of the type `type`
   * (by default `calculation`). Its name and label are edited with `textType`, by default the component the
   * names of the other components are edited with.
   */
  calculation?: boolean | { type?: string; textType?: string };
};

type MaybePromise<T> = T | PromiseLike<T>;
type Issues = ReadonlyArray<StandardSchemaV1.Issue>;

function isPromiseLike<T>(value: MaybePromise<T>): value is PromiseLike<T> {
  return typeof (value as PromiseLike<T> | null)?.then === 'function';
}

function then<T, R>(value: MaybePromise<T>, fn: (value: T) => R): R | Promise<R> {
  return isPromiseLike(value)
    ? Promise.resolve(value).then(fn)
    : fn(value);
}

/** A standard schema checking the value with `check` after the (optional) `schema`. */
function checkedSchema(check: (value: unknown) => Issues, schema?: StandardSchemaV1): StandardSchemaV1 {
  return {
    '~standard': {
      version: 1,
      vendor: 'former-formula',
      validate: (value: unknown) => then(
        schema
          ? schema['~standard'].validate(value)
          : { value },
        (result) => {
          if (result.issues?.length) {
            return result;
          }
          const issues = check(value);
          return issues.length
            ? { issues }
            : { value };
        },
      ),
    },
  };
}

const expectedTypes: Record<FormulaPropType, ExpectedType> = {
  number: 'number',
  boolean: 'boolean',
  string: 'string',
  date: 'date',
};

/**
 * The context of a formula in the props form of a node (`editedNode`), e.g. the variables of the schema and the
 * sources, and the lists around the node, without the node only the variables of the sources.
 */
export function formulaContextOf(
  engine: FormulaEngine,
  components: FormComponents,
  sources: ReadonlyArray<FormulaSource>,
  editedNode: DeepReadonly<EditedNode> | EditedNode | undefined,
  expect?: ExpectedType,
): FormulaContext {
  const edited = editedNode as EditedNode | undefined;
  return {
    variables: [
      ...(edited
        ? engine.schemaVariables(edited.schema, components)
        : []),
      ...engine.sourceVariables(sources),
    ],
    ...(expect
      ? { expect }
      : {}),
    ...(edited
      ? {
          loopScopes: listsAround(edited.path, components),
          self: variableNameOfNode(edited.node, edited.path, components, engine.itemSuffix),
        }
      : {}),
  };
}

export function formulaPropName(prop: string): string {
  return `${prop}Formula`;
}

// the wrappers by component and the props they resolve, so that the components keep their identity
const wrappers = new WeakMap<object, Map<string, Component>>();

/**
 * Wraps a component so that it gets the values of its formula props (e.g. `max` from `maxFormula`) instead of
 * the static ones. The engine and sources are injected, see `useFormulaProps`.
 */
function wrapComponent(component: Component, propTypes: Record<string, FormulaPropType>, hiddenProps: string[]): Component {
  const signature = JSON.stringify([propTypes, hiddenProps]);
  const byProps = wrappers.get(component) ?? new Map<string, Component>();
  wrappers.set(component, byProps);
  const existing = byProps.get(signature);
  if (existing) {
    return existing;
  }
  const wrapper = markRaw(defineComponent({
    name: 'FormulaProps',
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
      const engine = useFormulaEngine();
      const sources = useFormulaSources();
      const nodeContext = useFormNode();
      const components = inject(COMPONENTS_KEY, undefined);
      // evaluated while rendering, so that the component is rendered again when a referenced value changes
      return () => {
        const props: Record<string, unknown> = { ...attrs };
        hiddenProps.forEach(prop => delete props[prop]);
        Object.entries(propTypes).forEach(([prop, type]) => {
          const formula = props[formulaPropName(prop)];
          delete props[formulaPropName(prop)];
          if (typeof formula === 'string' && formula.trim()) {
            props[prop] = engine.evaluate(formula, {
              scopes: nodeContext.value?.scopes,
              sources: sources.value,
              variables: formVariables(engine, nodeContext.value?.schema, components?.value),
              expect: expectedTypes[type],
              missing: 'fail',
            });
          }
        });
        return h(component as any, props, slots);
      };
    },
  }));
  byProps.set(signature, wrapper);
  return wrapper;
}

const NAME_TYPE_SUFFIX = ':formula_name';

/**
 * Adds formulas to the props of components (e.g. from a preset): in the props form, each prop in `formulaProps`
 * can be switched between its fixed value and a formula stored as `<prop>Formula`, only one of them is set.
 * The component and its validation get the value of the formula instead of the fixed value.
 * A formula which can't be evaluated leaves the prop unset.
 *
 * The components are rendered with the engine and sources provided by a parent component (see `useFormulaProps`).
 */
export function withFormulaProps(components: FormComponents, formulaProps: FormulaPropsMap, options: WithFormulaPropsOptions): FormComponents {
  const { engine } = options;
  const editorType = options.editor?.type ?? 'formula';
  const switchType = options.switch?.type ?? 'formula_switch';
  const addShowIf = options.showIf !== false;
  const translate = options.translate ?? translateToEnglish;
  const checkReservedNames = options.checkReservedNames !== false;
  const sources = () => options.sources?.() ?? [];
  const result: FormComponents = {};
  const nameTypes = new Set<string>();

  const formulaNode = (name: string, nodeLabel: string, expect: ExpectedType): SchemaNode => ({
    type: editorType,
    name,
    props: { label: nodeLabel, expect },
  });

  for (const [type, fieldType] of Object.entries(components)) {
    if (fieldType.internal) {
      result[type] = fieldType;
      continue;
    }
    const propTypes = formulaProps[type] ?? {};
    let propsSchema = fieldType.propsSchema.map((node) => {
      if (node.name !== '$name' || !checkReservedNames) {
        return node;
      }
      nameTypes.add(node.type);
      return { ...node, type: `${node.type}${NAME_TYPE_SUFFIX}` };
    });
    Object.entries(propTypes).forEach(([prop, propType]) => {
      const staticNode = propsSchema.find(node => node.name === prop);
      const staticLabel = staticNode?.props?.label;
      const formula = formulaNode(formulaPropName(prop), typeof staticLabel === 'string' && staticLabel
        ? staticLabel
        : prop, expectedTypes[propType]);
      if (!staticNode) {
        propsSchema = [...propsSchema, formula];
        return;
      }
      // the field of the prop and the one of its formula take turns at the place of the prop
      propsSchema = propsSchema.map(node => (node === staticNode
        ? {
            type: switchType,
            props: {
              prop,
              formulaProp: formulaPropName(prop),
              useFormula: translate('formula_use_formula'),
              useValue: translate('formula_use_value'),
            },
            children: {
              value: [staticNode],
              formula: [formula],
            },
          }
        : node));
    });
    if (addShowIf) {
      propsSchema = [
        ...propsSchema,
        formulaNode('showIf', translate('formula_show_if'), 'boolean'),
      ];
    }
    const { validation } = fieldType;
    result[type] = {
      ...fieldType,
      propsSchema,
      component: Object.keys(propTypes).length || addShowIf
        ? wrapComponent(fieldType.component, propTypes, addShowIf
            ? ['showIf']
            : [])
        : fieldType.component,
      ...(validation && Object.keys(propTypes).length
        ? {
            validation: (props: Record<string, any>, context: ValidationContext) => {
              const resolved = { ...props };
              Object.entries(propTypes).forEach(([prop, propType]) => {
                const formula = resolved[formulaPropName(prop)];
                if (typeof formula === 'string' && formula.trim()) {
                  resolved[prop] = engine.evaluate(formula, {
                    scopes: context.scopes,
                    sources: sources(),
                    variables: formVariables(engine, context.schema, result),
                    expect: expectedTypes[propType],
                    missing: 'fail',
                  });
                  if (resolved[prop] === undefined) {
                    delete resolved[prop];
                  }
                }
              });
              return validation(resolved, context);
            },
          }
        : {}),
    };
  }

  if (options.calculation) {
    const calculation = typeof options.calculation === 'object'
      ? options.calculation
      : {};
    const textType = calculation.textType
      ?? Object.values(components).flatMap(fieldType => fieldType.propsSchema).find(node => node.name === '$name')?.type
      ?? 'text';
    if (checkReservedNames) {
      nameTypes.add(textType);
    }
    result[calculation.type ?? 'calculation'] = {
      label: translate('formula_calculation'),
      component: markRaw(FormulaCalculation),
      propsSchema: [
        {
          type: checkReservedNames
            ? `${textType}${NAME_TYPE_SUFFIX}`
            : textType,
          name: '$name',
          props: {
            label: translate('formula_calculation_name'),
          },
        },
        {
          type: textType,
          name: 'label',
          props: {
            label: translate('formula_calculation_label'),
          },
        },
        formulaNode('formula', translate('formula_calculation_formula'), 'any'),
        ...(addShowIf
          ? [
              formulaNode('showIf', translate('formula_show_if'), 'boolean'),
            ]
          : []),
      ],
    };
  }

  // the name fields of the props forms, which mustn't take the names of the variables of sources
  nameTypes.forEach((nameType) => {
    const fieldType = components[nameType];
    if (!fieldType) {
      return;
    }
    result[`${nameType}${NAME_TYPE_SUFFIX}`] = {
      ...fieldType,
      internal: true,
      validation: (props, context) => checkedSchema(
        value => (typeof value === 'string' && engine.reservedNames(sources()).includes(value)
          ? [
              {
                message: reservedNameMessage(value, engine, translate),
              },
            ]
          : []),
        fieldType.validation?.(props, context),
      ),
    };
  });

  if (options.editor?.component) {
    result[editorType] = formulaFieldType(options.editor.component, translate('formula_editor'));
  }
  // a layout component (without `$name`), so it gets the props of the node as its data
  result[switchType] = {
    label: translate('formula_switch'),
    component: markRaw(options.switch?.component ?? FormulaSwitch),
    propsSchema: [],
    internal: true,
  };
  return result;

  function formulaFieldType(component: Component, editorLabel: string): FormFieldType {
    return {
      label: editorLabel,
      component: markRaw(component),
      // a named field, otherwise Former would treat it as layout component without data of its own
      propsSchema: [
        { type: 'text', name: '$name' },
      ],
      internal: true,
      validation: (props, context) => checkedSchema((value) => {
        if (typeof value !== 'string' || !value.trim()) {
          return [];
        }
        const analysis = engine.analyze(value, formulaContextOf(engine, result, sources(), context.editedNode, props.expect), {
          sources: sources(),
        });
        // without the node whose props are edited, the variables of the form are unknown
        const isReported = (diagnostic: Diagnostic) => diagnostic.severity === 'error'
          && (context.editedNode || (diagnostic.code !== 'unknown-variable' && diagnostic.code !== 'out-of-scope'));
        return analysis.diagnostics.filter(isReported).map(diagnostic => ({
          message: diagnosticMessage(diagnostic, engine, translate),
        }));
      }),
    };
  }
}

export type UseFormulaPropsOptions = Omit<WithFormulaPropsOptions, 'engine' | 'sources' | 'translate'> & FormulaSetupOptions;

/**
 * Adds formulas to the props of the components (see `withFormulaProps`) and provides the engine and sources
 * to the form rendering them. The texts are translated with the i18n instance of the app and follow its locale,
 * the english texts are in `@former-ui/formula/en.json`.
 * Must be called in the `setup` of the component rendering the form.
 */
export function useFormulaProps(
  components: MaybeRefOrGetter<FormComponents>,
  formulaProps: MaybeRefOrGetter<FormulaPropsMap>,
  options: UseFormulaPropsOptions = {},
): ComputedRef<FormComponents> {
  const { t } = useI18n();
  const { engine, sources } = useSetup(options);
  provideFormulaEngine(engine);
  provide(SOURCES_KEY, sources);
  const result = computed(() => withFormulaProps(toValue(components), toValue(formulaProps), {
    ...options,
    engine,
    sources: () => sources.value,
    translate: (key, named) => t(key, named ?? {}),
  }));
  // for the editors of the formulas, which need to know the fields of the form (see `useFormulaEditorContext`)
  provide(COMPONENTS_KEY, result);
  return result;
}

/**
 * What an editor of a formula needs to know, e.g. for completion: the engine, the sources and the context of the
 * formula in the props form of the edited node (see `formulaContextOf`). Must be called in the `setup` of a component
 * rendered below `useFormulaProps`.
 */
export function useFormulaEditorContext(expect?: MaybeRefOrGetter<ExpectedType | undefined>) {
  const engine = useFormulaEngine();
  const sources = useFormulaSources();
  const components = inject(COMPONENTS_KEY, undefined);
  const editedNode = useEditedNode();
  const context = computed(() => formulaContextOf(engine, components?.value ?? {}, sources.value, editedNode.value, toValue(expect)));
  return { engine, sources, context, editedNode };
}
