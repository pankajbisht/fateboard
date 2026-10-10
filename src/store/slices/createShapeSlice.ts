import type { SliceCreator } from '../types';
import * as fabric from 'fabric';

export interface ShapeSlice {
    addShape: (shapeType: string, options?: Record<string, any>) => void;
    generateStarPoints: (
        numPoints: number,
        outerRadius: number,
        innerRadius: number,
    ) => { x: number; y: number }[];
    createArrowShape: (obj: Record<string, any>) => import('fabric').Group;
}

export interface FabricObjectWithMaster extends fabric.Object {
    __master?: fabric.Object; // reference to the parent
    __instances?: fabric.Object[]; // clones linked to this master
}

/* -------------------------------------------------------------------------- */
/* Geometry helpers                                                           */
/* -------------------------------------------------------------------------- */

// Generic polygon (point-top)
function createPolygon(sides: number, radius: number) {
    return Array.from({ length: sides }, (_, i) => {
        const angle = ((2 * Math.PI) / sides) * i - Math.PI / 2;
        return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
    });
}

function createDiamond(width = 100, height = 60) {
    return [
        { x: 0, y: -height / 2 },
        { x: width / 2, y: 0 },
        { x: 0, y: height / 2 },
        { x: -width / 2, y: 0 },
    ];
}

// Pie slice from the centre. SVG space: 0deg = right, clockwise.
function sectorToPath(radius: number, startDeg: number, endDeg: number, clockwise = true) {
    const start = fabric.util.degreesToRadians(startDeg);
    const end = fabric.util.degreesToRadians(endDeg);

    const cx = radius;
    const cy = radius;

    const x1 = cx + radius * Math.cos(start);
    const y1 = cy + radius * Math.sin(start);
    const x2 = cx + radius * Math.cos(end);
    const y2 = cy + radius * Math.sin(end);

    const largeArcFlag = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
    const sweepFlag = clockwise ? 1 : 0;

    return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${x2} ${y2} Z`;
}

// Without sizes, Rect/Triangle/Polygon/Path got width 0 or NaN points (invisible or crashing)
const SHAPE_DEFAULTS: Record<string, Record<string, any>> = {
    triangle: { width: 100, height: 100 },
    square: { width: 100, height: 100 },
    rect: { width: 160, height: 100 },
    polygon: { width: 100 },
    pentagon: { width: 100 },
    hexagon: { width: 100 },
    circle: { radius: 50 },
    ellipse: { rx: 60, ry: 40 },
    capsule: { width: 160, height: 60 },
    diamond: { width: 100, height: 60 },
    'semi-circle': { radius: 50 },
    quadrant: { radius: 50 },
    sector: { radius: 50 },
};

export const createShapeSlice: SliceCreator<ShapeSlice> = (set, get) => ({
    addShape: (shapeType, options = {} as Record<string, any>) => {
        const canvas = get().canvas;
        if (!canvas) return;

        const center = canvas.getVpCenter();

        const defaultPosition = {
            left: center.x,
            top: center.y,
            originX: 'center',
            originY: 'center',
            hasControls: true,
            customType: 'shape',
            fill: 'rgba(0,0,0,0)', // real transparent
            // A transparent fill with no stroke is invisible: use the style slice's current stroke
            stroke: (get() as any).stroke ?? '#000000',
            strokeWidth: (get() as any).strokeWidth ?? 1,
            objectCaching: false,
        };

        options = {
            ...defaultPosition,
            ...(SHAPE_DEFAULTS[shapeType] || {}),
            ...options,
        };

        // Polygons derive their size from the points; a width/height option would distort them
        const { width: _w, height: _h, ...polyOptions } = options;

        let shape: any;

        switch (shapeType) {
            case 'triangle':
                shape = new fabric.Triangle({ ...options });
                break;

            case 'square':
            case 'rect':
                shape = new fabric.Rect({ ...options });
                break;

            case 'polygon':
            case 'pentagon':
                shape = new fabric.Polygon(
                    createPolygon(5, (options.width ?? 100) / 2),
                    polyOptions,
                );
                break;

            case 'hexagon':
                shape = new fabric.Polygon(
                    createPolygon(6, (options.width ?? 100) / 2),
                    polyOptions,
                );
                break;

            case 'semi-circle':
                shape = new fabric.Path(sectorToPath(options.radius, -180, 0), { ...options });
                break;

            case 'quadrant':
                shape = new fabric.Path(sectorToPath(options.radius, -90, 0), { ...options });
                break;

            case 'sector':
                shape = new fabric.Path(sectorToPath(options.radius, -60, 0), { ...options });
                break;

            case 'circle':
                shape = new fabric.Circle({ ...options });
                break;

            case 'capsule': {
                // a capsule is a Rect with fully rounded ends (rx/ry were never set before)
                const r = options.rx ?? (options.height ?? 60) / 2;
                shape = new fabric.Rect({ ...options, rx: r, ry: options.ry ?? r });
                break;
            }

            case 'ellipse':
                shape = new fabric.Ellipse({ ...options });
                break;

            case 'line':
                shape = new fabric.Line([50, 50, 200, 50], {
                    selectable: true,
                    hasControls: true,
                    hasBorders: false,
                    ...options,
                    strokeWidth: options.strokeWidth || 2,
                });
                break;

            case 'diamond':
                shape = new fabric.Polygon(
                    createDiamond(options.width ?? 100, options.height ?? 60),
                    polyOptions,
                );
                break;

            case 'quadratic': {
                const startX = options.startX ?? 0;
                const startY = options.startY ?? 0;
                const controlX = options.controlX ?? (options.width || 100) / 2;
                const controlY = options.controlY ?? -(options.height || 100) / 2;
                const endX = options.endX ?? (options.width || 100);
                const endY = options.endY ?? 0;

                shape = new fabric.Path(
                    `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`,
                    {
                        ...options,
                        fill: 'transparent', // curves have no fill
                        strokeWidth: options.strokeWidth || 2,
                    },
                );
                break;
            }

            case 'star':
                shape = new fabric.Polygon(
                    get().generateStarPoints(
                        options.numPoints || 5,
                        options.outerRadius || 50,
                        options.innerRadius || 20,
                    ),
                    polyOptions,
                );
                break;

            case 'arrow':
                shape = get().createArrowShape({ ...options });
                break;

            case 'paper': {
                const box = new fabric.Rect({
                    width: 300,
                    height: 80,
                    fill: '#FFFFFF',
                    originX: 'center',
                    originY: 'center',
                    stroke: '#000000', // was `stroke: 1` (not a color)
                    strokeWidth: 1,
                });

                const text = new fabric.Textbox('Type to enter text', {
                    fontSize: 20,
                    width: 200,
                    textAlign: 'center',
                    originX: 'center',
                    originY: 'center',
                    fontFamily: 'Bubblegum Sans',
                });

                shape = new fabric.Group([box, text], options);
                shape.__text = text;
                shape.__box = box;
                (text as any).__group = shape;
                break;
            }

            default:
                console.warn('Shape not supported:', shapeType);
                return;
        }

        (shape as FabricObjectWithMaster).__instances = [];
        canvas.add(shape);
        canvas.setActiveObject(shape);
        canvas.renderAll();

        get().setToolbar({ target: shape });
        get().updateFromFabric(shape);
        get().saveState?.();
        get().addLayer(shape, shapeType);
    },

    generateStarPoints: (numPoints = 5, outerRadius = 50, innerRadius = 20) => {
        const points = [];
        const angle = Math.PI / numPoints;

        for (let i = 0; i < 2 * numPoints; i++) {
            const r = i % 2 === 0 ? outerRadius : innerRadius;
            const a = i * angle - Math.PI / 2; // start from top
            points.push({ x: r * Math.cos(a), y: r * Math.sin(a) });
        }

        return points;
    },

    createArrowShape: ({
        width = 120,
        stroke = 'black',
        strokeWidth = 2,
        headLength = 12,
        headWidth = 12,
        left = 0,
        top = 0,
    }) => {
        // main line
        const line = new fabric.Line([0, 0, width, 0], {
            stroke,
            strokeWidth,
            originX: 'left',
            originY: 'center',
        });

        // arrowhead (triangle pointing right)
        const head = new fabric.Triangle({
            width: headLength,
            height: headWidth,
            fill: stroke,
            left: width,
            top: 0,
            angle: 90,
            originX: 'center',
            originY: 'center',
        });

        return new fabric.Group([line, head], {
            left,
            top,
            originX: 'center',
            originY: 'center',
        });
    },
});
