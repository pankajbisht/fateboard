export const createUISlice = (set, get) => ({
    activePanel: null,
    setActivePanel: (panelId) => set({ activePanel: panelId }),

    toolbarPosition: 'left',
    setToolbarPosition: (pos) => set({ toolbarPosition: pos })
});
