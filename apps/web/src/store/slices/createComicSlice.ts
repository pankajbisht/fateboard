/**
 * Comic tools (Clip Studio style, 2026-11-17): panel layouts, panel split, screentones and manga effect lines.
 *
 * Panels use the page layers (createPageLayersSlice): a folder "Comic panels" holds
 *   "Panel borders" (top: the frames, stroke only, editable),
 *   "Art" (clipped to the layer below: what you draw shows only inside panels), and
 *   "Panel area" (bottom, locked: a white twin of every frame, the clip base).
 * A frame and its area share a `panelId`; moving / resizing / deleting a frame updates its area (`bindComic`).
 * Geometry: lib/comic (panelLayouts, mangaEffects, screentone). Saved props: `comicPanel`, `comicPanelArea`,
 * `panelId`, `toneParams`, `fillBeforeTone` (CUSTOM_PROPS).
 */
import { Path, Pattern, Rect, type Canvas, type FabricObject } from 'fabric';
import { boxOf, fitObjectToPanel, zoomObject } from '../comicFit';
import { bindComicCanvas, framesOf, syncTwin } from '../comicBind';
import { clipToPanel, isInPanel, lockFrame, reclip } from '../comicClip';
import type { FitMode } from '@/lib/comic/fitToPanel';
import type { SliceCreator } from '../types';
import { isLayerHelper, makeLayer, normalizeLayers, type DocLayer } from '@/lib/canvas/docLayers';
import { contentRect, normalizePageSetup, type Rect as Box } from '@/lib/document/pageSetup';
import { PANEL_PRESETS, layoutPanels, splitRect } from '@/lib/comic/panelLayouts';
import { burstPath, focusLinesPath, speedLinesPath } from '@/lib/comic/mangaEffects';
import {
    DEFAULT_TONE,
    normalizeTone,
    tonePatternMatrix,
    toneTile,
    type ToneParams,
} from '@/lib/comic/screentone';

export type MangaEffect = 'focus' | 'speed' | 'burst';
export interface ComicStyle {
    /** Space between panels, page px. */
    gutter: number;
    /** Frame line width, px. */
    border: number;
    /** Frames can be selected (to fill or split) but not moved, scaled or turned; off to edit the layout. */
    panelsLocked: boolean;
}

export interface ComicSlice {
    comicStyle: ComicStyle;
    setComicStyle: (patch: Partial<ComicStyle>) => void;
    /** Keep each panel area in step with its frame, content cut to its panel, frames locked; returns the uninstaller. */
    bindComic: (canvas: Canvas) => () => void;
    /** Replace the page's panels with a preset layout (inside the margins). Returns the panel count. */
    addPanelLayout: (presetId: string) => number;
    /** Cut the selected panel in two: 'horizontal' = top / bottom, 'vertical' = left / right. */
    splitComicPanel: (dir: 'horizontal' | 'vertical') => boolean;
    /** Screentone fill on the selected objects. Returns how many got it. */
    applyTone: (params: Partial<ToneParams>) => number;
    removeTone: () => number;
    /** Effect lines in the selected panel, else in the page margins. */
    addMangaEffect: (kind: MangaEffect) => boolean;
    /** Put the selected scene or picture in a panel ('fill' covers it, 'fit' shows it whole); false if nothing fits. */
    fitToPanel: (mode: FitMode, panel?: FabricObject) => boolean;
    /** Zoom the selected scene or picture about its centre (it stays in its panel; the Art layer crops it). */
    zoomInPanel: (factor: number) => boolean;
}

export const COMIC_LAYERS = {
    folder: 'Comic panels',
    borders: 'Panel borders',
    art: 'Art',
    area: 'Panel area',
} as const;

type Obj = FabricObject & Record<string, unknown>;
type ComicCanvas = Canvas & { docLayers?: DocLayer[]; pageSetup?: unknown };
type Peers = ComicSlice & {
    showToast?: (o: { message: string; tone?: string }) => void;
    canvas?: ComicCanvas | null;
    pageWidth?: number;
    pageHeight?: number;
    saveState?: (immediate?: boolean) => void;
    setActiveLayer?: (id: string) => void;
    currentPageNumber?: () => number | null;
    _isRestoring?: boolean;
    isPageSwitching?: boolean;
};

const newPanelId = () => `P${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const EFFECT_NAMES: Record<MangaEffect, string> = {
    focus: 'Focus lines',
    speed: 'Speed lines',
    burst: 'Burst',
};

export const createComicSlice: SliceCreator<ComicSlice> = (set, get) => {
    const peers = () => get() as Peers;
    const content = (c: ComicCanvas) => (c.getObjects() as Obj[]).filter((o) => !isLayerHelper(o));

    /** The comic layers, made when missing. */
    const comicLayers = (c: ComicCanvas) => {
        const layers = normalizeLayers(c.docLayers);
        const folder = layers.find((l) => l.kind === 'folder' && l.name === COMIC_LAYERS.folder);
        const child = (name: string) =>
            folder && layers.find((l) => l.parentId === folder.id && l.name === name);
        const found = {
            borders: child(COMIC_LAYERS.borders),
            art: child(COMIC_LAYERS.art),
            area: child(COMIC_LAYERS.area),
        };
        if (found.borders && found.art && found.area)
            return { borders: found.borders.id, art: found.art.id, area: found.area.id };
        const f = makeLayer({ name: COMIC_LAYERS.folder, kind: 'folder' });
        const area = makeLayer({ name: COMIC_LAYERS.area, parentId: f.id, locked: true });
        const art = makeLayer({ name: COMIC_LAYERS.art, parentId: f.id, clip: true });
        const borders = makeLayer({ name: COMIC_LAYERS.borders, parentId: f.id });
        c.docLayers = [...layers, f, area, art, borders];
        return { borders: borders.id, art: art.id, area: area.id };
    };

    const pageArea = (c: ComicCanvas): Box => {
        const { pageWidth = c.getWidth(), pageHeight = c.getHeight() } = peers();
        const n = peers().currentPageNumber?.() ?? 1;
        return contentRect(normalizePageSetup(c.pageSetup), pageWidth, pageHeight, n);
    };

    /** A frame (stroke only) and its white area twin for one panel box. */
    const panelPair = (r: Box, ids: { borders: string; area: string }, panelId = newPanelId()) => {
        const geo = {
            left: r.left,
            top: r.top,
            width: r.width,
            height: r.height,
            originX: 'left' as const,
            originY: 'top' as const,
        };
        const area = new Rect({
            ...geo,
            fill: '#ffffff',
            strokeWidth: 0,
            selectable: false,
            evented: false,
        });
        Object.assign(area, {
            layerId: ids.area,
            comicPanelArea: true,
            panelId,
            name: 'Panel area',
        });
        const frame = new Rect({
            ...geo,
            fill: '',
            stroke: '#000000',
            strokeWidth: get().comicStyle.border,
            strokeUniform: true,
            strokeLineJoin: 'miter',
        });
        Object.assign(frame, { layerId: ids.borders, comicPanel: true, panelId, name: 'Panel' });
        return [area, frame];
    };

    const run = <T>(name: string, fallback: T, fn: (c: ComicCanvas) => T): T => {
        const c = peers().canvas;
        if (!c) return fallback;
        try {
            return fn(c);
        } catch (err) {
            console.error(`[comic] ${name} failed`, err);
            return fallback;
        }
    };

    return {
        comicStyle: { gutter: 14, border: 3, panelsLocked: true },

        setComicStyle: (patch) => {
            const clamp = (v: unknown, lo: number, hi: number, d: number) =>
                Number.isFinite(Number(v)) ? Math.min(hi, Math.max(lo, Number(v))) : d;
            const now = get().comicStyle;
            set(
                {
                    comicStyle: {
                        gutter: clamp(patch.gutter ?? now.gutter, 0, 400, now.gutter),
                        border: clamp(patch.border ?? now.border, 0, 60, now.border),
                        panelsLocked:
                            typeof patch.panelsLocked === 'boolean'
                                ? patch.panelsLocked
                                : now.panelsLocked,
                    },
                },
                false,
                'comic/style',
            );
            const locked = get().comicStyle.panelsLocked;
            const c = peers().canvas;
            if (c && locked !== now.panelsLocked) {
                for (const f of framesOf(c)) lockFrame(f, locked);
                if (locked) c.discardActiveObject();
                c.requestRenderAll();
            }
        },

        bindComic: (canvas) =>
            bindComicCanvas(canvas, {
                busy: () => !!(peers()._isRestoring || peers().isPageSwitching),
                locked: () => get().comicStyle.panelsLocked,
            }),

        addPanelLayout: (presetId) =>
            run('addPanelLayout', 0, (c) => {
                const preset = PANEL_PRESETS.find((p) => p.id === presetId);
                if (!preset) return 0;
                const ids = comicLayers(c);
                const old = content(c).filter((o) => o.comicPanel || o.comicPanelArea);
                c.discardActiveObject();
                if (old.length) c.remove(...old);
                const rects = layoutPanels(preset, pageArea(c), get().comicStyle.gutter);
                c.add(...rects.flatMap((r) => panelPair(r, ids)));
                peers().setActiveLayer?.(ids.art);
                c.requestRenderAll();
                peers().saveState?.();
                return rects.length;
            }),

        splitComicPanel: (dir) =>
            run('splitComicPanel', false, (c) => {
                const frame = c.getActiveObject() as Obj | undefined;
                if (!frame?.comicPanel) return false;
                const ids = comicLayers(c);
                const [a, b] = splitRect(boxOf(frame), dir, get().comicStyle.gutter);
                frame.set({
                    originX: 'left',
                    originY: 'top',
                    left: a.left,
                    top: a.top,
                    width: a.width,
                    height: a.height,
                    scaleX: 1,
                    scaleY: 1,
                    angle: 0,
                });
                frame.setCoords();
                syncTwin(c, frame);
                const pair = panelPair(b, ids);
                c.add(...pair);
                c.setActiveObject(pair[1]);
                c.requestRenderAll();
                peers().saveState?.();
                return true;
            }),

        fitToPanel: (mode, panel) =>
            run('fitToPanel', false, (c) => {
                const sel = c.getActiveObject() as Obj | undefined;
                if (!sel || sel.comicPanel || sel.comicPanelArea || isLayerHelper(sel))
                    return false;
                const panels = content(c).filter((o) => o.comicPanel);
                if (!panels.length) {
                    peers().showToast?.({ message: 'Add panels first: pick a layout in Comic.' });
                    return false;
                }
                const frame = fitObjectToPanel(sel, panels, mode, panel);
                if (!frame) return false;
                // cut to that panel only (the Art layer cuts to all of them together)
                clipToPanel(sel, frame);
                // on the Art layer, so the panel's edge cuts it
                sel.layerId = comicLayers(c).art;
                c.requestRenderAll();
                peers().saveState?.();
                return true;
            }),

        zoomInPanel: (factor) =>
            run('zoomInPanel', false, (c) => {
                const sel = c.getActiveObject() as Obj | undefined;
                if (!sel || sel.comicPanel || sel.comicPanelArea || isLayerHelper(sel))
                    return false;
                if (!Number.isFinite(factor) || factor <= 0) return false;
                zoomObject(sel, factor);
                if (isInPanel(sel)) reclip(sel, framesOf(c));
                c.requestRenderAll();
                peers().saveState?.();
                return true;
            }),

        applyTone: (params) =>
            run('applyTone', 0, (c) => {
                const p = normalizeTone({ ...DEFAULT_TONE, ...params });
                const tile = toneTile(c.getElement().ownerDocument ?? document, p);
                if (!tile) return 0;
                const targets = (c.getActiveObjects() as Obj[]).filter(
                    (o) => !isLayerHelper(o) && !o.comicPanel,
                );
                for (const o of targets) {
                    if (!o.toneParams && typeof o.fill === 'string') o.fillBeforeTone = o.fill;
                    o.set({
                        fill: new Pattern({
                            source: tile,
                            repeat: 'repeat',
                            patternTransform: tonePatternMatrix(p.angle),
                        }),
                    });
                    o.toneParams = p;
                }
                if (targets.length) {
                    c.requestRenderAll();
                    peers().saveState?.();
                }
                return targets.length;
            }),

        removeTone: () =>
            run('removeTone', 0, (c) => {
                const targets = (c.getActiveObjects() as Obj[]).filter((o) => o.toneParams);
                for (const o of targets) {
                    o.set({
                        fill: typeof o.fillBeforeTone === 'string' ? o.fillBeforeTone : '#ffffff',
                    });
                    delete o.toneParams;
                    delete o.fillBeforeTone;
                }
                if (targets.length) {
                    c.requestRenderAll();
                    peers().saveState?.();
                }
                return targets.length;
            }),

        addMangaEffect: (kind) =>
            run('addMangaEffect', false, (c) => {
                const sel = c.getActiveObject() as Obj | undefined;
                const inPanel = !!sel?.comicPanel;
                const box = inPanel && sel ? boxOf(sel) : pageArea(c);
                const { width, height } = box;
                if (width < 2 || height < 2) return false;
                const seed = Math.floor(Math.random() * 1e6);
                const d =
                    kind === 'focus'
                        ? focusLinesPath({
                              width,
                              height,
                              count: 120,
                              innerRadius: 0.5,
                              thickness: Math.max(3, Math.min(width, height) / 45),
                              jitter: 0.6,
                              seed,
                          })
                        : kind === 'speed'
                          ? speedLinesPath({
                                width,
                                height,
                                count: Math.max(12, Math.round(height / 8)),
                                thickness: 3,
                                minLength: 0.35,
                                seed,
                            })
                          : burstPath({
                                width,
                                height,
                                spikes: 18,
                                innerRadius: 0.7,
                                jitter: 0.5,
                                seed,
                            });
                const path = new Path(d, {
                    fill: kind === 'burst' ? '#ffffff' : '#000000',
                    stroke: kind === 'burst' ? '#000000' : undefined,
                    strokeWidth: kind === 'burst' ? 3 : 0,
                    originX: 'left',
                    originY: 'top',
                });
                // the path's own box starts where its lines do: put the drawing exactly on the target box
                const off = path.pathOffset;
                path.set({
                    left: box.left + off.x - (path.width ?? 0) / 2,
                    top: box.top + off.y - (path.height ?? 0) / 2,
                });
                const fx = path as unknown as Obj;
                fx.name = EFFECT_NAMES[kind];
                // into a panel: the clipped Art layer, so the lines stay inside the panels
                if (inPanel) fx.layerId = comicLayers(c).art;
                c.add(path);
                c.setActiveObject(path);
                c.requestRenderAll();
                return true;
            }),
    };
};
