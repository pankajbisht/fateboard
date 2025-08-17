//import {
//  Router,
//  Route,
//  rootRouteWithContext,
//} from '@tanstack/react-router'
//
//import { SongGallery } from './components/pages/SongGallery.tsx'
//import { Practice } from './components/pages/Practice.tsx'
//import { AlbumPage } from './components/pages/AlbumPage.tsx'
//
//
//const rootRoute = rootRouteWithContext()();
//
//const homeRoute = new Route({
//  getParentRoute: () => rootRoute,
//  path: '/',
//  component: Practice
//})
//
//const routeTree = rootRoute.addChildren([homeRoute])
//
//export const router = new Router({
//  routeTree,
//})
//
//import { useRef, useState, useEffect } from "react";
//
//export function Editor() {
//  const canvasRef = useRef(null);
//  const [shapes, setShapes] = useState([]);
//  const [drawing, setDrawing] = useState(null);
//  const [selectedId, setSelectedId] = useState(null);
//  const [interaction, setInteraction] = useState(null);
//  const [keys, setKeys] = useState({ shift: false });
//
//  // Track Shift and Delete keys
//  useEffect(() => {
//    const handleKeyDown = (e) => {
//      if (e.key === "Shift") setKeys((k) => ({ ...k, shift: true }));
//      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
//        setShapes((prev) => prev.filter((s) => s.id !== selectedId));
//        setSelectedId(null);
//      }
//    };
//    const handleKeyUp = (e) => {
//      if (e.key === "Shift") setKeys((k) => ({ ...k, shift: false }));
//    };
//    window.addEventListener("keydown", handleKeyDown);
//    window.addEventListener("keyup", handleKeyUp);
//    return () => {
//      window.removeEventListener("keydown", handleKeyDown);
//      window.removeEventListener("keyup", handleKeyUp);
//    };
//  }, [selectedId]);
//
//  // Redraw canvas
//  useEffect(() => {
//    const canvas = canvasRef.current;
//    const ctx = canvas.getContext("2d");
//    ctx.clearRect(0, 0, canvas.width, canvas.height);
//
//    shapes.forEach((shape) => {
//      ctx.save();
//      ctx.translate(shape.x + shape.width / 2, shape.y + shape.height / 2);
//      ctx.rotate((shape.rotation || 0) * Math.PI / 180);
//
//      // Draw shape
//      ctx.fillStyle = shape.id === selectedId ? "green" : "blue";
//      ctx.fillRect(-shape.width / 2, -shape.height / 2, shape.width, shape.height);
//
//      // Draw bounding box and handles
//      if (shape.id === selectedId) drawBoundingBox(ctx, shape);
//      ctx.restore();
//    });
//
//    // Preview rectangle while drawing
//    if (drawing) {
//      ctx.strokeStyle = "black";
//      ctx.strokeRect(drawing.x, drawing.y, drawing.width, drawing.height);
//    }
//  }, [shapes, drawing, selectedId]);
//
//  // Draw bounding box + handles
//  const drawBoundingBox = (ctx, shape) => {
//    const { width, height } = shape;
//    ctx.strokeStyle = "red";
//    ctx.strokeRect(-width / 2, -height / 2, width, height);
//
//    const handles = [
//      { x: -width / 2, y: -height / 2, type: "corner", corner: "tl" },
//      { x: width / 2, y: -height / 2, type: "corner", corner: "tr" },
//      { x: -width / 2, y: height / 2, type: "corner", corner: "bl" },
//      { x: width / 2, y: height / 2, type: "corner", corner: "br" },
//      { x: 0, y: -height / 2, type: "side", side: "top" },
//      { x: 0, y: height / 2, type: "side", side: "bottom" },
//      { x: -width / 2, y: 0, type: "side", side: "left" },
//      { x: width / 2, y: 0, type: "side", side: "right" },
//      { x: 0, y: -height / 2 - 30, type: "rotate" }
//    ];
//
//    handles.forEach((h) => {
//      ctx.beginPath();
//      if (h.type === "rotate") {
//        ctx.fillStyle = "orange";
//        ctx.arc(h.x, h.y, 6, 0, 2 * Math.PI);
//        ctx.fill();
//        ctx.stroke();
//      } else {
//        ctx.fillStyle = "white";
//        ctx.fillRect(h.x - 5, h.y - 5, 10, 10);
//        ctx.strokeRect(h.x - 5, h.y - 5, 10, 10);
//      }
//    });
//  };
//
//  // Convert global coords to shape-local coords
//  const toLocalCoords = (x, y, centerX, centerY, rotation) => {
//    const angle = -(rotation * Math.PI) / 180;
//    const dx = x - centerX;
//    const dy = y - centerY;
//    return {
//      x: dx * Math.cos(angle) - dy * Math.sin(angle),
//      y: dx * Math.sin(angle) + dy * Math.cos(angle)
//    };
//  };
//
//  const getMousePos = (e) => {
//    const rect = canvasRef.current.getBoundingClientRect();
//    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
//  };
//
//  // Handle mousedown
//  const handleMouseDown = (e) => {
//    const { x, y } = getMousePos(e);
//    let clickedHandle = null;
//    let clickedShape = null;
//
//    for (let shape of [...shapes].reverse()) {
//      const centerX = shape.x + shape.width / 2;
//      const centerY = shape.y + shape.height / 2;
//      const local = toLocalCoords(x, y, centerX, centerY, shape.rotation || 0);
//
//      const handles = [
//        { x: -shape.width / 2, y: -shape.height / 2, type: "corner", corner: "tl" },
//        { x: shape.width / 2, y: -shape.height / 2, type: "corner", corner: "tr" },
//        { x: -shape.width / 2, y: shape.height / 2, type: "corner", corner: "bl" },
//        { x: shape.width / 2, y: shape.height / 2, type: "corner", corner: "br" },
//        { x: 0, y: -shape.height / 2, type: "side", side: "top" },
//        { x: 0, y: shape.height / 2, type: "side", side: "bottom" },
//        { x: -shape.width / 2, y: 0, type: "side", side: "left" },
//        { x: shape.width / 2, y: 0, type: "side", side: "right" },
//        { x: 0, y: -shape.height / 2 - 30, type: "rotate" }
//      ];
//
//      clickedHandle = handles.find((h) => {
//        if (h.type === "rotate") return Math.hypot(local.x - h.x, local.y - h.y) < 8;
//        return (
//          local.x >= h.x - 6 &&
//          local.x <= h.x + 6 &&
//          local.y >= h.y - 6 &&
//          local.y <= h.y + 6
//        );
//      });
//
//      if (clickedHandle) {
//        setSelectedId(shape.id);
//
//        if (clickedHandle.type === "rotate") {
//          const startAngle = Math.atan2(y - centerY, x - centerX);
//          setInteraction({
//            type: "rotate",
//            shapeId: shape.id,
//            centerX,
//            centerY,
//            startAngle,
//            initialRotation: shape.rotation || 0
//          });
//        } else {
//          setInteraction({
//            type: "resize",
//            shapeId: shape.id,
//            handle: clickedHandle,
//            initialWidth: shape.width,
//            initialHeight: shape.height,
//            initialX: shape.x,
//            initialY: shape.y
//          });
//        }
//        return;
//      }
//
//      if (
//        local.x > -shape.width / 2 &&
//        local.x < shape.width / 2 &&
//        local.y > -shape.height / 2 &&
//        local.y < shape.height / 2
//      ) {
//        clickedShape = shape;
//        break;
//      }
//    }
//
//    if (clickedShape) {
//      setSelectedId(clickedShape.id);
//      setInteraction({
//        type: "move",
//        shapeId: clickedShape.id,
//        offsetX: x - clickedShape.x,
//        offsetY: y - clickedShape.y
//      });
//    } else {
//      setSelectedId(null);
//      setDrawing({ x, y, width: 0, height: 0, id: Date.now(), rotation: 0 });
//    }
//  };
//
//  // Handle mousemove
//  const handleMouseMove = (e) => {
//    const { x, y } = getMousePos(e);
//
//    if (drawing) {
//      setDrawing((prev) => ({ ...prev, width: x - prev.x, height: y - prev.y }));
//    }
//
//    if (interaction) {
//      if (interaction.type === "move") {
//        setShapes((prev) =>
//          prev.map((s) =>
//            s.id === interaction.shapeId
//              ? { ...s, x: x - interaction.offsetX, y: y - interaction.offsetY }
//              : s
//          )
//        );
//      }
//
//      if (interaction.type === "rotate") {
//        const { centerX, centerY, startAngle, initialRotation } = interaction;
//        const currentAngle = Math.atan2(y - centerY, x - centerX);
//        let deltaAngle = (currentAngle - startAngle) * (180 / Math.PI);
//        let newRotation = initialRotation + deltaAngle;
//        if (keys.shift) newRotation = Math.round(newRotation / 15) * 15;
//        setShapes((prev) =>
//          prev.map((s) =>
//            s.id === interaction.shapeId ? { ...s, rotation: newRotation } : s
//          )
//        );
//      }
//
//      if (interaction.type === "resize") {
//        const { shapeId, handle, initialWidth, initialHeight, initialX, initialY } =
//          interaction;
//
//        let newWidth = initialWidth;
//        let newHeight = initialHeight;
//        let newX = initialX;
//        let newY = initialY;
//
//        if (handle.type === "corner") {
//          if (handle.corner.includes("l")) {
//            newWidth = initialWidth - (x - initialX);
//            newX = x;
//          } else {
//            newWidth = x - initialX;
//          }
//
//          if (handle.corner.includes("t")) {
//            newHeight = initialHeight - (y - initialY);
//            newY = y;
//          } else {
//            newHeight = y - initialY;
//          }
//        }
//
//        if (handle.type === "side") {
//          if (handle.side === "left") {
//            newWidth = initialWidth - (x - initialX);
//            newX = x;
//          }
//          if (handle.side === "right") newWidth = x - initialX;
//          if (handle.side === "top") {
//            newHeight = initialHeight - (y - initialY);
//            newY = y;
//          }
//          if (handle.side === "bottom") newHeight = y - initialY;
//        }
//
//        // Maintain aspect ratio
//        if (keys.shift && handle.type === "corner") {
//          const aspectRatio = initialWidth / initialHeight;
//          if (newWidth / newHeight > aspectRatio) newWidth = newHeight * aspectRatio;
//          else newHeight = newWidth / aspectRatio;
//        }
//
//        newWidth = Math.max(10, newWidth);
//        newHeight = Math.max(10, newHeight);
//
//        setShapes((prev) =>
//          prev.map((s) =>
//            s.id === shapeId
//              ? { ...s, x: newX, y: newY, width: newWidth, height: newHeight }
//              : s
//          )
//        );
//      }
//    }
//  };
//
//  // Handle mouseup
//  const handleMouseUp = () => {
//    if (drawing) {
//      setShapes((prev) => [...prev, drawing]);
//      setDrawing(null);
//    }
//    setInteraction(null);
//  };
//
//  return (
//    <canvas
//      ref={canvasRef}
//      width={800}
//      height={600}
//      style={{ border: "1px solid black" }}
//      onMouseDown={handleMouseDown}
//      onMouseMove={handleMouseMove}
//      onMouseUp={handleMouseUp}
//    />
//  );
//}
//
//
//
///* ---
// */
//import React, { useEffect, useRef, useState } from 'react';
//import * as fabric from 'fabric';
//import clsx from 'clsx';
//
//const Editor = () => {
//  const canvasRef = useRef(null);
//  const [canvas, setCanvas] = useState(null);
//  const [isExpanded, setIsExpanded] = useState(true);
//  const [activeSection, setActiveSection] = useState('transform'); // default open
//
//  useEffect(() => {
//    if (canvasRef.current) {
//      const initCanvas = new fabric.Canvas(canvasRef.current, {
//        width: 500,
//        height: 500,
//      });
//      initCanvas.backgroundColor = '#FFF';
//      initCanvas.renderAll();
//      setCanvas(initCanvas);
//
//      return () => initCanvas.dispose();
//    }
//  }, []);
//
//  const addRectangle = () => {
//    if (canvas) {
//      const rect = new fabric.Rect({
//        top: 0,
//        left: 0,
//        width: 100,
//        height: 100,
//        fill: '#FF0000',
//      });
//      canvas.add(rect);
//    }
//  };
//
//  const addCircle = () => {
//    if (canvas) {
//      const circle = new fabric.Circle({
//        top: 0,
//        left: 0,
//        radius: 50,
//        fill: '#FF0000',
//      });
//      canvas.add(circle);
//    }
//  };
//
//  const addText = () => {
//    if (canvas) {
//      const text = new fabric.IText('Edit me', {
//        left: 50,
//        top: 50,
//        fontSize: 24,
//        fill: '#000000',
//      });
//      canvas.add(text);
//      canvas.setActiveObject(text);
//    }
//  };
//
//
//  const toggleSection = (section) => {
//    setActiveSection(activeSection === section ? null : section);
//  };
//
//  return (
//    <div className="flex flex-row border bg-stone-300 w-full h-screen mx-auto justify-center items-center relative">
//      {/* Primary Sidebar */}
//      <aside className="flex flex-col gap-4 fixed top-2 left-2 bg-stone-100 p-2 rounded-md shadow-lg z-50">
//        <i
//          className={clsx(
//            'fa-solid fa-plus cursor-pointer p-2 rounded-sm',
//            isExpanded
//              ? 'text-stone-200 bg-blue-500 hover:bg-blue-600 hover:text-stone-100'
//              : 'hover:bg-stone-200 text-stone-900'
//          )}
//          onClick={() => setIsExpanded(!isExpanded)}
//        ></i>
//        <i
//          className="fa-regular fa-font cursor-pointer hover:bg-stone-200 p-2 rounded-sm text-stone-900"
//          onClick={addText}
//        ></i>
//        <i
//          className="fa-regular fa-square cursor-pointer hover:bg-stone-200 p-2 rounded-sm text-stone-900"
//          onClick={addRectangle}
//        ></i>
//        <i
//          className="fa-regular fa-circle cursor-pointer hover:bg-stone-200 p-2 rounded-sm text-stone-900"
//          onClick={addCircle}
//        ></i>
//      </aside>
//
//      {/* Collapsible Panel (Always Mounted, Animates In/Out) */}
//      <aside
//        className={clsx(
//          'fixed top-2 left-16 bg-stone-100 p-4 rounded-md shadow-lg w-64 transition-transform duration-300 z-50',
//          isExpanded
//            ? 'translate-x-0 pointer-events-auto'
//            : '-translate-x-80 pointer-events-none'
//        )}
//      >
//        {/* Header */}
//        <div className="flex flex-row justify-between items-center">
//          <h1>Size &amp; Position</h1>
//          <button
//            onClick={() => setIsExpanded(false)}
//            className="h-8 w-8 flex justify-center items-center cursor-pointer hover:rounded-full hover:bg-stone-200"
//          >
//            <i className="fa-solid fa-xmark text-lg"></i>
//          </button>
//        </div>
//
//        {/* Move Section */}
//        <div>
//          <h1
//            className={clsx(
//              'my-2 py-1 px-2 rounded-lg cursor-pointer flex items-center',
//              activeSection === 'move'
//                ? 'bg-blue-500 text-white'
//                : 'text-stone-500 hover:bg-blue-500 hover:text-white'
//            )}
//            onClick={() => toggleSection('move')}
//          >
//            <i className="fa-solid fa-arrow-pointer"></i>
//            <span className="mx-2">Move</span>
//          </h1>
//          {activeSection === 'move' && (
//            <p className="text-stone-700">By default it will open</p>
//          )}
//        </div>
//
//        {/* Transform Section */}
//        <div>
//          <h1
//            className={clsx(
//              'my-2 py-1 px-2 rounded-lg cursor-pointer flex items-center',
//              activeSection === 'transform'
//                ? 'bg-blue-500 text-white'
//                : 'text-stone-500 hover:bg-blue-500 hover:text-white'
//            )}
//            onClick={() => toggleSection('transform')}
//          >
//            <i className="fa-light fa-crop"></i>
//            <span className="mx-2">Transform</span>
//          </h1>
//          {activeSection === 'transform' && (
//            <div className="flex flex-col gap-2 text-base">
//              {['X', 'Y', 'Width', 'Height', 'Rotate'].map((label) => (
//                <div key={label} className="flex justify-between">
//                  <label
//                    className="text-stone-500 text-sm"
//                    htmlFor={label.toLowerCase()}
//                  >
//                    {label}
//                  </label>
//                  <input
//                    id={label.toLowerCase()}
//                    type="text"
//                    className="border border-stone-500 p-1 w-24 rounded-lg"
//                  />
//                </div>
//              ))}
//            </div>
//          )}
//        </div>
//
//        {/* Crop Section */}
//        <div>
//          <h1
//            className={clsx(
//              'my-2 py-1 px-2 rounded-lg cursor-pointer flex items-center',
//              activeSection === 'crop'
//                ? 'bg-blue-500 text-white'
//                : 'text-stone-500 hover:bg-blue-500 hover:text-white'
//            )}
//            onClick={() => toggleSection('crop')}
//          >
//            <i className="fa-light fa-crop"></i>
//            <span className="mx-2">Crop</span>
//          </h1>
//          {activeSection === 'crop' && (
//            <p className="text-stone-700">Crop options here</p>
//          )}
//        </div>
//      </aside>
//
//      {/* Canvas */}
//      <canvas ref={canvasRef} width={500} height={500} className="z-10" />
//    </div>
//  );
//};
//
//export { Editor };
//* 

//const EditorPage = () => {
//  const canvasRef = useRef(null);
////  const clipboardRef = useRef(null);
//  const fabricRef = useRef(null); // fabric.Canvas instance
//  const [canvas, setCanvas] = useState(null);
//  const [isExpanded, setIsExpanded] = useState(false); // isLayerExpanded
//  const [isLayerExpanded, setIsLayerExpanded] = useState(false);
//  const [isTransformExpanded, setIsTransformExpanded] = useState(false);
//
//
//  const [activeSection, setActiveSection] = useState('transform');
//  const [transformValues, setTransformValues] = useState({});
//  const [layers, setLayers] = useState([]);
//  const [selectedSection, setSelectedSection] = useState({})
//console.log(colors.red);
//
//  const {
//    trackMousePosition,
//    saveHistory,
//    copyObject,
//    cutObject,
//    pasteObject,
//    undo,
//    redo,
//    deleteSelectedLayers
//  } = useFabricClipboardHistory();
//
//  /** Get objects top-most first */
//  const getObjects = useCallback(() => {
//    if (!canvas) return [];
//    return [...canvas.getObjects()].reverse();
//  }, [canvas]);
//
//  /** Update layer panel */
////  const updateLayers = useCallback(() => {
////    if (!canvas) return;
////    const objects = getObjects().map((obj, index) => {
////      if (!obj.id) obj.id = `layer-${Date.now()}-${index}`;
////      return {
////        id: obj.id,
////        name: obj.name || `${obj.type}-${index + 1}`,
////        type: obj.type,
////        visible: obj.visible !== false,
////        locked: obj.selectable === false,
////        opacity: obj.opacity ?? 1,
////      };
////    });
////    setLayers(objects);
////  }, [canvas, getObjects]);
//
//const generateId = () => `layer-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
//
///** Update Layers */
//const updateLayers = useCallback(() => {
//  if (!canvas) return;
//
//  const seen = new Set();
//  const activeObject = canvas.getActiveObject(); // <-- Get currently selected object
//  const activeId = activeObject?.id || null;
//
//
//  const objects = getObjects().map(obj => {
//    if (!obj.id || seen.has(obj.id)) {
//      obj.id = generateId();
//    }
//    seen.add(obj.id);
//
//    console.log(obj.id, seen);
//    return {
//      id: obj.id,
//      name: obj.name || obj.type,
//      type: obj.type,
//      visible: obj.visible !== false,
//      locked: obj.locked || false,
//      opacity: obj.opacity ?? 1,
//      isSelected: true
//    };
//  });
//
//  setSelectedSection(activeId);
//
//  setLayers(objects);
//}, [canvas, getObjects]);
//
//
//
///** Initialize Fabric Canvas */
//useEffect(() => {
//  if (!canvasRef.current) return;
//
//  const initCanvas = new fabric.Canvas(canvasRef.current, {
//    width: 794,
//    height: 600,
//    preserveObjectStacking: true,
//  });
//
//  fabricRef.current = initCanvas;
//  initCanvas.backgroundColor = "#FFF";
//
//
//  const saved = db.local.get("drawJson");
//  console.log(saved);
//  if (saved) {
//    initCanvas.loadFromJSON(saved).then((canvas) => canvas.requestRenderAll());
//  }
//
//
//
// initCanvas.renderAll();
//
//  // Optional: remove this if you only use fabricRef
//  setCanvas(initCanvas);
//  saveHistory(initCanvas);
//
//  initCanvas.on("mouse:move", trackMousePosition(initCanvas));
//
//  const handleKeyDown = (e) => {
//    const isMac = navigator.platform.toUpperCase().includes("MAC");
//    const key = e.key.toLowerCase();
//    const cmd = isMac ? e.metaKey : e.ctrlKey;
//    const currentCanvas = fabricRef.current;
//
//    if (!currentCanvas) return;
//
//    if (cmd && key === "c") { e.preventDefault(); copyObject(currentCanvas); }
//    if (cmd && key === "x") { e.preventDefault(); cutObject(currentCanvas); }
//    if (cmd && key === "v") { e.preventDefault(); pasteObject(currentCanvas); }
//    if (cmd && key === "z" && !e.shiftKey) { e.preventDefault(); undo(currentCanvas); }
//    if (cmd && (key === "y" || (key === "z" && e.shiftKey))) { e.preventDefault(); redo(currentCanvas); }
//    if (cmd && (key === "delete" || key === "backspace")) { e.preventDefault(); deleteSelectedLayers(); }
//  };
//
//  document.addEventListener("keydown", handleKeyDown, true);
//
//  return () => {
//    document.removeEventListener("keydown", handleKeyDown, true);
//    initCanvas.dispose();
//  };
//}, []); // run once
//
//
//
//  // Keyboard listener
//
//
//  /** Attach event listeners after canvas is ready */
//  useEffect(() => {
//    if (!canvas) return;
//    const handleUpdate = () => updateLayers();
//
//    canvas.on('object:added', handleUpdate);
//    canvas.on('object:removed', handleUpdate);
//    canvas.on('object:modified', handleUpdate);
//    canvas.on('selection:created', handleUpdate);
//    canvas.on('selection:updated', handleUpdate);
//
//    updateLayers(); // Initial load
//
//    return () => {
//      canvas.off('object:added', handleUpdate);
//      canvas.off('object:removed', handleUpdate);
//      canvas.off('object:modified', handleUpdate);
//      canvas.off('selection:created', handleUpdate);
//      canvas.off('selection:updated', handleUpdate);
//    };
//  }, [canvas, updateLayers]);
//
//
//
//  /** Object creation */
//  const addRectangle = () =>
//    canvas?.add(new fabric.Rect({
//      top: 50, left: 50, width: 100, height: 100,
//      fill: colors.red[500], name: 'Rectangle'
//    }));
//
//  const addEllipse = () => {
//    const ellipse = new fabric.Ellipse({
//      top: 50,
//      left: 50,
//      rx: 70,
//      ry: 20,
//      fill: colors.red[500],
//      name: 'Ellips'
//    });
//    canvas.add(ellipse);
//  };
//
//  const addCircle = () =>
//    canvas?.add(new fabric.Circle({
//      top: 50, left: 200, radius: 50,
//      fill: colors.red[500], name: 'Circle'
//    }));
//
//  const addText = () =>
//    canvas?.add(new fabric.IText('Edit me', {
//      top: 150, left: 50,
//      fontSize: 24, fill: '#000', name: 'Text'
//    }));
//
//  /** Transform changes */
//  const handleTransformChange = (field, value) => {
//    setTransformValues(prev => ({ ...prev, [field]: value }));
//    const activeObj = canvas?.getActiveObject();
//    if (activeObj) {
//      activeObj.set(field, isNaN(parseFloat(value)) ? value : parseFloat(value));
//      canvas.renderAll();
//    }
//  };
//
//  /** Layer operations */
//  const bringForward = (index) => {
//    const obj = getObjects()[index];
//    if (obj) { canvas.bringObjectForward(obj); canvas.renderAll(); updateLayers(); }
//  };
//
//  const sendBackward = (index) => {
//    const obj = getObjects()[index];
//    if (obj) { canvas.sendObjectBackwards(obj); canvas.renderAll(); updateLayers(); }
//  };
//
//  const bringToFront = (index) => {
//    const obj = getObjects()[index];
//    if (obj) { canvas.bringObjectToFront(obj); canvas.renderAll(); updateLayers(); }
//  };
//
//  const sendToBack = (index) => {
//    const obj = getObjects()[index];
//    if (obj) { canvas.sendObjectToBack(obj); canvas.renderAll(); updateLayers(); }
//  };
//
//  const toggleVisibility = (index) => {
//    const obj = getObjects()[index];
//    if (obj) { obj.visible = !obj.visible; canvas.renderAll(); updateLayers(); }
//  };
//
//  const toggleLock1 = (index) => {
//    const obj = getObjects()[index];
//    if (obj) { obj.selectable = !obj.selectable; canvas.renderAll(); updateLayers(); }
//  };
//
//  const toggleLock = (index) => {
//    const obj = getObjects()[index];
//    if (!obj) return;
//
//    const isLocked = obj.selectable === false;
//
//    obj.set({
//      selectable: isLocked,     // true when unlocking
//      evented: isLocked,        // allow interaction when unlocking
//      lockMovementX: !isLocked, // lock when locking, unlock when unlocking
//      lockMovementY: !isLocked,
//      locked: !isLocked
//    });
//
//    canvas.renderAll();
//    updateLayers();
//  };
//
//
//
//  const deleteLayer = (index) => {
//    console.log(index);
//    const obj = getObjects()[index];
//    if (obj) { canvas.remove(obj); updateLayers(); }
//  };
//
////const deleteLayer = (index = null) => {
////
////  console.log(canvas.getActiveObjects())
//
////  const currentCanvas = fabricRef.current;
////  if (!currentCanvas) return; // safeguard
////
////  const objects = getObjects(); // or currentCanvas.getObjects()
////  let target = null;
////
////  if (index !== null) {
////    // Delete by index from layer panel
////    target = objects[index];
////  } else {
////    // Delete active object from keyboard
////    target = currentCanvas.getActiveObject();
////  }
////
////  if (target) {
////    // Save state before deleting
////    historyRef.current.push(JSON.stringify(currentCanvas));
////    redoStackRef.current.length = 0; // Clear redo on new action
////
////    currentCanvas.remove(target);
////    currentCanvas.discardActiveObject();
////    currentCanvas.renderAll();
////    updateLayers();
////  }
////};
//
//
//
///** Duplicate */
//const duplicateLayer = index => {
//  const obj = getObjects()[index];
//  if (!obj || !canvas) return;
//
//  try {
//    const json = obj.toJSON();
//    fabric.util.enlivenObjects([json], ([clone]) => {
//      if (!clone) return;
//
//      clone.set({
//        id: generateId(),
//        left: (obj.left || 0) + 20,
//        top: (obj.top || 0) + 20,
//        evented: true,
//        selectable: true,
//      });
//
//      canvas.add(clone);
//      canvas.setActiveObject(clone);
//      canvas.renderAll();
//      updateLayers();
//    });
//  } catch (err) {
//    console.error('Failed to duplicate:', err);
//  }
//};
//
//  const setLayerOpacity = (index, value) => {
//    const obj = getObjects()[index];
//    if (obj) {
//      obj.set('opacity', parseFloat(value));
//      canvas.renderAll();
//      updateLayers();
//    }
//  };
//
//
//
//
//  /** Group */
/////** Group Selected Objects (Fabric.js v5) */
////const groupSelected = () => {
////  if (!canvas) return;
////  const active = canvas.getActiveObject();
////
////  if (active && active.type === 'activeselection') {
////    const objects = active.getObjects();
////
////    // Create a new group from the selected objects
////    const group = new fabric.Group(objects);
////
////    // Remove individual objects from canvas
////    objects.forEach(obj => canvas.remove(obj));
////
////    // Add the new group to canvas
////    group.id = generateId(); // Give group a unique ID
////    canvas.add(group);
////    canvas.setActiveObject(group);
////
////    canvas.renderAll();
////    updateLayers();
////  }
////};
////
////
/////** Ungroup Selected Group (Fabric.js v5) */
////const ungroupSelected = () => {
////  if (!canvas) return;
////  const active = canvas.getActiveObject();
////
////  if (active && active.type === 'group') {
////    const items = active.getObjects();
////
////    // Remove the group
////    canvas.remove(active);
////
////    // Add back each object
////    items.forEach(obj => canvas.add(obj));
////
////    canvas.discardActiveObject();
////    canvas.renderAll();
////    updateLayers();
////  }
////};
//
////const groupSelected = () => {
////  if (!canvas) return;
////  const active = canvas.getActiveObject();
////
////  if (active && active.type === 'activeselection') {
////    const objects = active.getObjects();
////
////    // Create the new group
////    const group = new fabric.Group(objects, { id: generateId() });
////
////    // Remove individual objects from canvas
////    objects.forEach(obj => canvas.remove(obj));
////
////    // Reset selection and add the new group
////    canvas.discardActiveObject();
////    canvas.add(group);
////    canvas.setActiveObject(group);
////
////    canvas.requestRenderAll();
////    updateLayers();
////  }
////};
//
//const deleteObject = () => {
//    if (!canvas) return;
//
//    const activeObjects = canvas.getActiveObjects();
//    if (!activeObjects) return;
//
//    activeObjects.forEach((obj) => canvas.remove(obj));
//    canvas.discardActiveObject();
//    canvas.requestRenderAll();
//  };
//
//  const groupSelected = () => {
//    if (!canvas) return;
//    const objects = canvas.getActiveObjects();
//    deleteObject();
//    const group = new fabric.Group(objects);
//    canvas.add(group);
//    canvas.requestRenderAll();
//  };
//
//  const ungroupSelected = () => {
//    if (!canvas) return;
//    const object = canvas.getActiveObject() as Group;
//    if (!object) return;
//    canvas.remove(object);
//    canvas.add(...object.removeAll());
//    canvas.requestRenderAll();
//  };
//
// const leftConfigPanel = [
//  {
//    id: "draw",
//    icon: "fa-solid fa-plus",
//    position: "right",
//    component: <ShapePanel />
//  },
//  {
//    id: "shapes",
//    icon: "fa-regular fa-shapes",
//    position: "left",
//    component: <ShapePanel />
//  },
//  {
//    id: "text",
//    icon: "fa-regular fa-font",
//    position: "right",
//    component: <TextPanel />,
//  },
//];
//
//const rightConfigPanel = [
//  {
//    id: "transform",
//    icon: "fa fa-vector-square",
//    position: "left",
//    component: <TransformPanel selectedObject={true} onChange={deleteLayer} />
//  },
//  {
//    id: "layers",
//    icon: "fa-solid fa-layer-group",
//    position: "left",
//    component: <LayerPanel layers={layers} />
//  },
//];
//
//
//  return (
//      <>
//    {/*<EditorTemplate*/}
//    {/*  header={*/}
//    {/*    <Header canvasRef={canvasRef} canvas={canvas} />*/}
//    {/*  }*/}
//    {/*  sidebar={*/}
//    {/*    <PrimarySidebar*/}
//    {/*      onAddRectangle={addRectangle}*/}
//    {/*      onAddCircle={addCircle}*/}
//    {/*      onAddText={addText}*/}
//    {/*      onAddEllipse={addEllipse}*/}
//    {/*      onTogglePanel={() => setIsExpanded(!isExpanded)}*/}
//    {/*      isPanelOpen={isExpanded}*/}
//    {/*    />*/}
//    {/*  }*/}
//    {/*  propertiesPanel={*/}
//    {/*    <PropertiesPanel*/}
//    {/*      canvas={canvas}*/}
//    {/*      isExpanded={isExpanded}*/}
//    {/*      activeSection={activeSection}*/}
//    {/*      onClose={() => setIsExpanded(false)}*/}
//    {/*      onToggleSection={(s) => setActiveSection(activeSection === s ? null : s)}*/}
//    {/*      transformValues={transformValues}*/}
//    {/*      onTransformChange={handleTransformChange}*/}
//    {/*    />*/}
//    {/*  }*/}
//    {/*  rightPanel={*/}
//    {/*    <RightPanel*/}
//    {/*    onToggleLayerPanel={() => setIsLayerExpanded(!isLayerExpanded)}*/}
//    {/*    onToggleTransformPanel={() => setIsTransformExpanded(!isTransformExpanded)}*/}
//    {/*    canvas={canvas} />*/}
//    {/*  }*/}
//    {/*  layers={*/}
//    {/*    <LayerPanel*/}
//    {/*      layers={layers}*/}
//    {/*      isLayerExpanded={isLayerExpanded}*/}
//    {/*      selectedSection={selectedSection}*/}
//    {/*      onBringForward={bringForward}*/}
//    {/*      onSendBackward={sendBackward}*/}
//    {/*      onBringToFront={bringToFront}*/}
//    {/*      onSendToBack={sendToBack}*/}
//    {/*      onToggleVisibility={toggleVisibility}*/}
//    {/*      onToggleLock={toggleLock}*/}
//    {/*      onDelete={deleteLayer}*/}
//    {/*      onDuplicate={duplicateLayer}*/}
//    {/*      onGroup={groupSelected}*/}
//    {/*      onUngroup={ungroupSelected}*/}
//    {/*      onSetOpacity={setLayerOpacity}*/}
//    {/*    />*/}
//    {/*  }*/}
//    {/*  transform={*/}
//    {/*    <Transformation*/}
//    {/*      canvas={canvas}*/}
//    {/*      isTransformExpanded={isTransformExpanded}*/}
//    {/*      activeSection={activeSection}*/}
//    {/*      onClose={() => setIsTransformExpanded(false)}*/}
//    {/*      onToggleSection={(s) => setIsTransformExpanded(activeSection === s ? null : s)}*/}
//    {/*      transformValues={transformValues}*/}
//    {/*      onTransformChange={handleTransformChange}*/}
//    {/*    />*/}
//    {/*  }*/}
//    {/*  canvasBoard={<CanvasBoard canvasRef={canvasRef} canvas={canvas} />}*/}
//    {/*/>*/}
//    {/*<PanelManager config={leftConfigPanel} />*/}
//
//    {/*<EditorTemplate>*/}
//    {/*  <Header canvasRef={canvasRef} canvas={canvas} />*/}
//    {/*  <PanelManager config={leftConfigPanel} toolbarPosition={"left"}/>*/}
//    {/*  <PanelManager config={rightConfigPanel} toolbarPosition={"right"}/>*/}
//    {/*  <CanvasBoard canvasRef={canvasRef} canvas={canvas} />*/}
//    {/*</EditorTemplate>*/}
//
//    {/*<PanelManager config={panelConfig} position={"bottom"}/>*/}
//
//    {/*<EditorTemplate*/}
//    {/*  slots={[*/}
//    {/*    { id: "header", position: "top", component: <Header /> },*/}
//    {/*    { id: "leftPanel", position: "left", component: <PanelManager config={leftConfigPanel} toolbarPosition="left" /> },*/}
//    {/*    { id: "rightPanel", position: "right", component: <PanelManager config={rightConfigPanel} toolbarPosition="right" /> },*/}
//    {/*    { id: "canvas", position: "center", component: <CanvasBoard canvasRef={canvasRef} canvas={canvas} /> },*/}
//    {/*  ]}*/}
//
//    <EditorTemplate
//      header={<Header canvasRef={canvasRef} canvas={canvas} />}
//      leftSidebar={<PanelManager config={leftConfigPanel} toolbarPosition="left" />}
//      canvasBoard={<CanvasBoard canvasRef={canvasRef} canvas={canvas} />}
//      rightSidebar={<PanelManager config={rightConfigPanel} toolbarPosition="right" />}
//    />
//
//      </>
//  );
//};

//import { ShapePanel } from "./ShapePanel";
//import { TextPanel } from "./TextPanel";
//import { useStore } from "../../store/store.ts";

//export const leftPanelConfig = [
//  {
//    id: "draw",
//    icon: (activePanelId) =>
//      activePanelId === "draw" ? "fa-solid fa-check" : "fa-solid fa-pencil",
//    position: "left",
//    component: (props) => <DrawPanel {...props} panelId="draw" />,
//  },
//  {
//    id: "shapes",
//    icon: "fa-regular fa-shapes",
//    position: "left",
//    component: (props) => <ShapePanel {...props} panelId="shapes" />,
//  },
//  {
//    id: "text",
//    icon: "fa-regular fa-font",
//    position: "left", // put it on the left panel
//    component: (props) => {
//      const addText = useStore((state) => state.addText);
//      return <TextPanel {...props} panelId="text" onAddText={addText} />;
//    },
//  },
//  { id: "redo", icon: "fa-solid fa-rotate-right", position: "left", component: TransformPanel },
//  { id: "undo", icon: "fa-solid fa-rotate-left", position: "left", component: LayerPanel },
//];
//
//
//const rightPanelConfig = [
//  { id: "transform", icon: "fa fa-vector-square", position: "right", component: TransformPanel },
//  { id: "layers", icon: "fa-solid fa-layer-group", position: "right", component: LayerPanel },
//];
//
//const undoRedoPanelConfig = [
//    { id: "redo", icon: "fa-solid fa-rotate-right", position: "left", component: TransformPanel },
//    { id: "undo", icon: "fa-solid fa-rotate-left", position: "left", component: LayerPanel },
//];