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

export const createShapeSlice: SliceCreator<ShapeSlice> = (set, get, _store) => ({
    addShape: (shapeType, options = {} as Record<string, any>) => {
        const canvas = get().canvas;
        if (!canvas) return;

        const { pageWidth, pageHeight, scale } = get();
        const x = (pageWidth / 2) * scale;
        const y = (pageHeight / 2) * scale;

        const defaultPosition = {
            left: x,
            top: y,
            originX: 'center',
            originY: 'center',
            selection: true,
            hasControls: true,
            customType: 'shape',
        };

        options = { ...defaultPosition, ...options };

        console.log({ pageWidth, pageHeight, scale, options });

        let shape;

        switch (shapeType) {
            case 'rect':
                shape = new fabric.Rect({
                    width: 80,
                    height: 80,
                    fill: 'transparent',
                    stroke: 'black',
                    ...options,
                });
                break;

            case 'circle':
                shape = new fabric.Circle({
                    radius: 48,
                    fill: 'transparent',
                    stroke: 'black',
                    ...options,
                });
                break;

            case 'capsule':
                shape = new fabric.Rect({
                    radius: 48,
                    fill: 'transparent',
                    stroke: 'black',
                    ...options,
                });
                break;

            case 'ellipse':
                shape = new fabric.Ellipse({
                    rx: 70,
                    ry: 45,
                    fill: 'transparent',
                    stroke: 'black',
                    ...options,
                });
                break;

            case 'triangle':
                shape = new fabric.Triangle({
                    width: 100,
                    height: 100,
                    fill: 'transparent',
                    stroke: 'black',
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

            case 'polygon':
            case 'pentagon':
                shape = new fabric.Polygon(
                    options.points || [
                        { x: 0, y: 0 },
                        { x: 50, y: 0 },
                        { x: 25, y: 50 },
                    ],
                    { fill: 'transparent', stroke: 'black', ...options },
                );
                break;

            case 'diamond':
                shape = new fabric.Polygon(
                    [
                        { x: 0, y: options.height / 2 || 40 },
                        { x: options.width / 2 || 40, y: 0 },
                        { x: options.width || 80, y: options.height / 2 || 40 },
                        { x: options.width / 2 || 40, y: options.height || 80 },
                    ],
                    { fill: 'transparent', stroke: 'black', ...options },
                );
                break;

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
