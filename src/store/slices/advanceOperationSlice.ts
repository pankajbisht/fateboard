import * as fabric from 'fabric';
import { nanoid } from 'nanoid';
import {
    LIMITS,
    DEFAULT_RULE,
    clampInt,
    resolveRuleColor,
    seamlessGrid,
    paintObject,
    buildPresetShape,
    type ApplyPatternOptions,
    type ClearPatternOptions,
    type CreatePatternOptions,
    type GridOptions,
    type PatternSource,
    type PatternTile,
    type SavedPattern,
} from '@/lib/patternRules';
import {
    DEFAULT_ALONG_PATH,
    sampleAlongPath,
    toGuidePath,
    type AlongPathOptions,
} from '@/lib/pathRepeat';

export type RadialOptions = {
    count: number;
    pivotX: number;
    pivotY: number;
    gap?: number;
    mode?: 'ring' | 'spiral';
    /** degrees, clockwise-positive on screen. Rotates the whole ring around the pivot, original included. */
    startAngle?: number;
    clockwise?: boolean;
    scaleStep?: number;
    rotateAlongPath?: boolean; // true: clones rotate with their position around the pivot
    opacityFade?: boolean;
    jitter?: number;
};

export type RepeatAlongPathOptions = Partial<AlongPathOptions> & {
    /** wrap the result in one group (original included) */
    group?: boolean;
    /** true: the original becomes copy #1, so you get exactly N objects. false: original stays, N clones are added */
    useOriginal?: boolean;
    /** remove the guide shape from the canvas after applying */
    deleteGuide?: boolean;
};

const CLONE_PROPS = ['name', 'data', 'id']; // custom props that must survive clone()
const STORAGE_KEY = 'canvas.patterns.v1';

/* ---------------------------- pattern persistence --------------------------- */
const isSavedPattern = (p: any): p is SavedPattern =>
    !!p &&
    typeof p.id === 'string' &&
    typeof p.dataUrl === 'string' &&
    p.dataUrl.startsWith('data:image/') &&
    typeof p.width === 'number' &&
    typeof p.height === 'number' &&
    typeof p.multiplier === 'number';

const loadPatterns = (): SavedPattern[] => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.filter(isSavedPattern) : [];
    } catch {
        return [];
    }
};

const persistPatterns = (list: SavedPattern[]) => {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
        // quota exceeded / private mode: library still works for this session
        console.warn('[patterns] could not persist pattern library', e);
    }
};

/* ---------------------------------- slice ---------------------------------- */
export const advanceOperationSlice = (
    set: (partial: any) => void,
    get: () => any,
    _store?: unknown,
) => {
    const imageCache = new Map<string, Promise<HTMLImageElement>>();

    /** one history snapshot per user action (remove if your canvas events already snapshot) */
    const commit = () => {
        try {
            get().saveState?.();
        } catch (e) {
            console.warn('[advanceOperationSlice] saveState failed', e);
        }
    };

    // Add many objects to canvas + state in one go, render once
    const registerObjects = (objs: fabric.Object[]) => {
        const canvas = get().canvas;
        if (!canvas || !objs.length) return;
        const known = new Set<fabric.Object>(get().objects);
        const fresh = objs.filter((o) => !known.has(o));
        if (!fresh.length) return;
        fresh.forEach((o) => o.setCoords());
        canvas.add(...fresh);
        set({ objects: [...get().objects, ...fresh] });
        canvas.requestRenderAll();
    };

    const cloneObject = async (obj: fabric.Object) => {
        const cloned = await obj.clone(CLONE_PROPS);
        Object.assign(cloned, { id: nanoid() });
        return cloned;
    };

    /** Axis-aligned size including stroke and rotation (getScaledWidth ignored both). */
    const boundsOf = (obj: fabric.Object) => {
        obj.setCoords();
        const r = obj.getBoundingRect();
        return { w: Math.max(1, r.width), h: Math.max(1, r.height) };
    };

    const assertSingle = (obj: fabric.Object) => {
        if (obj instanceof fabric.ActiveSelection) {
            throw new Error('Group the selected objects first (Ctrl+G), then repeat the group.');
        }
    };

    /* ------------------------------ pattern tiles ----------------------------- */
    const resolveSource = async (source: PatternSource) => {
        if (source.kind === 'object') {
            assertSingle(source.object);
            return cloneObject(source.object);
        }
        return buildPresetShape(source.shape, source.size, source.color);
    };

    /** Draws the repeat unit into an off-screen canvas and returns it as a PNG. */
    const renderTile = async (opts: CreatePatternOptions): Promise<PatternTile> => {
        const rule = opts.rule ?? DEFAULT_RULE;
        const stagger = !!opts.stagger;
        const reqRows = clampInt(opts.rows, 1, LIMITS.maxTileSide, 1);
        const reqCols = clampInt(opts.cols, 1, LIMITS.maxTileSide, 1);
        const { rows, cols } = seamlessGrid(rule, reqRows, reqCols, {
            stagger,
            enforceRule: opts.seamless !== false,
        });

        if (rows * cols * (stagger ? 2 : 1) > LIMITS.maxTileItems) {
            throw new Error('Pattern tile has too many items. Reduce rows or columns.');
        }

        const base = await resolveSource(opts.source);
        const { w, h } = boundsOf(base);
        // integer cell sizes keep the tile edges pixel-exact, so repeats never show hairline seams
        const cellW = Math.max(1, Math.round(w + (opts.gapX || 0)));
        const cellH = Math.max(1, Math.round(h + (opts.gapY || 0)));
        const tileW = cols * cellW;
        const tileH = rows * cellH;

        const requested = clampInt(opts.quality ?? 2, 1, 4, 2);
        const multiplier = Math.min(
            requested,
            Math.floor(LIMITS.maxTilePx / Math.max(tileW, tileH)),
        );
        if (multiplier < 1)
            throw new Error('Pattern tile is too large. Reduce size, gaps, rows or columns.');

        // placements (staggered rows are drawn twice so they wrap around the tile edge)
        const placements: { cx: number; cy: number; row: number; col: number }[] = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const shifted = stagger && r % 2 === 1;
                const cx = c * cellW + cellW / 2 + (shifted ? cellW / 2 : 0);
                const cy = r * cellH + cellH / 2;
                placements.push({ cx, cy, row: r, col: c });
                if (shifted) placements.push({ cx: cx - tileW, cy, row: r, col: c });
            }
        }

        const items = await Promise.all(
            placements.map(async ({ cx, cy, row, col }) => {
                const item = await cloneObject(base);
                const color = resolveRuleColor(rule, {
                    index: row * cols + col + 1,
                    row,
                    col,
                    rows,
                    cols,
                    total: rows * cols,
                });
                if (color) paintObject(item, color, rule.applyTo);
                item.setPositionByOrigin(new fabric.Point(cx, cy), 'center', 'center');
                return item;
            }),
        );

        const sc = new fabric.StaticCanvas(undefined, {
            width: tileW,
            height: tileH,
            enableRetinaScaling: false,
            renderOnAddRemove: false,
            backgroundColor: opts.background ?? '',
        });
        try {
            sc.add(...items);
            sc.renderAll();
            const el = sc.toCanvasElement(multiplier);
            return {
                dataUrl: el.toDataURL('image/png'),
                width: tileW,
                height: tileH,
                multiplier,
                rows,
                cols,
                adjusted: rows !== reqRows || cols !== reqCols,
            };
        } finally {
            void sc.dispose();
        }
    };

    const loadTile = (tile: { id?: string; dataUrl: string }) => {
        if (tile.id && imageCache.has(tile.id)) return imageCache.get(tile.id)!;
        const promise = fabric.util.loadImage(tile.dataUrl);
        if (tile.id) {
            imageCache.set(tile.id, promise);
            promise.catch(() => imageCache.delete(tile.id!)); // do not cache failures
        }
        return promise;
    };

    /** every painted object gets its own Pattern instance (they carry per-object transform) */
    const makePattern = (
        img: HTMLImageElement,
        tile: { multiplier: number },
        o: ApplyPatternOptions,
    ) => {
        const scale = Math.min(20, Math.max(0.05, o.scale ?? 1)) / tile.multiplier;
        return new fabric.Pattern({
            source: img,
            repeat: o.repeat ?? 'repeat',
            offsetX: o.offsetX ?? 0,
            offsetY: o.offsetY ?? 0,
            patternTransform: fabric.util.composeMatrix({
                scaleX: scale,
                scaleY: scale,
                angle: o.angle ?? 0,
            }),
        });
    };

    /** expands groups / multi-selection into the shapes that can actually take a fill */
    const collectPaintables = (objs: fabric.Object[], paint: 'fill' | 'stroke') => {
        const out: fabric.Object[] = [];
        const visit = (o: fabric.Object) => {
            if (o instanceof fabric.Group) {
                o.getObjects().forEach(visit);
                return;
            }
            const type = (o.type || '').toLowerCase();
            if (type === 'image') return;
            if (paint === 'fill' && type === 'line') return;
            out.push(o);
        };
        objs.forEach(visit);
        return out;
    };

    const paintWithTile = async (
        tile: { id?: string; dataUrl: string; multiplier: number },
        o: ApplyPatternOptions,
    ) => {
        const canvas = get().canvas;
        if (!canvas) return false;
        const { target = 'selection', paint = 'fill' } = o;
        const img = await loadTile(tile);

        if (target === 'canvas') {
            canvas.backgroundColor = makePattern(img, tile, o);
            canvas.requestRenderAll();
            commit();
            return true;
        }

        const targets = collectPaintables(o.objects ?? canvas.getActiveObjects(), paint);
        if (!targets.length) throw new Error('Select a shape to apply the pattern to.');

        targets.forEach((t) => {
            t.set(paint, makePattern(img, tile, o));
            if (paint === 'stroke' && !t.strokeWidth) t.set('strokeWidth', 4); // pattern stroke needs width
            t.dirty = true;
            t.setCoords();
        });
        canvas.requestRenderAll();
        commit();
        return true;
    };

    /* --------------------------------- API ---------------------------------- */
    return {
        objects: [] as fabric.Object[], // all canvas objects
        patterns: loadPatterns() as SavedPattern[],

        setCanvas: (canvas: fabric.Canvas | null) => set({ canvas }),

        addObject: (obj: fabric.Object) => {
            if (!get().canvas || !obj) return;
            registerObjects([obj]);
        },

        // -------------------------------
        // CLONE OBJECT
        // -------------------------------
        cloneObject: async (obj: fabric.Object) => (obj ? cloneObject(obj) : null),

        // -------------------------------
        // HORIZONTAL REPEAT (a 1-row grid)
        // -------------------------------
        repeatHorizontally: async (
            obj: fabric.Object,
            count = 3,
            gap = 10,
            options: GridOptions = {},
        ) =>
            get().repeatGrid(
                obj,
                1,
                clampInt(count, 1, LIMITS.maxGridSide, 1) + 1,
                gap,
                0,
                options,
            ),

        // -------------------------------
        // GRID REPEAT (+ colour rules)
        // -------------------------------
        repeatGrid: async (
            obj: fabric.Object,
            rows = 2,
            cols = 2,
            gapX = 10,
            gapY = 10,
            options: GridOptions = {},
        ) => {
            if (!get().canvas || !obj) return [];
            assertSingle(obj);

            const r = clampInt(rows, 1, LIMITS.maxGridSide, 1);
            const c = clampInt(cols, 1, LIMITS.maxGridSide, 1);
            if (r * c - 1 > LIMITS.maxClones) {
                throw new Error(
                    `Too many copies (max ${LIMITS.maxClones}). Reduce rows or columns.`,
                );
            }

            const { rule, stagger = false, colorOriginal = true } = options;
            const { w, h } = boundsOf(obj);
            const stepX = Math.max(1, w + gapX);
            const stepY = Math.max(1, h + gapY);
            const ctxFor = (row: number, col: number) => ({
                index: row * c + col + 1,
                row,
                col,
                rows: r,
                cols: c,
                total: r * c,
            });

            const cells: { row: number; col: number }[] = [];
            for (let row = 0; row < r; row++) {
                for (let col = 0; col < c; col++) {
                    if (row === 0 && col === 0) continue; // original stays in place
                    cells.push({ row, col });
                }
            }

            const left = obj.left;
            const top = obj.top;
            const clones = await Promise.all(
                cells.map(async ({ row, col }) => {
                    const clone = await cloneObject(obj);
                    const shift = stagger && row % 2 === 1 ? stepX / 2 : 0;
                    clone.set({ left: left + col * stepX + shift, top: top + row * stepY });
                    const color = resolveRuleColor(rule, ctxFor(row, col));
                    if (color && rule) paintObject(clone, color, rule.applyTo);
                    return clone;
                }),
            );

            if (rule && colorOriginal) {
                const color = resolveRuleColor(rule, ctxFor(0, 0));
                if (color) paintObject(obj, color, rule.applyTo);
            }

            registerObjects(clones);
            get().canvas.requestRenderAll();
            commit();
            return clones;
        },

        // -------------------------------
        // RADIAL REPEAT (ring / spiral)
        // -------------------------------
        repeatRadially: async (object: fabric.Object, options: RadialOptions) => {
            const canvas = get().canvas ?? object?.canvas;
            if (!canvas || !object || !options || options.count < 2) return [];
            assertSingle(object);

            const {
                count,
                pivotX,
                pivotY,
                gap = 0,
                mode = 'ring',
                startAngle = 0,
                clockwise = true,
                scaleStep = 0,
                rotateAlongPath = false,
                opacityFade = false,
                jitter = 0,
            } = options;

            if (count - 1 > LIMITS.maxClones) {
                throw new Error(`Too many copies (max ${LIMITS.maxClones}).`);
            }

            const center = object.getCenterPoint();
            let dx = center.x - pivotX;
            let dy = center.y - pivotY;
            const baseRadius = Math.hypot(dx, dy);

            // Unit direction from pivot to object. If object sits on the pivot, pick +X.
            if (baseRadius === 0) {
                dx = 1;
                dy = 0;
            } else {
                dx /= baseRadius;
                dy /= baseRadius;
            }

            // startAngle rotates the whole ring, so the original moves too (otherwise spacing is uneven)
            if (startAngle && baseRadius > 0) {
                const r0 = fabric.util.degreesToRadians(startAngle);
                object.setPositionByOrigin(
                    new fabric.Point(
                        pivotX + (dx * Math.cos(r0) - dy * Math.sin(r0)) * baseRadius,
                        pivotY + (dx * Math.sin(r0) + dy * Math.cos(r0)) * baseRadius,
                    ),
                    'center',
                    'center',
                );
                if (rotateAlongPath) object.rotate(object.angle + startAngle);
                object.setCoords();
            }

            const sign = clockwise ? 1 : -1;
            const angleStep = 360 / count;
            const baseOpacity = object.opacity ?? 1;

            const clones = await Promise.all(
                Array.from({ length: count - 1 }, async (_, k) => {
                    const i = k + 1;
                    const clone = await cloneObject(object);

                    const angleDelta = sign * angleStep * i;
                    const rad = fabric.util.degreesToRadians(startAngle + angleDelta);
                    // ring: constant radius (gap used to push every copy off the circle); spiral: grows by gap per copy
                    const radius = Math.max(
                        0,
                        mode === 'spiral' ? baseRadius + gap * i : baseRadius,
                    );

                    let newX = pivotX + (dx * Math.cos(rad) - dy * Math.sin(rad)) * radius;
                    let newY = pivotY + (dx * Math.sin(rad) + dy * Math.cos(rad)) * radius;

                    if (jitter > 0) {
                        newX += (Math.random() - 0.5) * 2 * jitter;
                        newY += (Math.random() - 0.5) * 2 * jitter;
                    }

                    const scale = Math.max(0.01, 1 + scaleStep * i); // never zero/negative

                    clone.set({
                        angle: rotateAlongPath ? object.angle + angleDelta : object.angle,
                        scaleX: object.scaleX * scale,
                        scaleY: object.scaleY * scale,
                        opacity: opacityFade
                            ? baseOpacity * Math.max(0, 1 - i / count)
                            : baseOpacity,
                    });

                    clone.setPositionByOrigin(new fabric.Point(newX, newY), 'center', 'center');
                    return clone;
                }),
            );

            registerObjects(clones);
            commit();
            return clones;
        },

        // -------------------------------
        // REPEAT ALONG PATH
        // (old calls repeatAlongPath(obj, path, 30) still work: a number = spacing)
        // -------------------------------
        repeatAlongPath: async (
            obj: fabric.Object,
            guide: fabric.Object,
            input: number | RepeatAlongPathOptions = {},
        ) => {
            const canvas = get().canvas;
            if (!canvas || !obj || !guide) return [];
            assertSingle(obj);
            if (obj === guide) throw new Error('Pick a different object than the path.');

            const {
                group = false,
                useOriginal = true,
                deleteGuide = false,
                ...rest
            } = typeof input === 'number' ? ({ spacing: input } as RepeatAlongPathOptions) : input;
            const opts: AlongPathOptions = { ...DEFAULT_ALONG_PATH, ...rest };

            const guidePath = toGuidePath(guide);
            if (!guidePath) {
                throw new Error(
                    'This shape cannot be used as a path. Use a path, line, circle, ellipse, rectangle or polygon.',
                );
            }

            const { samples, tooMany, requested } = sampleAlongPath(
                guidePath,
                opts,
                obj.angle ?? 0,
                LIMITS.maxClones,
            );
            if (tooMany) {
                throw new Error(
                    `That would create ${requested} copies (max ${LIMITS.maxClones}). Increase the spacing or lower the count.`,
                );
            }
            if (!samples.length)
                throw new Error(
                    'Nothing to place. The path is empty or the offsets leave no room.',
                );

            // read the source's own values once, before anything is changed
            const base = {
                sx: obj.scaleX ?? 1,
                sy: obj.scaleY ?? 1,
                opacity: obj.opacity ?? 1,
                flipY: !!obj.flipY,
            };
            const place = (target: fabric.Object, s: (typeof samples)[number]) => {
                target.set({
                    angle: s.angle,
                    scaleX: base.sx * s.scale,
                    scaleY: base.sy * s.scale,
                    opacity: base.opacity * s.opacity,
                    flipY: s.flip ? !base.flipY : base.flipY,
                });
                target.setPositionByOrigin(new fabric.Point(s.x, s.y), 'center', 'center');
                target.setCoords();
            };

            const first = useOriginal ? 1 : 0;
            const clones = await Promise.all(
                samples.slice(first).map(async (s) => {
                    const c = await cloneObject(obj);
                    place(c, s);
                    return c;
                }),
            );
            if (useOriginal) place(obj, samples[0]);

            canvas.discardActiveObject();
            const all = useOriginal ? [obj, ...clones] : clones;

            if (group && all.length > 1) {
                if (useOriginal) {
                    canvas.remove(obj);
                    set({ objects: get().objects.filter((o: fabric.Object) => o !== obj) });
                }
                const g = new fabric.Group(all);
                Object.assign(g, { id: nanoid() });
                registerObjects([g]);
                canvas.setActiveObject(g);
            } else {
                registerObjects(clones);
            }

            if (deleteGuide) {
                canvas.remove(guide);
                set({ objects: get().objects.filter((o: fabric.Object) => o !== guide) });
            }

            canvas.requestRenderAll();
            commit();
            return all;
        },

        // -------------------------------
        // PATTERN LIBRARY
        // -------------------------------
        /** Renders a tile without saving it (used for the live preview). */
        previewPatternTile: (opts: CreatePatternOptions) => renderTile(opts),

        /** Builds a repeat tile from the selection or a preset shape and saves it to the library. */
        createPattern: async (opts: CreatePatternOptions): Promise<SavedPattern> => {
            const tile = await renderTile(opts);
            const rule = opts.rule;
            const pattern: SavedPattern = {
                id: nanoid(),
                name: opts.name?.trim() || `Pattern ${get().patterns.length + 1}`,
                dataUrl: tile.dataUrl,
                width: tile.width,
                height: tile.height,
                multiplier: tile.multiplier,
                createdAt: Date.now(),
                meta: {
                    rows: tile.rows,
                    cols: tile.cols,
                    gapX: opts.gapX,
                    gapY: opts.gapY,
                    stagger: !!opts.stagger,
                    background: opts.background,
                    rule: rule
                        ? {
                              type: rule.type,
                              colors: rule.colors,
                              applyTo: rule.applyTo,
                              n: rule.n,
                              offset: rule.offset,
                              seed: rule.seed,
                          }
                        : undefined,
                },
            };
            const next = [pattern, ...get().patterns];
            set({ patterns: next });
            persistPatterns(next);
            return pattern;
        },

        deletePattern: (id: string) => {
            imageCache.delete(id);
            const next = get().patterns.filter((p: SavedPattern) => p.id !== id);
            set({ patterns: next });
            persistPatterns(next);
        },

        renamePattern: (id: string, name: string) => {
            const next = get().patterns.map((p: SavedPattern) =>
                p.id === id ? { ...p, name: name.trim() || p.name } : p,
            );
            set({ patterns: next });
            persistPatterns(next);
        },

        /** Paints a saved pattern on the canvas background or on the selected shapes (fill / stroke). */
        applyPattern: async (patternId: string, options: ApplyPatternOptions = {}) => {
            const saved: SavedPattern | undefined = get().patterns.find(
                (p: SavedPattern) => p.id === patternId,
            );
            if (!saved) throw new Error('Pattern not found.');
            return paintWithTile(saved, options);
        },

        /** Removes a pattern paint again (canvas background or selected shapes). */
        clearPattern: (options: ClearPatternOptions = {}) => {
            const canvas = get().canvas;
            if (!canvas) return false;
            const { target = 'selection', paint = 'fill', fallback } = options;

            if (target === 'canvas') {
                if (canvas.backgroundColor instanceof fabric.Pattern) {
                    canvas.backgroundColor = fallback ?? '';
                    canvas.requestRenderAll();
                    commit();
                }
                return true;
            }

            const restore = fallback ?? (paint === 'fill' ? '#d1d5db' : null);
            const targets = collectPaintables(
                options.objects ?? canvas.getActiveObjects(),
                paint,
            ).filter((o) => o.get(paint) instanceof fabric.Pattern);
            targets.forEach((o) => {
                o.set(paint, restore);
                o.dirty = true;
            });
            if (targets.length) {
                canvas.requestRenderAll();
                commit();
            }
            return true;
        },

        // -------------------------------
        // PATTERN FILL (quick one-shot, kept for backwards compatibility)
        // -------------------------------
        // Rasterises `obj` once and tiles it over `target` (a shape) without touching the library.
        fillPattern: async (obj: fabric.Object, target: fabric.Object) => {
            if (!obj || !target || !get().canvas) return;
            assertSingle(obj);
            const tile = await renderTile({
                source: { kind: 'object', object: obj },
                rows: 1,
                cols: 1,
                gapX: 0,
                gapY: 0,
                seamless: false,
            });
            await paintWithTile(tile, { target: 'selection', paint: 'fill', objects: [target] });
        },

        // -------------------------------
        // DELETE OBJECT
        // -------------------------------
        removeObject: (obj: fabric.Object) => {
            const canvas = get().canvas;
            if (!canvas || !obj) return;

            if (canvas.getActiveObject() === obj) canvas.discardActiveObject();
            canvas.remove(obj);
            set({ objects: get().objects.filter((o: fabric.Object) => o !== obj) });
            canvas.requestRenderAll();
        },
    };
};
