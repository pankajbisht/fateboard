/**
 * Rulers belong to the board mode: always shown in design (fixed page), never in whiteboard.
 * A saved "rulers off" setting must not hide them in design mode.
 */
import { describe, expect, it } from 'vitest';

const src = (p: string) =>
    import.meta.glob<string>(
        [
            '/src/components/organisms/board/ui/CanvasBoard.tsx',
            '/src/components/organisms/settings/ui/Preferences.tsx',
        ],
        { query: '?raw', import: 'default', eager: true },
    )[p];

describe('ruler visibility', () => {
    it('design board always renders both rulers (not gated by settings.showRulers)', () => {
        const board = src('/src/components/organisms/board/ui/CanvasBoard.tsx');
        expect(board).not.toMatch(/showRulers/);
        expect(board.match(/<Ruler\b/g)).toHaveLength(2);
    });

    it('Settings has no separate Rulers switch (mode decides)', () => {
        expect(src('/src/components/organisms/settings/ui/Preferences.tsx')).not.toMatch(
            /setShowRulers|title="Rulers"/,
        );
    });
});
