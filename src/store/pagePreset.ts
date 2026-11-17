/**
 * Settings > Canvas size applied to boards (moved out of the Canvas slice, 2026-11-17): the page size and, for
 * the manga / comic sizes, their page setup (bleed + safe-area margins, Clip Studio manga manuscript style;
 * `pageSetup` on the preset in board.config). Called by the Canvas slice; no store import (BUG-048).
 */
import type * as fabric from 'fabric';
import { findPreset } from '@/components/organisms/board/board.config';
import type { CanvasPreset } from '@/components/organisms/board/board.type';
import { DEFAULT_PAGE_SETUP, normalizePageSetup, type PageSetup } from '@/lib/document/pageSetup';
import { getDefaultCanvasPreset, type Settings } from './slices/createSettingSlice';

type Setup = NonNullable<CanvasPreset['pageSetup']>;
type Peers = {
    canvas?: (fabric.Canvas & { pageSetup?: PageSetup }) | null;
    settings?: Settings;
    takePendingCanvasSize?: () => boolean;
    setSelectedPreset: (preset: CanvasPreset) => void;
    setPageSetup?: (patch: Setup) => void;
};
type SetFn = (partial: Record<string, unknown>, replace: false, action: string) => void;

/** The page setup a size starts with (manga / comic sizes, also rotated); null for other and custom sizes. */
export const presetPageSetup = (preset: CanvasPreset): Setup | null =>
    findPreset(preset.id)?.pageSetup ?? null;

/**
 * A new board starts at Settings > Canvas size. Plain state, not `setSelectedPreset`, and the page setup is
 * written straight to the (just cleared) canvas: it is the base of the new board, not an edit (no undo step, no
 * autosave of its own; the first history snapshot includes it).
 */
export function startBoardPreset(get: () => Peers, set: SetFn): void {
    const { settings, canvas } = get();
    if (!settings) return;
    const preset = getDefaultCanvasPreset(settings);
    set(
        { selectedPreset: preset, pageWidth: preset.width, pageHeight: preset.height },
        false,
        'canvas/defaultPreset',
    );
    const setup = presetPageSetup(preset);
    if (canvas && setup) canvas.pageSetup = normalizePageSetup({ ...DEFAULT_PAGE_SETUP, ...setup });
}

/**
 * Settings > Canvas size / Orientation changed since the editor was last open: the open page takes that size
 * (one undo step, owner 2026-11-11) and a manga size its page setup (same edit: history is debounced). A
 * whiteboard has no page size, so the change waits for the next design board.
 */
export function applySizeSetting(get: () => Peers): void {
    const { canvas, settings } = get();
    if (!canvas || !settings || settings.freehand) return;
    if (!get().takePendingCanvasSize?.()) return;
    const preset = getDefaultCanvasPreset(settings);
    get().setSelectedPreset(preset);
    const setup = presetPageSetup(preset);
    if (setup) get().setPageSetup?.(setup);
}
