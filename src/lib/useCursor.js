import { useEffect } from 'react';

/** Shows a pointer cursor while `hovered` is true. */
export function useCursor(hovered, cursor = 'pointer') {
  useEffect(() => {
    if (!hovered) return undefined;
    document.body.style.cursor = cursor;
    return () => {
      document.body.style.cursor = '';
    };
  }, [hovered, cursor]);
}
