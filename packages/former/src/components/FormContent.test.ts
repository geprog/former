import type { InternalSchemaNode } from '~/types';
import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, ref, type Ref } from 'vue';
import * as utils from '~/utils';

import FormContent from './FormContent.vue';
import FormRenderer from './FormRenderer.vue';

const enableTouchSpy = vi.fn();
const disableTouchSpy = vi.fn();

vi.mock('~/compositions/useTouchDrag', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/compositions/useTouchDrag')>();
  return {
    ...actual,
    useTouchDrag: vi.fn(() => ({
      enable: enableTouchSpy,
      disable: disableTouchSpy,
    })),
  };
});

function makeDropzone(attrs: { parentNode?: string | null; category?: string | null } = {}) {
  const el = document.createElement('div');
  el.className = 'former-drag-container';
  if ('parentNode' in attrs) {
    el.setAttribute('data-parent-node', attrs.parentNode ?? '');
  }
  if ('category' in attrs) {
    el.setAttribute('data-category', attrs.category ?? '');
  }
  return el;
}

function makeDraggable(nodeId: string) {
  const el = document.createElement('div');
  el.className = 'former-draggable';
  el.setAttribute('data-node', nodeId);
  return el;
}

function makeDataTransfer(_formId: string) {
  const store: Record<string, string> = {};
  const types: string[] = [];
  return {
    dropEffect: '',
    effectAllowed: '',
    types,
    setData(type: string, value: string) {
      store[type] = value;
      if (!types.includes(type)) {
        types.push(type);
      }
    },
    getData(type: string) {
      return store[type] ?? '';
    },
  } as unknown as DataTransfer;
}

function dispatchDrag(
  el: Element,
  type: 'dragover' | 'dragleave' | 'dragenter' | 'drop',
  init: {
    clientY?: number;
    dataTransfer?: DataTransfer | null;
    relatedTarget?: Node | null;
    preventDefault?: ReturnType<typeof vi.fn>;
  } = {},
) {
  const event = new DragEvent(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clientY', { value: init.clientY ?? 0, configurable: true });
  if (init.dataTransfer !== undefined) {
    Object.defineProperty(event, 'dataTransfer', { value: init.dataTransfer, configurable: true });
  }
  if (init.relatedTarget !== undefined) {
    Object.defineProperty(event, 'relatedTarget', { value: init.relatedTarget, configurable: true });
  }
  if (init.preventDefault) {
    Object.defineProperty(event, 'preventDefault', { value: init.preventDefault, configurable: true });
  }
  el.dispatchEvent(event);
  return event;
}

function wireDraggableMetrics(el: HTMLElement) {
  Object.defineProperty(el, 'offsetHeight', { configurable: true, value: 100 });
}

function dispatchWindowDrop(
  target: HTMLElement,
  dataTransfer: DataTransfer,
  opts?: { synthetic?: boolean },
) {
  const ev = new DragEvent('drop', { bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'dataTransfer', { value: dataTransfer, configurable: true });
  Object.defineProperty(ev, 'target', { value: target, configurable: true });
  if (opts?.synthetic) {
    Object.defineProperty(ev, 'synthetic', { value: true, configurable: true });
  }
  window.dispatchEvent(ev);
}

function rendererRoot(wrapper: ReturnType<typeof mount>) {
  return wrapper.findComponent(FormRenderer).element as HTMLElement;
}

/** Fixed layout boxes for `getBoundingClientRect` stubs (happy-dom has no real layout). */
const R = {
  full: { top: 0, left: 0, bottom: 100, right: 100, width: 100, height: 100 } as DOMRect,
  tall: { top: 100, left: 0, bottom: 200, right: 100, width: 100, height: 100 } as DOMRect,
  smallTop: { top: 0, left: 0, bottom: 50, right: 50, width: 50, height: 50 } as DOMRect,
  smallBottom: { top: 60, left: 0, bottom: 110, right: 50, width: 50, height: 50 } as DOMRect,
  tiny: { top: 0, left: 0, bottom: 50, right: 50, width: 50, height: 50 } as DOMRect,
};

function stubDragRect(el: HTMLElement, rect: DOMRect) {
  wireDraggableMetrics(el);
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(rect);
}

/** One dropzone + draggable under the stub FormRenderer root. */
function appendDragScene(
  wrapper: ReturnType<typeof mount>,
  opts: {
    zone?: { parentNode?: string | null; category?: string | null };
    nodeId: string;
    rect?: DOMRect;
  },
) {
  const root = rendererRoot(wrapper);
  const zone = makeDropzone(opts.zone ?? { parentNode: 'p', category: 'c' });
  const drag = makeDraggable(opts.nodeId);
  zone.appendChild(drag);
  root.appendChild(zone);
  stubDragRect(drag, opts.rect ?? R.full);
  return { root, zone, drag };
}

function transfer(formId: string, fields: Record<string, string>) {
  const dt = makeDataTransfer(formId);
  for (const [type, value] of Object.entries(fields)) {
    dt.setData(type, value);
  }
  return dt;
}

type ElementWithVueApp = HTMLElement & { __vue_app__?: { unmount: () => void } };

/** `mount(..., { attachTo: document.body })` leaves a Vue app root on `document.body`. Unmount those roots so `FormContent`'s `window` `drop` listener does not accumulate across tests (Vitest does not reset the DOM between `it` blocks). */
function unmountVueAppRootsAttachedToBody() {
  for (const el of [...document.body.children] as ElementWithVueApp[]) {
    el.__vue_app__?.unmount();
  }
}

describe('component FormContent', () => {
  let getFormIdSpy: ReturnType<typeof vi.spyOn>;
  let addNodeSpy: ReturnType<typeof vi.spyOn>;
  let deleteNodeSpy: ReturnType<typeof vi.spyOn>;
  let getNodeSpy: ReturnType<typeof vi.spyOn>;
  let nodePositionSpy: ReturnType<typeof vi.spyOn>;
  let nanoidSpy: ReturnType<typeof vi.spyOn>;

  /** After this, `window` drop + `getDropDetails` see a warmed tree (shared by onDrop* tests). */
  async function seedDragOver(
    wrapper: ReturnType<typeof mount>,
    opts: {
      zone: { parentNode?: string | null; category?: string | null };
      nodeId: string;
      rect?: DOMRect;
      clientY?: number;
    },
  ) {
    const { zone, drag } = appendDragScene(wrapper, {
      zone: opts.zone,
      nodeId: opts.nodeId,
      rect: opts.rect,
    });
    nodePositionSpy.mockReturnValue({ parentId: null, category: null, index: 0 });
    dispatchDrag(drag, 'dragover', {
      clientY: opts.clientY ?? 40,
      dataTransfer: makeDataTransfer('form-1'),
    });
    await nextTick();
    return { zone, drag };
  }

  function finishDropDebounce() {
    vi.runAllTimers();
    vi.useRealTimers();
  }

  /** Palette-style drop target: root dropzone + `n1` draggable (used by most `onDrop` tests). */
  const newNodeDragScene = {
    zone: { parentNode: null as string | null, category: 'c' },
    nodeId: 'n1' as const,
  };

  /** Existing-node move: dropzone under parent `p` + `move-me` draggable. */
  const moveNodeDragScene = {
    zone: { parentNode: 'p' as const, category: 'default' as const },
    nodeId: 'move-me' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    getFormIdSpy = vi.spyOn(utils, 'getFormIdFromEvent').mockReturnValue('form-1');
    addNodeSpy = vi.spyOn(utils, 'addNode');
    deleteNodeSpy = vi.spyOn(utils, 'deleteNode');
    getNodeSpy = vi.spyOn(utils, 'getNode');
    nodePositionSpy = vi.spyOn(utils, 'nodePosition');
    nanoidSpy = vi.spyOn(utils, 'nanoid').mockReturnValue('new-id-fixed');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    unmountVueAppRootsAttachedToBody();
  });

  describe('mount / unmount', () => {
    it('enables touch drag on mount', () => {
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const formId = ref('form-1');
      const schema = ref<InternalSchemaNode[]>([]);
      const selectedNode = ref<InternalSchemaNode | undefined>();
      mount(FormContent, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: { mode, schema, selectedNode, formId },
        },
      });
      expect(enableTouchSpy).toHaveBeenCalledTimes(1);
    });

    it('registers a window drop listener on mount', () => {
      const spy = vi.spyOn(window, 'addEventListener');
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const formId = ref('form-1');
      const schema = ref<InternalSchemaNode[]>([]);
      const selectedNode = ref<InternalSchemaNode | undefined>();
      mount(FormContent, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: { mode, schema, selectedNode, formId },
        },
      });
      expect(spy).toHaveBeenCalledWith('drop', expect.any(Function));
      spy.mockRestore();
    });

    it('disables touch drag on unmount', () => {
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const formId = ref('form-1');
      const schema = ref<InternalSchemaNode[]>([]);
      const selectedNode = ref<InternalSchemaNode | undefined>();
      const wrapper = mount(FormContent, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: { mode, schema, selectedNode, formId },
        },
      });
      wrapper.unmount();
      expect(disableTouchSpy).toHaveBeenCalledTimes(1);
    });

    it('removes the window drop listener on unmount', () => {
      const spy = vi.spyOn(window, 'removeEventListener');
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const formId = ref('form-1');
      const schema = ref<InternalSchemaNode[]>([]);
      const selectedNode = ref<InternalSchemaNode | undefined>();
      const wrapper = mount(FormContent, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: { mode, schema, selectedNode, formId },
        },
      });
      wrapper.unmount();
      expect(spy).toHaveBeenCalledWith('drop', expect.any(Function));
      spy.mockRestore();
    });
  });

  describe('dragOver gating', () => {
    it('does nothing when mode is not build', () => {
      const mode = ref<'build' | 'read' | 'edit'>('read');
      const formId = ref('form-1');
      const schema = ref<InternalSchemaNode[]>([]);
      const selectedNode = ref<InternalSchemaNode | undefined>();
      const wrapper = mount(FormContent, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: { mode, schema, selectedNode, formId },
        },
      });
      const { zone, drag } = appendDragScene(wrapper, { nodeId: 'n1' });
      dispatchDrag(drag, 'dragover', { clientY: 50, dataTransfer: makeDataTransfer('form-1') });
      expect(zone.querySelector('.bg-gray-800')).toBeNull();
    });

    it('does nothing when event form id does not match injected formId', () => {
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const formId = ref('form-1');
      const schema = ref<InternalSchemaNode[]>([]);
      const selectedNode = ref<InternalSchemaNode | undefined>();
      const wrapper = mount(FormContent, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: { mode, schema, selectedNode, formId },
        },
      });
      const { zone, drag } = appendDragScene(wrapper, { nodeId: 'n1' });
      getFormIdSpy.mockReturnValue('other-form');
      dispatchDrag(drag, 'dragover', { clientY: 50, dataTransfer: makeDataTransfer('other-form') });
      expect(zone.querySelector('.bg-gray-800')).toBeNull();
    });

    it('prevents default and sets dropEffect to move when handling', () => {
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const formId = ref('form-1');
      const schema = ref<InternalSchemaNode[]>([{ _id: 'n1', type: 'text', name: 't' }]);
      const selectedNode = ref<InternalSchemaNode | undefined>();
      const wrapper = mount(FormContent, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: { mode, schema, selectedNode, formId },
        },
      });
      const { drag } = appendDragScene(wrapper, { nodeId: 'n1' });
      const dt = makeDataTransfer('form-1');
      dispatchDrag(drag, 'dragover', { clientY: 50, dataTransfer: dt });
      expect(dt.dropEffect).toBe('move');
    });
  });

  describe('dragOver placeholder placement', () => {
    it('creates and inserts a placeholder above the drop target when aboveTarget is true', () => {
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const formId = ref('form-1');
      const schema = ref<InternalSchemaNode[]>([{ _id: 'n1', type: 'text', name: 't' }]);
      const selectedNode = ref<InternalSchemaNode | undefined>();
      const wrapper = mount(FormContent, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: { mode, schema, selectedNode, formId },
        },
      });
      const { drag } = appendDragScene(wrapper, { nodeId: 'n1', rect: R.tall });
      nodePositionSpy.mockReturnValue({ parentId: null, category: null, index: 0 });
      dispatchDrag(drag, 'dragover', { clientY: 120, dataTransfer: makeDataTransfer('form-1') });
      expect(drag.firstElementChild).toBeTruthy();
      expect(drag.firstElementChild?.className).toContain('bg-gray-800');
      expect((drag.firstElementChild as HTMLElement).style.top).toBe('0px');
    });

    it('creates and inserts a placeholder below the drop target when aboveTarget is false', () => {
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const formId = ref('form-1');
      const schema = ref<InternalSchemaNode[]>([{ _id: 'n1', type: 'text', name: 't' }]);
      const selectedNode = ref<InternalSchemaNode | undefined>();
      const wrapper = mount(FormContent, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: { mode, schema, selectedNode, formId },
        },
      });
      const { drag } = appendDragScene(wrapper, { nodeId: 'n1', rect: R.tall });
      nodePositionSpy.mockReturnValue({ parentId: null, category: null, index: 0 });
      dispatchDrag(drag, 'dragover', { clientY: 180, dataTransfer: makeDataTransfer('form-1') });
      expect(drag.lastElementChild).toBeTruthy();
      expect(drag.lastElementChild?.className).toContain('bg-gray-800');
      expect((drag.lastElementChild as HTMLElement).style.bottom).toBe('0px');
    });

    it('appends placeholder to dropzone when there is no drop target', () => {
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const formId = ref('form-1');
      const schema = ref<InternalSchemaNode[]>([]);
      const selectedNode = ref<InternalSchemaNode | undefined>();
      const wrapper = mount(FormContent, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: { mode, schema, selectedNode, formId },
        },
      });
      const root = rendererRoot(wrapper);
      const zone = makeDropzone({ parentNode: 'root', category: 'default' });
      root.appendChild(zone);
      dispatchDrag(zone, 'dragover', { clientY: 0, dataTransfer: makeDataTransfer('form-1') });
      const ph = zone.querySelector('.bg-gray-800');
      expect(ph).toBeTruthy();
      expect(ph?.parentElement).toBe(zone);
    });

    it('removes an existing placeholder before inserting a new one', () => {
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const formId = ref('form-1');
      const schema = ref<InternalSchemaNode[]>([{ _id: 'n1', type: 'text', name: 't' }]);
      const selectedNode = ref<InternalSchemaNode | undefined>();
      const wrapper = mount(FormContent, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: { mode, schema, selectedNode, formId },
        },
      });
      const { drag } = appendDragScene(wrapper, { nodeId: 'n1', rect: R.tall });
      nodePositionSpy.mockReturnValue({ parentId: null, category: null, index: 0 });
      dispatchDrag(drag, 'dragover', { clientY: 120, dataTransfer: makeDataTransfer('form-1') });
      const first = drag.querySelector('.bg-gray-800');
      dispatchDrag(drag, 'dragover', { clientY: 125, dataTransfer: makeDataTransfer('form-1') });
      const placeholders = drag.querySelectorAll('.bg-gray-800');
      expect(placeholders.length).toBe(1);
      expect(placeholders[0]).not.toBe(first);
    });
  });

  describe('dragOver dropzone highlighting', () => {
    it('adds dragging highlight classes to the active dropzone', () => {
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const formId = ref('form-1');
      const schema = ref<InternalSchemaNode[]>([{ _id: 'n1', type: 'text', name: 't' }]);
      const selectedNode = ref<InternalSchemaNode | undefined>();
      const wrapper = mount(FormContent, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: { mode, schema, selectedNode, formId },
        },
      });
      const { zone, drag } = appendDragScene(wrapper, { nodeId: 'n1' });
      nodePositionSpy.mockReturnValue({ parentId: null, category: null, index: 0 });
      dispatchDrag(drag, 'dragover', { clientY: 40, dataTransfer: makeDataTransfer('form-1') });
      expect(zone.classList.contains('bg-blue-200')).toBe(true);
      expect(zone.classList.contains('dark:bg-blue-800')).toBe(true);
    });

    it('removes highlight classes from the previous dropzone when dragging over a new dropzone', () => {
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const formId = ref('form-1');
      const schema = ref<InternalSchemaNode[]>([
        { _id: 'n1', type: 'text', name: 'a' },
        { _id: 'n2', type: 'text', name: 'b' },
      ]);
      const selectedNode = ref<InternalSchemaNode | undefined>();
      const wrapper = mount(FormContent, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: { mode, schema, selectedNode, formId },
        },
      });
      const root = rendererRoot(wrapper);
      const zoneA = makeDropzone({ parentNode: 'p', category: 'a' });
      const zoneB = makeDropzone({ parentNode: 'p', category: 'b' });
      const dragA = makeDraggable('n1');
      const dragB = makeDraggable('n2');
      zoneA.appendChild(dragA);
      zoneB.appendChild(dragB);
      root.appendChild(zoneA);
      root.appendChild(zoneB);
      stubDragRect(dragA, R.smallTop);
      stubDragRect(dragB, R.smallBottom);
      nodePositionSpy.mockReturnValue({ parentId: null, category: null, index: 0 });
      dispatchDrag(dragA, 'dragover', { clientY: 10, dataTransfer: makeDataTransfer('form-1') });
      expect(zoneA.classList.contains('bg-blue-200')).toBe(true);
      dispatchDrag(dragB, 'dragover', { clientY: 80, dataTransfer: makeDataTransfer('form-1') });
      expect(zoneA.classList.contains('bg-blue-200')).toBe(false);
      expect(zoneB.classList.contains('bg-blue-200')).toBe(true);
    });
  });

  describe('preventDefault on drag listeners', () => {
    it('calls preventDefault on dragenter at the FormRenderer root', () => {
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const formId = ref('form-1');
      const schema = ref<InternalSchemaNode[]>([]);
      const selectedNode = ref<InternalSchemaNode | undefined>();
      const wrapper = mount(FormContent, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: { mode, schema, selectedNode, formId },
        },
      });
      const root = rendererRoot(wrapper);
      const pd = vi.fn();
      dispatchDrag(root, 'dragenter', { dataTransfer: makeDataTransfer('form-1'), preventDefault: pd });
      expect(pd).toHaveBeenCalled();
    });

    it('calls preventDefault on dragleave at the FormRenderer root when not short-circuited by anti-flicker', () => {
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const formId = ref('form-1');
      const schema = ref<InternalSchemaNode[]>([]);
      const selectedNode = ref<InternalSchemaNode | undefined>();
      const wrapper = mount(FormContent, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: { mode, schema, selectedNode, formId },
        },
      });
      const root = rendererRoot(wrapper);
      const pd = vi.fn();
      const outside = document.createElement('div');
      document.body.appendChild(outside);
      dispatchDrag(root, 'dragleave', {
        dataTransfer: makeDataTransfer('form-1'),
        relatedTarget: outside,
        preventDefault: pd,
      });
      expect(pd).toHaveBeenCalled();
    });

    it('calls preventDefault on dragover at the FormRenderer root when dragOver handles the event', () => {
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const formId = ref('form-1');
      const schema = ref<InternalSchemaNode[]>([{ _id: 'n1', type: 'text', name: 't' }]);
      const selectedNode = ref<InternalSchemaNode | undefined>();
      const wrapper = mount(FormContent, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: { mode, schema, selectedNode, formId },
        },
      });
      const { drag } = appendDragScene(wrapper, { nodeId: 'n1' });
      nodePositionSpy.mockReturnValue({ parentId: null, category: null, index: 0 });
      const pd = vi.fn();
      dispatchDrag(drag, 'dragover', {
        clientY: 40,
        dataTransfer: makeDataTransfer('form-1'),
        preventDefault: pd,
      });
      expect(pd).toHaveBeenCalled();
    });
  });

  describe('getDropDetails errors', () => {
    it('throws when no dropzone can be resolved from the event target', () => {
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const formId = ref('form-1');
      const schema = ref<InternalSchemaNode[]>([]);
      const selectedNode = ref<InternalSchemaNode | undefined>();
      const wrapper = mount(FormContent, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: { mode, schema, selectedNode, formId },
        },
      });
      const root = rendererRoot(wrapper);
      const orphan = document.createElement('div');
      root.appendChild(orphan);
      expect(() =>
        dispatchDrag(orphan, 'dragover', { dataTransfer: makeDataTransfer('form-1') }),
      ).toThrow('No dropzone found');
    });

    it('treats inner dropzone hit as empty-tree when no draggable is targeted', () => {
      // getDropDetails returns the empty-tree branch when lastDropTarget is null but a dropzone exists;
      // "No drop target found" is unreachable after that branch in the current implementation.
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const formId = ref('form-1');
      const schema = ref<InternalSchemaNode[]>([]);
      const selectedNode = ref<InternalSchemaNode | undefined>();
      const wrapper = mount(FormContent, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: { mode, schema, selectedNode, formId },
        },
      });
      const root = rendererRoot(wrapper);
      const zone = makeDropzone({ parentNode: 'p', category: 'c' });
      root.appendChild(zone);
      const inner = document.createElement('div');
      zone.appendChild(inner);
      dispatchDrag(inner, 'dragover', { dataTransfer: makeDataTransfer('form-1') });
      expect(zone.querySelector('.bg-gray-800')).toBeTruthy();
      expect(zone.querySelector('.bg-gray-800')?.parentElement).toBe(zone);
    });

    it('throws when draggable target exists but has no data-node id', () => {
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const formId = ref('form-1');
      const schema = ref<InternalSchemaNode[]>([]);
      const selectedNode = ref<InternalSchemaNode | undefined>();
      const wrapper = mount(FormContent, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: { mode, schema, selectedNode, formId },
        },
      });
      const root = rendererRoot(wrapper);
      const zone = makeDropzone({ parentNode: 'p', category: 'c' });
      const bad = document.createElement('div');
      bad.className = 'former-draggable';
      zone.appendChild(bad);
      root.appendChild(zone);
      stubDragRect(bad, R.tiny);
      expect(() =>
        dispatchDrag(bad, 'dragover', { clientY: 10, dataTransfer: makeDataTransfer('form-1') }),
      ).toThrow('No drop target id found');
    });
  });

  describe('getDropDetails positioning', () => {
    it('returns nested-drop payload when draggable contains the dropzone', () => {
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const formId = ref('form-1');
      const schema = ref<InternalSchemaNode[]>([]);
      const selectedNode = ref<InternalSchemaNode | undefined>();
      const wrapper = mount(FormContent, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: { mode, schema, selectedNode, formId },
        },
      });
      const root = rendererRoot(wrapper);
      const parentDrag = makeDraggable('parent');
      const zone = makeDropzone({ parentNode: null, category: 'cat' });
      const leaf = document.createElement('span');
      zone.appendChild(leaf);
      parentDrag.appendChild(zone);
      root.appendChild(parentDrag);
      dispatchDrag(leaf, 'dragover', { dataTransfer: makeDataTransfer('form-1') });
      expect(nodePositionSpy).not.toHaveBeenCalled();
      expect(parentDrag.querySelector('.bg-gray-800')).toBeTruthy();
    });

    it('returns empty-tree payload when only dropzone exists (no draggable target)', () => {
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const formId = ref('form-1');
      const schema = ref<InternalSchemaNode[]>([]);
      const selectedNode = ref<InternalSchemaNode | undefined>();
      const wrapper = mount(FormContent, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: { mode, schema, selectedNode, formId },
        },
      });
      const root = rendererRoot(wrapper);
      const zone = makeDropzone({ parentNode: 'root', category: 'def' });
      root.appendChild(zone);
      dispatchDrag(zone, 'dragover', { dataTransfer: makeDataTransfer('form-1') });
      expect(nodePositionSpy).not.toHaveBeenCalled();
      expect(zone.querySelector('.bg-gray-800')).toBeTruthy();
    });

    it('returns null when dragging a node would reparent under itself (parentId equals dragged node id)', () => {
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const formId = ref('form-1');
      const schema = ref<InternalSchemaNode[]>([{ _id: 'self', type: 'text', name: 't' }]);
      const selectedNode = ref<InternalSchemaNode | undefined>();
      const wrapper = mount(FormContent, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: { mode, schema, selectedNode, formId },
        },
      });
      const { drag } = appendDragScene(wrapper, { nodeId: 'self' });
      nodePositionSpy.mockReturnValue({ parentId: 'self', category: null, index: 1 });
      const dt = makeDataTransfer('form-1');
      dt.setData('node_id', 'self');
      dispatchDrag(drag, 'dragover', { clientY: 40, dataTransfer: dt });
      expect(drag.querySelector('.bg-gray-800')).toBeNull();
    });
  });

  describe('dragLeave', () => {
    it('returns early when relatedTarget is still inside currentTarget (anti-flicker)', () => {
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const formId = ref('form-1');
      const schema = ref<InternalSchemaNode[]>([{ _id: 'n1', type: 'text', name: 't' }]);
      const selectedNode = ref<InternalSchemaNode | undefined>();
      const wrapper = mount(FormContent, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: { mode, schema, selectedNode, formId },
        },
      });
      const { root, zone, drag } = appendDragScene(wrapper, { nodeId: 'n1' });
      nodePositionSpy.mockReturnValue({ parentId: null, category: null, index: 0 });
      dispatchDrag(drag, 'dragover', { clientY: 40, dataTransfer: makeDataTransfer('form-1') });
      expect(zone.querySelector('.bg-gray-800')).toBeTruthy();
      const inner = document.createElement('div');
      root.appendChild(inner);
      dispatchDrag(root, 'dragleave', {
        relatedTarget: inner,
        dataTransfer: makeDataTransfer('form-1'),
      });
      expect(zone.querySelector('.bg-gray-800')).toBeTruthy();
      expect(zone.classList.contains('bg-blue-200')).toBe(true);
    });

    it('removes placeholder and clears dropzone highlight when leaving for real', () => {
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const formId = ref('form-1');
      const schema = ref<InternalSchemaNode[]>([{ _id: 'n1', type: 'text', name: 't' }]);
      const selectedNode = ref<InternalSchemaNode | undefined>();
      const wrapper = mount(FormContent, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: { mode, schema, selectedNode, formId },
        },
      });
      const { root, zone, drag } = appendDragScene(wrapper, { nodeId: 'n1' });
      nodePositionSpy.mockReturnValue({ parentId: null, category: null, index: 0 });
      dispatchDrag(drag, 'dragover', { clientY: 40, dataTransfer: makeDataTransfer('form-1') });
      expect(zone.classList.contains('bg-blue-200')).toBe(true);
      const outside = document.createElement('div');
      document.body.appendChild(outside);
      dispatchDrag(root, 'dragleave', { relatedTarget: outside, dataTransfer: makeDataTransfer('form-1') });
      expect(zone.querySelector('.bg-gray-800')).toBeNull();
      expect(zone.classList.contains('bg-blue-200')).toBe(false);
    });
  });

  describe('onDrop gating', () => {
    it('ignores drop while touch dragging unless the event is synthetic', async () => {
      const { isTouchDragging } = await import('~/compositions/useTouchDrag');
      isTouchDragging.value = true;
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const formId = ref('form-1');
      const schema = ref<InternalSchemaNode[]>([{ _id: 'n1', type: 'text', name: 't' }]);
      const selectedNode = ref<InternalSchemaNode | undefined>();
      const wrapper = mount(FormContent, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: { mode, schema, selectedNode, formId },
        },
      });
      const { drag } = await seedDragOver(wrapper, newNodeDragScene);
      const dt = transfer('form-1', { new_node_type: 'text' });
      dispatchWindowDrop(drag, dt);
      expect(addNodeSpy).not.toHaveBeenCalled();

      vi.useFakeTimers();
      dispatchWindowDrop(drag, dt, { synthetic: true });
      expect(addNodeSpy).toHaveBeenCalled();
      finishDropDebounce();
      isTouchDragging.value = false;
    });

    it('ignores subsequent drops while isDropping is true', async () => {
      vi.useFakeTimers();
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const formId = ref('form-1');
      const schema = ref<InternalSchemaNode[]>([{ _id: 'n1', type: 'text', name: 't' }]);
      const selectedNode = ref<InternalSchemaNode | undefined>();
      const wrapper = mount(FormContent, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: { mode, schema, selectedNode, formId },
        },
      });
      const { drag } = await seedDragOver(wrapper, newNodeDragScene);
      nanoidSpy.mockReturnValueOnce('nid-1').mockReturnValueOnce('nid-2');
      const dt = transfer('form-1', { new_node_type: 'text' });
      dispatchWindowDrop(drag, dt);
      expect(addNodeSpy).toHaveBeenCalledTimes(1);
      dispatchWindowDrop(drag, transfer('form-1', { new_node_type: 'text' }));
      expect(addNodeSpy).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(300);
      vi.useRealTimers();
    });

    it('does nothing when mode is not build', async () => {
      const mode = ref<'build' | 'read' | 'edit'>('read');
      const formId = ref('form-1');
      const schema = ref<InternalSchemaNode[]>([{ _id: 'n1', type: 'text', name: 't' }]);
      const selectedNode = ref<InternalSchemaNode | undefined>();
      const wrapper = mount(FormContent, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: { mode, schema, selectedNode, formId },
        },
      });
      const { drag } = await seedDragOver(wrapper, newNodeDragScene);
      dispatchWindowDrop(drag, transfer('form-1', { new_node_type: 'text' }));
      expect(addNodeSpy).not.toHaveBeenCalled();
    });

    it('does nothing when event form id does not match injected formId', async () => {
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const formId = ref('form-1');
      const schema = ref<InternalSchemaNode[]>([{ _id: 'n1', type: 'text', name: 't' }]);
      const selectedNode = ref<InternalSchemaNode | undefined>();
      const wrapper = mount(FormContent, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: { mode, schema, selectedNode, formId },
        },
      });
      const { drag } = await seedDragOver(wrapper, newNodeDragScene);
      getFormIdSpy.mockReturnValue('wrong');
      dispatchWindowDrop(drag, transfer('form-1', { new_node_type: 'text' }));
      expect(addNodeSpy).not.toHaveBeenCalled();
    });
  });

  describe('onDrop new node type', () => {
    it('adds a new node from new_node_type transfer data and updates schema', async () => {
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const formId = ref('form-1');
      const schema = ref<InternalSchemaNode[]>([{ _id: 'n1', type: 'text', name: 't' }]);
      const selectedNode = ref<InternalSchemaNode | undefined>();
      const wrapper = mount(FormContent, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: { mode, schema, selectedNode, formId },
        },
      });
      const { drag } = await seedDragOver(wrapper, newNodeDragScene);
      vi.useFakeTimers();
      dispatchWindowDrop(drag, transfer('form-1', { new_node_type: 'text' }));
      expect(addNodeSpy).toHaveBeenCalled();
      expect(schema.value.length).toBeGreaterThan(1);
      finishDropDebounce();
    });

    it('selects the newly created node', async () => {
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const formId = ref('form-1');
      const schema = ref<InternalSchemaNode[]>([{ _id: 'n1', type: 'text', name: 't' }]);
      const selectedNode = ref<InternalSchemaNode | undefined>();
      const wrapper = mount(FormContent, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: { mode, schema, selectedNode, formId },
        },
      });
      const { drag } = await seedDragOver(wrapper, newNodeDragScene);
      vi.useFakeTimers();
      dispatchWindowDrop(drag, transfer('form-1', { new_node_type: 'text' }));
      expect(selectedNode.value?.type).toBe('text');
      finishDropDebounce();
    });

    it('skips duplicate drops for the same generated new node id', async () => {
      nanoidSpy.mockReturnValue('same-id');
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const formId = ref('form-1');
      const schema = ref<InternalSchemaNode[]>([{ _id: 'n1', type: 'text', name: 't' }]);
      const selectedNode = ref<InternalSchemaNode | undefined>();
      const wrapper = mount(FormContent, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: { mode, schema, selectedNode, formId },
        },
      });
      const { drag } = await seedDragOver(wrapper, newNodeDragScene);
      const dt = transfer('form-1', { new_node_type: 'text' });
      vi.useFakeTimers();
      dispatchWindowDrop(drag, dt);
      dispatchWindowDrop(drag, dt);
      expect(addNodeSpy).toHaveBeenCalledTimes(1);
      finishDropDebounce();
    });

    it('resets dropping guards after the debounce timeout', async () => {
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const formId = ref('form-1');
      const schema = ref<InternalSchemaNode[]>([{ _id: 'n1', type: 'text', name: 't' }]);
      const selectedNode = ref<InternalSchemaNode | undefined>();
      const wrapper = mount(FormContent, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: { mode, schema, selectedNode, formId },
        },
      });
      const { drag } = await seedDragOver(wrapper, newNodeDragScene);
      vi.useFakeTimers();
      dispatchWindowDrop(drag, transfer('form-1', { new_node_type: 'text' }));
      expect(addNodeSpy).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(300);
      nanoidSpy.mockReturnValue('second-id');
      dispatchWindowDrop(drag, transfer('form-1', { new_node_type: 'text' }));
      expect(addNodeSpy).toHaveBeenCalledTimes(2);
      finishDropDebounce();
    });
  });

  describe('onDrop existing node id', () => {
    it('moves an existing node: delete then add at newPosition', async () => {
      const existing: InternalSchemaNode = { _id: 'move-me', type: 'text', name: 'f' };
      const schema = ref<InternalSchemaNode[]>([existing]);
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const formId = ref('form-1');
      const selectedNode = ref<InternalSchemaNode | undefined>();
      const wrapper = mount(FormContent, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: { mode, schema, selectedNode, formId },
        },
      });
      const { drag } = await seedDragOver(wrapper, moveNodeDragScene);
      getNodeSpy.mockReturnValue(existing);
      vi.useFakeTimers();
      dispatchWindowDrop(drag, transfer('form-1', { node_id: 'move-me' }));
      expect(deleteNodeSpy).toHaveBeenCalled();
      expect(addNodeSpy).toHaveBeenCalled();
      finishDropDebounce();
    });

    it('decrements newPosition.index when deleting from same parent below the insert index', async () => {
      const existing: InternalSchemaNode = { _id: 'move-me', type: 'text', name: 'f' };
      const schema = ref<InternalSchemaNode[]>([existing]);
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const formId = ref('form-1');
      const selectedNode = ref<InternalSchemaNode | undefined>();
      const wrapper = mount(FormContent, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: { mode, schema, selectedNode, formId },
        },
      });
      const { drag } = await seedDragOver(wrapper, moveNodeDragScene);
      getNodeSpy.mockReturnValue(existing);
      nodePositionSpy.mockReset();
      nodePositionSpy
        .mockReturnValueOnce({ parentId: 'p', category: null, index: 2 })
        .mockReturnValueOnce({ parentId: 'p', category: null, index: 1 });
      vi.useFakeTimers();
      dispatchWindowDrop(drag, transfer('form-1', { node_id: 'move-me' }));
      const addCall = addNodeSpy.mock.calls.at(-1);
      expect(addCall?.[1]).toMatchObject({ parentId: 'p', index: 1 });
      finishDropDebounce();
    });

    it('skips duplicate drops for the same node_id', async () => {
      const existing: InternalSchemaNode = { _id: 'move-me', type: 'text', name: 'f' };
      const schema = ref<InternalSchemaNode[]>([existing]);
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const formId = ref('form-1');
      const selectedNode = ref<InternalSchemaNode | undefined>();
      const wrapper = mount(FormContent, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: { mode, schema, selectedNode, formId },
        },
      });
      const { drag } = await seedDragOver(wrapper, moveNodeDragScene);
      getNodeSpy.mockReturnValue(existing);
      const dt = transfer('form-1', { node_id: 'move-me' });
      vi.useFakeTimers();
      dispatchWindowDrop(drag, dt);
      dispatchWindowDrop(drag, dt);
      expect(deleteNodeSpy).toHaveBeenCalledTimes(1);
      finishDropDebounce();
    });
  });

  describe('onDrop cleanup', () => {
    it('removes placeholder and clears highlight classes on drop', async () => {
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const formId = ref('form-1');
      const schema = ref<InternalSchemaNode[]>([{ _id: 'n1', type: 'text', name: 't' }]);
      const selectedNode = ref<InternalSchemaNode | undefined>();
      const wrapper = mount(FormContent, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: { mode, schema, selectedNode, formId },
        },
      });
      const { zone, drag } = appendDragScene(wrapper, { nodeId: 'n1' });
      nodePositionSpy.mockReturnValue({ parentId: null, category: null, index: 0 });
      dispatchDrag(drag, 'dragover', { clientY: 40, dataTransfer: makeDataTransfer('form-1') });
      expect(zone.classList.contains('bg-blue-200')).toBe(true);
      vi.useFakeTimers();
      dispatchWindowDrop(drag, transfer('form-1', { new_node_type: 'text' }));
      expect(zone.querySelector('.bg-gray-800')).toBeNull();
      expect(zone.classList.contains('bg-blue-200')).toBe(false);
      finishDropDebounce();
    });
  });
});
