import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as fabric from 'fabric'; // <-- For Fabric v5
import EditorTemplate from '../templates/EditorTemplate';
import PrimarySidebar from '../organisms/PrimarySidebar';
import PropertiesPanel from '../organisms/PropertiesPanel';
import CanvasBoard from '../organisms/CanvasBoard';
import LayerPanel from '../organisms/LayerPanel';
import useFabricClipboardHistory from "../../hooks/useFabricClipboardHistory.ts";
import colors from 'tailwindcss/colors';

const EditorPage = () => {
  const canvasRef = useRef(null);
//  const clipboardRef = useRef(null);
  const fabricRef = useRef(null); // fabric.Canvas instance
  const [canvas, setCanvas] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState('move');
  const [transformValues, setTransformValues] = useState({});
  const [layers, setLayers] = useState([]);
  const [selectedSection, setSelectedSection] = useState({})
console.log(colors.red);

  const {
    trackMousePosition,
    saveHistory,
    copyObject,
    cutObject,
    pasteObject,
    undo,
    redo,
    deleteSelectedLayers
  } = useFabricClipboardHistory();

  /** Get objects top-most first */
  const getObjects = useCallback(() => {
    if (!canvas) return [];
    return [...canvas.getObjects()].reverse();
  }, [canvas]);

  /** Update layer panel */
//  const updateLayers = useCallback(() => {
//    if (!canvas) return;
//    const objects = getObjects().map((obj, index) => {
//      if (!obj.id) obj.id = `layer-${Date.now()}-${index}`;
//      return {
//        id: obj.id,
//        name: obj.name || `${obj.type}-${index + 1}`,
//        type: obj.type,
//        visible: obj.visible !== false,
//        locked: obj.selectable === false,
//        opacity: obj.opacity ?? 1,
//      };
//    });
//    setLayers(objects);
//  }, [canvas, getObjects]);

const generateId = () => `layer-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

/** Update Layers */
const updateLayers = useCallback(() => {
  if (!canvas) return;

  const seen = new Set();
  const activeObject = canvas.getActiveObject(); // <-- Get currently selected object
  const activeId = activeObject?.id || null;


  const objects = getObjects().map(obj => {
    if (!obj.id || seen.has(obj.id)) {
      obj.id = generateId();
    }
    seen.add(obj.id);

    console.log(obj.id, seen);
    return {
      id: obj.id,
      name: obj.name || obj.type,
      type: obj.type,
      visible: obj.visible !== false,
      locked: obj.locked || false,
      opacity: obj.opacity ?? 1,
      isSelected: true
    };
  });

  setSelectedSection(activeId);

  setLayers(objects);
}, [canvas, getObjects]);



/** Initialize Fabric Canvas */
useEffect(() => {
  if (!canvasRef.current) return;

  const initCanvas = new fabric.Canvas(canvasRef.current, {
    width: 794,
    height: 500,
    preserveObjectStacking: true,
  });

  fabricRef.current = initCanvas;
  initCanvas.backgroundColor = "#FFF";
  initCanvas.renderAll();

  // Optional: remove this if you only use fabricRef
  setCanvas(initCanvas);
  saveHistory(initCanvas);

  initCanvas.on("mouse:move", trackMousePosition(initCanvas));

  const handleKeyDown = (e) => {
    const isMac = navigator.platform.toUpperCase().includes("MAC");
    const key = e.key.toLowerCase();
    const cmd = isMac ? e.metaKey : e.ctrlKey;
    const currentCanvas = fabricRef.current;

    if (!currentCanvas) return;

    if (cmd && key === "c") { e.preventDefault(); copyObject(currentCanvas); }
    if (cmd && key === "x") { e.preventDefault(); cutObject(currentCanvas); }
    if (cmd && key === "v") { e.preventDefault(); pasteObject(currentCanvas); }
    if (cmd && key === "z" && !e.shiftKey) { e.preventDefault(); undo(currentCanvas); }
    if (cmd && (key === "y" || (key === "z" && e.shiftKey))) { e.preventDefault(); redo(currentCanvas); }
    if (cmd && (key === "delete" || key === "backspace")) { e.preventDefault(); deleteSelectedLayers(); }
  };

  document.addEventListener("keydown", handleKeyDown, true);

  return () => {
    document.removeEventListener("keydown", handleKeyDown, true);
    initCanvas.dispose();
  };
}, []); // run once



  // Keyboard listener


  /** Attach event listeners after canvas is ready */
  useEffect(() => {
    if (!canvas) return;
    const handleUpdate = () => updateLayers();

    canvas.on('object:added', handleUpdate);
    canvas.on('object:removed', handleUpdate);
    canvas.on('object:modified', handleUpdate);
    canvas.on('selection:created', handleUpdate);
    canvas.on('selection:updated', handleUpdate);

    updateLayers(); // Initial load

    return () => {
      canvas.off('object:added', handleUpdate);
      canvas.off('object:removed', handleUpdate);
      canvas.off('object:modified', handleUpdate);
      canvas.off('selection:created', handleUpdate);
      canvas.off('selection:updated', handleUpdate);
    };
  }, [canvas, updateLayers]);



  /** Object creation */
  const addRectangle = () =>
    canvas?.add(new fabric.Rect({
      top: 50, left: 50, width: 100, height: 100,
      fill: colors.red[500], name: 'Rectangle'
    }));

  const addEllipse = () => {
    const ellipse = new fabric.Ellipse({
      top: 50,
      left: 50,
      rx: 70,
      ry: 20,
      fill: colors.red[500],
      name: 'Ellips'
    });
    canvas.add(ellipse);
  };

  const addCircle = () =>
    canvas?.add(new fabric.Circle({
      top: 50, left: 200, radius: 50,
      fill: colors.red[500], name: 'Circle'
    }));

  const addText = () =>
    canvas?.add(new fabric.IText('Edit me', {
      top: 150, left: 50,
      fontSize: 24, fill: '#000', name: 'Text'
    }));

  /** Transform changes */
  const handleTransformChange = (field, value) => {
    setTransformValues(prev => ({ ...prev, [field]: value }));
    const activeObj = canvas?.getActiveObject();
    if (activeObj) {
      activeObj.set(field, isNaN(parseFloat(value)) ? value : parseFloat(value));
      canvas.renderAll();
    }
  };

  /** Layer operations */
  const bringForward = (index) => {
    const obj = getObjects()[index];
    if (obj) { canvas.bringObjectForward(obj); canvas.renderAll(); updateLayers(); }
  };

  const sendBackward = (index) => {
    const obj = getObjects()[index];
    if (obj) { canvas.sendObjectBackwards(obj); canvas.renderAll(); updateLayers(); }
  };

  const bringToFront = (index) => {
    const obj = getObjects()[index];
    if (obj) { canvas.bringObjectToFront(obj); canvas.renderAll(); updateLayers(); }
  };

  const sendToBack = (index) => {
    const obj = getObjects()[index];
    if (obj) { canvas.sendObjectToBack(obj); canvas.renderAll(); updateLayers(); }
  };

  const toggleVisibility = (index) => {
    const obj = getObjects()[index];
    if (obj) { obj.visible = !obj.visible; canvas.renderAll(); updateLayers(); }
  };

  const toggleLock1 = (index) => {
    const obj = getObjects()[index];
    if (obj) { obj.selectable = !obj.selectable; canvas.renderAll(); updateLayers(); }
  };

  const toggleLock = (index) => {
    const obj = getObjects()[index];
    if (!obj) return;

    const isLocked = obj.selectable === false;

    obj.set({
      selectable: isLocked,     // true when unlocking
      evented: isLocked,        // allow interaction when unlocking
      lockMovementX: !isLocked, // lock when locking, unlock when unlocking
      lockMovementY: !isLocked,
      locked: !isLocked
    });

    canvas.renderAll();
    updateLayers();
  };



  const deleteLayer = (index) => {
    console.log(index);
    const obj = getObjects()[index];
    if (obj) { canvas.remove(obj); updateLayers(); }
  };

//const deleteLayer = (index = null) => {
//
//  console.log(canvas.getActiveObjects())

//  const currentCanvas = fabricRef.current;
//  if (!currentCanvas) return; // safeguard
//
//  const objects = getObjects(); // or currentCanvas.getObjects()
//  let target = null;
//
//  if (index !== null) {
//    // Delete by index from layer panel
//    target = objects[index];
//  } else {
//    // Delete active object from keyboard
//    target = currentCanvas.getActiveObject();
//  }
//
//  if (target) {
//    // Save state before deleting
//    historyRef.current.push(JSON.stringify(currentCanvas));
//    redoStackRef.current.length = 0; // Clear redo on new action
//
//    currentCanvas.remove(target);
//    currentCanvas.discardActiveObject();
//    currentCanvas.renderAll();
//    updateLayers();
//  }
//};



/** Duplicate */
const duplicateLayer = index => {
  const obj = getObjects()[index];
  if (!obj || !canvas) return;

  try {
    const json = obj.toJSON();
    fabric.util.enlivenObjects([json], ([clone]) => {
      if (!clone) return;

      clone.set({
        id: generateId(),
        left: (obj.left || 0) + 20,
        top: (obj.top || 0) + 20,
        evented: true,
        selectable: true,
      });

      canvas.add(clone);
      canvas.setActiveObject(clone);
      canvas.renderAll();
      updateLayers();
    });
  } catch (err) {
    console.error('Failed to duplicate:', err);
  }
};

  const setLayerOpacity = (index, value) => {
    const obj = getObjects()[index];
    if (obj) {
      obj.set('opacity', parseFloat(value));
      canvas.renderAll();
      updateLayers();
    }
  };




  /** Group */
///** Group Selected Objects (Fabric.js v5) */
//const groupSelected = () => {
//  if (!canvas) return;
//  const active = canvas.getActiveObject();
//
//  if (active && active.type === 'activeselection') {
//    const objects = active.getObjects();
//
//    // Create a new group from the selected objects
//    const group = new fabric.Group(objects);
//
//    // Remove individual objects from canvas
//    objects.forEach(obj => canvas.remove(obj));
//
//    // Add the new group to canvas
//    group.id = generateId(); // Give group a unique ID
//    canvas.add(group);
//    canvas.setActiveObject(group);
//
//    canvas.renderAll();
//    updateLayers();
//  }
//};
//
//
///** Ungroup Selected Group (Fabric.js v5) */
//const ungroupSelected = () => {
//  if (!canvas) return;
//  const active = canvas.getActiveObject();
//
//  if (active && active.type === 'group') {
//    const items = active.getObjects();
//
//    // Remove the group
//    canvas.remove(active);
//
//    // Add back each object
//    items.forEach(obj => canvas.add(obj));
//
//    canvas.discardActiveObject();
//    canvas.renderAll();
//    updateLayers();
//  }
//};

//const groupSelected = () => {
//  if (!canvas) return;
//  const active = canvas.getActiveObject();
//
//  if (active && active.type === 'activeselection') {
//    const objects = active.getObjects();
//
//    // Create the new group
//    const group = new fabric.Group(objects, { id: generateId() });
//
//    // Remove individual objects from canvas
//    objects.forEach(obj => canvas.remove(obj));
//
//    // Reset selection and add the new group
//    canvas.discardActiveObject();
//    canvas.add(group);
//    canvas.setActiveObject(group);
//
//    canvas.requestRenderAll();
//    updateLayers();
//  }
//};

const deleteObject = () => {
    if (!canvas) return;

    const activeObjects = canvas.getActiveObjects();
    if (!activeObjects) return;

    activeObjects.forEach((obj) => canvas.remove(obj));
    canvas.discardActiveObject();
    canvas.requestRenderAll();
  };

  const groupSelected = () => {
    if (!canvas) return;
    const objects = canvas.getActiveObjects();
    deleteObject();
    const group = new fabric.Group(objects);
    canvas.add(group);
    canvas.requestRenderAll();
  };

  const ungroupSelected = () => {
    if (!canvas) return;
    const object = canvas.getActiveObject() as Group;
    if (!object) return;
    canvas.remove(object);
    canvas.add(...object.removeAll());
    canvas.requestRenderAll();
  };


  return (
    <EditorTemplate
      sidebar={
        <PrimarySidebar
          onAddRectangle={addRectangle}
          onAddCircle={addCircle}
          onAddText={addText}
          onAddEllipse={addEllipse}
          onTogglePanel={() => setIsExpanded(!isExpanded)}
          isPanelOpen={isExpanded}
        />
      }
      propertiesPanel={
        <PropertiesPanel
          canvas={canvas}
          isExpanded={isExpanded}
          activeSection={activeSection}
          onClose={() => setIsExpanded(false)}
          onToggleSection={(s) => setActiveSection(activeSection === s ? null : s)}
          transformValues={transformValues}
          onTransformChange={handleTransformChange}
        />
      }
      canvasBoard={<CanvasBoard canvasRef={canvasRef} canvas={canvas} />}
      layers={
        <LayerPanel
          layers={layers}
          selectedSection={selectedSection}
          onBringForward={bringForward}
          onSendBackward={sendBackward}
          onBringToFront={bringToFront}
          onSendToBack={sendToBack}
          onToggleVisibility={toggleVisibility}
          onToggleLock={toggleLock}
          onDelete={deleteLayer}
          onDuplicate={duplicateLayer}
          onGroup={groupSelected}
          onUngroup={ungroupSelected}
          onSetOpacity={setLayerOpacity}
        />
      }
    />
  );
};

export default EditorPage;
