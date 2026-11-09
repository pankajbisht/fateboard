import LabeledToggle from '@/components/molecules/LabeledToggle';
import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/store';
import { EffectSection } from './EffectSection';
import { EffectGrid } from './EffectGrid';
import { RuleEditor } from './RuleEditor';
import { PaintTargetSwatch } from '@/components/molecules/PaintTargetSwatch';
import { useActiveObjects } from './useActiveObjects';
import { TransformInput } from '@/components/molecules/TransformInput';
import { SelectField } from '@/components/molecules/SelectField';
import { Button } from '@/components/atoms/Button';
import { IconButton } from '@/components/atoms/IconButton';
import { Icon } from '@/components/atoms/Icon';
import { Input } from '@/components/atoms/Input';
import {
    DEFAULT_RULE,
    LIMITS,
    type ApplyPatternOptions,
    type ColorRule,
    type CreatePatternOptions,
    type PatternTile,
    type PresetShape,
    type SavedPattern,
} from '@/lib/patternRules';

/* --------------------------------- helpers --------------------------------- */
const clampNum = (raw: string | number, min: number, max: number) => {
    const n = parseInt(String(raw), 10);
    return Number.isNaN(n) ? min : Math.min(max, Math.max(min, n));
};

const useAction = () => {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const run = async (fn: () => Promise<unknown> | unknown) => {
        setBusy(true);
        setError(null);
        try {
            await fn();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Something went wrong.');
        } finally {
            setBusy(false);
        }
    };
    return { busy, error, run };
};

const SOURCES: { value: 'selection' | PresetShape; label: string }[] = [
    { value: 'selection', label: 'Selected object' },
    { value: 'circle', label: 'Dot' },
    { value: 'square', label: 'Square' },
    { value: 'triangle', label: 'Triangle' },
    { value: 'diamond', label: 'Diamond' },
    { value: 'stripe', label: 'Stripe' },
    { value: 'plus', label: 'Plus' },
];

const ErrorText = ({ message }: { message: string | null }) =>
    message ? (
        <p role="alert" className="text-xs text-danger">
            {message}
        </p>
    ) : null;

/* ---------------------------------- panel ---------------------------------- */
export const PathEffects = () => {
    const canvas = useStore((s: any) => s.canvas);
    const repeatGrid = useStore((s: any) => s.repeatGrid);
    const createPattern = useStore((s: any) => s.createPattern);
    const previewPatternTile = useStore((s: any) => s.previewPatternTile);
    const applyPattern = useStore((s: any) => s.applyPattern);
    const clearPattern = useStore((s: any) => s.clearPattern);
    const deletePattern = useStore((s: any) => s.deletePattern);
    const patterns = useStore((s: any) => s.patterns) as SavedPattern[];

    const activeObjects = useActiveObjects(canvas);
    const multiple = activeObjects.length > 1;
    // one selected object (or one group) is the unit we can repeat / use as pattern source
    const single = activeObjects.length === 1 ? (canvas?.getActiveObject() ?? null) : null;

    /* ------------------------------ repeat grid ------------------------------ */
    const [grid, setGrid] = useState({ rows: 2, cols: 2, gapX: 10, gapY: 10 });
    const [gridRule, setGridRule] = useState<ColorRule>(DEFAULT_RULE);
    const [gridStagger, setGridStagger] = useState(false);
    const [colorOriginal, setColorOriginal] = useState(true);
    const gridAction = useAction();

    const patchGrid = (field: keyof typeof grid, raw: string | number) => {
        const isGap = field === 'gapX' || field === 'gapY';
        setGrid((prev) => ({
            ...prev,
            [field]: isGap ? clampNum(raw, 0, 500) : clampNum(raw, 1, LIMITS.maxGridSide),
        }));
    };

    /* ----------------------------- create pattern ---------------------------- */
    const [pat, setPat] = useState({
        name: '',
        source: 'selection' as 'selection' | PresetShape,
        size: 24,
        color: '#3b82f6',
        rows: 2,
        cols: 2,
        gapX: 8,
        gapY: 8,
        stagger: false,
        seamless: true,
        useBackground: false,
        background: '#ffffff',
    });
    const [patRule, setPatRule] = useState<ColorRule>({ ...DEFAULT_RULE, type: 'checkerboard' });
    const [preview, setPreview] = useState<PatternTile | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const createAction = useAction();

    const createOptions = useMemo<CreatePatternOptions | null>(() => {
        const source: CreatePatternOptions['source'] | null =
            pat.source === 'selection'
                ? single
                    ? { kind: 'object', object: single }
                    : null
                : { kind: 'preset', shape: pat.source, size: pat.size, color: pat.color };
        if (!source) return null;
        return {
            name: pat.name,
            source,
            rows: pat.rows,
            cols: pat.cols,
            gapX: pat.gapX,
            gapY: pat.gapY,
            rule: patRule,
            stagger: pat.stagger,
            seamless: pat.seamless,
            background: pat.useBackground ? pat.background : undefined,
        };
    }, [pat, patRule, single]);

    // live preview of the repeat tile (debounced)
    useEffect(() => {
        if (!createOptions || !previewPatternTile) {
            setPreview(null);
            return;
        }
        let cancelled = false;
        const timer = setTimeout(async () => {
            try {
                const tile = await previewPatternTile(createOptions);
                if (!cancelled) setPreview(tile);
            } catch {
                if (!cancelled) setPreview(null);
            }
        }, 250);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [createOptions, previewPatternTile]);

    /* ----------------------------- apply pattern ----------------------------- */
    const [apply, setApply] = useState({
        target: 'selection' as 'selection' | 'canvas',
        paint: 'fill' as 'fill' | 'stroke',
        scalePct: 100,
        angle: 0,
        offsetX: 0,
        offsetY: 0,
    });
    const applyAction = useAction();

    const activeId = patterns.some((p) => p.id === selectedId)
        ? selectedId
        : (patterns[0]?.id ?? null);

    const applyOptions: ApplyPatternOptions = {
        target: apply.target,
        paint: apply.paint,
        scale: apply.scalePct / 100,
        angle: apply.angle,
        offsetX: apply.offsetX,
        offsetY: apply.offsetY,
    };

    /* --------------------------------- render -------------------------------- */
    return (
        <>
            {/* ---------------------------- Repeat Grid ---------------------------- */}
            <EffectSection
                title="Repeat Grid"
                disabled={!single || gridAction.busy}
                onApply={() =>
                    gridAction.run(() =>
                        repeatGrid(single, grid.rows, grid.cols, grid.gapX, grid.gapY, {
                            rule: gridRule,
                            stagger: gridStagger,
                            colorOriginal,
                        }),
                    )
                }
            >
                {multiple && (
                    <p className="text-xs text-accent-700">
                        Group the selected objects (Ctrl+G) to repeat them.
                    </p>
                )}

                <EffectGrid>
                    <TransformInput
                        label="Rows"
                        value={grid.rows}
                        onChange={(v) => patchGrid('rows', v)}
                    />
                    <TransformInput
                        label="Gap X"
                        value={grid.gapX}
                        onChange={(v) => patchGrid('gapX', v)}
                    />
                    <TransformInput
                        label="Columns"
                        value={grid.cols}
                        onChange={(v) => patchGrid('cols', v)}
                    />
                    <TransformInput
                        label="Gap Y"
                        value={grid.gapY}
                        onChange={(v) => patchGrid('gapY', v)}
                    />
                </EffectGrid>

                <LabeledToggle
                    label="Brick offset (shift every 2nd row)"
                    checked={gridStagger}
                    onChange={(v) => setGridStagger(v)}
                />

                <RuleEditor
                    idPrefix="grid-rule"
                    value={gridRule}
                    onChange={setGridRule}
                    disabled={gridAction.busy}
                />

                {gridRule.type !== 'none' && (
                    <LabeledToggle
                        label="Recolour the original too"
                        checked={colorOriginal}
                        onChange={(v) => setColorOriginal(v)}
                    />
                )}

                <ErrorText message={gridAction.error} />
            </EffectSection>

            {/* --------------------------- Create Pattern -------------------------- */}
            <EffectSection
                title="Create Pattern"
                disabled={!createOptions || createAction.busy}
                onApply={() =>
                    createAction.run(async () => {
                        if (!createOptions) return;
                        const saved: SavedPattern = await createPattern(createOptions);
                        setSelectedId(saved.id);
                        setPat((p) => ({ ...p, name: '' }));
                    })
                }
            >
                <SelectField
                    label="Build from"
                    options={SOURCES}
                    value={pat.source}
                    onChange={(v) => setPat((p) => ({ ...p, source: v }))}
                />

                {pat.source === 'selection' && !single && (
                    <p className="text-xs text-accent-700">
                        {multiple
                            ? 'Group the selection (Ctrl+G) first.'
                            : 'Select one object or pick a preset shape.'}
                    </p>
                )}

                {pat.source !== 'selection' && (
                    <div className="flex items-end gap-2">
                        <div className="flex-1">
                            <TransformInput
                                label="Size"
                                value={pat.size}
                                onChange={(v) =>
                                    setPat((p) => ({ ...p, size: clampNum(v, 2, 400) }))
                                }
                            />
                        </div>
                        <PaintTargetSwatch
                            id="pattern-shape-color"
                            label="Shape colour"
                            value={pat.color}
                            onChange={(hex) => setPat((p) => ({ ...p, color: hex }))}
                        />
                    </div>
                )}

                <EffectGrid>
                    <TransformInput
                        label="Rows"
                        value={pat.rows}
                        onChange={(v) =>
                            setPat((p) => ({ ...p, rows: clampNum(v, 1, LIMITS.maxTileSide) }))
                        }
                    />
                    <TransformInput
                        label="Gap X"
                        value={pat.gapX}
                        onChange={(v) => setPat((p) => ({ ...p, gapX: clampNum(v, 0, 500) }))}
                    />
                    <TransformInput
                        label="Columns"
                        value={pat.cols}
                        onChange={(v) =>
                            setPat((p) => ({ ...p, cols: clampNum(v, 1, LIMITS.maxTileSide) }))
                        }
                    />
                    <TransformInput
                        label="Gap Y"
                        value={pat.gapY}
                        onChange={(v) => setPat((p) => ({ ...p, gapY: clampNum(v, 0, 500) }))}
                    />
                </EffectGrid>

                <LabeledToggle
                    label="Brick offset"
                    checked={pat.stagger}
                    onChange={(v) => setPat((p) => ({ ...p, stagger: v }))}
                />

                <LabeledToggle
                    label="Keep the colour rule seamless"
                    checked={pat.seamless}
                    onChange={(v) => setPat((p) => ({ ...p, seamless: v }))}
                />

                <div className="flex items-center gap-2">
                    <LabeledToggle
                        label="Tile background"
                        checked={pat.useBackground}
                        onChange={(v) => setPat((p) => ({ ...p, useBackground: v }))}
                    />
                    {pat.useBackground && (
                        <PaintTargetSwatch
                            id="pattern-tile-background"
                            label="Tile background"
                            value={pat.background}
                            onChange={(hex) => setPat((p) => ({ ...p, background: hex }))}
                        />
                    )}
                </div>

                <RuleEditor
                    idPrefix="pattern-rule"
                    value={patRule}
                    onChange={setPatRule}
                    disabled={createAction.busy}
                />

                <Input
                    aria-label="Pattern name"
                    placeholder="Pattern name (optional)"
                    value={pat.name}
                    maxLength={40}
                    onChange={(e) => setPat((p) => ({ ...p, name: e.target.value }))}
                />

                {preview && (
                    <div className="flex flex-col gap-1">
                        <div
                            className="h-24 w-full rounded-md border border-line"
                            style={{
                                backgroundImage: `url(${preview.dataUrl})`,
                                backgroundSize: `${preview.width}px ${preview.height}px`,
                                backgroundColor: '#525252',
                            }}
                            aria-label="Pattern preview"
                        />
                        {preview.adjusted && (
                            <p className="text-[11px] text-ink-muted">
                                Grid adjusted to {preview.cols}×{preview.rows} so the pattern
                                repeats seamlessly.
                            </p>
                        )}
                    </div>
                )}

                <ErrorText message={createAction.error} />
            </EffectSection>

            {/* ---------------------------- Apply Pattern -------------------------- */}
            <EffectSection
                title="Apply Pattern"
                disabled={
                    !activeId ||
                    applyAction.busy ||
                    (apply.target === 'selection' && activeObjects.length === 0)
                }
                onApply={() => applyAction.run(() => applyPattern(activeId, applyOptions))}
            >
                {patterns.length === 0 ? (
                    <p className="text-xs text-ink-muted">No patterns yet. Create one above.</p>
                ) : (
                    <div className="grid grid-cols-3 gap-2">
                        {patterns.map((p) => (
                            <div key={p.id} className="relative">
                                <button
                                    type="button"
                                    title={p.name}
                                    onClick={() => setSelectedId(p.id)}
                                    aria-pressed={p.id === activeId}
                                    className={`h-16 w-full rounded-md border-2 bg-surface-strong ${
                                        p.id === activeId ? 'border-primary-500' : 'border-line'
                                    }`}
                                    style={{
                                        backgroundImage: `url(${p.dataUrl})`,
                                        backgroundSize: `${Math.min(p.width, 48)}px auto`,
                                    }}
                                />
                                <IconButton
                                    size="sm"
                                    tone="danger"
                                    icon={<Icon name="xmark" />}
                                    aria-label={`Delete ${p.name}`}
                                    title={`Delete ${p.name}`}
                                    onClick={() => deletePattern(p.id)}
                                    className="absolute right-1 top-1 bg-surface/90 shadow-sm"
                                />
                                <span className="block truncate text-[10px] text-ink-subtle">
                                    {p.name}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                <SelectField<typeof apply.target>
                    label="Apply to"
                    value={apply.target}
                    onChange={(v) => setApply((a) => ({ ...a, target: v }))}
                    options={[
                        { value: 'selection', label: 'Selected shape(s)' },
                        { value: 'canvas', label: 'Whole canvas (background)' },
                    ]}
                />

                {apply.target === 'selection' && (
                    <SelectField<typeof apply.paint>
                        label="Paint"
                        value={apply.paint}
                        onChange={(v) => setApply((a) => ({ ...a, paint: v }))}
                        options={[
                            { value: 'fill', label: 'Fill' },
                            { value: 'stroke', label: 'Stroke' },
                        ]}
                    />
                )}

                <EffectGrid>
                    <TransformInput
                        label="Scale %"
                        value={apply.scalePct}
                        onChange={(v) =>
                            setApply((a) => ({ ...a, scalePct: clampNum(v, 5, 2000) }))
                        }
                    />
                    <TransformInput
                        label="Angle"
                        min={-360}
                        max={360}
                        value={apply.angle}
                        onChange={(v) => setApply((a) => ({ ...a, angle: clampNum(v, 0, 360) }))}
                    />
                    <TransformInput
                        label="Offset X"
                        min={-5000}
                        value={apply.offsetX}
                        onChange={(v) => setApply((a) => ({ ...a, offsetX: clampNum(v, 0, 2000) }))}
                    />
                    <TransformInput
                        label="Offset Y"
                        min={-5000}
                        value={apply.offsetY}
                        onChange={(v) => setApply((a) => ({ ...a, offsetY: clampNum(v, 0, 2000) }))}
                    />
                </EffectGrid>

                <Button
                    variant="danger-outline"
                    size="sm"
                    icon="eraser"
                    className="self-start"
                    disabled={applyAction.busy}
                    onClick={() =>
                        applyAction.run(() =>
                            clearPattern({ target: apply.target, paint: apply.paint }),
                        )
                    }
                >
                    Remove pattern from {apply.target === 'canvas' ? 'canvas' : 'selection'}
                </Button>

                <ErrorText message={applyAction.error} />
            </EffectSection>
        </>
    );
};
