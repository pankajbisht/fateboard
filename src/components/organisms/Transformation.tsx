import TransformControls from '../molecules/TransformControls.tsx';
import { useEffect, useState } from 'react';
import clsx from 'clsx';

export const Transformation = ({
    canvas,
    isTransformExpanded,
    activeSection,
    onClose,
    onToggleSection,
}) => {
    const [selectedObject, setSelectedObject] = useState<any>(null);
    const [top, setTop] = useState<number | string>('');
    const [left, setLeft] = useState<number | string>('');

    const [height, setHeight] = useState<number | string>('');
    const [width, setWidth] = useState<number | string>('');
    const [diameter, setDiameter] = useState<number | string>('');
    const [color, setColor] = useState('#000000');
    const [isSelected, setIsSelected] = useState(false);

    const handleTransformChange = (property, value) => {
        if (!selectedObject || !canvas) return;

        const numValue = parseFloat(String(value));

        switch (property) {
            case 'top':
                selectedObject.set({ top: numValue });
                setTop(numValue);
                break;

            case 'left':
                selectedObject.set({ left: numValue });
                setLeft(numValue);
                break;

            case 'width':
                if (selectedObject.type === 'rect') {
                    selectedObject.set({ scaleX: 1, width: numValue });
                    setWidth(numValue);
                }
                break;

            case 'height':
                if (selectedObject.type === 'rect') {
                    selectedObject.set({ scaleY: 1, height: numValue });
                    setHeight(numValue);
                }
                break;

            case 'diameter':
                if (selectedObject.type === 'circle') {
                    selectedObject.set({ scaleX: 1, scaleY: 1, radius: numValue / 2 });
                    setDiameter(numValue);
                }
                break;

            case 'fill':
                selectedObject.set({ fill: value });
                setColor(value);
                break;

            default:
                break;
        }

        // Refresh selection and canvas
        selectedObject.setCoords();
        canvas.renderAll();
    };

    useEffect(() => {
        if (!canvas) return;

        const onCreated = (e) => updateSelectedObject(e.selected[0]);
        const onUpdated = (e) => updateSelectedObject(e.selected[0]);
        const onCleared = () => updateSelectedObject(null);
        const onModified = (e) => updateSelectedObject(e.target);

        canvas.on('selection:created', onCreated);
        canvas.on('selection:updated', onUpdated);
        canvas.on('selection:cleared', onCleared);
        canvas.on('object:modified', onModified);

        return () => {
            canvas.off('selection:created', onCreated);
            canvas.off('selection:updated', onUpdated);
            canvas.off('selection:cleared', onCleared);
            canvas.off('object:modified', onModified);
        };
    }, [canvas]);

    const updateSelectedObject = (object) => {
        if (!object) {
            setIsSelected(true);
            //      setSelectedObject(null);
            //      setWidth("");
            //      setHeight("");
            //      setDiameter("");
            //      setTop("");
            //      setLeft("");
            //      setColor("#000000");
            return;
        }
        setIsSelected(false);

        setSelectedObject(object);

        setTop(Math.round(object.top));
        setLeft(Math.round(object.left));

        if (object.type === 'rect') {
            setWidth(Math.round(object.width * object.scaleX));
            setHeight(Math.round(object.height * object.scaleY));
            setDiameter('');
            setColor(object.fill || '#000000');
        } else if (object.type === 'circle') {
            setDiameter(Math.round(object.radius * 2 * object.scaleX));
            setWidth('');
            setHeight('');
            setColor(object.fill || '#000000');
        }
    };

    return (
        <>
            <aside
                className={clsx(
                    'p-2 fixed top-20 right-16 bg-stone-100 rounded-md shadow-lg w-72 z-50 transition-transform duration-300',
                    isTransformExpanded
                        ? 'translate-x-0 pointer-events-auto'
                        : 'translate-x-[150%] pointer-events-none',
                )}
            >
                <div className="flex flex-row justify-between items-center p-2">
                    <h1>Size &amp; Position</h1>
                    <button
                        onClick={onClose}
                        className="h-8 w-8 flex justify-center items-center cursor-pointer hover:rounded-full hover:bg-stone-200"
                    >
                        <i className="fa-solid fa-xmark text-lg"></i>
                    </button>
                </div>

                {['transform'].map((section) => (
                    <div key={section}>
                        {activeSection === section && section === 'transform' && (
                            <TransformControls
                                isSelected={isSelected}
                                width={width}
                                height={height}
                                diameter={diameter}
                                color={color}
                                top={top}
                                left={left}
                                onChange={handleTransformChange}
                            />
                        )}
                    </div>
                ))}
            </aside>
        </>
    );
};
