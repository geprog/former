import type { VirtualElement } from '@floating-ui/dom';
import type { Ref } from 'vue';
import { autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom';
import { onBeforeUnmount, ref, watch } from 'vue';

function rect(left: number, top: number, width: number, height: number) {
  return {
    x: left,
    y: top,
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
  };
}

/**
 * An anchor at a rectangle of the viewport, which is read again whenever the popup is positioned, e.g. to follow
 * the position of the cursor while the page scrolls. `contextElement` is the element it is in, whose scrolling
 * ancestors are watched.
 */
export function anchor(getRect: () => { left: number; top: number; width?: number; height?: number }, contextElement?: Element): VirtualElement {
  return {
    ...(contextElement
      ? { contextElement }
      : {}),
    getBoundingClientRect: () => {
      const { left, top, width = 0, height = 0 } = getRect();
      return rect(left, top, width, height);
    },
  };
}

/**
 * The position of a popup (`position: fixed`) at its anchor: below it, above it if there is no room below,
 * and moved into the viewport. It follows its anchor while the page scrolls or resizes.
 */
export function useFloating(target: Ref<VirtualElement | undefined>, floating: Ref<HTMLElement | null | undefined>, distance = 4) {
  const style = ref<{ left: string; top: string }>({ left: '0px', top: '0px' });
  let cleanup: (() => void) | undefined;

  watch([target, floating], ([reference, element]) => {
    cleanup?.();
    cleanup = undefined;
    if (!reference || !element) {
      return;
    }
    cleanup = autoUpdate(reference, element, () => {
      computePosition(reference, element, {
        strategy: 'fixed',
        placement: 'bottom-start',
        middleware: [
          offset(distance),
          flip(),
          shift({ padding: 8 }),
        ],
      }).then(({ x, y }) => {
        style.value = { left: `${x}px`, top: `${y}px` };
      });
    });
  }, { flush: 'post' });

  onBeforeUnmount(() => cleanup?.());
  return style;
}
