import type { FieldData, FormComponents, FormData, InternalSchemaNode, SchemaNode } from './types';

export function schemaIterator(schema: InternalSchemaNode[]) {
  let nextIndex = 0;
  let childrenIterator: Iterator<InternalSchemaNode> | null = null;

  const rangeIterator: Iterator<InternalSchemaNode> & Iterable<InternalSchemaNode> = {
    next() {
      const done = nextIndex >= schema.length;
      if (childrenIterator) {
        const { done: childrenDone, value } = childrenIterator.next();
        if (childrenDone) {
          childrenIterator = null;
        }
        else {
          return { value, done: childrenDone && done };
        }
      }
      const node = schema[nextIndex];
      if (node && node.children) {
        const children = Array.isArray(node.children)
          ? node.children
          : Object.values(node.children).flatMap(childrenOfCategory => childrenOfCategory);
        childrenIterator = schemaIterator(children);
      }
      const result = { value: node, done: childrenIterator === null && done };
      nextIndex++;
      return result;
    },
    [Symbol.iterator]() {
      return this;
    },
  };
  return rangeIterator;
}

function addIdToNode(_node: InternalSchemaNode | SchemaNode): InternalSchemaNode {
  const node = { ..._node } as InternalSchemaNode;

  if (!node._id) {
    node._id = nanoid();
  }

  if (node.children) {
    if (Array.isArray(node.children)) {
      node.children = node.children.map(addIdToNode);
    }
    else {
      node.children = Object.entries(node.children).reduce((result, [category, childrenOfCategory]) => ({
        ...result,
        [category]: childrenOfCategory.map(addIdToNode),
      }), {});
    }
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
    if (Array.isArray(node.children)) {
      node.children = node.children.map(removeIdFromNode);
    }
    else {
      node.children = Object.entries(node.children).reduce((result, [category, childrenOfCategory]) => ({
        ...result,
        [category]: childrenOfCategory.map(removeIdFromNode),
      }), {});
    }
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
      if (Array.isArray(children)) {
        replaceNode(children, node);
      }
      else {
        Object.values(children).forEach(childrenOfCategory => replaceNode(childrenOfCategory, node));
      }
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
      if (Array.isArray(children)) {
        deleteNode(children, nodeId);
      }
      else {
        Object.values(children).forEach(childrenOfCategory => deleteNode(childrenOfCategory, nodeId));
      }
    }
  }
}

type NodePosition = {
  parentId: string | null;
  category: string | null;
  index: number;
};

export function nodePosition(
  schema: InternalSchemaNode[],
  nodeId: string,
  anchor: 'above' | 'below',
  parentId?: string,
  category?: string,
): NodePosition | null {
  for (let i = 0; i < schema.length; i++) {
    if (schema[i]._id === nodeId) {
      return { parentId: parentId || null, index: anchor === 'above' ? i : i + 1, category: category || null };
    }

    const children = schema[i].children;
    if (children) {
      if (Array.isArray(children)) {
        const position = nodePosition(children, nodeId, anchor, schema[i]._id);
        if (position) {
          return position;
        }
      }
      else {
        for (const category of Object.keys(children)) {
          const position = nodePosition(children[category], nodeId, anchor, schema[i]._id, category);
          if (position) {
            return position;
          }
        }
      }
    }
  }

  return null;
}

export function addNode(
  schema: InternalSchemaNode[],
  position: NodePosition,
  node: InternalSchemaNode,
): void {
  const { parentId, index, category } = position;
  if (parentId === null) {
    schema.splice(index, 0, node);
    return;
  }

  for (let i = 0; i < schema.length; i++) {
    if (schema[i]._id === parentId) {
      let children = schema[i].children;
      if (Array.isArray(children)) {
        children = { default: children };
      }
      else if (!children) {
        children = { };
      }
      const categoryOrDefault = category || 'default';
      children[categoryOrDefault] = children[categoryOrDefault] || [];
      children[categoryOrDefault].splice(index, 0, node);
      schema[i].children = children;
      return;
    }

    const children = schema[i].children;
    if (children) {
      if (Array.isArray(children)) {
        addNode(children, position, node);
      }
      else {
        Object.values(children).forEach(childrenOfCategory => addNode(childrenOfCategory, position, node));
      }
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
      if (Array.isArray(children)) {
        const node = getNode(children, nodeId);
        if (node) {
          return node;
        }
      }
      else {
        for (const category of Object.keys(children)) {
          const node = getNode(children[category], nodeId);
          if (node) {
            return node;
          }
        }
      }
    }
  }

  return null;
}

export function isNodeLayoutComponent(node: InternalSchemaNode, components: FormComponents): boolean {
  return !(components[node.type]?.propsSchema || []).some(prop => prop.name === '$name');
}

export function unsetDataOfNode(node: InternalSchemaNode, data: FormData | FieldData | undefined, components: FormComponents) {
  if (data === undefined || typeof data !== 'object' || Array.isArray(data)) {
    return;
  }
  if (node.name) {
    data[node.name] = undefined;
  }
  else if (isNodeLayoutComponent(node, components) && node.children) {
    let children = node.children;
    if (!Array.isArray(children)) {
      children = Object.values(children).flatMap(childrenOfCategory => childrenOfCategory);
    }
    children.forEach((child) => {
      unsetDataOfNode(child, data, components);
    });
  }
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

export function generateFormId(): string {
  // must be lower case to match with drag event handling hack see e.g. FormNode.vue#startDrag
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
