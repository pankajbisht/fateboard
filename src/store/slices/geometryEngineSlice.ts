import * as fabric from 'fabric';
import paper from 'paper';
import { nanoid } from 'nanoid';

type Vec2 = { x: number; y: number };

type PathData = {
    points: Vec2[];
    closed: boolean;
};

type Geometry = {
    type: 'geometry';
    paths: PathData[];
};

type GeometryNode = {
    id: string;
    type: string;
    inputs: Record<string, any>;
    run: (geo: Geometry, inputs: any, helpers: any) => Geometry;
};

export const geometryEngineSlice = (set, get, store) => ({
    // -----------------------------------
    // CORE STATE
    // -----------------------------------
    inputGeometry: null,
    outputGeometry: null,

    graph: {
        nodes: [] as GeometryNode[],
    },

    // -----------------------------------
    // CANVAS BINDING
    // -----------------------------------

    // -----------------------------------
    // INPUT (from Fabric selection)
    // -----------------------------------
    setInputFromFabric: (fabricObject) => {
        const geo = get().fabricToGeometry(fabricObject);
        set({ inputGeometry: geo }, () => get().runGraph());
    },

    // -----------------------------------
    // GRAPH MANAGEMENT
    // -----------------------------------
    addNode: (node) =>
        set(
            (state) => ({
                graph: { nodes: [...state.graph.nodes, node] },
            }),
            () => get().runGraph(),
        ),

    updateNodeInputs: (id, inputs) =>
        set(
            (state) => ({
                graph: {
                    nodes: state.graph.nodes.map((n) =>
                        n.id === id ? { ...n, inputs: { ...n.inputs, ...inputs } } : n,
                    ),
                },
            }),
            () => get().runGraph(),
        ),

    removeNode: (id) =>
        set(
            (state) => ({
                graph: { nodes: state.graph.nodes.filter((n) => n.id !== id) },
            }),
            () => get().runGraph(),
        ),

    // -----------------------------------
    // GRAPH EXECUTION (Blender-style)
    // -----------------------------------
    runGraph: () => {
        const { graph, inputGeometry } = get();
        if (!inputGeometry) return;

        let geo = structuredClone(inputGeometry);

        for (const node of graph.nodes) {
            geo = node.run(geo, node.inputs, get());
        }

        set({ outputGeometry: geo });
        get().renderToFabric();
    },

    // -----------------------------------
    // RENDER OUTPUT → FABRIC
    // -----------------------------------
    renderToFabric: () => {
        const { canvas, outputGeometry } = get();
        if (!canvas || !outputGeometry) return;

        canvas.clear();

        outputGeometry.paths.forEach((p) => {
            const path = get().geometryPathToFabric(p);
            canvas.add(path);
        });

        canvas.requestRenderAll();
    },

    // -----------------------------------
    // GEOMETRY HELPERS (PURE)
    // -----------------------------------
    translate: (pt, x, y) => ({ x: pt.x + x, y: pt.y + y }),

    rotate: (pt, angle) => {
        const rad = (angle * Math.PI) / 180;
        return {
            x: pt.x * Math.cos(rad) - pt.y * Math.sin(rad),
            y: pt.x * Math.sin(rad) + pt.y * Math.cos(rad),
        };
    },

    // -----------------------------------
    // NODE IMPLEMENTATIONS
    // -----------------------------------

    TransformNode: () => ({
        id: nanoid(),
        type: 'transform',
        inputs: { x: 0, y: 0, rotation: 0 },

        run: (geo, { x, y, rotation }, helpers) => ({
            ...geo,
            paths: geo.paths.map((p) => ({
                ...p,
                points: p.points.map((pt) => helpers.rotate(helpers.translate(pt, x, y), rotation)),
            })),
        }),
    }),

    RepeatNode: () => ({
        id: nanoid(),
        type: 'repeat',
        inputs: { count: 5, spacing: 40, mode: 'linear' },

        run: (geo, { count, spacing, mode }, helpers) => {
            const all: Geometry[] = [];

            for (let i = 0; i < count; i++) {
                const copy = structuredClone(geo);

                if (mode === 'linear') {
                    copy.paths.forEach((p) =>
                        p.points.forEach((pt) => {
                            pt.x += i * spacing;
                        }),
                    );
                }

                if (mode === 'radial') {
                    copy.paths.forEach((p) =>
                        p.points.forEach((pt, idx) => {
                            p.points[idx] = helpers.rotate(pt, (360 / count) * i);
                        }),
                    );
                }

                all.push(copy);
            }

            return {
                type: 'geometry',
                paths: all.flatMap((g) => g.paths),
            };
        },
    }),

    BooleanNode: () => ({
        id: nanoid(),
        type: 'boolean',
        inputs: { mode: 'unite', target },

        run: (geo, { mode, target }, helpers) => {
            paper.setup(new paper.Size(5000, 5000));

            const a = helpers.geometryToPaper(geo);
            const b = helpers.geometryToPaper(target);

            const result = a[mode](b);
            return helpers.paperToGeometry(result);
        },
    }),

    // -----------------------------------
    // FABRIC ↔ GEOMETRY
    // -----------------------------------
    fabricToGeometry: (obj) => ({
        type: 'geometry',
        paths: [
            {
                closed: true,
                points: obj.path.map((p) => ({ x: p[1], y: p[2] })),
            },
        ],
    }),

    geometryPathToFabric: (path) => {
        const d =
            path.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') +
            (path.closed ? ' Z' : '');

        return new fabric.Path(d, {
            fill: '',
            stroke: 'black',
        });
    },

    geometryToPaper: (geo) => {
        const p = new paper.Path();
        geo.paths[0].points.forEach((pt, i) => (i === 0 ? p.moveTo(pt) : p.lineTo(pt)));
        p.closed = geo.paths[0].closed;
        return p;
    },

    paperToGeometry: (paperPath) => ({
        type: 'geometry',
        paths: [
            {
                closed: paperPath.closed,
                points: paperPath.segments.map((s) => ({
                    x: s.point.x,
                    y: s.point.y,
                })),
            },
        ],
    }),
});
