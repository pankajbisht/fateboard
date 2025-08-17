//import React from 'react';
//import {Button} from "../atoms/Button.tsx";
//import clsx from "clsx";
//import { PanelHeader } from "../molecules/PanelHeader.tsx";
//import { useStore } from "../../store/store";


//const LayerPanel = ({
//  layers,
//  isLayerExpanded,
//  selectedSection,
//  onBringForward,
//  onSendBackward,
//  onBringToFront,
//  onSendToBack,
//  onToggleVisibility,
//  onToggleLock,
//  onDelete,
//  onDuplicate,
//  onRename,
//  onSetOpacity,
//  onGroup,
//  onUngroup
//}) => {
//
//console.log(layers);
//
//  return (
//    <aside
//      className={clsx(
//        "fixed top-20 right-16 bg-stone-100 rounded-md shadow-lg w-72 z-50 transition-transform duration-300",
//        true
//          ? "translate-x-0 pointer-events-auto"
//          : "translate-x-[150%] pointer-events-none"
//      )}
//    >
//      <h2 className="text-lg font-bold mb-2 px-4 p-2">Layers</h2>
//
//      {/* Group / Ungroup */}
//      <div className="mb-2 flex p-2">
//        <button  className="cursor-pointer h-8 w-8 hover:bg-stone-200"  onClick={onGroup}>
//          <i className="fa-solid fa-object-group"></i>
//        </button>
//
//        <button  className="cursor-pointer h-8 w-8 hover:bg-stone-200"  onClick={onUngroup}>
//          <i className="fa-solid fa-object-ungroup"></i>
//        </button>
//
//        {/*<button  className="cursor-pointer h-8 w-8 hover:bg-stone-200"  onClick={onSendToBack}>*/}
//        {/*  <i className="fa-regular fa-send-backward"></i>*/}
//        {/*</button>*/}
//      </div>
//
//      {/* Layer List */}
//      <ul className="overflow-y-auto h-96">
//        {layers.map((layer, index) => (
//          <li
//            key={layer.id}
//            className={clsx('flex items-center justify-between p-2 hover:bg-stone-200 cursor-drag', selectedSection === layer.id && 'bg-blue-200')}
//          >
//            {/* Editable Layer Name */}
//
//            <div className="flex flex-row items-center">
//
//              <button className="cursor-pointer h-8 w-8"  onClick={() => onToggleVisibility(index)}>
//                {
//                  layer.visible ?
//                  <i className="fa-solid fa-eye"></i> :
//                  <i className="fa-solid fa-eye-slash"></i>
//                }
//              </button>
//
//              <button className="cursor-pointer h-8 w-8 mx-1"  onClick={() => onToggleLock(index)}>
//                {
//                  layer.locked ?
//                  <i className="fa-solid fa-lock"></i> :
//                  <i className="fa-solid fa-unlock"></i>
//                }
//              </button>
//
//              <input
//                type="text"
//                value={layer.name[0]}
//                onChange={(e) => onRename(index, e.target.value)}
//                className="w-12 h-12 text-center border rounded px-1 text-sm mx-1"
//                readOnly
//              />
//
//            </div>
//
//            <div className="flex flex-row items-center">
//
//              <button className="cursor-pointer h-8 w-8"  onClick={() => onDelete(index)}>
//                <i className="fa-solid fa-trash"></i>
//              </button>
//            </div>
//
//            <div className="flex flex-row items-center">
//
//              <button className="cursor-pointer h-8 w-8"  onClick={() => onBringForward(index)}>
//                 <i className="fa-solid fa-bring-front"></i>
//              </button>
//            </div>
//
//            <div className="flex flex-row items-center">
//
//              <button className="cursor-pointer h-8 w-8"  onClick={() => onSendToBack(index)}>
//                 <i className="fa-regular fa-send-backward"></i>
//              </button>
//            </div>
//
//
//
//            {/* Controls */}
//            {/*<div className="flex items-center gap-1 text-xs">*/}
//            {/*  <button onClick={() => onBringForward(index)} title="Bring Forward">*/}
//            {/*    ▲*/}
//            {/*  </button>*/}
//            {/*  <button onClick={() => onSendBackward(index)} title="Send Backward">*/}
//            {/*    ▼*/}
//            {/*  </button>*/}
//            {/*  <button onClick={() => onBringToFront(index)} title="Bring to Front">*/}
//            {/*    ⏫*/}
//            {/*  </button>*/}
//            {/*  <button onClick={() => onSendToBack(index)} title="Send to Back">*/}
//            {/*    ⏬*/}
//            {/*  </button>*/}
//            {/*  <button onClick={() => onToggleVisibility(index)} title="Toggle Visibility">*/}
//            {/*    {layer.visible ? '👁️' : '🚫'}*/}
//            {/*  </button>*/}
//            {/*  <button onClick={() => onToggleLock(index)} title="Toggle Lock">*/}
//            {/*    {layer.locked ? '🔒' : '🔓'}*/}
//            {/*  </button>*/}
//            {/*  <button onClick={() => onDuplicate(index)} title="Duplicate">*/}
//            {/*    📄*/}
//            {/*  </button>*/}
//            {/*  <button onClick={() => onDelete(index)} title="Delete">*/}
//            {/*    🗑️*/}
//            {/*  </button>*/}
//            {/*</div>*/}
//
//            {/* Opacity Control */}
//            {/*<input*/}
//            {/*  type="range"*/}
//            {/*  min="0"*/}
//            {/*  max="1"*/}
//            {/*  step="0.1"*/}
//            {/*  value={layer.opacity}*/}
//            {/*  onChange={(e) => onSetOpacity(index, e.target.value)}*/}
//            {/*  className="w-16"*/}
//            {/*/>*/}
//          </li>
//        ))}
//      </ul>
//    </aside>
//  );
//};

//const LayerPanel = ({ closePanel }) => {
//
//  const layers = useStore(state => state.layers);
//
//  console.log(layers);
//
//  return <div>
//    <PanelHeader title="Layers" onClose={closePanel} />
//
//    <ul className="overflow-y-auto h-96">
//      { layers.map((layer, index) => {
//        return <li
//            key={layer.id}
//            className={clsx('flex items-center justify-between p-2 hover:bg-stone-200 cursor-drag', true && 'bg-blue-200')}
//          >
//            <div className="flex flex-row items-center">
//              <button className="cursor-pointer h-8 w-8"  onClick={() => onToggleVisibility(index)}>
//                {
//                  layer.visible ?
//                  <i className="fa-solid fa-eye"></i> :
//                  <i className="fa-solid fa-eye-slash"></i>
//                }
//              </button>
//
//               <button className="cursor-pointer h-8 w-8 mx-1"  onClick={() => onToggleLock(index)}>
//                {
//                  layer.locked ?
//                  <i className="fa-solid fa-lock"></i> :
//                  <i className="fa-solid fa-unlock"></i>
//                }
//              </button>
//
//              <input
//                  type="text"
//                  value={layer.name[0]}
//                  onChange={(e) => onRename(index, e.target.value)}
//                  className="w-12 h-12 text-center border rounded px-1 text-sm mx-1"
//                  readOnly
//                />
//              </div>
//              <div className="flex flex-row items-center">
//
//              <button className="cursor-pointer h-8 w-8"  onClick={() => onDelete(index)}>
//                <i className="fa-solid fa-trash"></i>
//              </button>
//            </div>
//
//            <div className="flex flex-row items-center">
//
//                            <button className="cursor-pointer h-8 w-8"  onClick={() => onBringForward(index)}>
//                               <i className="fa-solid fa-bring-front"></i>
//                            </button>
//                          </div>
//
//                          <div className="flex flex-row items-center">
//
//                            <button className="cursor-pointer h-8 w-8"  onClick={() => onSendToBack(index)}>
//                               <i className="fa-regular fa-send-backward"></i>
//                            </button>
//                          </div>
//          </li>
//      })}
//    </ul>
//
//
//    <div className="mb-2 flex p-2">
//      <button  className="cursor-pointer h-8 w-8 hover:bg-stone-200"  onClick={() => {}}>
//            <i className="fa-solid fa-object-group"></i>
//        </button>
//
//        <button  className="cursor-pointer h-8 w-8 hover:bg-stone-200"  onClick={() => {}}>
//          <i className="fa-solid fa-object-ungroup"></i>
//        </button>
//    </div>
//  </div>
//}
//
//export default LayerPanel;

//import React, { useEffect, useState } from "react";
//import clsx from "clsx";
//import { useStore } from "../../store/store";
//import { PanelHeader } from "../molecules/PanelHeader";
//
//const LayerItem = ({ layer, isSelected, handlers }) => {
//  const { onToggleVisibility, onToggleLock, onRename, onDelete, onBringForward, onSendToBack } = handlers;
//
//  return (
//    <li
//      className={clsx(
//        "flex items-center justify-between px-3 py-2 cursor-pointer rounded hover:bg-blue-50",
//        isSelected ? "bg-blue-100" : "bg-white"
//      )}
//    >
//      <div className="flex items-center gap-2">
//        <button onClick={() => onToggleVisibility(layer.id)}>
//          {layer.visible ? <i className="fa-solid fa-eye text-gray-600"></i> : <i className="fa-solid fa-eye-slash text-gray-400"></i>}
//        </button>
//        <button onClick={() => onToggleLock(layer.id)}>
//          {layer.locked ? <i className="fa-solid fa-lock text-gray-600"></i> : <i className="fa-solid fa-unlock text-gray-400"></i>}
//        </button>
//        <input
//          type="text"
//          value={layer.name}
//          onChange={(e) => onRename(layer.id, e.target.value)}
//          className="w-28 text-sm truncate border-none bg-transparent focus:outline-none"
//          readOnly={layer.locked}
//        />
//      </div>
//      <div className="flex items-center gap-2">
//        <button onClick={() => onDelete(layer.id)} title="Delete">
//          <i className="fa-solid fa-trash text-red-500 hover:text-red-700"></i>
//        </button>
//        <button onClick={() => onBringForward(layer.id)} title="Bring Forward">
//          <i className="fa-solid fa-bring-front text-gray-600 hover:text-gray-800"></i>
//        </button>
//        <button onClick={() => onSendToBack(layer.id)} title="Send Back">
//          <i className="fa-regular fa-send-backward text-gray-600 hover:text-gray-800"></i>
//        </button>
//      </div>
//    </li>
//  );
//};
//
//const LayerPanel = ({ closePanel }) => {
//  const canvas = useStore((s) => s.canvas);
//  const layers = useStore((s) => s.layers);
//
//  const [activeLayer, setActiveLayer] = useState(null);
//
//  const handlers = {
//    onToggleVisibility: useStore.getState().toggleLayerVisibility,
//    onToggleLock: useStore.getState().toggleLayerLock,
//    onRename: useStore.getState().renameLayer,
//    onDelete: useStore.getState().deleteLayer,
//    onBringForward: useStore.getState().bringLayerForward,
//    onSendToBack: useStore.getState().sendLayerToBack,
//  };
//
//  const groupSelected = () => useStore.getState().groupSelectedLayers();
//  const ungroupSelected = () => useStore.getState().ungroupSelectedLayers();
//
//  useEffect(() => {
//    if (!canvas) return;
//
//    const updateActiveLayer = () => {
//      const obj = canvas.getActiveObject();
//      setActiveLayer(obj?.layerId || null);
//    };
//
//    canvas.on("selection:created", updateActiveLayer);
//    canvas.on("selection:updated", updateActiveLayer);
//    canvas.on("selection:cleared", () => setActiveLayer(null));
//
//    return () => {
//      canvas.off("selection:created", updateActiveLayer);
//      canvas.off("selection:updated", updateActiveLayer);
//      canvas.off("selection:cleared", () => setActiveLayer(null));
//    };
//  }, [canvas]);
//
//  return (
//    <aside className="space-y-3 w-64 relative rounded">
//      {/* Header */}
//      <PanelHeader title="Layers" onClose={closePanel} />
//
//      {/* Layer List */}
//      <ul className="flex-1 overflow-y-auto divide-y divide-gray-200 h-64">
//        {layers.length === 0 && (
//          <li className="p-4 text-gray-400 text-center">No layers</li>
//        )}
//        {layers.map((layer) => (
//          <LayerItem
//            key={layer.id}
//            layer={layer}
//            isSelected={activeLayer === layer.id}
//            handlers={handlers}
//          />
//        ))}
//      </ul>
//
//      {/* Footer */}
//      <div className="flex gap-2 p-2 border-t bg-gray-50">
//        <button onClick={groupSelected} className="flex-1 p-2 bg-blue-50 hover:bg-blue-100 rounded text-center flex items-center justify-center gap-2 text-sm font-medium">
//          <i className="fa-solid fa-object-group"></i> Group
//        </button>
//        <button onClick={ungroupSelected} className="flex-1 p-2 bg-blue-50 hover:bg-blue-100 rounded text-center flex items-center justify-center gap-2 text-sm font-medium">
//          <i className="fa-solid fa-object-ungroup"></i> Ungroup
//        </button>
//      </div>
//    </aside>
//  );
//};
//
//export default LayerPanel;

import React, { useState, useRef } from "react";
import clsx from "clsx";
import { useStore } from "../../store/store";
import { PanelHeader } from "../molecules/PanelHeader";

// Tooltip icon button
const IconButton = ({ title, onClick, icon }) => (
  <div className="relative group">
    <button
      onClick={onClick}
      className="p-1 hover:bg-gray-200 rounded text-gray-600 flex items-center justify-center w-7 h-7"
    >
      <i className={icon}></i>
    </button>
    <span className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-xs bg-gray-800 text-white rounded px-2 py-1 whitespace-nowrap z-50">
      {title}
    </span>
  </div>
);


// Recursive Layer Item
//const LayerItem = ({ layer, handlers, toggleSelect, multiSelect, depth = 0 }) => {
//  const [collapsed, setCollapsed] = useState(false);
//  const isSelected = multiSelect.includes(layer.id);
//  const indent = depth * 12;
//
//    console.log(layer.visible)
//
//  return (
//    <>
//      <li
//        className={clsx(
//          "flex justify-between items-center px-2 py-1 rounded-md hover:bg-blue-50 cursor-pointer transition select-none",
//          isSelected ? "bg-blue-100 border border-blue-300" : "bg-white"
//        )}
//        style={{ marginLeft: indent }}
//        onClick={() => toggleSelect(layer.id)}
//      >
//        <div className="flex items-center gap-1">
//          {layer.children?.length > 0 && (
//            <button
//              className="w-4 h-4 flex items-center justify-center text-xs text-gray-500"
//              onClick={(e) => {
//                e.stopPropagation();
//                setCollapsed(!collapsed);
//              }}
//            >
//              {collapsed ? "+" : "-"}
//            </button>
//          )}
//
//          {/* Visibility Icon */}
//          <button
//            onClick={(e) => {
//              e.stopPropagation();
//              handlers.onToggleVisibility(layer.id);
//            }}
//            title={layer.visible ? "Visible" : "Hidden"}
//            className="p-1 hover:bg-gray-200 rounded"
//          >
//            <i className={layer.visible ? "fa-solid fa-eye" : "fa-solid fa-eye-slash"}></i>
//          </button>
//
//          {/* Lock Icon */}
//          <button
//            onClick={(e) => {
//              e.stopPropagation();
//              handlers.onToggleLock(layer.id);
//            }}
//            title={layer.locked ? "Locked" : "Unlocked"}
//            className="p-1 hover:bg-gray-200 rounded"
//          >
//            <i className={layer.locked ? "fa-solid fa-lock" : "fa-solid fa-unlock"}></i>
//          </button>
//
//          <input
//            type="text"
//            value={layer.name}
//            onChange={(e) => handlers.onRename(layer.id, e.target.value)}
//            className="w-24 text-xs border rounded px-1 py-0.5"
//            readOnly={layer.locked}
//          />
//        </div>
//
//        <div className="flex items-center gap-1">
//          <IconButton
//            title="Delete"
//            onClick={() => handlers.onDelete(layer.id)}
//            icon="fa-solid fa-trash"
//          />
//        </div>
//      </li>
//
//      {layer.children?.length > 0 && !collapsed && (
//        <ul className="pl-2">
//          {layer.children.map((child) => (
//            <LayerItem
//              key={child.id}
//              layer={child}
//              handlers={handlers}
//              toggleSelect={toggleSelect}
//              multiSelect={multiSelect}
//              depth={depth + 1}
//            />
//          ))}
//        </ul>
//      )}
//    </>
//  );
//};


const LayerItem = ({ layer, handlers, toggleSelect, multiSelect, depth = 0 }) => {
    const [collapsed, setCollapsed] = useState(false);
    const isSelected = multiSelect.includes(layer.id);
    const indent = depth * 12;

    console.log(multiSelect);

    return (
      <>
        <li
          className={clsx(
            "flex justify-between items-center px-2 py-1 rounded-md hover:bg-blue-50 cursor-pointer transition select-none",
            isSelected ? "bg-blue-100 border border-blue-300" : "bg-white"
          )}
          style={{ marginLeft: indent }}
          onClick={() => toggleSelect(layer.id)}
        >
          <div className="flex items-center gap-1">
            {layer.children?.length > 0 && (
              <button
                className="w-4 h-4 flex items-center justify-center text-xs text-gray-500"
                onClick={(e) => {
                  e.stopPropagation();
                  setCollapsed(!collapsed);
                }}
              >
                {collapsed ? "+" : "-"}
              </button>
            )}

            {/* Visibility */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlers.onToggleVisibility(layer.id);
              }}
              title={layer.visible ? "Visible" : "Hidden"}
              className="p-1 hover:bg-gray-200 rounded"
            >
              <i className={layer.visible ? "fa-solid fa-eye" : "fa-solid fa-eye-slash"}></i>
            </button>

            {/* Lock */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlers.onToggleLock(layer.id);
              }}
              title={layer.locked ? "Locked" : "Unlocked"}
              className="p-1 hover:bg-gray-200 rounded"
            >
              <i className={layer.locked ? "fa-solid fa-lock" : "fa-solid fa-unlock"}></i>
            </button>

            {/* Rename */}
            <input
              type="text"
              value={layer.name}
              onChange={(e) => handlers.onRename(layer.id, e.target.value)}
              className="w-24 text-xs border rounded px-1 py-0.5"
              readOnly={layer.locked}
            />
          </div>

          <div className="flex items-center gap-1">
            {/* Reorder Buttons */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlers.onBringToFront(layer.id);
              }}
              title="Bring to Front"
              className="p-1 hover:bg-gray-200 rounded"
            >
              <i className="fa-solid fa-arrow-up"></i>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handlers.onSendToBack(layer.id);
              }}
              title="Send to Back"
              className="p-1 hover:bg-gray-200 rounded"
            >
              <i className="fa-solid fa-arrow-down"></i>
            </button>

            {/* Delete */}
            <IconButton
              title="Delete"
              onClick={() => handlers.onDelete(layer.id)}
              icon="fa-solid fa-trash"
            />
          </div>
        </li>

        {/* Render children recursively */}
        {layer.children?.length > 0 && !collapsed && (
          <ul className="pl-2">
            {layer.children.map((child) => (
              <LayerItem
                key={child.id}
                layer={child}
                handlers={handlers}
                toggleSelect={toggleSelect}
                multiSelect={multiSelect}
                depth={depth + 1}
              />
            ))}
          </ul>
        )}
      </>
    );
  };



const LayerPanel = ({ closePanel }) => {
  const layers = useStore((s) => s.layers);
  const [multiSelect, setMultiSelect] = useState([]);

    console.log(layers);

  const handlers = {
    onToggleVisibility: useStore.getState().toggleVisibility,
    onToggleLock: useStore.getState().toggleLayerLock,
    onRename: useStore.getState().renameLayer,
    onDelete: useStore.getState().removeLayer,
    reorderLayer: useStore.getState().reorderLayer,
    onBringToFront: useStore.getState().bringLayerForward,
    onSendToBack: useStore.getState().sendLayerBackward,
    duplicateLayer: useStore.getState().duplicateLayer,
  };

  const groupSelected = () => useStore.getState().groupLayers(multiSelect);
  const ungroupSelected = () => useStore.getState().ungroupSelectedLayers(multiSelect);
  const align = (type) => useStore.getState().alignLayers(type, multiSelect);
  const distribute = (type) => useStore.getState().distributeLayers(type, multiSelect);

  const toggleSelect = (id) => {
    setMultiSelect((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <aside className="flex flex-col w-64 h-full  rounded">
      {/* Header */}
      <div className="flex flex-col border-b border-stone-300">
        <PanelHeader title="Layers" onClose={closePanel} />
        <div className="flex flex-wrap gap-1 p-2 bg-gray-50 justify-start">
          <IconButton title="Group" onClick={groupSelected} icon="fa-solid fa-object-group" />
          <IconButton title="Ungroup" onClick={ungroupSelected} icon="fa-solid fa-object-ungroup" />
          <IconButton title="Align Left" onClick={() => align("left")} icon="fa-solid fa-align-left" />
          <IconButton title="Align Center" onClick={() => align("center")} icon="fa-solid fa-align-center" />
          <IconButton title="Align Right" onClick={() => align("right")} icon="fa-solid fa-align-right" />
          <IconButton title="Distribute Horizontally" onClick={() => distribute("horizontal")} icon="fa-solid fa-arrows-left-right" />
          <IconButton title="Distribute Vertically" onClick={() => distribute("vertical")} icon="fa-solid fa-arrows-up-down" />
        </div>
      </div>

      {/* Layer List */}
      <ul className="overflow-y-auto h-64 p-1 space-y-1">
          {layers.map((layer) => (
            <LayerItem
              key={layer.id}
              layer={layer}
              handlers={handlers}
              toggleSelect={toggleSelect}
              multiSelect={multiSelect}
            />
          ))}
        </ul>
    </aside>
  );
};

export default LayerPanel;
