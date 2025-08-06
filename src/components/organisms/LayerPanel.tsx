import React from 'react';
import {Button} from "../atoms/Button.tsx";

const LayerPanel = ({
  layers,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
  onToggleVisibility,
  onToggleLock,
  onDelete,
  onDuplicate,
  onRename,
  onSetOpacity,
  onGroup,
  onUngroup
}) => {

console.log(layers);

  return (
    <aside className="fixed top-2 right-2 bg-stone-100 rounded-md shadow-lg w-72 z-50">
      <h2 className="text-lg font-bold mb-2 px-4 p-2">Layers</h2>

      {/* Group / Ungroup */}
      <div className="mb-2 flex p-2">
        <button  className="cursor-pointer h-8 w-8 hover:bg-stone-200"  onClick={onGroup}>
          <i className="fa-solid fa-object-group"></i>
        </button>

        <button  className="cursor-pointer h-8 w-8 hover:bg-stone-200"  onClick={onUngroup}>
          <i className="fa-solid fa-object-ungroup"></i>
        </button>
      </div>

      {/* Layer List */}
      <ul className="overflow-y-auto h-96">
        {layers.map((layer, index) => (
          <li
            key={layer.id}
            className="flex items-center justify-between p-2 hover:bg-stone-200 cursor-drag"
          >
            {/* Editable Layer Name */}

            <div className="flex flex-row items-center">

              <button className="cursor-pointer h-8 w-8"  onClick={() => onToggleVisibility(index)}>
                {
                  layer.visible ?
                  <i className="fa-solid fa-eye"></i> :
                  <i className="fa-solid fa-eye-slash"></i>
                }
              </button>

              <button className="cursor-pointer h-8 w-8 mx-1"  onClick={() => onToggleLock(index)}>
                {
                  layer.locked ?
                  <i className="fa-solid fa-lock"></i> :
                  <i className="fa-solid fa-unlock"></i>
                }
              </button>

              <input
                type="text"
                value={layer.name[0]}
                onChange={(e) => onRename(index, e.target.value)}
                className="w-12 h-12 text-center border rounded px-1 text-sm mx-1"
                readOnly
              />

            </div>

            <div className="flex flex-row items-center">

              <button className="cursor-pointer h-8 w-8"  onClick={() => onDelete(index)}>
                <i className="fa-solid fa-trash"></i>
              </button>
            </div>

            {/* Controls */}
            {/*<div className="flex items-center gap-1 text-xs">*/}
            {/*  <button onClick={() => onBringForward(index)} title="Bring Forward">*/}
            {/*    ▲*/}
            {/*  </button>*/}
            {/*  <button onClick={() => onSendBackward(index)} title="Send Backward">*/}
            {/*    ▼*/}
            {/*  </button>*/}
            {/*  <button onClick={() => onBringToFront(index)} title="Bring to Front">*/}
            {/*    ⏫*/}
            {/*  </button>*/}
            {/*  <button onClick={() => onSendToBack(index)} title="Send to Back">*/}
            {/*    ⏬*/}
            {/*  </button>*/}
            {/*  <button onClick={() => onToggleVisibility(index)} title="Toggle Visibility">*/}
            {/*    {layer.visible ? '👁️' : '🚫'}*/}
            {/*  </button>*/}
            {/*  <button onClick={() => onToggleLock(index)} title="Toggle Lock">*/}
            {/*    {layer.locked ? '🔒' : '🔓'}*/}
            {/*  </button>*/}
            {/*  <button onClick={() => onDuplicate(index)} title="Duplicate">*/}
            {/*    📄*/}
            {/*  </button>*/}
            {/*  <button onClick={() => onDelete(index)} title="Delete">*/}
            {/*    🗑️*/}
            {/*  </button>*/}
            {/*</div>*/}

            {/* Opacity Control */}
            {/*<input*/}
            {/*  type="range"*/}
            {/*  min="0"*/}
            {/*  max="1"*/}
            {/*  step="0.1"*/}
            {/*  value={layer.opacity}*/}
            {/*  onChange={(e) => onSetOpacity(index, e.target.value)}*/}
            {/*  className="w-16"*/}
            {/*/>*/}
          </li>
        ))}
      </ul>
    </aside>
  );
};

export default LayerPanel;
