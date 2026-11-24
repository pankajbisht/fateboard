import { createRegistry } from '../registry';
import type { Scene, SceneCamera, V3 } from '../schema/types';
import { buildSkeleton } from '@/character/rig/skeleton';
import { forward, makeView, project } from './projection';

/**
 * Named views (docs/CHARACTER_STUDIO.md §7): one click puts the camera where a director would, framing the
 * actors (or the stage when there are none). Each view is data + a small function, in one registry.
 */
export interface ViewCtx {
    /** centre of the actors on the ground */
    target: V3;
    /** how wide the group is (cm) */
    spread: number;
    /** the tallest actor (cm) */
    tallest: number;
    scene: Scene;
    /** the actor the view is about (over-the-shoulder, POV): the selected one, else the first */
    subject: string | null;
}

export interface ViewDef {
    id: string;
    name: string;
    tags: readonly string[];
    make(ctx: ViewCtx): SceneCamera;
}

const DEG = Math.PI / 180;

/** A perspective camera at `yaw` / `pitch` looking at `look`, far enough to fit `width` × `height` cm. */
function orbit(
    look: V3,
    yaw: number,
    pitch: number,
    width: number,
    height: number,
    focalMm = 35,
): SceneCamera {
    const halfW = 18 / focalMm;
    const halfH = (18 * 9) / 16 / focalMm;
    const d = Math.max(width / 2 / halfW, height / 2 / halfH) * 1.15;
    const p: V3 = [
        look[0] + Math.sin(yaw * DEG) * Math.cos(pitch * DEG) * d,
        Math.max(5, look[1] + Math.sin(pitch * DEG) * d),
        look[2] + Math.cos(yaw * DEG) * Math.cos(pitch * DEG) * d,
    ];
    return { position: p, yaw, pitch, roll: 0, lens: { kind: 'perspective', focalMm } };
}

const actorById = (c: ViewCtx, id: string | null) =>
    c.scene.actors.find((a) => a.id === id) ?? c.scene.actors[0];

/** The camera behind `from`'s shoulder (or at its eyes) looking at the nearest other actor. */
function behind(c: ViewCtx, pov: boolean): SceneCamera {
    const a = actorById(c, c.subject);
    if (!a) return orbit([c.target[0], 100, c.target[2]], 0, 4, c.spread + 200, c.tallest + 40);
    // someone standing on the same spot gives no direction to look in
    const others = c.scene.actors.filter(
        (x) => x.id !== a.id && Math.hypot(x.x - a.x, x.z - a.z) > 30,
    );
    const b = others.sort(
        (p, q) => Math.hypot(p.x - a.x, p.z - a.z) - Math.hypot(q.x - a.x, q.z - a.z),
    )[0];
    const eye = buildSkeleton(a.character.body).height * 0.93;
    const look: V3 = b
        ? [b.x, buildSkeleton(b.character.body).height * 0.85, b.z]
        : [a.x + Math.sin(a.facing * DEG) * 300, eye, a.z + Math.cos(a.facing * DEG) * 300];
    const dx = look[0] - a.x;
    const dz = look[2] - a.z;
    const len = Math.hypot(dx, dz) || 1;
    // the camera looks along (dx, dz): yaw such that forward = (-sin yaw, -cos yaw)
    const yaw = (Math.atan2(-dx, -dz) / DEG + 360) % 360;
    const back = pov ? -12 : 110;
    const side = pov ? 0 : 45;
    const pos: V3 = [
        a.x - (dx / len) * back + (dz / len) * side,
        eye + (pov ? 0 : 12),
        a.z - (dz / len) * back - (dx / len) * side,
    ];
    const pitch = Math.max(
        -89,
        Math.min(89, (Math.atan2(pos[1] - look[1], Math.max(1, len + back)) / DEG) * 0.9),
    );
    return {
        position: pos,
        yaw,
        pitch,
        roll: 0,
        lens: { kind: 'perspective', focalMm: pov ? 24 : 50 },
    };
}

/**
 * Moves a framing camera back (or widens an orthographic one) until every actor's feet and head are inside the
 * frame with a margin: a formula cannot know every formation's depth from every side.
 */
export function fitActors(cam: SceneCamera, c: ViewCtx): SceneCamera {
    const pts: V3[] = c.scene.actors.flatMap((a) => {
        const h = buildSkeleton(a.character.body).height;
        return [
            [a.x, 0, a.z],
            [a.x, h * 1.04, a.z],
        ] as V3[];
    });
    if (!pts.length) return cam;
    let out = cam;
    for (let i = 0; i < 12; i++) {
        const v = makeView(out, c.scene.frame.aspect);
        const m = 0.05;
        const fits = pts.every((p) => {
            const s = project(v, p);
            return (
                !!s &&
                s[0] > v.width * m &&
                s[0] < v.width * (1 - m) &&
                s[1] > v.height * m &&
                s[1] < v.height * (1 - m)
            );
        });
        if (fits) return out;
        if (out.lens.kind === 'orthographic')
            out = { ...out, lens: { kind: 'orthographic', heightCm: out.lens.heightCm * 1.15 } };
        else {
            const f = forward(v);
            const step = Math.max(
                60,
                Math.hypot(out.position[0] - c.target[0], out.position[2] - c.target[2]) * 0.15,
            );
            const p = out.position;
            out = {
                ...out,
                position: [p[0] - f[0] * step, Math.max(5, p[1] - f[1] * step), p[2] - f[2] * step],
            };
        }
    }
    return out;
}

const framed =
    (make: (c: ViewCtx) => SceneCamera) =>
    (c: ViewCtx): SceneCamera =>
        fitActors(make(c), c);

export const VIEWS = createRegistry<ViewDef>(
    [
        {
            id: 'front',
            name: 'Front',
            tags: ['eye level'],
            make: framed((c) =>
                orbit(
                    [c.target[0], c.tallest * 0.55, c.target[2]],
                    0,
                    4,
                    c.spread + 160,
                    c.tallest + 40,
                ),
            ),
        },
        {
            id: 'three-quarter',
            name: '¾ corner',
            tags: ['corner'],
            make: framed((c) =>
                orbit(
                    [c.target[0], c.tallest * 0.55, c.target[2]],
                    35,
                    8,
                    c.spread + 160,
                    c.tallest + 40,
                ),
            ),
        },
        {
            id: 'side',
            name: 'Side',
            tags: ['profile'],
            make: framed((c) =>
                orbit(
                    [c.target[0], c.tallest * 0.55, c.target[2]],
                    90,
                    4,
                    c.spread + 160,
                    c.tallest + 40,
                ),
            ),
        },
        {
            id: 'back',
            name: 'Back',
            tags: ['behind'],
            make: framed((c) =>
                orbit(
                    [c.target[0], c.tallest * 0.55, c.target[2]],
                    180,
                    6,
                    c.spread + 160,
                    c.tallest + 40,
                ),
            ),
        },
        {
            id: 'high',
            name: 'High angle',
            tags: ['above'],
            make: framed((c) =>
                orbit(
                    [c.target[0], c.tallest * 0.4, c.target[2]],
                    20,
                    40,
                    c.spread + 260,
                    c.tallest + 160,
                ),
            ),
        },
        {
            id: 'birds-eye',
            name: "Bird's-eye",
            tags: ['top', 'overhead'],
            make: framed((c) =>
                orbit([c.target[0], 0, c.target[2]], 0, 85, c.spread + 300, c.spread + 300),
            ),
        },
        {
            id: 'worms-eye',
            name: "Worm's-eye",
            tags: ['low', 'heroic'],
            make: framed((c) => ({
                ...orbit(
                    [c.target[0], c.tallest * 0.75, c.target[2]],
                    0,
                    -20,
                    c.spread + 160,
                    c.tallest + 60,
                    20,
                ),
                position: [c.target[0], 25, c.target[2] + (c.spread + 160) * 0.9],
            })),
        },
        {
            id: 'isometric',
            name: 'Isometric',
            tags: ['game', 'diagram'],
            make: framed((c) => {
                const cam = orbit(
                    [c.target[0], c.tallest * 0.3, c.target[2]],
                    45,
                    35.264,
                    c.spread + 300,
                    c.tallest + 300,
                );
                return {
                    ...cam,
                    lens: {
                        kind: 'orthographic',
                        heightCm: Math.max(c.tallest + 200, (c.spread + 300) * 0.7),
                    },
                };
            }),
        },
        {
            id: 'over-shoulder',
            name: 'Over the shoulder',
            tags: ['conversation', 'dialogue'],
            make: (c) => behind(c, false),
        },
        {
            id: 'pov',
            name: 'Point of view',
            tags: ['eyes', 'first person'],
            make: (c) => behind(c, true),
        },
    ],
    'front',
);

/** The context for `VIEWS.get(id).make(…)` from a scene. */
export function viewCtx(
    scene: Scene,
    subject: string | null,
    stage: { x: number; z: number; spread: number },
): ViewCtx {
    const a = scene.actors;
    if (!a.length)
        return {
            target: [stage.x, 0, stage.z],
            spread: stage.spread,
            tallest: 170,
            scene,
            subject,
        };
    const xs = a.map((x) => x.x);
    const zs = a.map((x) => x.z);
    return {
        target: [
            (Math.min(...xs) + Math.max(...xs)) / 2,
            0,
            (Math.min(...zs) + Math.max(...zs)) / 2,
        ],
        spread: Math.max(
            Math.max(...xs) - Math.min(...xs),
            (Math.max(...zs) - Math.min(...zs)) * 0.6,
            60,
        ),
        tallest: Math.max(...a.map((x) => buildSkeleton(x.character.body).height)),
        scene,
        subject,
    };
}
