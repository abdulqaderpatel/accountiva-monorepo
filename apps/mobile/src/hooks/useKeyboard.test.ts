import { describe, it, expect, vi } from 'vitest';
import { Keyboard } from 'react-native';
import { useKeyboard } from './useKeyboard';

let effectCleanup: (() => void) | null = null;

vi.mock('react', () => ({
  useState: (initial: any) => [initial, vi.fn()],
  useEffect: (effect: () => (() => void) | void) => {
    effectCleanup = effect() || null;
  },
}));

vi.mock('react-native', () => {
  const listeners: Record<string, ((e: any) => void)[]> = {};
  return {
    Platform: { OS: 'android' },
    Keyboard: {
      addListener: vi.fn((event: string, callback: (e: any) => void) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(callback);
        return {
          remove: vi.fn(() => {
            listeners[event] = (listeners[event] || []).filter((cb) => cb !== callback);
          }),
        };
      }),
    },
  };
});

describe('useKeyboard', () => {
  it('registers keyboard listeners and cleans up on unmount', () => {
    const result = useKeyboard();
    expect(Keyboard.addListener).toHaveBeenCalledWith('keyboardDidShow', expect.any(Function));
    expect(Keyboard.addListener).toHaveBeenCalledWith('keyboardDidHide', expect.any(Function));
    expect(result).toHaveProperty('keyboardHeight');
    expect(result).toHaveProperty('isKeyboardVisible');
    expect(typeof effectCleanup).toBe('function');
  });
});
