import { useState, useEffect } from 'react';

/**
 * Hook to make a component draggable within the window.
 * @param {React.RefObject<HTMLElement>} ref - ref to the draggable element
 * @param {{x: number, y: number}} initialPos - initial top-left coordinates
 * @returns {{x: number, y: number}} current position
 */
export default function useDraggable(ref, initialPos, modalKey) {
  const [pos, setPos] = useState(initialPos);
  // Keep position in sync if initialPos changes (e.g. when modal is opened)
  useEffect(() => {
    setPos(initialPos);
  }, [initialPos.x, initialPos.y]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let startX, startY, origX, origY;

    const onMouseDown = (e) => {
      const interactiveElements = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'LABEL'];
      if (interactiveElements.includes(e.target.tagName)) {
        // Ignore mousedown on interactive elements
        return;
      }
      if (e.button !== 0) return;
      startX = e.clientX;
      startY = e.clientY;
      origX = pos.x;
      origY = pos.y;
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      e.preventDefault();
    };

    const onMouseMove = (e) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const { innerWidth, innerHeight } = window;
      const { offsetWidth, offsetHeight } = node;
      let newX = origX + dx;
      let newY = origY + dy;
      // clamp within viewport
      newX = Math.max(0, Math.min(innerWidth - offsetWidth, newX));
      newY = Math.max(0, Math.min(innerHeight - offsetHeight, newY));
      setPos({ x: newX, y: newY });
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    node.style.cursor = 'move';
    node.addEventListener('mousedown', onMouseDown);
    return () => {
      node.style.cursor = '';
      node.removeEventListener('mousedown', onMouseDown);
    };
  }, [ref, pos.x, pos.y, modalKey]);

  return pos;
}