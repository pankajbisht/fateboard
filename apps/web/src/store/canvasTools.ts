import { sprayToolFor, type SprayStyle } from './sprayStyle';

/**
 * The canvas tools (`activeTool`, `setActiveTool`). Pen (P), Pencil (Shift + P) and Laser (K) work with
 * `createDrawingToolsSlice` / the brush slice; Spray (its Copy mode = the `copySpray` tool), Paint bucket, Lasso and Drafter with
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

/** The tool `setActiveTool` really opens: Spray in Copy mode is the copy-spray tool underneath. */
export const resolveTool = (tool: CanvasTool, state: { sprayStyle?: SprayStyle }): CanvasTool =>
    tool === 'spray' ? sprayToolFor(state.sprayStyle?.mode) : tool;
