type Box = { left: number; top: number; right: number; bottom: number };
type Size = { width: number; height: number };

/** A popover's size for `placeBeside`. */
export const sizeOf = (el: HTMLElement): Size => ({
    width: el.offsetWidth,
    height: el.offsetHeight,
});

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, Math.max(lo, hi)));

/**
 * Where to put a fixed popover next to the button that opened it (the dock's color tools), always
 * inside the window: left of the button (the dock on the right edge), else right of it, else above
 * it, else below it (a bar under the board on an upright phone, BUG-219), else pinned to the edge.
 */
export function placeBeside(
    anchor: Box,
    size: Size,
    view: Size = { width: window.innerWidth, height: window.innerHeight },
    gap = 6,
    edge = 8,
) {
    const sideTop = clamp(anchor.top, edge, view.height - size.height - edge);
    if (anchor.left - gap - size.width >= edge)
        return { left: anchor.left - gap - size.width, top: sideTop };
    if (anchor.right + gap + size.width <= view.width - edge)
        return { left: anchor.right + gap, top: sideTop };

    const centre = (anchor.left + anchor.right) / 2 - size.width / 2;
    const left = clamp(centre, edge, view.width - size.width - edge);
    if (anchor.top - gap - size.height >= edge)
        return { left, top: anchor.top - gap - size.height };
    if (anchor.bottom + gap + size.height <= view.height - edge)
        return { left, top: anchor.bottom + gap };
    return { left, top: sideTop };
}
