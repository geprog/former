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

export function allValid(results: MaybePromise<string | undefined>[]): MaybePromise<boolean> {
  if (results.some(result => result instanceof Promise)) {
    return Promise.all(results).then(messages => messages.every(message => message === undefined));
  }
  return results.every(result => result === undefined);
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
  return allValid(component.propsSchema.map((propsNode) => {
    const data = propsNode.name === '$name' ? node.name : (node.props || {})[propsNode.name || ''];
    const context: ValidationContext = {
      node: propsNode,
      path: propsNode.name ? [propsNode.name] : [],
      scopes: [{ data: propsData, path: [] }],
    };
    return validateComponent(components, propsNode, data, context);
  }));
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

type SuperstructFailure = { message: string; path: ReadonlyArray<PropertyKey> };
type SuperstructStruct<T> = {
  validate: (value: unknown, options?: { coerce?: boolean }) => [{ failures: () => SuperstructFailure[] } | undefined, T | undefined];
};

/**
 * Wraps a Superstruct struct as a Standard Schema, as Superstruct doesn't implement the spec itself.
 * Coercions (e.g. `defaulted`) are applied to the output, like `create` does.
 */
export function fromSuperstruct<T>(struct: SuperstructStruct<T>): StandardSchemaV1<unknown, T> {
  return {
    '~standard': {
      version: 1,
      vendor: 'superstruct',
      validate(value) {
        const [error, output] = struct.validate(value, { coerce: true });
        if (error) {
          return { issues: error.failures().map(failure => ({ message: failure.message, path: failure.path })) };
        }
        return { value: output as T };
      },
    },
  };
}
