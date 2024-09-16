import type { DefineComponent, Raw } from 'vue';

export type SchemaNode<Props = { [key: string]: any }> = {
  type: string;
  name?: string;
  props?: Props;
  children?: SchemaNode<Props>[];
  showIf?: string;
};

export type InternalSchemaNode<Props = { [key: string]: any }> = Omit<SchemaNode<Props>, 'children'> & {
  _id: string;
  children?: InternalSchemaNode<Props>[];
};

export type FormData = any;

type FormFieldComponent = DefineComponent<any, any, any>;

export type FormFieldType = {
  label: string;
  propsSchema: SchemaNode[];
  component: FormFieldComponent | Raw<FormFieldComponent>;
};
