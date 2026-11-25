/** Small 3D math for the rig: vectors as [x, y, z], 3 × 3 rotation matrices row-major. Pure. */
export type V3 = [number, number, number];
export type M3 = number[];

const RAD = Math.PI / 180;

export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
];
export const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
export const dist = (a: V3, b: V3) => len(sub(a, b));
export const normalize = (a: V3): V3 => {
    const l = len(a);
    return l > 1e-9 ? scale(a, 1 / l) : [0, 0, 0];
};
export const lerp3 = (a: V3, b: V3, t: number): V3 => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
];

export const IDENTITY: M3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

export function mul(a: M3, b: M3): M3 {
    const o = new Array<number>(9);
    for (let r = 0; r < 3; r++)
        for (let c = 0; c < 3; c++)
            o[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
    return o;
}

export const apply = (m: M3, v: V3): V3 => [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];

export const transpose = (m: M3): M3 => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];

export function rotX(deg: number): M3 {
    const c = Math.cos(deg * RAD);
    const s = Math.sin(deg * RAD);
    return [1, 0, 0, 0, c, -s, 0, s, c];
}
export function rotY(deg: number): M3 {
    const c = Math.cos(deg * RAD);
    const s = Math.sin(deg * RAD);
    return [c, 0, s, 0, 1, 0, -s, 0, c];
}
export function rotZ(deg: number): M3 {
    const c = Math.cos(deg * RAD);
    const s = Math.sin(deg * RAD);
    return [c, -s, 0, s, c, 0, 0, 0, 1];
}

/** The rig's Euler convention: R = Ry(y) · Rx(x) · Rz(z) (degrees). */
export const fromEuler = (e: { x: number; y: number; z: number }): M3 =>
    mul(rotY(e.y), mul(rotX(e.x), rotZ(e.z)));

/** Angle difference on the shortest way, in (-180, 180]. */
export const wrapDeg = (d: number) => {
    const w = ((((d + 180) % 360) + 360) % 360) - 180;
    return w === -180 ? 180 : w;
};
