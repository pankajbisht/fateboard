import type { SliceCreator } from '../types';
import * as fabric from 'fabric';
import _db from 'opendb-store';

export interface ShapeSlice {
    addShape: (shapeType: string, options?: Record<string, any>) => void;
    generateStarPoints: (
        numPoints: number,
        outerRadius: number,
        innerRadius: number,
    ) => { x: number; y: number }[];
    createArrowShape: (obj: Record<string, any>) => import('fabric').Group;
}

function createPolygon1(sides, radius) {
    return Array.from({ length: sides }, (_, i) => {
        const angle = ((2 * Math.PI) / sides) * i - Math.PI / 2;
        return {
            x: radius * Math.cos(angle),
            y: radius * Math.sin(angle),
        };
    });
}

// Generic polygon creator
function createPolygon(sides, radius) {
    return Array.from({ length: sides }, (_, i) => {
        const angle = ((2 * Math.PI) / sides) * i - Math.PI / 2; // point-top
        return {
            x: radius * Math.cos(angle),
            y: radius * Math.sin(angle),
        };
    });
}

// Star shape
function createStar(points = 5, outerRadius = 50, innerRadius = 25) {
    const result = [];
    const step = Math.PI / points;
    for (let i = 0; i < 2 * points; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = i * step - Math.PI / 2;
        result.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
    }
    return result;
}

// Diamond
function createDiamond(width = 100, height = 60) {
    return [
        { x: 0, y: -height / 2 },
        { x: width / 2, y: 0 },
        { x: 0, y: height / 2 },
        { x: -width / 2, y: 0 },
    ];
}

// Arrow
function createArrow(width = 100, height = 60) {
    return [
        { x: -width / 2, y: -height / 4 },
        { x: 0, y: -height / 4 },
        { x: 0, y: -height / 2 },
        { x: width / 2, y: 0 },
        { x: 0, y: height / 2 },
        { x: 0, y: height / 4 },
        { x: -width / 2, y: height / 4 },
    ];
}

export interface FabricObjectWithMaster extends fabric.Object {
    __master?: fabric.Object; // reference to the parent
    __instances?: fabric.Object[]; // clones linked to this master
}

const radToDeg = (rad: number) => (rad * 180) / Math.PI;

function circleArcToPath(
    radius: number,
    startDeg: number,
    endDeg: number,
    options?: {
        clockwise?: boolean;
        close?: boolean;
    },
) {
    const { clockwise = true, close = true } = options || {};

    // Fabric v6: degrees → radians
    const start = fabric.util.degreesToRadians(startDeg);
    const end = fabric.util.degreesToRadians(endDeg);

    // Centered at (r, r)
    const cx = radius;
    const cy = radius;

    const x1 = cx + radius * Math.cos(start);
    const y1 = cy + radius * Math.sin(start);

    const x2 = cx + radius * Math.cos(end);
    const y2 = cy + radius * Math.sin(end);

    // Arc flags
    const delta = Math.abs(endDeg - startDeg);
    const largeArcFlag = delta > 180 ? 1 : 0;
    const sweepFlag = clockwise ? 1 : 0;

    return `
    M ${x1} ${y1}
    A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${x2} ${y2}
    ${close ? 'Z' : ''}
  `;
}

function sectorToPath(
    radius: number,
    startDeg: number,
    endDeg: number,
    options?: {
        clockwise?: boolean;
    },
) {
    const { clockwise = true } = options || {};

    const start = fabric.util.degreesToRadians(startDeg);
    const end = fabric.util.degreesToRadians(endDeg);

    const cx = radius;
    const cy = radius;

    const x1 = cx + radius * Math.cos(start);
    const y1 = cy + radius * Math.sin(start);

    const x2 = cx + radius * Math.cos(end);
    const y2 = cy + radius * Math.sin(end);

    const delta = Math.abs(endDeg - startDeg);
    const largeArcFlag = delta > 180 ? 1 : 0;
    const sweepFlag = clockwise ? 1 : 0;

    return `
    M ${cx} ${cy}
    L ${x1} ${y1}
    A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${x2} ${y2}
    Z
  `;
}

export const createShapeSlice: SliceCreator<ShapeSlice> = (set, get, _store) => ({
    addShape: (shapeType, options = {} as Record<string, any>) => {
        const canvas = get().canvas;
        if (!canvas) return;

        const { pageWidth, pageHeight, scale } = get();
        const x = (pageWidth / 2) * scale;
        const y = (pageHeight / 2) * scale;

        console.log(x, y, pageWidth, pageHeight);

        // if (get().settings.freehand) {
        //     x = 800;
        //     y = 400;
        // }

        const defaultPosition = {
            left: x,
            top: y,
            originX: 'center',
            originY: 'center',
            selection: true,
            hasControls: true,
            customType: 'shape',
            fill: 'rgba(0,0,0,0)', // real transparent
            objectCaching: false,
        };

        options = { ...defaultPosition, ...options };

        // console.log({ pageWidth, pageHeight, scale, defaultPosition, options, shapeType });

        let shape;

        switch (shapeType) {
            case 'triangle':
                shape = new fabric.Triangle({
                    ...options,
                });
                break;

            case 'square':
                shape = new fabric.Rect({
                    ...options,
                });
                break;

            case 'rect':
                shape = new fabric.Rect({
                    ...options,
                });
                break;

            case 'polygon':
            case 'pentagon':
                shape = new fabric.Polygon(createPolygon(5, options.width / 2), options);
                break;

            case 'hexagon':
                shape = new fabric.Polygon(createPolygon(6, options.width / 2), options);
                break;

            case 'semi-circle': {
                const d = sectorToPath(options.radius, -180, 0);
                shape = new fabric.Path(d, {
                    ...options,
                });

                break;
            }

            case 'quadrant': {
                const d = sectorToPath(options.radius, -90, 0);

                shape = new fabric.Path(d, {
                    ...options,
                });

                break;
            }

            case 'sector': {
                const d = sectorToPath(options.radius, -60, 0);

                shape = new fabric.Path(d, {
                    ...options,
                });

                break;
            }

            case 'circle':
                shape = new fabric.Circle({
                    ...options,
                });
                break;

            case 'capsule':
                shape = new fabric.Rect({
                    ...options,
                });
                break;

            case 'ellipse':
                shape = new fabric.Ellipse({
                    ...options,
                });
                break;

            case 'line':
                shape = new fabric.Line([50, 50, 200, 50], {
                    stroke: 'black',
                    strokeWidth: 2,
                    selectable: true,
                    hasControls: true,
                    hasBorders: false,
                    ...options,
                });
                break;

            case 'diamond':
                shape = new fabric.Polygon(
                    createDiamond(options.width || 100, options.height || 60),
                    options,
                );
                break;

            case 'quadratic': {
                const startX = options.startX ?? 0;
                const startY = options.startY ?? 0;
                const controlX = options.controlX ?? (options.width || 100) / 2;
                const controlY = options.controlY ?? -(options.height || 100) / 2;
                const endX = options.endX ?? (options.width || 100);
                const endY = options.endY ?? 0;

                const pathStr = `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`;

                shape = new fabric.Path(pathStr, {
                    ...options,
                    fill: 'transparent', // curves have no fill
                    stroke: options.stroke || 'black',
                    strokeWidth: options.strokeWidth || 2,
                });

                break;
            }

            case 'star':
                shape = new fabric.Polygon(
                    get().generateStarPoints(
                        options.numPoints || 5,
                        options.outerRadius || 50,
                        options.innerRadius || 20,
                    ),
                    { fill: 'transparent', stroke: 'black', ...options },
                );
                break;

            case 'arrow':
                shape = get().createArrowShape({ ...options }); // requires helper function
                break;

            case 'paper':
                {
                    const box = new fabric.Rect({
                        width: 300,
                        height: 80,
                        fill: '#FFFFFF',
                        originX: 'center',
                        originY: 'center',
                        stroke: 1,
                        fontFamily: 'Bubblegum Sans',
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
                    (shape as any).__text = text;
                    (shape as any).__box = box;
                    (text as any).__group = shape;
                }

                break;

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
        get().saveState();
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
            originX: 'left', // start from left end
            originY: 'center',
        });

        // arrowhead (triangle pointing right)
        const head = new fabric.Triangle({
            width: headLength,
            height: headWidth,
            fill: stroke,
            left: width, // position at end of line
            top: 0,
            angle: 90, // rotate triangle to point right
            originX: 'center',
            originY: 'center',
        });

        // group line + head
        const arrow = new fabric.Group([line, head], {
            left,
            top,
            originX: 'center',
            originY: 'center',
        });

        return arrow;
    },
});
