/**
 * Animated symmetry: the linked families on the page (a source + its copies) move as one pattern.
 * - spin: the whole pattern turns once per period around its centre;
 * - pulse: copies breathe (size + opacity) in a wave around the circle;
 * - swirl: copies twist around the centre, further for later copies (a kaleidoscope swirl).
 * Every effect is periodic, so exporting one period gives a seamless looping GIF. Sound (microphone, or an
 * audio file the user picks) adds energy live: louder = faster spin / bigger pulse. Poses are applied without
 * canvas events and the exact starting state is restored on stop (never in history or saved files); any click
 * on the board, a page switch or closing the panel stops it.
 */
import * as fabric from 'fabric';
import { multiply, rotation, similarity, type Matrix, type Pt } from '@/lib/canvas/symmetryMath';
import { downloadBlob } from '@/lib/export/downloadBlob';
import type { SymmetryPeers } from '../createSymmetrySlice';
import { findById, linkOf } from './symmetryLinks';

export type SymmetryAnimEffect = 'spin' | 'pulse' | 'swirl';
export type SymmetryAnimSettings = { effect: SymmetryAnimEffect; period: number; amount: number };

export interface SymmetryAnimationActions {
    symmetryAnim: SymmetryAnimSettings;
    symmetryAnimating: boolean;
    symmetrySound: 'off' | 'mic' | 'file';
    setSymmetryAnim: (patch: Partial<SymmetryAnimSettings>) => void;
    playSymmetryAnimation: () => boolean;
    stopSymmetryAnimation: () => void;
    /** Sound input: 'mic' asks for the microphone; 'file' plays `file`; 'off' stops listening. */
    listenSymmetrySound: (kind: 'off' | 'mic' | 'file', file?: File) => Promise<boolean>;
    /** One period as a looping GIF (download). */
    exportSymmetryLoop: () => Promise<boolean>;
}

type Set = (partial: Record<string, unknown>, replace: false, action: string) => void;

const KEYS = [
    'left',
    'top',
    'scaleX',
    'scaleY',
    'angle',
    'skewX',
    'skewY',
    'flipX',
    'flipY',
    'opacity',
] as const;
type Pose = {
    obj: fabric.FabricObject;
    base: Record<string, unknown>;
    m: Matrix;
    k: number;
    n: number;
    c: Pt;
};

/** Every linked family on the canvas, as poses (source k = 0). */
export function familyPoses(canvas: fabric.Canvas): Pose[] {
    const out: Pose[] = [];
    const sources = new Set<fabric.FabricObject>();
    for (const o of canvas.getObjects()) {
        const l = linkOf(o);
        if (!l) continue;
        out.push({
            obj: o,
            base: {},
            m: o.calcTransformMatrix() as Matrix,
            k: l.k,
            n: l.n,
            c: l.c,
        });
        const src = findById(canvas, l.src);
        if (src && !sources.has(src)) {
            sources.add(src);
            out.push({
                obj: src,
                base: {},
                m: src.calcTransformMatrix() as Matrix,
                k: 0,
                n: l.n,
                c: l.c,
            });
        }
    }
    for (const p of out) for (const key of KEYS) p.base[key] = p.obj[key];
    return out;
}

/** Puts every pose at time `t` (ms); `energy` 0–1 from sound. */
export function applyPoses(poses: Pose[], s: SymmetryAnimSettings, t: number, energy = 0): void {
    const period = Math.max(0.5, s.period) * 1000;
    const phase = (2 * Math.PI * t) / period;
    const amount = Math.min(1, s.amount + energy * 0.6);
    for (const p of poses) {
        const share = (p.k + 1) / (p.n + 1);
        let a: Matrix;
        let opacity = Number(p.base.opacity ?? 1);
        if (s.effect === 'spin') a = rotation(p.c, (360 * t) / period + energy * 25);
        else if (s.effect === 'swirl') a = rotation(p.c, amount * 45 * Math.sin(phase) * share);
        else {
            const wave = Math.sin(phase + 2 * Math.PI * share);
            opacity *= 0.7 + 0.3 * (0.5 + 0.5 * wave);
            // centre of scaling = the copy's own centre at its base pose
            const base = fabric.util.transformPoint(new fabric.Point(0, 0), p.m);
            a = similarity({ x: base.x, y: base.y }, 0, 1 + amount * 0.35 * wave);
        }
        fabric.util.applyTransformToObject(p.obj, multiply(a, p.m));
        p.obj.set({ opacity });
        p.obj.setCoords();
    }
}

export const restorePoses = (poses: Pose[]) => {
    for (const p of poses) {
        p.obj.set(p.base);
        p.obj.setCoords();
    }
};

export function createSymmetryAnimation(set: Set, peers: () => SymmetryPeers) {
    let poses: Pose[] = [];
    let frame = 0;
    let started = 0;
    let offDown: (() => void) | null = null;
    let audio: {
        ctx: AudioContext;
        analyser: AnalyserNode;
        stop: () => void;
        data: Uint8Array;
    } | null = null;
    let energy = 0;
    const toast = (message: string) => peers().showToast?.({ message });

    const level = () => {
        if (!audio) return 0;
        audio.analyser.getByteTimeDomainData(audio.data as Uint8Array<ArrayBuffer>);
        let sum = 0;
        for (const v of audio.data) sum += ((v - 128) / 128) ** 2;
        const rms = Math.sqrt(sum / audio.data.length);
        energy = energy * 0.8 + Math.min(1, rms * 4) * 0.2;
        return energy;
    };

    const stop = () => {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        offDown?.();
        offDown = null;
        const canvas = peers().canvas;
        restorePoses(poses);
        poses = [];
        canvas?.requestRenderAll();
        if (peers().symmetryAnimating)
            set({ symmetryAnimating: false }, false, 'symmetry/animStop');
    };

    const tick = (now: number) => {
        const s = peers();
        const canvas = s.canvas;
        if (!canvas || s.isPageSwitching || !s.symmetryPanelOpen) return stop();
        applyPoses(poses, s.symmetryAnim, now - started, level());
        canvas.requestRenderAll();
        frame = requestAnimationFrame(tick);
    };

    const closeAudio = () => {
        audio?.stop();
        audio = null;
        energy = 0;
    };

    return {
        stop,
        closeAudio,
        actions: {
            symmetryAnim: { effect: 'spin', period: 4, amount: 0.5 },
            symmetryAnimating: false,
            symmetrySound: 'off',

            setSymmetryAnim: (patch) => {
                const prev = peers().symmetryAnim;
                const effect = ['spin', 'pulse', 'swirl'].includes(String(patch.effect))
                    ? patch.effect!
                    : prev.effect;
                const num = (v: unknown, d: number, lo: number, hi: number) =>
                    typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d;
                set(
                    {
                        symmetryAnim: {
                            effect,
                            period: num(patch.period, prev.period, 1, 20),
                            amount: num(patch.amount, prev.amount, 0, 1),
                        },
                    },
                    false,
                    'symmetry/anim',
                );
            },

            playSymmetryAnimation: () => {
                const canvas = peers().canvas;
                if (!canvas || peers().symmetryAnimating) return false;
                canvas.discardActiveObject();
                poses = familyPoses(canvas);
                if (!poses.length) {
                    toast(
                        'Animation moves linked copies: draw with "Keep copies linked" on first.',
                    );
                    return false;
                }
                set({ symmetryAnimating: true }, false, 'symmetry/animPlay');
                started = performance.now();
                offDown = canvas.on('mouse:down:before', () => stop());
                frame = requestAnimationFrame(tick);
                return true;
            },

            stopSymmetryAnimation: () => stop(),

            listenSymmetrySound: async (kind, file) => {
                closeAudio();
                if (kind === 'off') {
                    set({ symmetrySound: 'off' }, false, 'symmetry/sound');
                    return true;
                }
                try {
                    const ctx = new AudioContext();
                    const analyser = ctx.createAnalyser();
                    analyser.fftSize = 1024;
                    const data = new Uint8Array(analyser.fftSize);
                    if (kind === 'mic') {
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        ctx.createMediaStreamSource(stream).connect(analyser);
                        audio = {
                            ctx,
                            analyser,
                            data,
                            stop: () => {
                                stream.getTracks().forEach((t) => t.stop());
                                void ctx.close();
                            },
                        };
                    } else {
                        if (!file) return false;
                        const url = URL.createObjectURL(file);
                        const el = new Audio(url);
                        el.loop = true;
                        const src = ctx.createMediaElementSource(el);
                        src.connect(analyser);
                        analyser.connect(ctx.destination);
                        await el.play();
                        audio = {
                            ctx,
                            analyser,
                            data,
                            stop: () => {
                                el.pause();
                                URL.revokeObjectURL(url);
                                void ctx.close();
                            },
                        };
                    }
                    set({ symmetrySound: kind }, false, 'symmetry/sound');
                    return true;
                } catch (err) {
                    console.error('[symmetry] sound input failed', err);
                    toast(
                        kind === 'mic'
                            ? 'The microphone is blocked or missing.'
                            : 'This audio file could not be played.',
                    );
                    set({ symmetrySound: 'off' }, false, 'symmetry/sound');
                    return false;
                }
            },

            exportSymmetryLoop: async () => {
                const canvas = peers().canvas;
                if (!canvas) return false;
                stop();
                const loopPoses = familyPoses(canvas);
                if (!loopPoses.length) {
                    toast(
                        'Animation moves linked copies: draw with "Keep copies linked" on first.',
                    );
                    return false;
                }
                const helpers = canvas
                    .getObjects()
                    .filter(
                        (o) => (o as unknown as Record<string, unknown>)._isHelper && o.visible,
                    );
                helpers.forEach((h) => h.set({ visible: false }));
                const settings = peers().symmetryAnim;
                const scale = Math.min(1, 720 / Math.max(canvas.getWidth(), canvas.getHeight()));
                try {
                    toast('Making the looping GIF…');
                    const { renderGif } = await import('@/animation/gif/renderGif');
                    const blob = await renderGif({
                        canvas,
                        from: 0,
                        to: settings.period * 1000,
                        fps: 20,
                        width: Math.round(canvas.getWidth() * scale),
                        height: Math.round(canvas.getHeight() * scale),
                        background:
                            typeof canvas.backgroundColor === 'string' && canvas.backgroundColor
                                ? canvas.backgroundColor
                                : '#ffffff',
                        loop: true,
                        dither: false,
                        transparent: false,
                        renderFrame: (t) => applyPoses(loopPoses, settings, t, 0),
                    });
                    downloadBlob(blob, 'symmetry-loop.gif');
                    return true;
                } catch (err) {
                    console.error('[symmetry] loop export failed', err);
                    toast('The loop could not be exported.');
                    return false;
                } finally {
                    restorePoses(loopPoses);
                    helpers.forEach((h) => h.set({ visible: true }));
                    canvas.requestRenderAll();
                }
            },
        } satisfies SymmetryAnimationActions,
    };
}
