import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useHarmonyBase } from '../useHarmonyBase';

describe('useHarmonyBase', () => {
    it('follows the color, keeps the base for the echo of a pick (one-shot)', () => {
        const { result, rerender } = renderHook(({ c }) => useHarmonyBase(c), {
            initialProps: { c: '#ff0000' as string | null },
        });
        expect(result.current[0]).toBe('#ff0000');
        act(() => result.current[1]('#00ffff'));
        rerender({ c: '#00ffff' }); // echo of the pick
        expect(result.current[0]).toBe('#ff0000');
        rerender({ c: '#123456' });
        expect(result.current[0]).toBe('#123456');
        rerender({ c: '#00ffff' }); // the old pick again, from elsewhere: re-base
        expect(result.current[0]).toBe('#00ffff');
    });

    it('goes to null (no fill) and back', () => {
        const { result, rerender } = renderHook(({ c }) => useHarmonyBase(c), {
            initialProps: { c: '#ff0000' as string | null },
        });
        rerender({ c: null });
        expect(result.current[0]).toBeNull();
        rerender({ c: '#00ff00' });
        expect(result.current[0]).toBe('#00ff00');
    });
});
