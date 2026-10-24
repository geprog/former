import type { FieldData, FormComponents, FormData, SchemaNode } from '@former-ui/former';
import type { InjectionKey, Ref } from 'vue';
import { hasValue, nodeChildren } from '@former-ui/former';

// the schema of the form built in the playground, the show if select is rendered in the props form which has its own schema
export const playgroundSchemaKey: InjectionKey<Ref<SchemaNode[]>> = Symbol('playgroundSchema');

export type DataField = { label: string; value: string };

// collects all fields of the schema with their dot separated data path, e.g. `group.name`
export function dataFields(schema: SchemaNode[], components: FormComponents, parentPath: string[] = []): DataField[] {
  return schema.flatMap((node) => {
    // layout components (without a `$name` prop) don't nest the data of their children
    const isLayout = !(components[node.type]?.propsSchema ?? []).some(prop => prop.name === '$name');
    if (isLayout || !node.name) {
      return dataFields(nodeChildren(node), components, parentPath);
    }

    const path = [...parentPath, node.name];
    const value = path.join('.');
    const label = typeof node.props?.label === 'string' && node.props.label ? `${node.props.label} (${value})` : value;
    const field = { label, value };
    // the data of a repeater is a list, so its children can't be addressed by a single path
    if (node.type === 'repeater') {
      return [field];
    }
    return [field, ...dataFields(nodeChildren(node), components, path)];
  });
}

function valueAt(data: FormData, path: string): FieldData | FormData | undefined {
  return path.split('.').reduce<FieldData | FormData | undefined>((value, key) => {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      return undefined;
    }
    return (value as FormData)[key];
  }, data);
}

export function hasValueAt(data: FormData, path: string): boolean {
  return hasValue(valueAt(data, path));
}
