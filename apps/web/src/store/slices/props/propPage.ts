import type { Canvas, FabricObject, Group } from 'fabric';
import { uiPrefsStorage } from '@/lib/storage';
import type { PropLight } from '@/props/types';

/**
 * Page-level helpers for the props slice (docs/PROPS.md phase 4): where the page is, the page's time of
 * day, the ground line, saved panel preferences. No store import (the slice passes what it needs).
 */
export interface Box {
    left: number;
    top: number;
    width: number;
    height: number;
}

export interface PageState {
    canvas?: Canvas | null;
    boardMode?: 'design' | 'whiteboard' | null;
    pageWidth?: number;
    pageHeight?: number;
}

/** The page in scene coordinates (design board), or the visible area on the whiteboard. */
export function pageBox({ canvas, boardMode, pageWidth, pageHeight }: PageState): Box {
    if (boardMode !== 'whiteboard' && pageWidth && pageHeight)
        return { left: 0, top: 0, width: pageWidth, height: pageHeight };
    const zoom = canvas?.getZoom?.() || 1;
    const c = canvas?.getVpCenter?.() ?? { x: 0, y: 0 };
    const width = (canvas?.getWidth?.() ?? 800) / zoom;
    const height = (canvas?.getHeight?.() ?? 600) / zoom;
    return { left: c.x - width / 2, top: c.y - height / 2, width, height };
}

type WithProp = FabricObject & { propData?: { light?: unknown } };

/** The page's time of day: what its props already use (the first one says), else day. */
export function pageLight(canvas: Canvas | null | undefined): PropLight {
    const lit = (canvas?.getObjects() as WithProp[] | undefined)?.find((o) => o.propData)?.propData
        ?.light;
    return lit === 'sunset' || lit === 'night' ? lit : 'day';
}

/** Every prop group on the page. */
export const propObjects = (canvas: Canvas): Group[] =>
    (canvas.getObjects() as WithProp[]).filter((o) => !!o.propData) as unknown as Group[];

/**
 * Snap a prop's base onto the ground line when it is within `reach` (scene px) of it. True when it moved.
 * Uses the bounding box, so a turned or flipped prop still lands on its lowest point.
 */
export function snapToGround(obj: FabricObject, groundY: number, reach: number): boolean {
    const r = obj.getBoundingRect();
    const gap = groundY - (r.top + r.height);
    if (Math.abs(gap) > reach || Math.abs(gap) < 0.01) return false;
    obj.set({ top: (obj.top ?? 0) + gap });
    obj.setCoords();
    return true;
}

/* ── Saved panel preferences (per browser) ───────────────────────────────────────────────────────── */

export const RECENT_MAX = 12;
const SECTION = 'props';
export const PROP_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export interface PropPrefs {
    favorites: string[];
    recent: string[];
    groundSnap: boolean;
    /** the ground line, as a fraction of the page height from the top (0.5 … 1) */
    groundLine: number;
}

/** Saved preferences, validated (ids only: the catalogue is not loaded here; the panel skips unknown ids). */
export function readPropPrefs(): PropPrefs {
    const raw = uiPrefsStorage.load(SECTION) as Record<string, unknown> | undefined;
    const ids = (v: unknown) =>
        Array.isArray(v)
            ? v.filter((x): x is string => typeof x === 'string' && PROP_ID.test(x))
            : [];
    const line =
        typeof raw?.groundLine === 'number' && Number.isFinite(raw.groundLine)
            ? raw.groundLine
            : 0.85;
    return {
        favorites: ids(raw?.favorites),
        recent: ids(raw?.recent).slice(0, RECENT_MAX),
        groundSnap: raw?.groundSnap === true,
        groundLine: clampLine(line),
    };
}

export const clampLine = (v: number) => Math.min(1, Math.max(0.5, Math.round(v * 100) / 100));

export function savePropPrefs(p: PropPrefs) {
    if (!uiPrefsStorage.save(SECTION, p)) console.error('[props] panel preferences not saved');
}
