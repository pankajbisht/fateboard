/**
 * The canvas tools (`activeTool`, `setActiveTool`). Pen (P), Pencil (Shift + P) and Laser (K) work with
 * `createDrawingToolsSlice` / the brush slice; Spray, Copy spray, Paint bucket, Lasso and Drafter with
 * `createPaintToolsSlice`; Note (N) with
 * `createNotesSlice`. The toolbar commands (ToolBarConfig) use the same names.
 */
export type CanvasTool =
    | 'select'
    | 'pan'
    | 'draw'
    | 'node'
    | 'pen'
    | 'pencil'
    | 'laser'
    | 'spray'
    | 'copySpray'
    | 'bucket'
    | 'lasso'
    | 'drafter'
    | 'note';
