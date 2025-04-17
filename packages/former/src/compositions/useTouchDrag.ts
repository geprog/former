import { ref } from 'vue';

export const isTouchDragging = ref(false);

const ghostStyle = {
  position: 'fixed',
  pointerEvents: 'none',
  opacity: '0.7',
  top: '0',
  left: '0',
  zIndex: '1000',
  width: '300px',
  borderRadius: '8px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
  background: '#808080',
  transition: 'none',
};

export function useTouchDrag(dragThreshold = 10) {
  let startEl: HTMLElement | null = null;
  let dataTransfer: DataTransfer | null = null;
  let ghostEl: HTMLElement | null = null;
  let initialTouch: Touch | null = null;
  let hasDragged = false;

  function handleTouchStart(e: TouchEvent) {
    const target = e.target as HTMLElement;
    const draggable = target.closest('[draggable="true"]') as HTMLElement;
    if (!draggable) {
      return;
    }

    startEl = draggable;
    initialTouch = e.touches[0];
    hasDragged = false;
  }

  function handleTouchMove(e: TouchEvent) {
    if (!startEl || !initialTouch) {
      return;
    }

    const touch = e.touches[0];
    const dx = touch.clientX - initialTouch.clientX;
    const dy = touch.clientY - initialTouch.clientY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (!hasDragged && distance > dragThreshold) {
      hasDragged = true;
      isTouchDragging.value = true;
      dataTransfer = new DataTransfer();

      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      startEl.dispatchEvent(dragStartEvent);

      ghostEl = startEl.cloneNode(true) as HTMLElement;
      Object.assign(ghostEl.style, ghostStyle);
      ghostEl.style.transform = `translate(${touch.clientX}px, ${touch.clientY}px)`;
      document.body.appendChild(ghostEl);
    }

    if (hasDragged && ghostEl) {
      ghostEl.style.transform = `translate(${touch.clientX}px, ${touch.clientY}px)`;
    }

    if (hasDragged) {
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      if (!el) {
        return;
      }

      const dragOverEvent = new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        clientX: touch.clientX,
        clientY: touch.clientY,
        dataTransfer,
      });
      el.dispatchEvent(dragOverEvent);
    }
  }

  function handleTouchEnd(e: TouchEvent) {
    if (!startEl) {
      return;
    }

    ghostEl?.remove();
    ghostEl = null;

    if (hasDragged) {
      const touch = e.changedTouches[0];
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      const validDropzone = el?.closest('.former-drag-container');

      if (el && validDropzone) {
        const dropEvent = new DragEvent('drop', {
          bubbles: true,
          cancelable: true,
          clientX: touch.clientX,
          clientY: touch.clientY,
          dataTransfer,
        });
        (dropEvent as any).synthetic = true;
        el.dispatchEvent(dropEvent);
      }
      else {
        // Cancel if dropped in invalid place
        const dragEndEvent = new DragEvent('dragend', {
          bubbles: true,
          cancelable: true,
          dataTransfer,
        });
        startEl.dispatchEvent(dragEndEvent);
      }
    }

    startEl = null;
    dataTransfer = null;
    initialTouch = null;
    hasDragged = false;

    setTimeout(() => {
      isTouchDragging.value = false;
    }, 0);
  }

  function enable() {
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: false });
  }

  function disable() {
    window.removeEventListener('touchstart', handleTouchStart);
    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', handleTouchEnd);
  }

  return { enable, disable };
}
