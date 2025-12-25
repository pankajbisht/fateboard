import EIconButton from '../atoms/EIconButton.tsx';

export const RightPanel = ({ canvas, onToggleLayerPanel, onToggleTransformPanel }) => {
    return (
        <aside className="flex flex-col gap-4 fixed top-20 right-2 bg-stone-100 p-2 rounded-md shadow-lg z-50">
            <EIconButton icon="fa-solid fa-layer-group" onClick={onToggleLayerPanel} />
            <EIconButton icon="fa fa-vector-square" onClick={onToggleTransformPanel} />
        </aside>
    );
};
