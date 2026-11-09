import { afterEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useStore } from '@store';
import { useBoardMode } from '../useBoardMode';
import { DEFAULT_SETTINGS } from '@/store/slices/createSettingSlice';

afterEach(() => {
    act(() => useStore.getState().setFreehand(false));
});

describe('board mode follows Settings > Freehand (whiteboard)', () => {
    it('new users start in design mode (Freehand off by default)', () => {
        expect(DEFAULT_SETTINGS.freehand).toBe(false);
    });

    it('Freehand on = whiteboard, off = design', () => {
        const { result } = renderHook(() => useBoardMode());
        act(() => useStore.getState().setFreehand(true));
        expect(result.current).toBe('whiteboard');
        act(() => useStore.getState().setFreehand(false));
        expect(result.current).toBe('design');
    });
});

describe('editor wiring', () => {
    it('the editor takes its board mode from the setting (no hard-coded design)', async () => {
        const src = (await import('../../components/pages/Editor/Editor.tsx?raw'))
            .default as string;
        expect(src).not.toMatch(/isWhiteboard = false/);
        expect(src).toMatch(/useBoardMode\(\)/);
    });
});
