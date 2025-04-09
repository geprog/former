import { onMounted, onUnmounted } from 'vue';
import { setDragEventData } from '~/utils';

interface UseTouchDragOptions {
  elementGetter: () => HTMLElement | undefined | null;
  dragData: () => { type: string; value: string };
}

export function useTouchDrag({ elementGetter, dragData }: UseTouchDragOptions) {
  let startX = 0;
  let startY = 0;
  let isDragging = false;
  let ghost: HTMLElement | null = null;

  const onTouchMove = (e: TouchEvent) => {
    if (!isDragging)
      return;
    e.preventDefault();

    const touch = e.touches[0];

    // Create ghost element to show dragging
    if (!ghost) {
      const el = elementGetter();
      if (el) {
        ghost = el.cloneNode(true) as HTMLElement;
        ghost.style.position = 'fixed';
        ghost.style.left = '0px';
        ghost.style.top = '0px';
        ghost.style.opacity = '0.5';
        ghost.style.zIndex = '9999';
        ghost.style.pointerEvents = 'none';
        document.body.appendChild(ghost);
      }

      const { value } = dragData();
      setDragEventData(e as any, 'form_id', 'node_id', value); // override for touch
    }

    // Move ghost
    if (ghost) {
      ghost.style.top = `${touch.clientY}px`;
      ghost.style.left = `${touch.clientX}px`;
    }

    window.dispatchEvent(
      new DragEvent('dragover', {
        clientX: touch.clientX,
        clientY: touch.clientY,
      }),
    );
  };

  const onTouchEnd = (e: TouchEvent) => {
    isDragging = false;
    const touch = e.changedTouches[0];

    window.dispatchEvent(
      new DragEvent('drop', {
        clientX: touch.clientX,
        clientY: touch.clientY,
      }),
    );

    if (ghost) {
      ghost.remove();
    }

    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', onTouchEnd);
  };

  const onTouchStart = (e: TouchEvent) => {
    const el = elementGetter();
    if (!el)
      return;

    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    isDragging = true;

    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
  };

  onMounted(() => {
    const el = elementGetter();
    if (el) {
      el.addEventListener('touchstart', onTouchStart, { passive: false });
    }
  });

  onUnmounted(() => {
    const el = elementGetter();
    if (el) {
      el.removeEventListener('touchstart', onTouchStart);
    }
  });
}
