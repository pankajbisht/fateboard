import type { StateCreator } from 'zustand';
import db from 'opendb-store';

/* -------------------------------------------------------------------------- */
/*  Types & constants                                                          */
/* -------------------------------------------------------------------------- */

export const THEME_MODES = ['light', 'dark', 'system'] as const;
export const ICON_SIZES = ['sm', 'md', 'lg'] as const;
export const PAGE_FORMATS = ['A3', 'A4', 'A5', 'LETTER', 'CUSTOM'] as const;
export const ORIENTATIONS = ['LANDSCAPE', 'PORTRAIT'] as const;
export const BACKGROUND_STYLES = ['none', 'grid', 'ruled', 'dots', 'isometric'] as const;
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

export type ThemeMode = (typeof THEME_MODES)[number];
export type IconSize = (typeof ICON_SIZES)[number];
export type PageFormat = (typeof PAGE_FORMATS)[number];
export type Orientation = (typeof ORIENTATIONS)[number];
export type BackgroundStyle = (typeof BACKGROUND_STYLES)[number];
export type Unit = (typeof UNITS)[number];

export interface CustomSize {
    /** millimetres */
    width: number;
    /** millimetres */
    height: number;
}

export interface Settings {
    mode: ThemeMode;
    /** Brand color theme for the whole app (works with light / dark mode). */
    colorTheme: ColorTheme;
    iconSize: IconSize;
    backgroundStyle: BackgroundStyle;
    /** Canvas / page colour as #rrggbb. */
    backgroundColor: string;
    /** Spacing of the background pattern and the snap grid, in px. */
    gridSize: number;
    snapToGrid: boolean;
    showRulers: boolean;
    /** Unit shown on rulers and in size fields. */
    unit: Unit;
    orientation: Orientation;
    /** Infinite canvas when true, fixed page when false. */
    freehand: boolean;
    /** Derived: 'FREEHAND' while freehand is on, otherwise lastPageFormat. */
    format: PageFormat | 'FREEHAND';
    /** Remembered so turning freehand off restores the user's previous page. */
    lastPageFormat: PageFormat;
    customSize: CustomSize;
}

/** Portrait dimensions in millimetres. */
export const PAGE_SIZES_MM: Record<Exclude<PageFormat, 'CUSTOM'>, CustomSize> = {
    A3: { width: 297, height: 420 },
    A4: { width: 210, height: 297 },
    A5: { width: 148, height: 210 },
    LETTER: { width: 216, height: 279 },
};

export const CUSTOM_SIZE_LIMITS = { min: 50, max: 2000 } as const;
export const GRID_SIZE_LIMITS = { min: 4, max: 200 } as const;

const STORAGE_KEY = 'fateboard-settings';

export const DEFAULT_SETTINGS: Settings = {
    mode: 'system',
    colorTheme: 'fate',
    iconSize: 'md',
    backgroundStyle: 'ruled',
    backgroundColor: '#ffffff',
    gridSize: 24,
    snapToGrid: false,
    showRulers: true,
    unit: 'px',
    orientation: 'LANDSCAPE',
    // design (fixed page) first; whiteboard is opt-in (DECISIONS Q3)
    freehand: false,
    format: 'A4',
    lastPageFormat: 'A4',
    customSize: { width: 210, height: 297 },
};

/* -------------------------------------------------------------------------- */
/*  Pure helpers (safe to unit test)                                           */
/* -------------------------------------------------------------------------- */

export const clampDimension = (
    value: unknown,
    fallback: number = CUSTOM_SIZE_LIMITS.min,
): number => {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(CUSTOM_SIZE_LIMITS.max, Math.max(CUSTOM_SIZE_LIMITS.min, Math.round(n)));
};

export const isHexColor = (value: unknown): value is string =>
    typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);

export const clampGridSize = (
    value: unknown,
    fallback: number = DEFAULT_SETTINGS.gridSize,
): number => {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(GRID_SIZE_LIMITS.max, Math.max(GRID_SIZE_LIMITS.min, Math.round(n)));
};

const bool = (value: unknown, fallback: boolean): boolean =>
    typeof value === 'boolean' ? value : fallback;

const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
    typeof value === 'string' && (allowed as readonly string[]).includes(value)
        ? (value as T)
        : fallback;

/**
 * Turns anything (corrupt storage, old versions, partial data) into a valid
 * Settings object. Also migrates the legacy `backgroundStyle1` key.
 */
export function sanitizeSettings(raw: unknown): Settings {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

    const freehand = typeof r.freehand === 'boolean' ? r.freehand : DEFAULT_SETTINGS.freehand;

    // Older saves stored the page format in `format` and had no `lastPageFormat`.
    const legacyFormat = r.format !== 'FREEHAND' ? r.format : undefined;
    const lastPageFormat = pick(
        r.lastPageFormat ?? legacyFormat,
        PAGE_FORMATS,
        DEFAULT_SETTINGS.lastPageFormat,
    );

    const custom = (r.customSize && typeof r.customSize === 'object' ? r.customSize : {}) as Record<
        string,
        unknown
    >;

    return {
        mode: pick(r.mode, THEME_MODES, DEFAULT_SETTINGS.mode),
        colorTheme: pick(r.colorTheme, COLOR_THEME_IDS, DEFAULT_SETTINGS.colorTheme),
        iconSize: pick(r.iconSize, ICON_SIZES, DEFAULT_SETTINGS.iconSize),
        backgroundStyle: pick(
            r.backgroundStyle ?? r.backgroundStyle1,
            BACKGROUND_STYLES,
            DEFAULT_SETTINGS.backgroundStyle,
        ),
        backgroundColor: isHexColor(r.backgroundColor)
            ? r.backgroundColor.toLowerCase()
            : DEFAULT_SETTINGS.backgroundColor,
        gridSize: clampGridSize(r.gridSize),
        snapToGrid: bool(r.snapToGrid, DEFAULT_SETTINGS.snapToGrid),
        showRulers: bool(r.showRulers, DEFAULT_SETTINGS.showRulers),
        unit: pick(r.unit, UNITS, DEFAULT_SETTINGS.unit),
        orientation: pick(r.orientation, ORIENTATIONS, DEFAULT_SETTINGS.orientation),
        freehand,
        format: freehand ? 'FREEHAND' : lastPageFormat,
        lastPageFormat,
        customSize: {
            width: clampDimension(custom.width, DEFAULT_SETTINGS.customSize.width),
            height: clampDimension(custom.height, DEFAULT_SETTINGS.customSize.height),
        },
    };
}

/**
 * Final page size in millimetres with orientation applied,
 * or null for the infinite (freehand) canvas.
 */
export function getCanvasSize(settings: Settings): CustomSize | null {
    if (settings.freehand) return null;

    const base =
        settings.lastPageFormat === 'CUSTOM'
            ? settings.customSize
            : PAGE_SIZES_MM[settings.lastPageFormat];

    const long = Math.max(base.width, base.height);
    const short = Math.min(base.width, base.height);

    return settings.orientation === 'LANDSCAPE'
        ? { width: long, height: short }
        : { width: short, height: long };
}

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

function persist(settings: Settings): void {
    try {
        db.local.set(STORAGE_KEY, settings);
    } catch (error) {
        // Storage can be full, blocked or unavailable (private mode). Never crash the UI for it.
        console.error('[settings] Failed to save settings', error);
    }
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
    setBackgroundStyle: (style: BackgroundStyle) => void;
    setBackgroundColor: (color: string) => void;
    setGridSize: (size: number) => void;
    setSnapToGrid: (snap: boolean) => void;
    setShowRulers: (show: boolean) => void;
    setUnit: (unit: Unit) => void;
    setFreehand: (freehand: boolean) => void;
    toggleFreehand: () => void;
    setFormat: (format: PageFormat) => void;
    setOrientation: (orientation: Orientation) => void;
    setCustomSize: (size: Partial<CustomSize>) => void;
    resetSettings: () => void;

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
    };

    return {
        settings: { ...DEFAULT_SETTINGS },

        load: async () => {
            try {
                const saved = await Promise.resolve(db.local.get(STORAGE_KEY));
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
        setBackgroundStyle: (backgroundStyle) => commit({ backgroundStyle }),
        setBackgroundColor: (color) => {
            if (isHexColor(color)) commit({ backgroundColor: color.toLowerCase() }); // ignore half-typed values
        },
        setGridSize: (gridSize) =>
            commit({ gridSize: clampGridSize(gridSize, get().settings.gridSize) }),
        setSnapToGrid: (snapToGrid) => commit({ snapToGrid }),
        setShowRulers: (showRulers) => commit({ showRulers }),
        setUnit: (unit) => commit({ unit }),

        setFreehand: (freehand) => commit({ freehand }),
        toggleFreehand: () => commit({ freehand: !get().settings.freehand }),

        setFormat: (format) => {
            if (get().settings.freehand) return; // page size has no meaning on an infinite canvas
            commit({ lastPageFormat: format });
        },

        setOrientation: (orientation) => {
            if (get().settings.freehand) return;
            commit({ orientation });
        },

        setCustomSize: (size) => {
            const current = get().settings.customSize;
            commit({
                customSize: {
                    width:
                        size.width !== undefined
                            ? clampDimension(size.width, current.width)
                            : current.width,
                    height:
                        size.height !== undefined
                            ? clampDimension(size.height, current.height)
                            : current.height,
                },
            });
        },

        resetSettings: () => commit({ ...DEFAULT_SETTINGS }),

        updateSetting: (key, value) => commit({ [key]: value } as Partial<Settings>),
        applyTheme: (mode) => applyTheme(mode),
        opendbSave: () => persist(get().settings),
    };
};
