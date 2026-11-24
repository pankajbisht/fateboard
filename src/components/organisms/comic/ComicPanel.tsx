import { useStore } from '@store';
import { Button } from '@/components/atoms/Button';
import { PanelSection } from '@/components/molecules/PanelSection';
import { SliderField } from '@/components/molecules/LabeledSlider';
import { PANEL_PRESETS, layoutPanels, type PanelPreset } from '@/lib/comic/panelLayouts';
import { SHAPES, shapeIconPath } from '@hooks/shape/shapeCatalog';
import { ComicToneEffects } from './ComicToneEffects';

const TILE =
    'flex w-[68px] cursor-pointer flex-col items-center gap-1 rounded-md border border-transparent p-1.5 text-[11px] leading-tight text-ink-muted transition-colors hover:border-line-strong hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/60';

/** Mini page with the preset's panels. */
function LayoutIcon({ preset }: { preset: PanelPreset }) {
    const rects = layoutPanels(preset, { left: 2, top: 2, width: 26, height: 36 }, 1.6);
    return (
        <svg viewBox="0 0 30 40" width={30} height={40} aria-hidden="true">
            <rect
                x={0.5}
                y={0.5}
                width={29}
                height={39}
                rx={1}
                className="fill-surface stroke-line-strong"
            />
            {rects.map((r, i) => (
                <rect
                    key={i}
                    x={r.left}
                    y={r.top}
                    width={r.width}
                    height={r.height}
                    className="fill-surface stroke-ink"
                    strokeWidth={1}
                />
            ))}
        </svg>
    );
}

const BALLOONS = SHAPES.filter((s) => s.category === 'balloons');

/**
 * Left rail "Comic" (2026-11-17, Clip Studio style): panel layouts (frames + a clipped Art layer), split,
 * manga balloons, screentones and effect lines. Stores: createComicSlice, Shape (balloons).
 */
export default function ComicPanel() {
    const style = useStore((s) => s.comicStyle);
    const hasSelection = useStore((s) => !!s.hasSelection);
    const setStyle = useStore((s) => s.setComicStyle);
    const addLayout = useStore((s) => s.addPanelLayout);
    const split = useStore((s) => s.splitComicPanel);
    const addShape = useStore((s) => s.addShape);
    const fitToPanel = useStore((s) => s.fitToPanel);
    const zoomInPanel = useStore((s) => s.zoomInPanel);

    return (
        <div className="flex flex-col gap-3 p-4">
            <PanelSection
                title="Panel layouts"
                description="Replaces this page's panels. Draw on the Art layer: it stays inside the panels."
            >
                <div className="flex flex-wrap gap-1">
                    {PANEL_PRESETS.map((p) => (
                        <button
                            key={p.id}
                            type="button"
                            aria-label={`Panel layout ${p.label}`}
                            title={p.label}
                            className={TILE}
                            onClick={() => addLayout(p.id)}
                        >
                            <LayoutIcon preset={p} />
                            <span className="w-full truncate text-center">{p.label}</span>
                        </button>
                    ))}
                </div>
                <SliderField
                    label="Gutter"
                    min={0}
                    max={80}
                    unit="px"
                    value={style.gutter}
                    onChange={(gutter) => setStyle({ gutter })}
                />
                <SliderField
                    label="Border"
                    min={0}
                    max={16}
                    unit="px"
                    value={style.border}
                    onChange={(border) => setStyle({ border })}
                />
                <div className="grid grid-cols-2 gap-2">
                    <Button
                        variant="secondary"
                        size="sm"
                        disabled={!hasSelection}
                        onClick={() => split('horizontal')}
                    >
                        Split top / bottom
                    </Button>
                    <Button
                        variant="secondary"
                        size="sm"
                        disabled={!hasSelection}
                        onClick={() => split('vertical')}
                    >
                        Split left / right
                    </Button>
                </div>
            </PanelSection>

            <PanelSection
                title="Scene in a panel"
                description="Select a scene or picture, then fit it to the panel it sits on. Fill covers the panel and the panel's edge crops it; zoom to frame the shot."
            >
                <div className="grid grid-cols-2 gap-2">
                    <Button
                        variant="secondary"
                        size="sm"
                        disabled={!hasSelection}
                        onClick={() => fitToPanel('fill')}
                    >
                        Fill panel
                    </Button>
                    <Button
                        variant="secondary"
                        size="sm"
                        disabled={!hasSelection}
                        onClick={() => fitToPanel('fit')}
                    >
                        Fit in panel
                    </Button>
                    <Button
                        variant="secondary"
                        size="sm"
                        disabled={!hasSelection}
                        onClick={() => zoomInPanel(1.1)}
                    >
                        Zoom in
                    </Button>
                    <Button
                        variant="secondary"
                        size="sm"
                        disabled={!hasSelection}
                        onClick={() => zoomInPanel(1 / 1.1)}
                    >
                        Zoom out
                    </Button>
                </div>
            </PanelSection>

            <PanelSection title="Balloons" description="Double-click a balloon to type in it.">
                <div className="flex flex-wrap gap-1">
                    {BALLOONS.map((b) => (
                        <button
                            key={b.type}
                            type="button"
                            aria-label={`Add ${b.label} balloon`}
                            title={b.label}
                            className={TILE}
                            onClick={() => addShape(b.type)}
                        >
                            <svg viewBox="-8 -8 116 116" width={28} height={28} aria-hidden="true">
                                <path
                                    d={shapeIconPath(b)}
                                    className="fill-surface stroke-ink"
                                    strokeWidth={1.6}
                                    vectorEffect="non-scaling-stroke"
                                />
                            </svg>
                            <span className="w-full truncate text-center">{b.label}</span>
                        </button>
                    ))}
                </div>
            </PanelSection>

            <ComicToneEffects />
        </div>
    );
}
