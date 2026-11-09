/**
 * One place per feature (owner decision, 2026-11-07). Each capability has exactly one home:
 *   page size            -> left "Canvas Size" panel
 *   zoom                 -> footer (− slider + % Fit)
 *   save / open project  -> top bar File (whole project)
 *   export image / video -> right dock "Export" tab
 *   snap / grid toggles  -> top bar (Settings: appearance, freehand, units only)
 *   text formatting      -> text float (quick) + Text panel (full); no header text tools
 * These guards stop a second copy from creeping back.
 */
import { describe, expect, it } from 'vitest';

const SRC = import.meta.glob<string>(
    [
        '/src/components/organisms/page/PagePanel.tsx',
        '/src/components/organisms/settings/ui/Preferences.tsx',
        '/src/components/organisms/ShapeToolsHeader.tsx',
        '/src/components/organisms/toolbars/ui/TopToolbar.tsx',
        '/src/components/organisms/footer/ui/ZoomControl.tsx',
    ],
    { query: '?raw', import: 'default', eager: true },
);
const src = (f: string) => SRC[`/src/components/organisms/${f}`] ?? '';

describe('one place per feature', () => {
    it('Pages panel: pages + page background + clear only (no size, zoom, export, save/open)', () => {
        const s = src('page/PagePanel.tsx');
        expect(s).not.toMatch(
            /setPageFormat|setOrientation|setCustomPageSize|applyFormatToAllPages/,
        );
        expect(s).not.toMatch(/\bzoomIn\b|\bzoomOut\b|fitToScreen/);
        expect(s).not.toMatch(/exportPageAsDataURL|exportProject|importProject/);
        expect(s).toMatch(/setPageBackground/);
        expect(s).toMatch(/clearCurrentPage/);
    });

    it('Settings: only preferences that work (no page size, background or snap copies)', () => {
        const s = src('settings/ui/Preferences.tsx');
        // page size / orientation -> Canvas Size panel
        expect(s).not.toMatch(/setFormat|setOrientation|setCustomSize/);
        // these settings were saved but never read by the editor (grid / snap live in the top bar)
        expect(s).not.toMatch(/setSnapToGrid|setBackgroundStyle|setBackgroundColor|setGridSize/);
        // working preferences stay
        expect(s).toMatch(/setMode/);
        expect(s).toMatch(/setColorTheme/);
        expect(s).toMatch(/setIconSize/);
        expect(s).toMatch(/toggleFreehand/);
        expect(s).toMatch(/setUnit/);
    });

    it('header: no second set of text tools (the text float + Text panel cover it)', () => {
        expect(src('ShapeToolsHeader.tsx')).not.toMatch(/TextToolsHeader/);
    });

    it('zoom lives in the footer only (no top Zoom bar)', () => {
        expect(src('toolbars/ui/TopToolbar.tsx')).not.toMatch(
            /import \{ ZoomBar \}|component: ZoomBar/,
        );
        const footer = src('footer/ui/ZoomControl.tsx');
        expect(footer).toMatch(/zoomIn/);
        expect(footer).toMatch(/zoomOut/);
        expect(footer).toMatch(/fitToScreen/);
        expect(footer).toMatch(/actualSize/);
    });
});
