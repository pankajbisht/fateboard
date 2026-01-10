// export type BackgroundStyle = 'none' | 'grid' | 'ruled' | 'dots' | 'isometric';

const initialValues = {
    mode: 'dark',
    iconSize: 'sm', // small, middium, large
    backgroundStyle1: 'ruled',
    orientation: 'LANDSCAPE',
    freehand: false,
};

export const createSettingSlice = (set, get, store) => ({
    ...initialValues,

    load: () => {
        if (get().freehand) {
            set({
                format: 'FREEHAND',
            });
        } else {
            set({
                format: 'A4',
            });
        }
    },
});
