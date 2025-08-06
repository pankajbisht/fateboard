import LayerItem from '../atoms/LayerItem';

const LayerList = ({ layers, onToggleVisibility, onToggleLock, onBringForward, onSendBackward }) => {
  return (
    <div className="bg-stone-100 p-2 rounded-md shadow">
      {layers.map((layer) => (
        <LayerItem
          key={layer.id}
          layer={layer}
          onToggleVisibility={onToggleVisibility}
          onToggleLock={onToggleLock}
          onBringForward={onBringForward}
          onSendBackward={onSendBackward}
        />
      ))}
    </div>
  );
};

export default LayerList;
