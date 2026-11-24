// useImageFilters.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { useStore } from '@/store';
import {
    DEFAULT_FILTER_STATE,
    type FilterState,
    type PresetKey,
    applyStateToImage,
    flattenToImage,
    getImageFilterState,
    isFabricImage,
    previewOriginal,
    stateFromPreset,
} from './filterEngine';

export type SelectionKind = 'none' | 'image' | 'other';

export function useImageFilters() {
    const canvas = useStore((s) => s.canvas) as fabric.Canvas | null;

    const [images, setImages] = useState<fabric.FabricImage[]>([]);
    const [kind, setKind] = useState<SelectionKind>('none');
    const [state, setState] = useState<FilterState>(DEFAULT_FILTER_STATE);

    const stateRef = useRef(state);
    const imagesRef = useRef(images);
    const pendingRef = useRef<Partial<FilterState>>({});
    const rafRef = useRef<number | null>(null);

    /* ---------- selection sync ---------- */

    const sync = useCallback(() => {
        if (!canvas) {
            setImages([]);
            setKind('none');
            return;
        }
        const imgs = canvas.getActiveObjects().filter(isFabricImage);
        const active = canvas.getActiveObject();

        imagesRef.current = imgs;
        setImages(imgs);
        setKind(imgs.length ? 'image' : active ? 'other' : 'none');

        const next = imgs[0] ? getImageFilterState(imgs[0]) : DEFAULT_FILTER_STATE;
        stateRef.current = next;
        setState(next);
    }, [canvas]);

    useEffect(() => {
        if (!canvas) return;
        sync();
        canvas.on('selection:created', sync);
        canvas.on('selection:updated', sync);
        canvas.on('selection:cleared', sync);
        return () => {
            canvas.off('selection:created', sync);
            canvas.off('selection:updated', sync);
            canvas.off('selection:cleared', sync);
        };
    }, [canvas, sync]);

    /* ---------- apply (rAF-throttled) ---------- */

    const flush = useCallback(() => {
        rafRef.current = null;
        const patch = pendingRef.current;
        pendingRef.current = {};
        if (!canvas || !Object.keys(patch).length) return;

        // Patch per image so multi-selection keeps each image's other settings
        imagesRef.current.forEach((img) =>
            applyStateToImage(img, { ...getImageFilterState(img), ...patch }),
        );
        canvas.requestRenderAll();
    }, [canvas]);

    const update = useCallback(
        (patch: Partial<FilterState>) => {
            // any manual change leaves "preset mode", unless the patch sets the preset itself
            const full: Partial<FilterState> =
                'preset' in patch ? patch : { ...patch, preset: null };

            stateRef.current = { ...stateRef.current, ...full };
            setState(stateRef.current);

            pendingRef.current = { ...pendingRef.current, ...full };
            if (rafRef.current === null) rafRef.current = requestAnimationFrame(flush);
        },
        [flush],
    );

    /** Call when a drag ends / a discrete action finishes: flush + push one undo step. */
    const commit = useCallback(() => {
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
        flush();
        // adapt to your undo slice API
        (useStore.getState() as any).saveState?.();
    }, [flush]);

    useEffect(
        () => () => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        },
        [],
    );

    /* ---------- actions ---------- */

    const reset = useCallback(
        (keys?: (keyof FilterState)[]) => {
            const patch: any = {};
            (keys ?? (Object.keys(DEFAULT_FILTER_STATE) as (keyof FilterState)[])).forEach(
                (k) => (patch[k] = DEFAULT_FILTER_STATE[k]),
            );
            update(patch);
            commit();
        },
        [update, commit],
    );

    const applyPreset = useCallback(
        (key: PresetKey) => {
            // clicking the active preset again clears it
            const next = stateRef.current.preset === key ? 'none' : key;
            update(stateFromPreset(next, stateRef.current.presetIntensity));
            commit();
        },
        [update, commit],
    );

    const setPresetIntensity = useCallback(
        (intensity: number) => {
            const key = stateRef.current.preset;
            if (!key) return;
            update(stateFromPreset(key, intensity));
        },
        [update],
    );

    const setComparing = useCallback(
        (on: boolean) => {
            if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
                flush();
            }
            imagesRef.current.forEach((img) => previewOriginal(img, on));
            canvas?.requestRenderAll();
        },
        [canvas, flush],
    );

    const flatten = useCallback(() => {
        if (!canvas) return;
        const obj = canvas.getActiveObject();
        if (!obj || obj instanceof fabric.ActiveSelection) return;
        flattenToImage(canvas, obj);
        commit();
    }, [canvas, commit]);

    return {
        kind,
        images,
        state,
        update,
        commit,
        reset,
        applyPreset,
        setPresetIntensity,
        setComparing,
        flatten,
    };
}
