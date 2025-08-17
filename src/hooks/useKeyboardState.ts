import { useState, useCallback, useEffect } from 'react';

export interface UseKeyboardStateReturn {
  isShiftPressed: boolean;
  setIsShiftPressed: (pressed: boolean) => void;
}

/**
 * Hook to manage keyboard state, particularly modifier keys
 */
export const useKeyboardState = (): UseKeyboardStateReturn => {
  const [isShiftPressed, setIsShiftPressed] = useState(false);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Shift') {
      setIsShiftPressed(true);
    }
  }, []);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Shift') {
      setIsShiftPressed(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  return {
    isShiftPressed,
    setIsShiftPressed,
  };
};
