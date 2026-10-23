import { useRef } from 'react';

/**
 * Lets a controlled text input keep its caret when the value is rewritten while
 * typing (masks). Attach `inputRef` to the input and call `setCaret(position)` from
 * the change handler, AFTER calling the state setter.
 *
 * The caret is applied in a microtask: React re-writes the DOM value of a controlled
 * input at the end of the event (even when the state did not change, e.g. when the
 * user deletes a thousands dot that the mask puts back) and that moves the caret to the
 * end. The microtask runs after React is done and before the browser paints.
 */
export function useCaretRestore() {
  const inputRef = useRef(null);

  const setCaret = (position) => {
    queueMicrotask(() => {
      const input = inputRef.current;
      // Do not touch the selection of an input that is not focused (some browsers would focus it).
      if (input && document.activeElement === input) {
        input.setSelectionRange(position, position);
      }
    });
  };

  return { inputRef, setCaret };
}
