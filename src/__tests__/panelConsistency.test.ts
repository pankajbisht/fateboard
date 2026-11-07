/**
 * Panels are built from the shared atoms / molecules (docs/DESIGN.md "Panels"):
 * one header from PanelLayout, Select instead of <select>, Slider instead of <input type=range>,
 * Switch instead of checkboxes, tokens instead of dark / neutral hard-coded backgrounds.
 */
import { describe, expect, it } from 'vitest';

const SOURCES = import.meta.glob<string>(
    [
        '/src/components/**/*.tsx',
        '!/src/components/**/__tests__/**',
        '!/src/components/pages/web/**',
    ],
    { query: '?raw', import: 'default', eager: true },
);

const PANELS = [
    'organisms/DrawPanel.tsx',
    'organisms/ShapePanel.tsx',
    'organisms/TextPanel.tsx',
    'organisms/board/ui/CanvasSizePanel.tsx',
    'organisms/effects/ui/TemplateGallery.tsx',
    'organisms/fonts/FontTemplatePanel.tsx',
    'organisms/page/PagePanel.tsx',
    'organisms/layer/LayersPanel.tsx',
    'organisms/effects/ui/PathEffects.tsx',
    'organisms/effects/ui/RepeatRadially.tsx',
    'organisms/effects/ui/RepeatAlongPath.tsx',
    'organisms/effects/ui/RuleEditor.tsx',
    'organisms/filter/ui/Filters.tsx',
    'organisms/effects/ui/ExportCanvas.tsx',
    'organisms/AnimationPanel.tsx',
    'organisms/FillShadowPanel.tsx',
].map((p) => `/src/components/${p}`);

const hits = (files: string[], re: RegExp) =>
    files.flatMap((file) =>
        SOURCES[file]
            .split('\n')
            .map((line, i) => ({ line, at: `${file}:${i + 1}` }))
            .filter(({ line }) => re.test(line))
            .map(({ at }) => at),
    );

describe('panel consistency', () => {
    it('every panel file exists', () => {
        for (const p of PANELS) expect(SOURCES[p], p).toBeDefined();
    });

    it('panels use Select / Slider / Switch, not raw form controls', () => {
        expect(hits(PANELS, /<select\b/)).toEqual([]);
        expect(hits(PANELS, /type="range"/)).toEqual([]);
        expect(hits(PANELS, /type="checkbox"/)).toEqual([]);
    });

    it('panels do not draw their own title bar (PanelLayout owns the header)', () => {
        expect(hits(PANELS, /<(PanelHeader|DockTemplate)\b/)).toEqual([]);
        // an <h2> is only allowed as a dialog title (aria-labelledby target: id={titleId})
        const titleBars = PANELS.flatMap((file) => {
            const lines = SOURCES[file].split('\n');
            return lines
                .map((line, i) => ({ i, line, next: lines.slice(i, i + 3).join(' ') }))
                .filter(({ line, next }) => /<h2\b/.test(line) && !/id=\{titleId\}/.test(next))
                .map(({ i }) => `${file}:${i + 1}`);
        });
        expect(titleBars).toEqual([]);
    });

    it('panels use surface tokens, not dark or fixed neutral backgrounds', () => {
        expect(
            hits(
                PANELS,
                /\bbg-(gray|stone|slate|neutral|zinc)-(50|100|200|700|800|900|950)\b|\bbg-white\b|\bbg-black\b(?!\/)/,
            ),
        ).toEqual([]);
    });

    it('UI status colours are tokens (danger / success / accent), not raw red / green / amber', () => {
        const ui = Object.keys(SOURCES).filter((f) => !f.endsWith('ColorPicker.tsx'));
        expect(
            hits(ui, /\b(text|bg|border)-(red|rose|green|emerald|amber|teal)-\d{2,3}\b/),
        ).toEqual([]);
    });

    it('AnimationPanel buttons are the shared atoms (Button / IconButton / SegmentedControl)', () => {
        const file = '/src/components/organisms/AnimationPanel.tsx';
        // Only the timeline keyframe markers may be raw <button>s (absolutely positioned diamonds).
        const raw = hits([file], /<button\b/);
        expect(raw).toHaveLength(1);
        expect(hits([file], /<svg\b|text-white|an-hover/)).toEqual([]);
    });

    it('the animation theme CSS does not override control colours', () => {
        const css = import.meta.glob<string>('/src/components/hooks/useAnimationTheme.ts', {
            query: '?raw',
            import: 'default',
            eager: true,
        })['/src/components/hooks/useAnimationTheme.ts'];
        expect(css).toContain('ANIM_CSS');
        expect(css).not.toMatch(/button\s*\{\s*color\s*:\s*inherit/);
    });

    it('the final action of a panel is PanelAction (same look as "Export PNG")', () => {
        const withFinalAction = [
            'organisms/effects/ui/ExportCanvas.tsx',
            'organisms/AnimationPanel.tsx',
            'organisms/effects/ui/EffectSection.tsx',
            'organisms/board/ui/CanvasSizePanel.tsx',
            'organisms/ShapePanel.tsx',
            'organisms/fonts/FontTemplatePanel.tsx',
        ].map((p) => `/src/components/${p}`);
        for (const file of withFinalAction) expect(SOURCES[file], file).toMatch(/<PanelAction\b/);
        // Panel-level destructive actions share the same shape, in the danger tone.
        expect(SOURCES['/src/components/organisms/AnimationPanel.tsx']).toMatch(
            /<PanelAction\s[^>]*tone="danger"[^>]*>\s*Clear all animations/,
        );
        // No hand-made "big primary" buttons left: full-width / large Buttons are PanelAction.
        const files = [...PANELS, '/src/components/organisms/effects/ui/EffectSection.tsx'];
        expect(hits(files, /^(?!.*variant=).*<Button\b[^>]*\b(block|size="lg")\b/)).toEqual([]);
    });

    it('one button system: panel-level = PanelAction; every other Button is small and never brand-filled', () => {
        const files = [...PANELS, '/src/components/organisms/effects/ui/EffectSection.tsx'];
        const bad = files.flatMap((file) =>
            [
                ...SOURCES[file]
                    .replace(/^\s*\/\/.*$/gm, '') // commented-out JSX
                    .matchAll(/<Button\b((?:[^>{]|\{(?:[^{}]|\{[^{}]*\})*\})*)>/g),
            ]
                .filter(([, props]) => {
                    const variant = /variant="([^"]+)"/.exec(props)?.[1] ?? 'primary';
                    const small = /size="sm"/.test(props);
                    return !small || !['secondary', 'danger-outline', 'ghost'].includes(variant);
                })
                .map((m) => `${file}: ${m[0].replace(/\s+/g, ' ').slice(0, 80)}`),
        );
        expect(bad).toEqual([]);
    });
});
