/** BUG-064: the Animation panel follows Settings > Theme (`settings.mode`; it read a key that does not exist). */
import { afterEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useStore } from '@store';
import { useIsDark } from '../useAnimationTheme';

/* eslint-disable @typescript-eslint/no-explicit-any */
const prev = useStore.getState().settings;
afterEach(() => act(() => useStore.setState({ settings: prev } as any)));

describe('useIsDark', () => {
    it('follows settings.mode when the page has no theme marker', () => {
        document.documentElement.className = '';
        document.documentElement.removeAttribute('data-theme');
        act(() => useStore.setState({ settings: { ...prev, mode: 'dark' } } as any));
        const dark = renderHook(() => useIsDark());
        expect(dark.result.current).toBe(true);
        act(() => useStore.setState({ settings: { ...prev, mode: 'light' } } as any));
        dark.rerender();
        expect(dark.result.current).toBe(false);
    });
});
