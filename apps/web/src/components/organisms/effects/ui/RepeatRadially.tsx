import { useState } from 'react';
import type * as fabric from 'fabric';
import { TransformInput } from '@/components/molecules/TransformInput';
import { SegmentedControl } from '@/components/molecules/SegmentedControl';
import LabeledToggle from '@/components/molecules/LabeledToggle';
import { Field } from '@/components/molecules/Field';
import { useStore } from '@/store';
import { LIMITS } from '@/lib/patternRules';
import { EffectSection } from './EffectSection';
import { useActiveObjects } from './useActiveObjects';

type Mode = 'ring' | 'spiral';

// label = what the user sees, value = what we store (they were swapped before,
// so the slice received "Ring"/"Spiral" and `mode === 'spiral'` never matched)
const modeList: { label: string; value: Mode }[] = [
    { label: 'Ring', value: 'ring' },
    { label: 'Spiral', value: 'spiral' },
];

// The anchor is the one in the top transform bar (store `transform.originX/Y`),
// so the panel has no anchor picker of its own (owner, 2026-11-28).
const FACTOR: Record<string, number> = { left: 0, top: 0, center: 0.5, right: 1, bottom: 1 };

/**
 * Pivot = anchor point of the object's bounding box, optionally pushed further
 * away from the object's centre by `distance`.
 * (For the centre anchor, "away" is straight down, so the object sits at 12 o'clock.)
 * Without this, a centre pivot puts the pivot on the object itself and every
 * copy lands on the same spot.
 */
const getPivot = (obj: fabric.Object, originX: string, originY: string, distance: number) => {
    obj.setCoords();
    const rect = obj.getBoundingRect();
    const fx = FACTOR[originX] ?? 0.5;
    const fy = FACTOR[originY] ?? 0.5;
    const anchorPt = { x: rect.left + rect.width * fx, y: rect.top + rect.height * fy };
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    let dirX = anchorPt.x - cx;
    let dirY = anchorPt.y - cy;
    const len = Math.hypot(dirX, dirY);
    if (len === 0) {
        dirX = 0;
        dirY = 1;
    } else {
        dirX /= len;
        dirY /= len;
    }
    return { x: anchorPt.x + dirX * distance, y: anchorPt.y + dirY * distance };
};

// raw strings are kept in state so "-", "0." and an empty box can be typed;
// they are parsed and clamped only when the effect is applied
const num = (raw: string, fallback: number, min: number, max: number) => {
    const n = parseFloat(raw);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

export const RepeatRadially = () => {
    const canvas = useStore((s: any) => s.canvas);
    const repeatRadially = useStore((s: any) => s.repeatRadially);
    const originX = useStore((s) => s.transform.originX);
    const originY = useStore((s) => s.transform.originY);

    const activeObjects = useActiveObjects(canvas);
    const multiple = activeObjects.length > 1;
    const target: fabric.Object | null =
        activeObjects.length === 1 ? (canvas?.getActiveObject() ?? null) : null;

    const [fields, setFields] = useState({
        count: '6',
        distance: '100',
        gap: '0',
        startAngle: '0',
        scalePct: '0',
        jitter: '0',
    });
    const [mode, setMode] = useState<Mode>('ring');
    const [clockwise, setClockwise] = useState(true);
    const [rotateAlongPath, setRotateAlongPath] = useState(false);
    const [opacityFade, setOpacityFade] = useState(false);

    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const field = (key: keyof typeof fields) => (v: number) =>
        setFields((p) => ({ ...p, [key]: String(v) }));

    const handleApply = async () => {
        if (!target || !repeatRadially) return;
        setBusy(true);
        setError(null);
        try {
            // pivot is computed now (not during render) so it always matches the current object position
            const pivot = getPivot(target, originX, originY, num(fields.distance, 0, 0, 5000));
            await repeatRadially(target, {
                count: Math.round(num(fields.count, 6, 2, LIMITS.maxClones + 1)),
                pivotX: pivot.x,
                pivotY: pivot.y,
                gap: num(fields.gap, 0, -1000, 1000),
                mode,
                startAngle: num(fields.startAngle, 0, -360, 360),
                clockwise,
                scaleStep: num(fields.scalePct, 0, -90, 500) / 100, // UI is in %, slice wants a fraction
                rotateAlongPath,
                opacityFade,
                jitter: num(fields.jitter, 0, 0, 500),
            });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not repeat the object.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <EffectSection title="Repeat Radially" disabled={!target || busy} onApply={handleApply}>
            {!target && (
                <p className="text-caption text-accent-700">
                    {multiple
                        ? 'Group the selected objects (Ctrl+G) to repeat them.'
                        : 'Select an object to repeat around a pivot.'}
                </p>
            )}

            <TransformInput
                label="Count (incl. original)"
                value={fields.count}
                onChange={field('count')}
            />
            <TransformInput
                label="Pivot distance"
                value={fields.distance}
                onChange={field('distance')}
            />
            {mode === 'spiral' && (
                <TransformInput
                    label="Gap per turn"
                    min={-1000}
                    value={fields.gap}
                    onChange={field('gap')}
                />
            )}
            <TransformInput
                label="Start angle"
                min={-360}
                max={360}
                value={fields.startAngle}
                onChange={field('startAngle')}
            />
            <TransformInput
                label="Scale step %"
                min={-100}
                value={fields.scalePct}
                onChange={field('scalePct')}
            />
            <TransformInput label="Jitter" value={fields.jitter} onChange={field('jitter')} />

            <Field label="Mode">
                <SegmentedControl<Mode>
                    aria-label="Mode"
                    size="sm"
                    options={modeList}
                    value={mode}
                    onChange={setMode}
                />
            </Field>
            <LabeledToggle label="Clockwise" checked={clockwise} onChange={setClockwise} />
            <LabeledToggle
                label="Rotate copies with the ring"
                checked={rotateAlongPath}
                onChange={setRotateAlongPath}
            />
            <LabeledToggle label="Fade opacity" checked={opacityFade} onChange={setOpacityFade} />

            {error && (
                <p role="alert" className="text-caption text-danger">
                    {error}
                </p>
            )}
        </EffectSection>
    );
};
