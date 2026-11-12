import LabeledToggle from '@/components/molecules/LabeledToggle';
import clsx from 'clsx';
import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@store';
import { useShapeFactory } from '@hooks/shape/useShapeFactory';
import {
    SHAPE_CATEGORIES,
    SHAPE_CATEGORY_INFO as CATEGORY_INFO,
    shapeIconPath,
    type ShapeCategory,
    type ShapeDef,
} from '@hooks/shape/shapeCatalog';
import type { ConnectorMode } from '@/lib/utils/shapeConnectors';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Badge } from '../atoms/Badge';
import { EmptyState } from '../molecules/EmptyState';
import { PanelSection } from '../molecules/PanelSection';
import { SegmentedControl } from '../molecules/SegmentedControl';
import { SelectField } from '../molecules/SelectField';
import { SliderField } from '../molecules/LabeledSlider';
import { PaintTargetSwatch } from '../molecules/PaintTargetSwatch';
import { PanelAction } from '@/components/molecules/PanelAction';
import { Textarea } from '@/components/atoms/Textarea';
import { Chip } from '@/components/atoms/Chip';

/* -------------------------------------------------------------------------- */
/* Static info                                                                */
/* -------------------------------------------------------------------------- */

const CONNECTOR_CARDS: {
    mode: ConnectorMode;
    title: string;
    desc: string;
    d: string;
}[] = [
    {
        mode: 'simple',
        title: 'Simple connector',
        desc: 'Straight line. Drag the blue middle dot to curve it.',
        d: 'M 6 34 L 34 6 M 24 6 H 34 V 16',
    },
    {
        mode: 'elbow',
        title: 'Elbow connector',
        desc: 'Right-angle routing between shape sides. Best for flow diagrams.',
        d: 'M 6 34 H 20 V 6 H 34 M 28 0 L 34 6 L 28 12',
    },
    {
        mode: 'smooth',
        title: 'Smooth connector',
        desc: 'S-shaped curve that leaves and enters shapes cleanly.',
        d: 'M 6 34 C 22 34 18 6 34 6 M 26 2 L 34 6 L 28 14',
    },
];

type Tab = 'shapes' | 'connectors' | 'new';

/* -------------------------------------------------------------------------- */
/* Small pieces                                                               */
/* -------------------------------------------------------------------------- */

/** Real preview of the shape (inline SVG: never blank, no Font Awesome Pro needed). */
function ShapeIcon({ def, size = 28 }: { def: ShapeDef; size?: number }) {
    return (
        <svg viewBox="-8 -8 116 116" width={size} height={size} aria-hidden="true">
            <path
                d={shapeIconPath(def)}
                // preview chrome follows the theme; a shape's own fill color is content
                fill={def.open ? 'none' : def.fill}
                className={clsx('stroke-ink', !def.open && !def.fill && 'fill-surface')}
                fillRule={def.evenodd ? 'evenodd' : 'nonzero'}
                strokeWidth={1.6}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
            />
            {def.text && (
                <path
                    d="M 32 44 H 68 M 40 58 H 60"
                    fill="none"
                    className="stroke-ink-subtle"
                    strokeWidth={1.4}
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                />
            )}
        </svg>
    );
}

function ShapeTile({
    shape,
    onAdd,
    onRemove,
}: {
    shape: ShapeDef;
    onAdd: (type: string) => void;
    onRemove?: (type: string) => void;
}) {
    return (
        <div className="group relative">
            <button
                type="button"
                title={shape.text ? `${shape.label} (double-click to type)` : shape.label}
                aria-label={shape.label}
                onClick={() => onAdd(shape.type)}
                className="flex w-[68px] cursor-pointer flex-col items-center gap-1 rounded-md border border-transparent p-1.5 transition-colors hover:border-line-strong hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/60"
            >
                <ShapeIcon def={shape} />
                <span className="w-full truncate text-center text-[11px] leading-tight text-ink-muted">
                    {shape.label}
                </span>
            </button>

            {shape.text && (
                <span className="pointer-events-none absolute right-1 top-1 rounded bg-primary-100 px-1 text-[9px] font-semibold leading-3 text-primary-ink">
                    Aa
                </span>
            )}

            {onRemove && (
                <button
                    type="button"
                    title="Delete this shape"
                    aria-label={`Delete ${shape.label}`}
                    onClick={() => onRemove(shape.type)}
                    className="absolute -left-1 -top-1 hidden h-4 w-4 cursor-pointer items-center justify-center rounded-full bg-danger text-[10px] leading-none text-white shadow-sm group-hover:flex"
                >
                    ×
                </button>
            )}
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Panel                                                                      */
/* -------------------------------------------------------------------------- */

export function ShapePanel({ closePanel }: { closePanel?: (type?: string) => void }) {
    const strokeWidth = useStore((s) => s.strokeWidth);
    const setStrokeWidth = useStore((s) => s.setStrokeWidth);

    const activeConnector = useStore((s: any) => s.activeConnector);
    const updateConnectorStyle = useStore((s: any) => s.updateConnectorStyle);
    const normalizePathData = useStore((s: any) => s.normalizePathData);

    const {
        shapesList,
        add,
        enableLineDrawing,
        addConnector,
        saveSelectionAsShape,
        saveCustomPath,
        removeCustomShape,
    } = useShapeFactory();

    const [tab, setTab] = useState<Tab>('shapes');
    const [category, setCategory] = useState<ShapeCategory | 'all'>('all');
    const [query, setQuery] = useState('');

    const [name, setName] = useState('');
    const [pathText, setPathText] = useState('');
    const [withText, setWithText] = useState(false);
    const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
    const [, setTick] = useState(0);

    // selecting a connector on the canvas shows its settings right away
    useEffect(() => {
        if (activeConnector) setTab('connectors');
    }, [activeConnector]);

    const borderWidth = Math.max(1, strokeWidth || 2);

    /* ------------------------------ shapes tab ------------------------------ */

    const groups = useMemo(() => {
        const q = query.trim().toLowerCase();

        return SHAPE_CATEGORIES.filter((c) => c.id !== 'all')
            .filter((c) => category === 'all' || c.id === category)
            .map((c) => ({
                id: c.id as ShapeCategory,
                shapes: shapesList.filter((s) => {
                    if (s.category !== c.id) return false;
                    if (!q) return true;
                    return `${s.label} ${s.type} ${s.keywords ?? ''}`.toLowerCase().includes(q);
                }),
            }))
            .filter((g) => g.shapes.length > 0 || (g.id === 'custom' && !q && category !== 'all'));
    }, [shapesList, category, query]);

    function handleAddShape(type: string) {
        if (type === 'line') {
            enableLineDrawing({ stroke: '#000000', strokeWidth: borderWidth });
        } else {
            // colours come from the slice defaults: white fill + black border
            add(type, { strokeWidth: borderWidth });
        }
        closePanel?.(type);
    }

    /* ----------------------------- connectors tab ---------------------------- */

    function patchConnector(patch: Record<string, unknown>) {
        updateConnectorStyle(patch);
        setTick((t) => t + 1);
    }

    const cdata = activeConnector?.connectorData;

    /* ------------------------------- new shape tab --------------------------- */

    const preview = useMemo(
        () => (pathText.trim() ? (normalizePathData?.(pathText) ?? null) : null),
        [pathText, normalizePathData],
    );

    const customList = useMemo(() => shapesList.filter((s) => s.custom), [shapesList]);

    function finishCreate(res: { ok: boolean; error?: string }) {
        if (res.ok) {
            setMessage({ ok: true, text: 'Saved. Find it in Shapes → My Shapes.' });
            setName('');
            setPathText('');
        } else {
            setMessage({ ok: false, text: res.error ?? 'Could not save the shape.' });
        }
    }

    /* --------------------------------- render -------------------------------- */

    const tabs: { id: Tab; label: string }[] = [
        { id: 'shapes', label: 'Shapes' },
        { id: 'connectors', label: 'Connectors' },
        { id: 'new', label: '+ New shape' },
    ];

    return (
        <>
            <SegmentedControl<Tab>
                aria-label="Shape panel section"
                value={tab}
                onChange={setTab}
                options={tabs.map((t) => ({ value: t.id, label: t.label }))}
            />

            {/* ============================ SHAPES ============================ */}
            {tab === 'shapes' && (
                <>
                    <Input
                        type="search"
                        aria-label="Search shapes"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={`Search ${shapesList.length} shapes…`}
                    />

                    <div className="flex flex-wrap gap-1">
                        {SHAPE_CATEGORIES.map((c) => (
                            <Chip
                                key={c.id}
                                active={category === c.id}
                                onClick={() => setCategory(c.id)}
                            >
                                {c.label}
                            </Chip>
                        ))}
                    </div>

                    <SliderField
                        label="Border"
                        min={1}
                        max={16}
                        unit="px"
                        value={borderWidth}
                        onChange={setStrokeWidth}
                    />

                    {groups.length === 0 && <EmptyState icon="shapes" title="No shapes found" />}

                    {groups.map((g) => (
                        <PanelSection
                            key={g.id}
                            title={CATEGORY_INFO[g.id].title}
                            description={CATEGORY_INFO[g.id].hint}
                            actions={<Badge>{g.shapes.length}</Badge>}
                        >
                            {g.shapes.length === 0 ? (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="border-dashed"
                                    icon="plus"
                                    onClick={() => setTab('new')}
                                >
                                    No saved shapes yet: create one
                                </Button>
                            ) : (
                                <div className="flex flex-wrap gap-1">
                                    {g.shapes.map((shape) => (
                                        <ShapeTile
                                            key={shape.type}
                                            shape={shape}
                                            onAdd={handleAddShape}
                                            onRemove={shape.custom ? removeCustomShape : undefined}
                                        />
                                    ))}
                                </div>
                            )}
                        </PanelSection>
                    ))}
                </>
            )}

            {/* ========================== CONNECTORS ========================== */}
            {tab === 'connectors' && (
                <>
                    <p className="text-caption text-ink-muted">
                        Select <b>two shapes</b> on the canvas and click a connector to join them.
                        With nothing selected a free connector is placed in the middle: drag its
                        white end dots onto a shape&apos;s side dots to attach it.
                    </p>

                    <div className="flex flex-col gap-2">
                        {CONNECTOR_CARDS.map((c) => (
                            <button
                                key={c.mode}
                                type="button"
                                onClick={() => addConnector(c.mode)}
                                className="flex cursor-pointer items-center gap-3 rounded-lg border border-line-strong bg-surface p-2 text-left transition-colors hover:border-primary-500 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/60"
                            >
                                <svg
                                    viewBox="-2 -2 40 40"
                                    width={34}
                                    height={34}
                                    className="shrink-0 text-ink"
                                    aria-hidden="true"
                                >
                                    <path
                                        d={c.d}
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth={2.4}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                                <span className="flex flex-col">
                                    <span className="text-xs font-semibold text-ink">
                                        {c.title}
                                    </span>
                                    <span className="text-caption text-ink-muted">{c.desc}</span>
                                </span>
                            </button>
                        ))}
                    </div>

                    {cdata ? (
                        <PanelSection title="Selected connector">
                            <SegmentedControl
                                aria-label="Connector style"
                                size="sm"
                                value={cdata.mode}
                                onChange={(m) => patchConnector({ mode: m as ConnectorMode })}
                                options={[
                                    { value: 'simple', label: 'Straight' },
                                    { value: 'elbow', label: 'Elbow' },
                                    { value: 'smooth', label: 'Smooth' },
                                ]}
                            />

                            <SelectField
                                inline
                                label="Arrows"
                                value={cdata.arrow}
                                onChange={(v) => patchConnector({ arrow: v })}
                                options={[
                                    { value: 'none', label: 'None' },
                                    { value: 'end', label: 'End' },
                                    { value: 'both', label: 'Both ends' },
                                ]}
                            />

                            <div className="flex items-center justify-between gap-2">
                                <PaintTargetSwatch
                                    id="connector-stroke"
                                    label="Connector color"
                                    value={String(activeConnector.stroke || '#111827')}
                                    showLabel
                                    onChange={(hex) => patchConnector({ stroke: hex })}
                                />
                            </div>
                            <LabeledToggle
                                label="Dashed"
                                checked={!!activeConnector.strokeDashArray?.length}
                                onChange={(v) => patchConnector({ dashed: v })}
                            />

                            <SliderField
                                label="Width"
                                min={1}
                                max={12}
                                unit="px"
                                value={activeConnector.strokeWidth || 2}
                                onChange={(v) => patchConnector({ strokeWidth: v })}
                            />
                        </PanelSection>
                    ) : (
                        <EmptyState
                            icon="share-nodes"
                            title="No connector selected"
                            description="Click a connector on the canvas to edit its style here."
                        />
                    )}
                </>
            )}

            {/* ============================= NEW SHAPE ============================= */}
            {tab === 'new' && (
                <>
                    <p className="text-caption text-ink-muted">
                        Turn something you drew into a reusable shape. It is saved in your browser
                        and appears under <b>Shapes → My Shapes</b>.
                    </p>

                    <Input
                        label="Shape name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="My shape"
                    />

                    <LabeledToggle
                        label="Allow text inside this shape"
                        checked={withText}
                        onChange={setWithText}
                    />

                    <PanelSection
                        title="From the canvas"
                        description="Select one path, polygon, rectangle, circle or triangle first."
                    >
                        <PanelAction
                            icon="floppy-disk"
                            onClick={() =>
                                finishCreate(saveSelectionAsShape(name, { text: withText }))
                            }
                        >
                            Save selected object as shape
                        </PanelAction>
                    </PanelSection>

                    <PanelSection title="From an SVG path">
                        <Textarea
                            mono
                            aria-label="SVG path data"
                            value={pathText}
                            onChange={(e) => setPathText(e.target.value)}
                            rows={3}
                            placeholder="M 50 0 L 100 100 L 0 100 Z"
                        />

                        {preview && (
                            <div className="flex items-center gap-2">
                                <svg
                                    viewBox="-8 -8 116 116"
                                    width={40}
                                    height={40}
                                    aria-hidden="true"
                                >
                                    <path
                                        d={preview.d}
                                        fill={preview.open ? 'none' : undefined}
                                        className={clsx(
                                            'stroke-ink',
                                            !preview.open && 'fill-surface',
                                        )}
                                        strokeWidth={1.6}
                                        strokeLinejoin="round"
                                        vectorEffect="non-scaling-stroke"
                                    />
                                </svg>
                                <span className="text-caption text-ink-muted">Preview</span>
                            </div>
                        )}

                        <PanelAction
                            icon="floppy-disk"
                            disabled={!preview}
                            onClick={() =>
                                finishCreate(saveCustomPath(name, pathText, { text: withText }))
                            }
                        >
                            Save path as shape
                        </PanelAction>
                    </PanelSection>

                    {message && (
                        <p
                            role="status"
                            className={`text-caption ${message.ok ? 'text-success' : 'text-danger'}`}
                        >
                            {message.text}
                        </p>
                    )}

                    {customList.length > 0 && (
                        <PanelSection
                            title="Your saved shapes"
                            actions={<Badge>{customList.length}</Badge>}
                        >
                            <div className="flex flex-wrap gap-1">
                                {customList.map((shape) => (
                                    <ShapeTile
                                        key={shape.type}
                                        shape={shape}
                                        onAdd={(t) => {
                                            setTab('shapes');
                                            handleAddShape(t);
                                        }}
                                        onRemove={removeCustomShape}
                                    />
                                ))}
                            </div>
                        </PanelSection>
                    )}
                </>
            )}
        </>
    );
}
