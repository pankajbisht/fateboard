const LayerItem = ({ layer, onToggleVisibility, onToggleLock, onBringForward, onSendBackward }) => {
    return (
      <div className="flex justify-between items-center p-1 border-b">
        <span>{layer.type} {layer.id + 1}</span>
        <div className="flex gap-2">
          <button onClick={() => onToggleVisibility(layer)}>{layer.visible ? "👁️" : "🚫"}</button>
          <button onClick={() => onToggleLock(layer)}>{layer.locked ? "🔒" : "🔓"}</button>
          <button onClick={() => onBringForward(layer)}>⬆️</button>
          <button onClick={() => onSendBackward(layer)}>⬇️</button>
        </div>
      </div>
    );
  };

  export default LayerItem;
  