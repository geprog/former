import type { InternalSchemaNode, SchemaNode } from './types';
import { isRef, type MaybeRef, type MaybeRefOrGetter, nextTick, toValue } from 'vue';

function addIdToNode(_node: InternalSchemaNode | SchemaNode): InternalSchemaNode {
  const node = { ..._node } as InternalSchemaNode;

  if (!node._id) {
    node._id = nanoid();
  }

  if (node.children) {
    node.children = node.children.map(addIdToNode);
  }

  return node;
}

export function toInternalSchema(schema: SchemaNode[]): InternalSchemaNode[] {
  return schema.map(addIdToNode);
}

function removeIdFromNode(_node: InternalSchemaNode | SchemaNode): SchemaNode {
  const node = { ..._node } as SchemaNode & { _id?: string };

  delete node._id;

  if (node.children) {
    node.children = node.children.map(removeIdFromNode);
  }

  return node;
}

export function toSchema(schema: InternalSchemaNode[]): SchemaNode[] {
  return schema.map(removeIdFromNode);
}

export function replaceNode(schema: InternalSchemaNode[], node: InternalSchemaNode): void {
  for (let i = 0; i < schema.length; i++) {
    if (schema[i]._id === node._id) {
      schema.splice(i, 1, node);
      return;
    }

    const children = schema[i].children;
    if (children) {
      replaceNode(children, node);
    }
  }
}

export function deleteNode(schema: InternalSchemaNode[], nodeId: string): void {
  for (let i = 0; i < schema.length; i++) {
    if (schema[i]._id === nodeId) {
      schema.splice(i, 1);
      return;
    }

    const children = schema[i].children;
    if (children) {
      deleteNode(children, nodeId);
    }
  }
}

export function nodePosition(
  schema: InternalSchemaNode[],
  nodeId: string,
  anchor: 'above' | 'below',
  parentId?: string,
): {
  parentId?: string;
  index: number;
} | null {
  for (let i = 0; i < schema.length; i++) {
    if (schema[i]._id === nodeId) {
      return { parentId, index: anchor === 'above' ? i : i + 1 };
    }

    const children = schema[i].children;
    if (children) {
      const position = nodePosition(children, nodeId, anchor, schema[i]._id);
      if (position) {
        return position;
      }
    }
  }

  return null;
}

export function addNode(
  schema: InternalSchemaNode[],
  parentId: string | null,
  index: number,
  node: InternalSchemaNode,
): void {
  if (parentId === null) {
    schema.splice(index, 0, node);
    return;
  }

  for (let i = 0; i < schema.length; i++) {
    if (schema[i]._id === parentId) {
      if (!schema[i].children) {
        schema[i].children = [node];
        return;
      }

      schema[i].children?.splice(index, 0, node);
      return;
    }

    const children = schema[i].children;
    if (children) {
      addNode(children, parentId, index, node);
    }
  }
}

export function getNode(schema: InternalSchemaNode[], nodeId: string): InternalSchemaNode | null {
  for (let i = 0; i < schema.length; i++) {
    if (schema[i]._id === nodeId) {
      return schema[i];
    }

    const children = schema[i].children;
    if (children) {
      const node = getNode(children, nodeId);
      if (node) {
        return node;
      }
    }
  }

  return null;
}

export function moveNode(
  schema: InternalSchemaNode[],
  node: InternalSchemaNode,
  parentId: string | null,
  index: number,
): void {
  deleteNode(schema, node._id);
  addNode(schema, parentId, index, node);
}

// port from nanoid
// https://github.com/ai/nanoid
const urlAlphabet = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict';
export function nanoid(size = 21) {
  let id = '';
  let i = size;
  while (i--) id += urlAlphabet[(Math.random() * 64) | 0];
  return id;
}

// from: https://github.com/vueuse/vueuse/blob/main/packages/integrations/useSortable/index.ts
export function moveArrayElement<T>(list: MaybeRefOrGetter<T[]>, from: number, to: number): void {
  const _valueIsRef = isRef(list);
  // When the list is a ref, make a shallow copy of it to avoid repeatedly triggering side effects when moving elements
  const array = _valueIsRef ? [...toValue(list)] : toValue(list);

  if (to >= 0 && to < array.length) {
    const element = array.splice(from, 1)[0];
    nextTick(() => {
      array.splice(to, 0, element);
      // When list is ref, assign array to list.value
      if (_valueIsRef) {
        (list as MaybeRef).value = array;
      }
    });
  }
}

export function generateFormId(): string {
  // must be lower case to match with drag event handling hack see e.g. EditComponent.vue#startDrag
  return nanoid().toLowerCase();
}

export function getFormIdFromEvent(event: DragEvent) {
  return (event.dataTransfer?.types || []).find(type => type.startsWith('form_id_'))?.replace('form_id_', '');
}

export function setDragEventData(event: DragEvent, formId: string, nodeDiscriminator: 'new_node_type' | 'node_id', nodeDiscriminatorValue: string) {
  if (event.dataTransfer === null) {
    return;
  }

  event.dataTransfer.dropEffect = 'move';
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData(nodeDiscriminator, nodeDiscriminatorValue);
  event.dataTransfer.setData('form_id', formId);
  // hack because transfer data is not available on drag over but you can iterate the available types
  // see https://html.spec.whatwg.org/multipage/dnd.html#the-drag-data-store
  event.dataTransfer.setData(`form_id_${formId}`, formId);
}
