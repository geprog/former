import type { DefineComponent, Raw } from 'vue';

export type SchemaNode<Props = { [key: string]: any }> = {
  type: string;
  name: string;
  props?: Props & {
    label?: string;
  };
  children?: SchemaNode<Props>[];
  if?: string;
};

export type FormData = Record<string, any>;

export type FormFieldType = {
  label: string;
  propsSchema: SchemaNode[];
  component: DefineComponent | Raw<DefineComponent>;
};
