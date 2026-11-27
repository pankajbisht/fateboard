import {
    useEffect,
    useId,
    useMemo,
    useRef,
    type DragEvent,
    type KeyboardEvent,
    type PointerEvent,
} from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@store';
import { PROP_DRAG_TYPE } from '@/props/dragType';
import { makeView, screenToGround } from '@/scene/camera/projection';
import { sceneGuides } from '@/scene/render/guides';
import { renderScene } from '@/scene/render/renderScene';
import { ENVIRONMENTS } from '@/scene/sets/registry';
import { svgPaint } from '../character/svgPaint';

/**
 * The scene as the camera sees it (the same paths the page gets). Press a character or a prop to select it, drag
 * it to walk it on the ground (the drag follows the floor in perspective, one undo step per drag); arrow keys move
 * the selected one 10 cm (Shift: 50) as seen on screen (Up = away from the camera), [ and ] turn a character or
 * resize a prop, Delete removes a prop. A prop card from the Props tab drops where it lands. Guides are drawn on
 * top and never placed.
 */
const STEP = 10;

export function SceneStage() {
    const scene = useStore((s) => s.studioScene);
    const selected = useStore((s) => s.sceneSelectedActor);
    const guides = useStore(useShallow((s) => s.sceneGuides));
    const select = useStore((s) => s.selectSceneActor);
    const edit = useStore((s) => s.editStudioScene);
    const selectedPropId = useStore((s) => s.sceneSelectedProp);
    const selectProp = useStore((s) => s.selectSceneProp);
    const addProp = useStore((s) => s.addSceneProp);
    const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
    const svg = useRef<SVGSVGElement>(null);
    const drag = useRef<{
        kind: 'actor' | 'prop';
        id: string;
        dx: number;
        dz: number;
        key: string;
    } | null>(null);
    const frame = useRef(0);
    const pending = useRef<{ x: number; y: number } | null>(null);

    const model = useMemo(() => (scene ? renderScene(scene) : null), [scene]);
    const lines = useMemo(() => (scene ? sceneGuides(scene, guides) : []), [scene, guides]);
    useEffect(() => () => cancelAnimationFrame(frame.current), []);
    if (!scene || !model) return null;

    const { fills, defs } = svgPaint(model.items, uid, 5);
    // one selection: a prop counts only while no character is selected
    const propSel = !selected ? scene.props.find((p) => p.id === selectedPropId) : undefined;
    const found = propSel
        ? model.props.find((p) => p.id === propSel.id)
        : model.actors.find((a) => a.id === selected);
    // the selection ring stops at the frame's edge (an actor can step out of the picture)
    const box = found && {
        x0: Math.max(0, found.bounds[0] - 6),
        y0: Math.max(0, found.bounds[1] - 6),
        x1: Math.min(model.width, found.bounds[2] + 6),
        y1: Math.min(model.height, found.bounds[3] + 6),
    };
    const actor = scene.actors.find((a) => a.id === selected);
    const env = ENVIRONMENTS.get(scene.set.environment);

    /** client point → frame units */
    const toFrame = (e: { clientX: number; clientY: number }) => {
        const el = svg.current;
        const ctm = el?.getScreenCTM?.();
        if (!el || !ctm) return null;
        const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
        return { x: p.x, y: p.y };
    };
    const ground = (p: { x: number; y: number }) =>
        screenToGround(makeView(scene.camera, scene.frame.aspect), p.x, p.y);

    const onPress = (kind: 'actor' | 'prop', id: string, e: PointerEvent) => {
        e.stopPropagation();
        if (kind === 'actor') {
            selectProp(null);
            select(id);
        } else selectProp(id);
        const p = toFrame(e);
        const g = p && ground(p);
        const a =
            kind === 'actor'
                ? scene.actors.find((x) => x.id === id)
                : scene.props.find((x) => x.id === id);
        if (!g || !a) return;
        // capture on the svg: the pressed path may be redrawn or re-sorted while it moves
        svg.current?.setPointerCapture?.(e.pointerId);
        drag.current = {
            kind,
            id,
            dx: a.x - g[0],
            dz: a.z - g[2],
            key: `gesture:drag-${id}-${Date.now()}`,
        };
    };
    const onMove = (e: PointerEvent) => {
        if (!drag.current) return;
        // the button came up where we could not see it: the drag is over
        if (e.buttons === 0) {
            drag.current = null;
            return;
        }
        pending.current = toFrame(e);
        if (frame.current) return;
        frame.current = requestAnimationFrame(() => {
            frame.current = 0;
            const d = drag.current;
            const p = pending.current;
            const g = d && p && ground(p);
            if (d && g)
                edit(
                    {
                        kind: d.kind === 'actor' ? 'moveActor' : 'moveProp',
                        id: d.id,
                        x: g[0] + d.dx,
                        z: g[2] + d.dz,
                    },
                    d.key,
                );
        });
    };
    const onUp = () => {
        drag.current = null;
    };

    const onKeyDown = (e: KeyboardEvent) => {
        const target = propSel ?? actor;
        if (!target) return;
        const k = e.shiftKey ? STEP * 5 : STEP;
        // left / right follow the screen, up / down go away from / toward the camera
        const yaw = (scene.camera.yaw * Math.PI) / 180;
        const right: [number, number] = [Math.cos(yaw), -Math.sin(yaw)];
        const away: [number, number] = [-Math.sin(yaw), -Math.cos(yaw)];
        const move = (sx: number, sa: number) =>
            edit(
                {
                    kind: propSel ? 'moveProp' : 'moveActor',
                    id: target.id,
                    x: Math.round(target.x + right[0] * sx + away[0] * sa),
                    z: Math.round(target.z + right[1] * sx + away[1] * sa),
                },
                `nudge-${target.id}`,
            );
        if (e.key === 'ArrowLeft') move(-k, 0);
        else if (e.key === 'ArrowRight') move(k, 0);
        else if (e.key === 'ArrowUp') move(0, k);
        else if (e.key === 'ArrowDown') move(0, -k);
        else if (propSel && (e.key === '[' || e.key === ']'))
            edit(
                {
                    kind: 'updateProp',
                    id: propSel.id,
                    patch: { height: propSel.height * (e.key === '[' ? 0.9 : 1.1) },
                },
                `prop-size-${propSel.id}`,
            );
        else if (propSel && (e.key === 'Delete' || e.key === 'Backspace')) {
            edit({ kind: 'removeProp', id: propSel.id });
            selectProp(null);
        } else if (actor && (e.key === '[' || e.key === ']'))
            edit(
                {
                    kind: 'turnActor',
                    id: actor.id,
                    facing: actor.facing + (e.key === '[' ? -15 : 15),
                },
                `turn-${actor.id}`,
            );
        else return;
        e.preventDefault();
    };

    const onDragOver = (e: DragEvent) => {
        // only prop cards: files and other drags keep the browser's behaviour
        if (!e.dataTransfer.types.includes(PROP_DRAG_TYPE)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };
    const onDrop = (e: DragEvent) => {
        const id = e.dataTransfer.getData(PROP_DRAG_TYPE);
        if (!id) return;
        e.preventDefault();
        const p = toFrame(e);
        const g = p && ground(p);
        void addProp(id, g ? { x: g[0], z: g[2] } : undefined);
    };

    return (
        <div
            role="group"
            tabIndex={0}
            aria-label="Scene stage. Arrow keys move the selection, [ and ] turn a character or resize a prop, Delete removes a prop."
            onKeyDown={onKeyDown}
            className="flex h-full w-full items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500"
        >
            <svg
                ref={svg}
                viewBox={`0 0 ${model.width} ${model.height}`}
                role="img"
                aria-label={`${scene.name}: ${env.name}, ${scene.actors.length} ${scene.actors.length === 1 ? 'character' : 'characters'}`}
                preserveAspectRatio="xMidYMid meet"
                className="h-full w-full touch-none select-none"
                onPointerDown={() => {
                    select(null);
                    selectProp(null);
                }}
                onDragOver={onDragOver}
                onDrop={onDrop}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={onUp}
                onLostPointerCapture={onUp}
            >
                {defs}
                <clipPath id={`${uid}frame`}>
                    <rect width={model.width} height={model.height} />
                </clipPath>
                {/* the picture stops at the frame, as on the page */}
                <g clipPath={`url(#${uid}frame)`}>
                    {model.items.map((d, i) => (
                        <path
                            key={d.key}
                            d={d.d}
                            fill={fills[i]}
                            fillRule={d.evenOdd ? 'evenodd' : undefined}
                            opacity={d.opacity}
                            stroke={d.stroke ?? 'none'}
                            strokeWidth={d.strokeWidth}
                            strokeLinejoin="round"
                            strokeLinecap="round"
                            data-actor={d.actor}
                            data-prop={d.prop}
                            className={d.actor || d.prop ? 'cursor-grab' : undefined}
                            onPointerDown={
                                d.actor
                                    ? (e) => onPress('actor', d.actor!, e)
                                    : d.prop
                                      ? (e) => onPress('prop', d.prop!, e)
                                      : undefined
                            }
                        />
                    ))}
                </g>
                {lines.map((g) => (
                    <path
                        key={g.key}
                        d={g.d}
                        fill="none"
                        strokeWidth={g.key === 'horizon' ? 1.6 : 0.8}
                        strokeDasharray={g.key === 'grid' ? undefined : '6 5'}
                        style={{ stroke: 'var(--color-primary-500)' }}
                        opacity={g.key === 'grid' ? 0.45 : 0.8}
                        pointerEvents="none"
                    />
                ))}
                {box && box.x1 > box.x0 && box.y1 > box.y0 && (
                    <rect
                        x={box.x0}
                        y={box.y0}
                        width={box.x1 - box.x0}
                        height={box.y1 - box.y0}
                        rx={6}
                        fill="none"
                        strokeWidth={2}
                        strokeDasharray="8 6"
                        style={{ stroke: 'var(--color-primary-500)' }}
                        pointerEvents="none"
                    />
                )}
            </svg>
        </div>
    );
}

export default SceneStage;
