import * as fabric from 'fabric';
import { useStore } from '@store';
import SemiCircle from '@/assets/icons/SemiCircle.tsx';
import Quadrant from '@/assets/icons/Quadrant';
import Sector from '@/assets/icons/Sector';

export const shapesList = [
    {
        type: 'triangle',
        tooltip: 'Triangle',
        icon: 'fas fa-play rotate-270',
        defaultProps: {
            width: 120,
            height: 120,
            fill: 'transparent',
            stroke: 'black',
        },
    },
    {
        type: 'square',
        tooltip: 'Square',
        icon: 'fa-sharp fa-solid fa-square',
        defaultProps: {
            width: 120,
            height: 120,
            rx: 0,
            ry: 0,
            fill: 'transparent',
            stroke: 'black',
        },
    },
    {
        type: 'rect',
        tooltip: 'Rectangle',
        icon: 'fa-solid fa-square transform scale-x-120',
        defaultProps: {
            width: 200,
            height: 120,
            rx: 0,
            ry: 0,
            fill: 'transparent',
            stroke: 'black',
        },
    },
    {
        type: 'pentagon',
        tooltip: 'Pentagon',
        icon: 'fa-sharp fa-solid fa-pentagon',
        defaultProps: {
            width: 200,
            height: 120,
            rx: 0,
            ry: 0,
            fill: 'transparent',
            stroke: 'black',
        },
    },
    {
        type: 'hexagon',
        tooltip: 'Hexagon',
        icon: 'fa-sharp fa-solid fa-hexagon',
        defaultProps: {
            width: 200,
            height: 120,
            rx: 0,
            ry: 0,
            stroke: 'black',
            fill: 'rgba(0,0,0,0)', // real transparent
            objectCaching: false,
        },
    },
    {
        type: 'semi-circle',
        tooltip: 'Semi Circle',
        // icon: 'fa-solid fa-circle-half-stroke',
        icon: SemiCircle,
        defaultProps: {
            radius: 120,
            fill: 'transparent',
            stroke: 'black',
        },
    },
    {
        type: 'quadrant',
        tooltip: 'Quadrant',
        icon: Quadrant,
        defaultProps: {
            radius: 120,
            fill: 'transparent',
            stroke: 'black',
        },
    },
    {
        type: 'sector',
        tooltip: 'Sector',
        icon: Sector,
        defaultProps: {
            radius: 120,
            fill: 'transparent',
            stroke: 'black',
        },
    },
    {
        type: 'circle',
        tooltip: 'Circle',
        icon: 'fa-sharp fa-solid fa-circle',
        defaultProps: {
            radius: 60,
            fill: 'transparent',
            stroke: 'black',
        },
    },
    {
        type: 'ellipse',
        tooltip: 'Ellipse',
        icon: 'fa-regular fa-circle transform scale-x-120',
        defaultProps: {
            rx: 100,
            ry: 60,
            fill: 'transparent',
            stroke: 'black',
        },
    },
    {
        type: 'line',
        tooltip: 'Line',
        icon: 'fa-solid fa-slash',
        defaultProps: {
            strokeWidth: 2,
            stroke: 'black',
        },
    },
    {
        type: 'paper',
        tooltip: 'Paper',
        icon: 'fa-solid fa-square-pen',
        defaultProps: {
            with: 120,
            height: 60,
            fill: 'transparent',
            strock: 'black',
        },
    },
    // New shapes
    // {
    //     type: 'polygon',
    //     tooltip: 'Polygon',
    //     icon: 'fa-solid fa-caret-up', // example FA icon
    //     defaultProps: {
    //         points: [
    //             { x: 50, y: 0 },
    //             { x: 100, y: 50 },
    //             { x: 75, y: 100 },
    //             { x: 25, y: 100 },
    //             { x: 0, y: 50 },
    //         ],
    //         fill: 'transparent',
    //         stroke: 'black',
    //         strokeWidth: 2,
    //     },
    // },
    {
        type: 'star',
        tooltip: 'Star',
        icon: 'fa-regular fa-star',
        defaultProps: {
            numPoints: 5,
            innerRadius: 20,
            outerRadius: 50,
            fill: 'transparent',
            stroke: 'black',
            strokeWidth: 2,
        },
    },
    {
        type: 'arrow',
        tooltip: 'Arrow',
        icon: 'fa-solid fa-arrow-up',
        defaultProps: {
            width: 120,
            height: 20,
            fill: 'transparent',
            stroke: 'black',
            strokeWidth: 3,
            headLength: 15, // optional for Fabric arrow plugin
        },
    },
    // {
    //     type: 'diamond',
    //     tooltip: 'Diamond',
    //     icon: 'fa-solid fa-gem', // approximate FA icon
    //     defaultProps: {
    //         width: 80,
    //         height: 80,
    //         fill: 'transparent',
    //         stroke: 'black',
    //         strokeWidth: 2,
    //         angle: 45,
    //     },
    // },
    // {
    //     type: 'pentagon',
    //     tooltip: 'pentagon',
    //     icon: 'fa-solid fa-star-half-stroke', // closest FA icon
    //     defaultProps: {
    //         points: [
    //             { x: 50, y: 0 },
    //             { x: 95, y: 38 },
    //             { x: 78, y: 90 },
    //             { x: 22, y: 90 },
    //             { x: 5, y: 38 },
    //         ],
    //         fill: 'transparent',
    //         stroke: 'black',
    //         strokeWidth: 2,
    //     },
    // },
];

export const useShapeFactory = () => {
    const canvas = useStore((state) => state.canvas);
    const addShape = useStore((state) => state.addShape);
    const setActiveTool = useStore((state) => state.setActiveTool);

    /** Add predefined shape */
    const add = (type, options = {}) => {
        if (!canvas) return;
        const shapeConfig = shapesList.find((s) => s.type === type);
        if (!shapeConfig) return;
        addShape(type, { ...shapeConfig.defaultProps, ...options });
    };

    /** ---------------- LINE DRAWING ---------------- */
    let line = null;
    let isDrawing = false;
    let listenersAttached = false;

    const startLine = (opt) => {
        // ignore clicks on existing objects
        if (opt.target) return;

        isDrawing = true;
        const pointer = canvas.getPointer(opt.e);
        const points = [pointer.x, pointer.y, pointer.x, pointer.y];

        line = new fabric.Line(points, {
            strokeWidth: 2,
            stroke: 'black',
            selectable: true,
            evented: true,
        });

        canvas.add(line);
    };

    const drawLine = (opt) => {
        if (!isDrawing || !line) return;
        const pointer = canvas.getPointer(opt.e);
        line.set({ x2: pointer.x, y2: pointer.y });
        canvas.renderAll();
    };

    const finishLine = () => {
        if (!isDrawing) return;
        isDrawing = false;
        line = null;
        setActiveTool('select');
        disableLineDrawing();
    };

    /** Enable line drawing mode */
    const enableLineDrawing = () => {
        if (!canvas || listenersAttached) return;

        canvas.on('mouse:down', startLine);
        canvas.on('mouse:move', drawLine);
        canvas.on('mouse:up', finishLine);

        listenersAttached = true;
        canvas.isDrawingMode = false; // prevent fabric pencil
    };

    /** Disable line drawing mode */
    const disableLineDrawing = () => {
        if (!canvas || !listenersAttached) return;

        canvas.off('mouse:down', startLine);
        canvas.off('mouse:move', drawLine);
        canvas.off('mouse:up', finishLine);

        listenersAttached = false;
    };

    return { shapesList, add, enableLineDrawing, disableLineDrawing };
};
