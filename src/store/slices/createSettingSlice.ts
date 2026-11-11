import type { StateCreator } from 'zustand';
import { settingsStorage } from '@/lib/storage';
import {
    CANVAS_ORIENTATIONS,
    CANVAS_PRESETS,
    DEFAULT_CANVAS_PRESET,
    orientPreset,
    type CanvasOrientation,
} from '@/components/organisms/board/board.config';
import type { CanvasPreset } from '@/components/organisms/board/board.type';

/* -------------------------------------------------------------------------- */
/*  Types & constants                                                          */
/* -------------------------------------------------------------------------- */

export const THEME_MODES = ['light', 'dark', 'system'] as const;
export const ICON_SIZES = ['sm', 'md', 'lg'] as const;
export const UNITS = ['px', 'mm', 'cm', 'in'] as const;

/** Color themes (brand scale for the whole app). CSS: `:root[data-theme='…']` in index.css. */
export const COLOR_THEMES = [
    { id: 'fate', label: 'Fate Blue', swatch: ['#22a7ff', '#0a60d6'] },
    { id: 'ocean', label: 'Ocean', swatch: ['#2dd4bf', '#0f766e'] },
    { id: 'violet', label: 'Violet', swatch: ['#a78bfa', '#7c3aed'] },
    { id: 'rose', label: 'Rose', swatch: ['#fb7185', '#e11d48'] },
    { id: 'emerald', label: 'Emerald', swatch: ['#34d399', '#047857'] },
    { id: 'graphite', label: 'Graphite', swatch: ['#94a3b8', '#475569'] },
] as const;
export type ColorTheme = (typeof COLOR_THEMES)[number]['id'];
const COLOR_THEME_IDS = COLOR_THEMES.map((t) => t.id) as readonly ColorTheme[];
const CANVAS_PRESET_IDS = CANVAS_PRESETS.map((p) => p.id);

export type ThemeMode = (typeof THEME_MODES)[number];
export type IconSize = (typeof ICON_SIZES)[number];
export type Unit = (typeof UNITS)[number];

/**
 * Per-browser preferences. Only what the editor reads lives here: page size, background, grid and
 * snap were saved but never read and were removed (owner, 2026-11-11). A document's own settings
 * (each page's size and background) are stored with the document.
 */
export interface Settings {
    mode: ThemeMode;
    /** Brand color theme for the whole app (works with light / dark mode). */
    colorTheme: ColorTheme;
    iconSize: IconSize;
    /** Unit shown on rulers and in size fields. */
    unit: Unit;
    /** Infinite canvas when true, fixed page when false. */
    freehand: boolean;
    /**
     * Settings > Canvas size: a `CANVAS_PRESETS` id, or `'custom'` for `customCanvasSize`. New boards
     * start at it, and a change resizes the open page.
     */
    defaultCanvasPresetId: string;
    /** Settings > Orientation: the canvas size is used in it. */
    canvasOrientation: CanvasOrientation;
    /** Settings > Canvas size > Custom size, in whole px (kept while a preset is chosen). */
    customCanvasSize: CustomCanvasSize;
}

export type CustomCanvasSize = { width: number; height: number };

/** `defaultCanvasPresetId` of the custom size. */
export const CUSTOM_CANVAS_ID = 'custom';

/** Custom size limits in px: the same as pages accept from a file (`MAX_PAGE_PX`). */
export const CUSTOM_CANVAS_LIMITS = { min: 1, max: 10000 } as const;

/** A side of a custom size: a whole number of px inside the limits. */
export const isCanvasSide = (n: unknown): n is number =>
    typeof n === 'number' &&
    Number.isInteger(n) &&
    n >= CUSTOM_CANVAS_LIMITS.min &&
    n <= CUSTOM_CANVAS_LIMITS.max;

/** What a new user gets and what Reset restores (owner, 2026-11-11). */
export const DEFAULT_SETTINGS: Settings = {
    mode: 'light',
    colorTheme: 'fate',
    iconSize: 'sm',
    unit: 'px',
    // design (fixed page) first; whiteboard is opt-in (DECISIONS Q3)
    freehand: false,
    defaultCanvasPresetId: DEFAULT_CANVAS_PRESET.id,
    canvasOrientation: 'landscape',
    customCanvasSize: { width: 1920, height: 1080 },
};

/* -------------------------------------------------------------------------- */
/*  Pure helpers (safe to unit test)                                           */
/* -------------------------------------------------------------------------- */

const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
    typeof value === 'string' && (allowed as readonly string[]).includes(value)
        ? (value as T)
        : fallback;

/**
 * Turns anything (corrupt storage, old versions, partial data) into a valid Settings object.
 * Fields from older versions that nothing reads are dropped.
 */
export function sanitizeSettings(raw: unknown): Settings {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

    return {
        mode: pick(r.mode, THEME_MODES, DEFAULT_SETTINGS.mode),
        colorTheme: pick(r.colorTheme, COLOR_THEME_IDS, DEFAULT_SETTINGS.colorTheme),
        iconSize: pick(r.iconSize, ICON_SIZES, DEFAULT_SETTINGS.iconSize),
        unit: pick(r.unit, UNITS, DEFAULT_SETTINGS.unit),
        freehand: typeof r.freehand === 'boolean' ? r.freehand : DEFAULT_SETTINGS.freehand,
        defaultCanvasPresetId: pick(
            r.defaultCanvasPresetId,
            [...CANVAS_PRESET_IDS, CUSTOM_CANVAS_ID],
            DEFAULT_SETTINGS.defaultCanvasPresetId,
        ),
        canvasOrientation: pick(
            r.canvasOrientation,
            CANVAS_ORIENTATIONS,
            DEFAULT_SETTINGS.canvasOrientation,
        ),
        customCanvasSize: sanitizeCustomSize(r.customCanvasSize),
    };
}

const sanitizeCustomSize = (raw: unknown): CustomCanvasSize => {
    const size = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    return isCanvasSide(size.width) && isCanvasSide(size.height)
        ? { width: size.width, height: size.height }
        : { ...DEFAULT_SETTINGS.customCanvasSize };
};

/**
 * The preset a new board starts with, in the chosen orientation. Always a new object, so changing a
 * page never changes the setting.
 */
export function getDefaultCanvasPreset(settings: Settings): CanvasPreset {
    const preset =
        settings.defaultCanvasPresetId === CUSTOM_CANVAS_ID
            ? customPreset(settings.customCanvasSize)
            : (CANVAS_PRESETS.find((p) => p.id === settings.defaultCanvasPresetId) ??
              DEFAULT_CANVAS_PRESET);
    return orientPreset(preset, settings.canvasOrientation);
}

/** A custom size as a preset; `orientPreset` gives it its `custom-<w>x<h>` id. */
const customPreset = ({ width, height }: CustomCanvasSize): CanvasPreset => ({
    id: CUSTOM_CANVAS_ID,
    label: 'Custom size',
    category: 'Custom',
    width,
    height,
    icon: 'ruler-combined',
});

/** Same canvas size (id and px), so only a real change resizes the open page. */
const sizeKey = (settings: Settings) => {
    const { id, width, height } = getDefaultCanvasPreset(settings);
    return `${id}:${width}x${height}`;
};

/* -------------------------------------------------------------------------- */
/*  Theme                                                                      */
/* -------------------------------------------------------------------------- */

const prefersDark = () =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;

export function applyTheme(mode: ThemeMode): void {
    if (typeof document === 'undefined') return;

    const resolved = mode === 'system' ? (prefersDark() ? 'dark' : 'light') : mode;
    const root = document.documentElement;

    root.classList.toggle('dark', resolved === 'dark');
    root.style.colorScheme = resolved; // native scrollbars & form controls follow the theme
}

/** Color theme setting -> `data-theme` on <html>; index.css swaps the brand scale. */
export function applyColorTheme(theme: ColorTheme): void {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.theme = theme;
}

/** Icon size setting -> `data-icon-size` on <html>; index.css maps it to the --ui-* sizes. */
export function applyIconSize(size: IconSize): void {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.iconSize = size;
}

/* -------------------------------------------------------------------------- */
/*  Persistence                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Set when Settings > Canvas size or Orientation changes; the editor resizes the page that was open
 * and clears it. Stored, not in memory: Settings is another page, and a reload must not lose it.
 */
function markCanvasSizePending(): void {
    if (!settingsStorage.markCanvasSizePending()) {
        console.error('[settings] Failed to save the canvas size change');
    }
}

/** True once after a canvas size change, then false until the next change. */
const takeCanvasSizePending = (): boolean => settingsStorage.takeCanvasSizePending();

function persist(settings: Settings): void {
    // Storage can be full, blocked or unavailable (private mode). Never crash the UI for it.
    if (!settingsStorage.save(settings)) console.error('[settings] Failed to save settings');
}

/* -------------------------------------------------------------------------- */
/*  Slice                                                                      */
/* -------------------------------------------------------------------------- */

export interface SettingsSlice {
    settings: Settings;

    /** Loads saved settings from storage. Call once on app start. */
    load: () => Promise<void>;
    /** Replaces settings with validated data (e.g. from another source). */
    hydrate: (data: unknown) => void;
    /** Applies the theme and keeps "System" in sync with the OS. Returns a cleanup function. */
    initTheme: () => () => void;

    setMode: (mode: ThemeMode) => void;
    setIconSize: (size: IconSize) => void;
    setColorTheme: (theme: ColorTheme) => void;
    setUnit: (unit: Unit) => void;
    setFreehand: (freehand: boolean) => void;
    toggleFreehand: () => void;
    /** Settings > Canvas size: a `CANVAS_PRESETS` id or `'custom'` (anything else is ignored). */
    setDefaultCanvasPreset: (presetId: string) => void;
    /** Settings > Orientation: landscape or portrait for the canvas size. */
    setCanvasOrientation: (orientation: CanvasOrientation) => void;
    /**
     * Settings > Canvas size > Custom size, in px. Selects it and sets the orientation from it, so it
     * is used exactly as typed. False (nothing changes) for a size outside `CUSTOM_CANVAS_LIMITS`.
     */
    setCustomCanvasSize: (width: number, height: number) => boolean;
    /** Every setting back to `DEFAULT_SETTINGS`, applied to the page at once. */
    resetSettings: () => void;
    /**
     * True once after Canvas size or Orientation changed in Settings (then false until the next
     * change). The Canvas slice takes it when the editor loads and resizes the open page.
     */
    takePendingCanvasSize: () => boolean;

    /** Kept for existing callers. Prefer the specific setters above. */
    updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
    applyTheme: (mode: ThemeMode) => void;
    opendbSave: () => void;
}

export const createSettingSlice: StateCreator<SettingsSlice, [], [], SettingsSlice> = (
    set,
    get,
) => {
    /** Single write path: validate -> store -> theme -> persist. */
    const commit = (patch: Partial<Settings>) => {
        const prev = get().settings;
        const next = sanitizeSettings({ ...prev, ...patch });

        if (JSON.stringify(prev) === JSON.stringify(next)) return; // nothing changed, skip the write

        set({ settings: next });
        if (next.mode !== prev.mode) applyTheme(next.mode);
        if (next.iconSize !== prev.iconSize) applyIconSize(next.iconSize);
        if (next.colorTheme !== prev.colorTheme) applyColorTheme(next.colorTheme);
        persist(next);
        if (sizeKey(next) !== sizeKey(prev)) markCanvasSizePending();
    };

    return {
        settings: { ...DEFAULT_SETTINGS },

        load: async () => {
            try {
                const saved = settingsStorage.load();
                get().hydrate(saved);
            } catch (error) {
                console.error('[settings] Failed to load settings', error);
                get().hydrate(null);
            }
        },

        hydrate: (data) => {
            const settings = sanitizeSettings(data);
            set({ settings });
            applyTheme(settings.mode);
            applyIconSize(settings.iconSize);
            applyColorTheme(settings.colorTheme);
        },

        initTheme: () => {
            applyTheme(get().settings.mode);
            applyIconSize(get().settings.iconSize);
            applyColorTheme(get().settings.colorTheme);
            if (typeof window === 'undefined') return () => {};

            const query = window.matchMedia('(prefers-color-scheme: dark)');
            const onChange = () => {
                if (get().settings.mode === 'system') applyTheme('system');
            };
            query.addEventListener('change', onChange);
            return () => query.removeEventListener('change', onChange);
        },

        setMode: (mode) => commit({ mode }),
        setIconSize: (iconSize) => commit({ iconSize }),
        setColorTheme: (colorTheme) => commit({ colorTheme }),
        setUnit: (unit) => commit({ unit }),

        setFreehand: (freehand) => commit({ freehand }),
        toggleFreehand: () => commit({ freehand: !get().settings.freehand }),

        setDefaultCanvasPreset: (presetId) => {
            if (presetId === CUSTOM_CANVAS_ID || CANVAS_PRESET_IDS.includes(presetId))
                commit({ defaultCanvasPresetId: presetId });
        },

        setCanvasOrientation: (canvasOrientation) => commit({ canvasOrientation }),

        setCustomCanvasSize: (width, height) => {
            if (!isCanvasSide(width) || !isCanvasSide(height)) return false;
            const current = get().settings.canvasOrientation;
            commit({
                defaultCanvasPresetId: CUSTOM_CANVAS_ID,
                customCanvasSize: { width, height },
                // a square has no orientation of its own: keep the chosen one
                canvasOrientation:
                    width === height ? current : width > height ? 'landscape' : 'portrait',
            });
            return true;
        },

        resetSettings: () => commit({ ...DEFAULT_SETTINGS }),
        takePendingCanvasSize: () => takeCanvasSizePending(),

        updateSetting: (key, value) => commit({ [key]: value } as Partial<Settings>),
        applyTheme: (mode) => applyTheme(mode),
        opendbSave: () => persist(get().settings),
    };
};
