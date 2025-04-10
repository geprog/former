// composables/useTouchDrag.ts
export function useTouchDrag() {
  let startEl: HTMLElement | null = null;
  let dataTransfer: DataTransfer | null = null;
  let ghostEl: HTMLElement | null = null;

  function handleTouchStart(e: TouchEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('[draggable="true"]'))
      return;

    startEl = target.closest('[draggable="true"]')!;
    dataTransfer = new DataTransfer();

    const dragStartEvent = new DragEvent('dragstart', {
      bubbles: true,
      cancelable: true,
      dataTransfer,
    });
    ghostEl = startEl.cloneNode(true) as HTMLElement;
    ghostEl.style.position = 'fixed';
    ghostEl.style.pointerEvents = 'none';
    ghostEl.style.opacity = '0.7';
    ghostEl.style.top = '0';
    ghostEl.style.left = '0';
    ghostEl.style.zIndex = '1000';
    ghostEl.style.width = '300px';
    ghostEl.style.borderRadius = '8px';
    ghostEl.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    ghostEl.style.background = '#bfdbfe';
    ghostEl.style.transform = 'translate(-9999px, -9999px)';
    ghostEl.style.transition = 'none';

    document.body.appendChild(ghostEl);

    startEl.dispatchEvent(dragStartEvent);
  }

  function handleTouchMove(e: TouchEvent) {
    if (!startEl)
      return;

    const touch = e.touches[0];
    if (ghostEl) {
      ghostEl.style.transform = `translate(${touch.clientX}px, ${touch.clientY}px)`;
    }
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!el)
      return;

    const dragOverEvent = new DragEvent('dragover', {
      bubbles: true,
      cancelable: true,
      dataTransfer,
    });

    el.dispatchEvent(dragOverEvent);
  }

  function handleTouchEnd(e: TouchEvent) {
    if (!startEl)
      return;

    if (ghostEl && ghostEl.parentNode) {
      ghostEl.parentNode.removeChild(ghostEl);
    }
    ghostEl = null;

    const touch = e.changedTouches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!el)
      return;

    const dropEvent = new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer,
    });

    el.dispatchEvent(dropEvent);

    const dragEndEvent = new DragEvent('dragend', {
      bubbles: true,
      cancelable: true,
      dataTransfer,
    });

    startEl.dispatchEvent(dragEndEvent);

    startEl = null;
    dataTransfer = null;
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
