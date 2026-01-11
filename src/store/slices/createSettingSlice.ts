// export type BackgroundStyle = 'none' | 'grid' | 'ruled' | 'dots' | 'isometric';

import db from 'opendb-store';

const initialValues = {
    mode: 'dark',
    iconSize: 'md', // small, middium, large
    backgroundStyle1: 'ruled',
    orientation: 'LANDSCAPE',
    freehand: false,
    format: 'A4',
};

export const createSettingSlice = (set, get, store) => ({
    settings: {
        ...initialValues,
    },

    load: () => {
        console.log('here');
        console.log(db);
        // db.config.createNamespace('FateBoard')
        // db.config.switchNamespace('FateBoard')
        //
        // if (get().settings.freehand) {
        //     set({ format: 'FREEHAND' })
        // } else {
        //     set({ format: 'A4' })
        // }
    },

    setMode: (mode) => {
        console.log(mode);
        set((state) => ({
            settings: {
                ...state.settings,
                mode,
            },
        }));
        get().applyTheme(mode);
        get().opendbSave();
    },

    applyTheme: (mode) => {
        const root = document.documentElement;

        const finalMode =
            mode === 'system'
                ? window.matchMedia('(prefers-color-scheme: dark)').matches
                    ? 'dark'
                    : 'light'
                : mode;

        root.classList.toggle('dark', finalMode === 'dark');
    },

    toggleFreehand: () => {
        set((s) => {
            const next = !s.settings.freehand; // flip the current value
            const updated = {
                ...s.settings,
                freehand: next,
                format: next ? 'FREEHAND' : 'A4', // update derived value
            };
            return { settings: updated };
        });

        get().opendbSave();
    },

    hydrate: (data) => {
        // set({ ...initialValues, ...data });
        set({ settings: { ...initialValues, ...data } });
    },

    updateSetting: (key, value) => {
        set((s) => ({
            settings: { ...s.settings, [key]: value },
        }));
        get().opendbSave();
    },

    setFormat: (format) => {
        set((s) => {
            if (s.settings.freehand) return {}; // block changes
            return {
                settings: {
                    ...s.settings,
                    format,
                },
            };
        });
        get().opendbSave();
    },

    setOrientation: (orientation) => {
        set((s) => {
            if (s.settings.freehand) return {}; // ❌ block in freehand
            return {
                settings: {
                    ...s.settings,
                    orientation,
                },
            };
        });
        get().opendbSave();
    },

    opendbSave: () => {
        const { settings } = get();
        db.local.set('fateboard-settings', settings);
    },
});
