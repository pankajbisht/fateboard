export const createContextMenu = (set, get) => ({
    visible: false,
      x: 0,
      y: 0,
      items: [],

      openMenu: (x, y, items) => {
        // prevent overflow
        const MENU_WIDTH = 220;
        const MENU_HEIGHT = items.length * 36;

        const posX = Math.min(x, window.innerWidth - MENU_WIDTH);
        const posY = Math.min(y, window.innerHeight - MENU_HEIGHT);

        set({
          visible: true,
          x: posX,
          y: posY,
          items,
        });
      },

      closeMenu: () =>
        set({
          visible: false,
        }),
})
