/**
 * File size budget (docs/CODE_REVIEW.md, R-02). Large files mix responsibilities ("god" components and slices),
 * are hard to review and to test. New files stay under the budget; the files over it today are listed with
 * their size as a ceiling: they may shrink, never grow. When a refactor brings one under the budget, delete
 * its line. Raising a ceiling is a visible, reviewed change in the same pull request (like `--max-warnings`).
 *
 * Budget: components (.tsx) 300 lines, other modules (.ts) 400. Data tables (templates, help text, the shape
 * and icon catalogs) are exempt: their length is content, not logic.
 */
import { describe, expect, it } from 'vitest';

const SRC = import.meta.glob<string>(
    [
        '/src/**/*.{ts,tsx}',
        '!/src/**/*.test.{ts,tsx}',
        '!/src/**/__tests__/**',
        '!/src/test/**',
        '!/src/**/*.d.ts',
    ],
    { query: '?raw', import: 'default', eager: true },
);

const BUDGET = { tsx: 300, ts: 400 };

const DATA_FILES = new Set([
    '/src/components/organisms/effects/designTemplateData.ts',
    '/src/components/organisms/helpsection/helpTopics.ts',
    '/src/components/organisms/helpsection/helpExamples.ts',
    '/src/components/pages/web/gallery/galleryTutorials.ts',
    '/src/hooks/shape/shapeCatalog.ts',
    '/src/components/organisms/fonts/fontTemplates.config.ts',
    '/src/components/atoms/Icon.tsx',
    '/src/store/brushLibrary.ts', // the brush library: ~60 brush definitions
]);

/** Over budget on 2026-11-11: current size = ceiling. Split them (skill `fate-refactor`), never grow them. */
const LEGACY_CEILINGS: Record<string, number> = {
    '/src/store/slices/createNodeEditorSlice.ts': 1710, // -8: screenScale moved to lib/canvas
    '/src/lib/utils/GradientTool.ts': 1319,
    '/src/store/slices/createCanvasSlice.ts': 1223, // was 1257: CanvasTool type → store/canvasTools.ts, size setting → store/pagePreset.ts (2026-11-17); 1224 → 1223: empty select case folded (notes, 2026-11-17)
    '/src/components/organisms/effects/ui/ExportCanvas.tsx': 1150, // was 1183: export bounds moved to lib/export/exportBounds.ts (2026-11-17)
    '/src/store/slices/createLayersSlice.ts': 1024,
    '/src/store/slices/templateSlice.ts': 933,
    '/src/store/slices/createAnimationSlice.ts': 861,
    '/src/lib/utils/shapeConnectors.ts': 851,
    '/src/components/organisms/effects/ui/TemplateGallery.tsx': 818,
    '/src/components/organisms/layer/LayersPanel.tsx': 791, // -23: key labels moved to layer/layerKeys.ts (2026-11-13)
    '/src/store/slices/createNotebookSlice.ts': 756,
    '/src/store/slices/createBrushSlice.ts': 458, // was 502: symmetry copies moved to store/brushes/symmetryCopies.ts, preset key table replaced by isBrushId (2026-11-16)
    '/src/store/slices/advanceOperationSlice.ts': 726,
    '/src/animation/engine.ts': 725,
    '/src/store/slices/createShapeSlice.ts': 699,
    '/src/components/organisms/board/ui/CanvasBoard.tsx': 625, // was 645: fit maths moved to lib/canvas/pageFit.ts (2026-11-17); 634 → 625: float anchor maths → deepZoom sceneToClient (notes)
    '/src/components/pages/web/WhiteboardMarketingSite.tsx': 558, // -2: gallery nav map (2026-11-12)
    '/src/components/organisms/effects/ui/RepeatAlongPath.tsx': 572,
    '/src/components/organisms/DrawPanel.tsx': 526, // was 549: symmetry moved to SymmetryControls (2026-11-16)
    '/src/store/slices/createPagesSlice.ts': 549,
    '/src/components/organisms/ShapePanel.tsx': 534,
    '/src/components/organisms/FillShadowPanel.tsx': 437, // was 458: opacity moved to LayerEffectsSection (2026-11-16)
    '/src/components/organisms/effects/ui/PathEffects.tsx': 512,
    '/src/store/slices/createShapeStyleSlice.ts': 466,
    '/src/components/organisms/ColorPicker.tsx': 465,
    '/src/components/organisms/filter/ui/filterEngine.ts': 465,
    '/src/components/pages/web/MiniWhiteboard.tsx': 415,
    '/src/components/organisms/TextPanel.tsx': 394,
    '/src/components/organisms/filter/ui/Filters.tsx': 389,
    '/src/components/organisms/fonts/FontTemplatePanel.tsx': 387,
    '/src/components/organisms/settings/ui/Preferences.tsx': 378,
    '/src/components/atoms/Select.tsx': 326,
    '/src/components/atoms/NumberField.tsx': 307,
};

const sizes = Object.entries(SRC)
    .filter(([file]) => !DATA_FILES.has(file))
    .map(([file, text]) => ({
        file,
        lines: text.split('\n').length,
        budget: file.endsWith('.tsx') ? BUDGET.tsx : BUDGET.ts,
    }));

describe('file size budget', () => {
    it('no new file is over budget', () => {
        const over = sizes
            .filter((s) => s.lines > s.budget && !(s.file in LEGACY_CEILINGS))
            .map((s) => `${s.file}: ${s.lines} lines (budget ${s.budget})`);
        expect(over).toEqual([]);
    });

    it('files over budget do not grow', () => {
        const grown = sizes
            .filter((s) => s.file in LEGACY_CEILINGS && s.lines > LEGACY_CEILINGS[s.file])
            .map((s) => `${s.file}: ${s.lines} lines (ceiling ${LEGACY_CEILINGS[s.file]})`);
        expect(grown).toEqual([]);
    });

    it('the legacy list only holds files that are still over budget', () => {
        const stale = Object.keys(LEGACY_CEILINGS).filter((file) => {
            const s = sizes.find((x) => x.file === file);
            return !s || s.lines <= s.budget;
        });
        expect(stale, 'delete these lines from LEGACY_CEILINGS').toEqual([]);
    });
});
