import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { FieldData, FormComponents, FormData, InternalSchemaNode, SchemaNode, ValidationContext } from '~/types';
import { cloneDeep } from 'lodash';
import { type Ref, shallowRef, toRaw, watch } from 'vue';

// the Standard Schema (https://standardschema.dev) implemented by e.g. Zod, Valibot, ArkType and Yup
export type { StandardSchemaV1 };

export type MaybePromise<T> = T | Promise<T>;

function then<T, R>(value: MaybePromise<T>, fn: (value: T) => MaybePromise<R>): MaybePromise<R> {
  return value instanceof Promise ? value.then(fn) : fn(value);
}

// the data is cloned, so that a schema validating asynchronously still tracks all reactive dependencies
// and schema libraries don't get to see (or mutate) the reactive proxies
export function validateWithSchema(schema: StandardSchemaV1, data: unknown): MaybePromise<ReadonlyArray<StandardSchemaV1.Issue>> {
  // schemas mustn't be reactive, e.g. zod schemas break when they are proxied
  return then(toRaw(schema)['~standard'].validate(cloneDeep(data)), result => result.issues ?? []);
}

/**
 * Validates the data of a node with the `validation` of its component.
 * Returns the error message or `undefined` if the data is valid, or a promise of it for async validation.
 */
export function validateComponent(components: FormComponents, node: SchemaNode, data: FieldData | FormData, context: ValidationContext): MaybePromise<string | undefined> {
  const schema = components[node.type]?.validation?.(node.props ?? {}, context);
  return schema ? then(validateWithSchema(schema, data), issues => issues[0]?.message) : undefined;
}

// whether all results match the predicate, only asynchronous if one of the results is a promise
export function every<T>(results: MaybePromise<T>[], predicate: (result: T) => boolean): MaybePromise<boolean> {
  if (results.some(result => result instanceof Promise)) {
    return Promise.all(results).then(resolved => resolved.every(predicate));
  }
  return (results as T[]).every(predicate);
}

// whether the props of the node are valid (used to validate the schema in build mode)
export function isNodeValid(node: InternalSchemaNode, components: FormComponents): MaybePromise<boolean> {
  const component = components[node.type];
  // nodes of unknown components (e.g. after switching the components) can't be rendered or validated
  if (!component) {
    return false;
  }
  // the props are edited in a form of their own (see `FormNodeProps`), so they are the only scope of their validation
  const propsData: FormData = { $name: node.name, ...node.props };
  return every(component.propsSchema.map((propsNode) => {
    const data = propsNode.name === '$name' ? node.name : (node.props || {})[propsNode.name || ''];
    const context: ValidationContext = {
      node: propsNode,
      path: propsNode.name ? [propsNode.name] : [],
      scopes: [{ data: propsData, path: [] }],
    };
    return validateComponent(components, propsNode, data, context);
  }), message => message === undefined);
}

/**
 * A ref with the result of `getter`, which may be a promise (e.g. for async schemas).
 * While a promise is pending the previous result is kept, results of outdated promises are dropped.
 */
export function useMaybeAsync<T>(getter: () => MaybePromise<T>, initial: T): Ref<T> {
  const result = shallowRef<T>(initial);
  let latestRun = 0;
  watch(getter, (value) => {
    const run = ++latestRun;
    if (value instanceof Promise) {
      value.then((resolved) => {
        if (run === latestRun) {
          result.value = resolved;
        }
      });
    }
    else {
      result.value = value;
    }
  }, { immediate: true, flush: 'sync' });
  return result;
}
