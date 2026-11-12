/** Reading a gallery SVG: its build steps and the colours worth copying. Pure, no DOM. */

const STEP_GROUP = /<g id="step-\d+">/g;
const COLOUR = /(?:fill|stroke|stop-color)="(#[0-9a-fA-F]{6})"/g;
/** Too plain to be worth a swatch. */
const SKIP = new Set(['#ffffff', '#000000']);

/** How many `<g id="step-N">` build steps the artwork has. */
export const countSteps = (svg: string) => svg.match(STEP_GROUP)?.length ?? 0;

/** The artwork's most used colours, most used first. */
export function extractPalette(svg: string, max = 8): string[] {
    const counts = new Map<string, number>();
    for (const [, hex] of svg.matchAll(COLOUR)) {
        const colour = hex!.toLowerCase();
        if (!SKIP.has(colour)) counts.set(colour, (counts.get(colour) ?? 0) + 1);
    }
    return [...counts]
        .sort((a, b) => b[1] - a[1])
        .slice(0, max)
        .map(([colour]) => colour);
}
