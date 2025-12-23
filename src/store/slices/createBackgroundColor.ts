import tailwindcolors from "tailwindcss/colors";

function tailwindBgToHex(bgClass) {
      const [, color, shade] = bgClass.split("-");
      return tailwindcolors[color]?.[shade];
}


export const createBackgroundColor = (set, get) => ({
    backgroundColor: "#ff0000",
    borderColor: "#000000",
    borderWidth: "1",
    borderStyle: "solid",

    setBackgroundColor: (bgColor) => {
        const canvas = get().canvas;
        if (!canvas) return;

        const color = tailwindBgToHex(bgColor);
        if (!color) return;

        const obj = canvas.getActiveObject();
        if (!obj) return;

        obj.set("fill", color);
        canvas.requestRenderAll();

        set({ backgroundColor: bgColor });
    }
})
