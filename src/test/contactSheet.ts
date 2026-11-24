/**
 * A contact sheet of rendered characters (docs/CHARACTER_STUDIO.md, reference pass): one SVG with a labelled cell per
 * render, to compare our figures with the owner's reference sheets side by side. Test helper; never shipped.
 */
export interface SheetCell {
    svg: string;
    label: string;
}

export function contactSheet(cells: SheetCell[], cols = 6, w = 200, h = 320): string {
    const rows = Math.ceil(cells.length / cols);
    const body = cells
        .map((c, i) => {
            const x = (i % cols) * w;
            const y = Math.floor(i / cols) * h;
            const end = c.svg.indexOf('>');
            const open = c.svg.slice(0, end).replace(/ (width|height)="[^"]*"/g, '');
            const inner = `${open} x="${x}" y="${y + 16}" width="${w}" height="${h - 16}"${c.svg.slice(end)}`;
            return `${inner}<text x="${x + 4}" y="${y + 12}" font-size="11" font-family="sans-serif">${c.label}</text>`;
        })
        .join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * w}" height="${rows * h}"><rect width="100%" height="100%" fill="#fff"/>${body}</svg>`;
}
