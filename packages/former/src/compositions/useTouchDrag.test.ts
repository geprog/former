import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isTouchDragging, useTouchDrag } from './useTouchDrag';

class FakeDataTransfer {
  private data = new Map<string, string>();
  public dropEffect = '';
  public effectAllowed = '';
  public types: string[] = [];

  setData(type: string, value: string) {
    this.data.set(type, value);
    if (!this.types.includes(type)) {
      this.types.push(type);
    }
  }

  getData(type: string) {
    return this.data.get(type) ?? '';
  }
}

class FakeDragEvent extends Event {
  public dataTransfer: FakeDataTransfer | null;
  public clientX: number;
  public clientY: number;

  constructor(type: string, init: any = {}) {
    super(type, { bubbles: init.bubbles, cancelable: init.cancelable });
    this.dataTransfer = init.dataTransfer ?? null;
    this.clientX = init.clientX ?? 0;
    this.clientY = init.clientY ?? 0;
  }
}

function touchLike(x: number, y: number): Touch {
  return { clientX: x, clientY: y } as Touch;
}

function dispatchTouch(
  target: EventTarget,
  type: 'touchstart' | 'touchmove' | 'touchend',
  touches: Touch[],
  changedTouches = touches,
) {
  const event = new Event(type, { bubbles: true, cancelable: true }) as TouchEvent;
  Object.defineProperty(event, 'touches', { value: touches });
  Object.defineProperty(event, 'changedTouches', { value: changedTouches });
  target.dispatchEvent(event);
  return event;
}

describe('useTouchDrag', () => {
  const originalDataTransfer = globalThis.DataTransfer;
  const originalDragEvent = globalThis.DragEvent;

  beforeEach(() => {
    isTouchDragging.value = false;
    vi.clearAllMocks();
    vi.restoreAllMocks();
    (globalThis as any).DataTransfer = FakeDataTransfer;
    (globalThis as any).DragEvent = FakeDragEvent;
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
    (globalThis as any).DataTransfer = originalDataTransfer;
    (globalThis as any).DragEvent = originalDragEvent;
  });

  describe('isTouchDragging', () => {
    it('exports a ref that is false before any drag', () => {
      expect(isTouchDragging.value).toBe(false);
    });
  });

  describe('enable / disable', () => {
    it('adds touch listeners on enable', () => {
      const addSpy = vi.spyOn(window, 'addEventListener');
      const drag = useTouchDrag();
      drag.enable();

      expect(addSpy).toHaveBeenCalledWith('touchstart', expect.any(Function), { passive: false });
      expect(addSpy).toHaveBeenCalledWith('touchmove', expect.any(Function), { passive: false });
      expect(addSpy).toHaveBeenCalledWith('touchend', expect.any(Function), { passive: false });

      drag.disable();
    });

    it('removes touch listeners on disable', () => {
      const removeSpy = vi.spyOn(window, 'removeEventListener');
      const drag = useTouchDrag();
      drag.enable();
      drag.disable();

      expect(removeSpy).toHaveBeenCalledWith('touchstart', expect.any(Function));
      expect(removeSpy).toHaveBeenCalledWith('touchmove', expect.any(Function));
      expect(removeSpy).toHaveBeenCalledWith('touchend', expect.any(Function));
    });
  });

  describe('handleTouchStart (via touchstart)', () => {
    it('ignores events whose target is not under [draggable="true"]', () => {
      const drag = useTouchDrag();
      drag.enable();

      const target = document.createElement('div');
      document.body.appendChild(target);
      const preventDefaultSpy = vi.fn();
      const move = new Event('touchmove', { bubbles: true, cancelable: true }) as TouchEvent;
      Object.defineProperty(move, 'touches', { value: [touchLike(20, 20)] });
      Object.defineProperty(move, 'changedTouches', { value: [touchLike(20, 20)] });
      Object.defineProperty(move, 'preventDefault', { value: preventDefaultSpy });

      dispatchTouch(target, 'touchstart', [touchLike(0, 0)]);
      window.dispatchEvent(move);

      expect(preventDefaultSpy).not.toHaveBeenCalled();
      expect(isTouchDragging.value).toBe(false);
      drag.disable();
    });

    it('remembers the draggable element when touchstart target is a descendant', () => {
      const drag = useTouchDrag(1);
      drag.enable();

      const source = document.createElement('div');
      source.setAttribute('draggable', 'true');
      const inner = document.createElement('span');
      source.appendChild(inner);
      document.body.appendChild(source);

      const dragStartSpy = vi.fn();
      source.addEventListener('dragstart', dragStartSpy);

      dispatchTouch(inner, 'touchstart', [touchLike(0, 0)]);
      dispatchTouch(window, 'touchmove', [touchLike(10, 10)]);

      expect(dragStartSpy).toHaveBeenCalledTimes(1);
      drag.disable();
    });
  });

  describe('handleTouchMove (via touchmove)', () => {
    it('no-ops when there was no qualifying touchstart', () => {
      const drag = useTouchDrag();
      drag.enable();

      const preventDefaultSpy = vi.fn();
      const move = new Event('touchmove', { bubbles: true, cancelable: true }) as TouchEvent;
      Object.defineProperty(move, 'touches', { value: [touchLike(5, 5)] });
      Object.defineProperty(move, 'changedTouches', { value: [touchLike(5, 5)] });
      Object.defineProperty(move, 'preventDefault', { value: preventDefaultSpy });

      window.dispatchEvent(move);

      expect(preventDefaultSpy).not.toHaveBeenCalled();
      drag.disable();
    });

    it('calls preventDefault on move after a qualified start', () => {
      const drag = useTouchDrag(1);
      drag.enable();

      const source = document.createElement('div');
      source.setAttribute('draggable', 'true');
      document.body.appendChild(source);

      dispatchTouch(source, 'touchstart', [touchLike(0, 0)]);

      const preventDefaultSpy = vi.fn();
      const move = new Event('touchmove', { bubbles: true, cancelable: true }) as TouchEvent;
      Object.defineProperty(move, 'touches', { value: [touchLike(5, 5)] });
      Object.defineProperty(move, 'changedTouches', { value: [touchLike(5, 5)] });
      Object.defineProperty(move, 'preventDefault', { value: preventDefaultSpy });

      window.dispatchEvent(move);

      expect(preventDefaultSpy).toHaveBeenCalled();
      drag.disable();
    });

    it('starts dragging only after exceeding dragThreshold and dispatches dragstart', () => {
      const drag = useTouchDrag(10);
      drag.enable();

      const source = document.createElement('div');
      source.setAttribute('draggable', 'true');
      document.body.appendChild(source);
      const dragStartSpy = vi.fn();
      source.addEventListener('dragstart', dragStartSpy);

      dispatchTouch(source, 'touchstart', [touchLike(0, 0)]);
      dispatchTouch(window, 'touchmove', [touchLike(5, 5)]);
      expect(dragStartSpy).not.toHaveBeenCalled();

      const bodyChildrenBefore = document.body.childElementCount;
      dispatchTouch(window, 'touchmove', [touchLike(30, 30)]);

      expect(dragStartSpy).toHaveBeenCalledTimes(1);
      expect(isTouchDragging.value).toBe(true);
      expect(document.body.childElementCount).toBeGreaterThan(bodyChildrenBefore);
      drag.disable();
    });

    it('dispatches dragover to elementFromPoint after drag has started', () => {
      const drag = useTouchDrag(1);
      drag.enable();

      const source = document.createElement('div');
      source.setAttribute('draggable', 'true');
      const target = document.createElement('div');
      document.body.append(source, target);
      const dragOverSpy = vi.fn();
      target.addEventListener('dragover', dragOverSpy);
      vi.spyOn(document, 'elementFromPoint').mockReturnValue(target);

      dispatchTouch(source, 'touchstart', [touchLike(0, 0)]);
      dispatchTouch(window, 'touchmove', [touchLike(10, 10)]);
      dispatchTouch(window, 'touchmove', [touchLike(12, 12)]);

      expect(dragOverSpy).toHaveBeenCalled();
      drag.disable();
    });

    it('does not dispatch dragover when elementFromPoint returns null', () => {
      const drag = useTouchDrag(1);
      drag.enable();

      const source = document.createElement('div');
      source.setAttribute('draggable', 'true');
      const target = document.createElement('div');
      document.body.append(source, target);
      const documentDragOverSpy = vi.fn();
      document.addEventListener('dragover', documentDragOverSpy);

      const elementFromPoint = vi.spyOn(document, 'elementFromPoint');
      elementFromPoint.mockReturnValue(target);

      dispatchTouch(source, 'touchstart', [touchLike(0, 0)]);
      dispatchTouch(window, 'touchmove', [touchLike(10, 10)]);

      elementFromPoint.mockReturnValue(null);
      documentDragOverSpy.mockClear();
      dispatchTouch(window, 'touchmove', [touchLike(20, 20)]);

      expect(documentDragOverSpy).not.toHaveBeenCalled();
      drag.disable();
    });

    it('moves the ghost with the finger after drag has started', () => {
      const drag = useTouchDrag(1);
      drag.enable();

      const source = document.createElement('div');
      source.setAttribute('draggable', 'true');
      document.body.appendChild(source);
      const target = document.createElement('div');
      document.body.appendChild(target);
      vi.spyOn(document, 'elementFromPoint').mockReturnValue(target);

      dispatchTouch(source, 'touchstart', [touchLike(0, 0)]);
      dispatchTouch(window, 'touchmove', [touchLike(10, 10)]);
      const ghost = [...document.body.children].find(
        el => el !== source && el !== target,
      ) as HTMLElement | undefined;
      expect(ghost).toBeDefined();
      const t1 = ghost!.style.transform;
      dispatchTouch(window, 'touchmove', [touchLike(50, 60)]);
      const t2 = ghost!.style.transform;
      expect(t2).not.toBe(t1);
      expect(t2).toContain('50');
      expect(t2).toContain('60');
      drag.disable();
    });
  });

  describe('handleTouchEnd (via touchend)', () => {
    it('removes the ghost from the document when touch ends', () => {
      const drag = useTouchDrag(1);
      drag.enable();

      const source = document.createElement('div');
      source.setAttribute('draggable', 'true');
      const nonDropTarget = document.createElement('div');
      document.body.append(source, nonDropTarget);
      vi.spyOn(document, 'elementFromPoint').mockReturnValue(nonDropTarget);

      dispatchTouch(source, 'touchstart', [touchLike(0, 0)]);
      dispatchTouch(window, 'touchmove', [touchLike(10, 10)]);
      const ghost = [...document.body.children].find(el => el !== source && el !== nonDropTarget);
      expect(ghost).toBeDefined();

      dispatchTouch(window, 'touchend', [], [touchLike(10, 10)]);
      expect(document.body.contains(ghost!)).toBe(false);
      drag.disable();
    });

    it('dispatches drop on valid dropzone and sets synthetic flag', () => {
      const drag = useTouchDrag(1);
      drag.enable();

      const source = document.createElement('div');
      source.setAttribute('draggable', 'true');
      const dropZone = document.createElement('div');
      dropZone.className = 'former-drag-container';
      const target = document.createElement('div');
      dropZone.appendChild(target);
      document.body.append(source, dropZone);

      const dropSpy = vi.fn((e: Event) => {
        expect((e as any).synthetic).toBe(true);
      });
      target.addEventListener('drop', dropSpy);
      vi.spyOn(document, 'elementFromPoint').mockReturnValue(target);

      dispatchTouch(source, 'touchstart', [touchLike(0, 0)]);
      dispatchTouch(window, 'touchmove', [touchLike(10, 10)]);
      dispatchTouch(window, 'touchend', [], [touchLike(10, 10)]);

      expect(dropSpy).toHaveBeenCalledTimes(1);
      drag.disable();
    });

    it('flags synthetic drop events with a synthetic property', () => {
      const drag = useTouchDrag(1);
      drag.enable();

      const source = document.createElement('div');
      source.setAttribute('draggable', 'true');
      const dropZone = document.createElement('div');
      dropZone.className = 'former-drag-container';
      const target = document.createElement('div');
      dropZone.appendChild(target);
      document.body.append(source, dropZone);
      const dropSpy = vi.fn();
      target.addEventListener('drop', dropSpy);
      vi.spyOn(document, 'elementFromPoint').mockReturnValue(target);

      dispatchTouch(source, 'touchstart', [touchLike(0, 0)]);
      dispatchTouch(window, 'touchmove', [touchLike(10, 10)]);
      dispatchTouch(window, 'touchend', [], [touchLike(10, 10)]);

      expect(dropSpy).toHaveBeenCalledWith(expect.objectContaining({ synthetic: true }));
      drag.disable();
    });

    it('dispatches dragend on the source when dropped outside a valid dropzone', () => {
      const drag = useTouchDrag(1);
      drag.enable();

      const source = document.createElement('div');
      source.setAttribute('draggable', 'true');
      const nonDropTarget = document.createElement('div');
      document.body.append(source, nonDropTarget);
      const dragEndSpy = vi.fn();
      source.addEventListener('dragend', dragEndSpy);
      vi.spyOn(document, 'elementFromPoint').mockReturnValue(nonDropTarget);

      dispatchTouch(source, 'touchstart', [touchLike(0, 0)]);
      dispatchTouch(window, 'touchmove', [touchLike(10, 10)]);
      dispatchTouch(window, 'touchend', [], [touchLike(10, 10)]);

      expect(dragEndSpy).toHaveBeenCalledTimes(1);
      drag.disable();
    });

    it('schedules isTouchDragging to false on the next macrotask after touch end', () => {
      vi.useFakeTimers();
      const drag = useTouchDrag(1);
      drag.enable();

      const source = document.createElement('div');
      source.setAttribute('draggable', 'true');
      const nonDropTarget = document.createElement('div');
      document.body.append(source, nonDropTarget);
      vi.spyOn(document, 'elementFromPoint').mockReturnValue(nonDropTarget);

      dispatchTouch(source, 'touchstart', [touchLike(0, 0)]);
      dispatchTouch(window, 'touchmove', [touchLike(10, 10)]);
      expect(isTouchDragging.value).toBe(true);

      dispatchTouch(window, 'touchend', [], [touchLike(10, 10)]);
      expect(isTouchDragging.value).toBe(true);

      vi.runAllTimers();
      expect(isTouchDragging.value).toBe(false);
      drag.disable();
    });
  });

  describe('error resilience / edge cases', () => {
    it('ignores touch end when there was no start (startEl null)', () => {
      const drag = useTouchDrag();
      drag.enable();

      expect(() => dispatchTouch(window, 'touchend', [], [touchLike(10, 10)])).not.toThrow();
      drag.disable();
    });

    it('uses custom dragThreshold when useTouchDrag(n) is called', () => {
      const drag = useTouchDrag(50);
      drag.enable();

      const source = document.createElement('div');
      source.setAttribute('draggable', 'true');
      document.body.appendChild(source);
      const dragStartSpy = vi.fn();
      source.addEventListener('dragstart', dragStartSpy);

      dispatchTouch(source, 'touchstart', [touchLike(0, 0)]);
      dispatchTouch(window, 'touchmove', [touchLike(20, 20)]);
      expect(dragStartSpy).not.toHaveBeenCalled();

      dispatchTouch(window, 'touchmove', [touchLike(60, 0)]);
      expect(dragStartSpy).toHaveBeenCalledTimes(1);
      drag.disable();
    });
  });
});
