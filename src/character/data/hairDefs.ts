import type { HairStyle } from '../schema/types';
import type { HairBlob, HairDef } from './hairStyles';

/** The 44 hairstyles as records (the shape of a record is described in hairStyles.ts). */
const spikes = (n: number): HairBlob[] =>
    Array.from({ length: n }, (_, i) => {
        const t = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
        return { at: [t * 0.62, 1.12 - Math.abs(t) * 0.22, 0.15], r: [0.13, 0.42, 0.13] };
    });

/** Bumps round the top of the head (curls, tufts): they scallop the outline. */
const bumps = (n: number, ring: number, size: number, from = -85, to = 85): HairBlob[] =>
    Array.from({ length: n }, (_, i) => {
        const a = ((from + ((to - from) * i) / (n - 1)) * Math.PI) / 180;
        return {
            at: [Math.sin(a) * ring, Math.cos(a) * ring * 0.95 + 0.05, -0.05],
            r: [size, size, size * 1.6],
        };
    });

const locks = (n: number, tip = false): HairBlob[] =>
    Array.from({ length: n }, (_, i) => {
        const t = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
        return {
            at: [t * 1.0, -0.65, -0.35 - (1 - Math.abs(t)) * 0.5],
            r: [0.12, 1.15, 0.12],
            tip,
        };
    });

export const HAIR_DEFS: Record<HairStyle, HairDef> = {
    bald: { name: 'Bald', group: 'Short', suits: 'any', cap: null, back: null },
    buzz: {
        name: 'Buzz cut',
        group: 'Short',
        suits: 'any',
        cap: { vol: 0.95, top: 0.35, fringe: 'none' },
        back: null,
    },
    crew: {
        name: 'Crew cut',
        group: 'Short',
        suits: 'any',
        cap: { vol: 0.98, top: 0.3, fringe: 'none' },
        back: { floor: -0.2, vol: 0.97 },
    },
    short: {
        name: 'Short',
        group: 'Short',
        suits: 'any',
        cap: { top: 0.3, fringe: 'straight' },
        back: { floor: -0.55 },
    },
    'side-part': {
        name: 'Side part',
        group: 'Short',
        suits: 'masculine',
        cap: { top: 0.25, fringe: 'side' },
        back: { floor: -0.45 },
    },
    quiff: {
        name: 'Quiff',
        group: 'Short',
        suits: 'masculine',
        cap: { lift: 0.14, top: 0.3, fringe: 'swept' },
        back: { floor: -0.35 },
    },
    pompadour: {
        name: 'Pompadour',
        group: 'Short',
        suits: 'masculine',
        cap: { lift: 0.26, vol: 1.04, top: 0.3, fringe: 'swept' },
        back: { floor: -0.3 },
    },
    undercut: {
        name: 'Undercut',
        group: 'Short',
        suits: 'any',
        cap: { lift: 0.1, top: 0.45, fringe: 'swept' },
        back: { floor: 0.05, vol: 0.97 },
    },
    spiky: {
        name: 'Spiky',
        group: 'Short',
        suits: 'masculine',
        cap: { top: 0.4, fringe: 'wispy' },
        back: { floor: -0.3 },
        blobs: spikes(5),
    },
    mohawk: {
        name: 'Mohawk',
        group: 'Short',
        suits: 'any',
        cap: null,
        back: null,
        blobs: [{ at: [0, 0.95, -0.05], r: [0.14, 0.55, 0.62] }],
    },
    'faux-hawk': {
        name: 'Faux hawk',
        group: 'Short',
        suits: 'masculine',
        cap: { lift: 0.12, top: 0.5, fringe: 'swept' },
        back: { floor: 0 },
        blobs: [{ at: [0, 1.05, 0.1], r: [0.2, 0.4, 0.5] }],
    },
    bowl: {
        name: 'Bowl cut',
        group: 'Short',
        suits: 'any',
        cap: { vol: 1.03, top: 0.0, fringe: 'low' },
        back: { floor: -0.2, vol: 1.04 },
    },
    messy: {
        name: 'Messy',
        group: 'Short',
        suits: 'any',
        cap: { vol: 1.08, lift: 0.06, top: 0.2, fringe: 'wispy' },
        back: { floor: -0.4, vol: 1.08 },
        blobs: bumps(4, 1.1, 0.2, -50, 70),
    },
    curtains: {
        name: 'Curtains',
        group: 'Short',
        suits: 'any',
        cap: { top: 0.2, fringe: 'center' },
        back: { floor: -0.45, vol: 1.03 },
    },
    bob: {
        name: 'Bob',
        group: 'Medium',
        suits: 'feminine',
        cap: { top: 0.2, fringe: 'low' },
        back: { floor: -0.3, hang: 1.2 },
    },
    'long-bob': {
        name: 'Long bob',
        group: 'Medium',
        suits: 'feminine',
        cap: { top: 0.2, fringe: 'side' },
        back: { floor: -0.3, hang: 1.6, flare: 1.05 },
    },
    pixie: {
        name: 'Pixie',
        group: 'Medium',
        suits: 'feminine',
        cap: { lift: 0.05, top: 0.25, fringe: 'swept' },
        back: { floor: -0.05, vol: 0.98 },
    },
    shag: {
        name: 'Shag',
        group: 'Medium',
        suits: 'any',
        cap: { vol: 1.08, top: 0.2, fringe: 'wispy' },
        back: { floor: -0.3, hang: 1.0, flare: 1.18 },
    },
    mullet: {
        name: 'Mullet',
        group: 'Medium',
        suits: 'masculine',
        cap: { top: 0.3, fringe: 'wispy' },
        back: { floor: -0.4, hang: 1.5, flare: 0.7 },
    },
    'wavy-medium': {
        name: 'Wavy',
        group: 'Medium',
        suits: 'any',
        cap: { vol: 1.05, top: 0.2, fringe: 'side' },
        back: { floor: -0.3, hang: 1.8, flare: 1.22 },
    },
    shoulder: {
        name: 'Shoulder length',
        group: 'Medium',
        suits: 'any',
        cap: { top: 0.2, fringe: 'straight' },
        back: { floor: -0.3, hang: 2.0 },
    },
    'center-part': {
        name: 'Centre part',
        group: 'Medium',
        suits: 'any',
        cap: { top: 0.2, fringe: 'center' },
        back: { floor: -0.3, hang: 2.1 },
    },
    long: {
        name: 'Long',
        group: 'Long',
        suits: 'feminine',
        cap: { top: 0.3, fringe: 'straight' },
        back: { floor: -0.55, hang: 2.2 },
    },
    'long-straight': {
        name: 'Long, straight',
        group: 'Long',
        suits: 'feminine',
        cap: { top: 0.2, fringe: 'low' },
        back: { floor: -0.3, hang: 2.9, flare: 0.95 },
    },
    'very-long': {
        name: 'Very long',
        group: 'Long',
        suits: 'feminine',
        cap: { top: 0.2, fringe: 'center' },
        back: { floor: -0.3, hang: 3.8, flare: 0.95 },
    },
    layered: {
        name: 'Layered',
        group: 'Long',
        suits: 'feminine',
        cap: { vol: 1.04, top: 0.2, fringe: 'side' },
        back: { floor: -0.3, hang: 2.5, flare: 1.18 },
    },
    'side-bangs': {
        name: 'Long, side bangs',
        group: 'Long',
        suits: 'feminine',
        cap: { top: 0.15, fringe: 'side' },
        back: { floor: -0.3, hang: 2.7 },
    },
    'wavy-long': {
        name: 'Long, wavy',
        group: 'Long',
        suits: 'feminine',
        cap: { vol: 1.06, top: 0.2, fringe: 'center' },
        back: { floor: -0.3, hang: 2.7, flare: 1.32 },
    },
    'ponytail-high': {
        name: 'High ponytail',
        group: 'Tied up',
        suits: 'any',
        cap: { top: 0.3, fringe: 'swept' },
        back: { floor: -0.2 },
        blobs: [{ at: [0, 0.35, -1.15], r: [0.3, 1.0, 0.3], tip: true }],
    },
    'ponytail-low': {
        name: 'Low ponytail',
        group: 'Tied up',
        suits: 'any',
        cap: { top: 0.3, fringe: 'side' },
        back: { floor: -0.4 },
        blobs: [{ at: [0, -0.75, -1.1], r: [0.28, 0.95, 0.28], tip: true }],
    },
    'side-ponytail': {
        name: 'Side ponytail',
        group: 'Tied up',
        suits: 'feminine',
        cap: { top: 0.3, fringe: 'side' },
        back: { floor: -0.35 },
        blobs: [{ at: [0.95, -0.35, -0.4], r: [0.3, 0.95, 0.3], tip: true }],
    },
    pigtails: {
        name: 'Pigtails',
        group: 'Tied up',
        suits: 'feminine',
        cap: { top: 0.3, fringe: 'straight' },
        back: { floor: -0.25 },
        blobs: [
            { at: [-1.08, -0.35, -0.15], r: [0.3, 0.85, 0.3], tip: true },
            { at: [1.08, -0.35, -0.15], r: [0.3, 0.85, 0.3], tip: true },
        ],
    },
    'space-buns': {
        name: 'Space buns',
        group: 'Tied up',
        suits: 'feminine',
        cap: { top: 0.3, fringe: 'center' },
        back: { floor: -0.2 },
        blobs: [
            { at: [-0.62, 1.0, -0.15], r: [0.4, 0.4, 0.4] },
            { at: [0.62, 1.0, -0.15], r: [0.4, 0.4, 0.4] },
        ],
    },
    bun: {
        name: 'Bun',
        group: 'Tied up',
        suits: 'feminine',
        cap: { top: 0.3, fringe: 'straight' },
        back: { floor: -0.55 },
        blobs: [{ at: [0, 0.85, -0.75], r: [0.42, 0.36, 0.4] }],
    },
    'bun-low': {
        name: 'Low bun',
        group: 'Tied up',
        suits: 'any',
        cap: { top: 0.3, fringe: 'center' },
        back: { floor: -0.35 },
        blobs: [{ at: [0, -0.2, -1.0], r: [0.42, 0.4, 0.36] }],
    },
    topknot: {
        name: 'Top knot',
        group: 'Tied up',
        suits: 'masculine',
        cap: { top: 0.45, fringe: 'swept' },
        back: { floor: 0 },
        blobs: [{ at: [0, 1.25, -0.1], r: [0.3, 0.36, 0.3] }],
    },
    braid: {
        name: 'Braid',
        group: 'Tied up',
        suits: 'feminine',
        cap: { top: 0.3, fringe: 'side' },
        back: { floor: -0.4 },
        blobs: [{ at: [0, -0.9, -1.05], r: [0.2, 1.2, 0.22], tip: true }],
    },
    'double-braids': {
        name: 'Double braids',
        group: 'Tied up',
        suits: 'feminine',
        cap: { top: 0.3, fringe: 'center' },
        back: { floor: -0.35 },
        blobs: [
            { at: [-0.82, -0.9, -0.55], r: [0.2, 1.1, 0.22], tip: true },
            { at: [0.82, -0.9, -0.55], r: [0.2, 1.1, 0.22], tip: true },
        ],
    },
    afro: {
        name: 'Afro',
        group: 'Curly',
        suits: 'any',
        cap: { vol: 1.4, lift: 0.24, top: -0.15, fringe: 'none' },
        back: { floor: -0.5, vol: 1.42 },
        blobs: bumps(11, 1.46, 0.34, -95, 95),
    },
    'curly-short': {
        name: 'Curly, short',
        group: 'Curly',
        suits: 'any',
        cap: { vol: 1.14, lift: 0.08, top: 0.1, fringe: 'wispy' },
        back: { floor: -0.4, vol: 1.14 },
        blobs: bumps(9, 1.22, 0.26, -90, 90),
    },
    'curly-long': {
        name: 'Curly, long',
        group: 'Curly',
        suits: 'any',
        cap: { vol: 1.18, lift: 0.08, top: 0.1, fringe: 'wispy' },
        back: { floor: -0.4, hang: 1.9, flare: 1.45, vol: 1.18 },
        blobs: bumps(9, 1.2, 0.26, -90, 90),
    },
    dreadlocks: {
        name: 'Dreadlocks',
        group: 'Curly',
        suits: 'any',
        cap: { vol: 1.04, top: 0.2, fringe: 'wispy' },
        back: { floor: -0.3 },
        blobs: locks(7, true),
    },
    receding: {
        name: 'Receding',
        group: 'Older',
        suits: 'masculine',
        cap: { top: 0.62, fringe: 'none' },
        back: { floor: -0.45 },
    },
    balding: {
        name: 'Balding',
        group: 'Older',
        suits: 'masculine',
        cap: null,
        back: { floor: -0.1, ceil: 0.3 },
    },
    // manga styles
    hime: {
        name: 'Hime cut (blunt bangs, side locks)',
        group: 'Long',
        suits: 'feminine',
        cap: { top: 0.15, fringe: 'low' },
        back: { floor: -0.3, hang: 3.2, flare: 0.9 },
        // the chin-length side locks, cut straight across
        blobs: [
            { at: [0.98, -0.55, 0.3], r: [0.16, 0.72, 0.2] },
            { at: [-0.98, -0.55, 0.3], r: [0.16, 0.72, 0.2] },
        ],
    },
    'spiky-long': {
        name: 'Spiky, long (shonen)',
        group: 'Medium',
        suits: 'masculine',
        cap: { top: 0.3, fringe: 'wispy', vol: 1.04 },
        // a short back shell, then pointed spikes: up and out over the crown, down and out at the back
        back: { floor: -0.45, vol: 1.05 },
        blobs: [
            ...[-0.75, -0.4, 0, 0.4, 0.75].map((x): HairBlob => ({
                at: [x * 0.8, 0.85 - Math.abs(x) * 0.2, -0.1],
                r: [0.22, 0.22, 0.22],
                apex: [x * 1.5, 1.55 - Math.abs(x) * 0.35, -0.15],
            })),
            ...[-1, -0.5, 0, 0.5, 1].map((x): HairBlob => ({
                at: [x * 0.85, -0.45, -0.75 + Math.abs(x) * 0.35],
                r: [0.2, 0.25, 0.2],
                apex: [x * 1.35, -1.35 + Math.abs(x) * 0.15, -0.9 + Math.abs(x) * 0.45],
            })),
        ],
    },
};
