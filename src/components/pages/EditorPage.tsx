import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as fabric from 'fabric'; // <-- For Fabric v5
import EditorTemplate from '../templates/EditorTemplate';
import PrimarySidebar from '../organisms/PrimarySidebar';
import PropertiesPanel from '../organisms/PropertiesPanel';
import CanvasBoard from '../organisms/CanvasBoard';
import LayerPanel from '../organisms/LayerPanel';

const EditorPage = () => {
  const canvasRef = useRef(null);
  const [canvas, setCanvas] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState('move');
  const [transformValues, setTransformValues] = useState({});
  const [layers, setLayers] = useState([]);

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
  const objects = getObjects().map(obj => {
    if (!obj.id || seen.has(obj.id)) {
      obj.id = generateId();
    }
    seen.add(obj.id);

    return {
      id: obj.id,
      name: obj.name || obj.type,
      type: obj.type,
      visible: obj.visible !== false,
      locked: obj.locked || false,
      opacity: obj.opacity ?? 1,
    };
  });

  setLayers(objects);
}, [canvas, getObjects]);

  /** Initialize Fabric Canvas */
  useEffect(() => {
    if (!canvasRef.current) return;
    const initCanvas = new fabric.Canvas(canvasRef.current, {
      width: 794,
      height: 500,
      preserveObjectStacking: true, // Important for layer ordering
    });

    initCanvas.backgroundColor = '#FFF';
    initCanvas.renderAll();
    setCanvas(initCanvas);

    return () => initCanvas.dispose();
  }, []);

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
      fill: '#FF0000', name: 'Rectangle'
    }));

  const addCircle = () =>
    canvas?.add(new fabric.Circle({
      top: 50, left: 200, radius: 50,
      fill: '#00FF00', name: 'Circle'
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
    const obj = getObjects()[index];
    if (obj) { canvas.remove(obj); updateLayers(); }
  };

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
