/**
 * Laser pointer trail (Excalidraw / FigJam laser): what the pointer drew in the last second, fading
 * out. Nothing here is part of the document.
 */
export const LASER_LIFE_MS = 1000;

export type LaserPoint = { x: number; y: number; t: number };
export type LaserStroke = LaserPoint[];

/** The strokes with only the points still alive at `now`; empty strokes are dropped. */
export function liveLaserStrokes(strokes: readonly LaserStroke[], now: number): LaserStroke[] {
    return strokes
        .map((stroke) => stroke.filter((p) => now - p.t <= LASER_LIFE_MS))
        .filter((stroke) => stroke.length > 0);
}

/** 1 when just drawn, 0 at the end of its life. */
export const laserAlpha = (age: number): number =>
    Math.min(1, Math.max(0, 1 - age / LASER_LIFE_MS));
