import { useRef, useCallback } from 'react';
import { ActiveSelection } from 'fabric'; // <-- For Fabric v5

export default function useFabricClipboardHistory() {
    const clipboardRef = useRef(null);
    const lastMousePos = useRef({ x: 100, y: 100 });
    const historyRef = useRef([]);
    const redoStackRef = useRef([]);

    /** TRACK MOUSE POSITION (to paste at cursor) */
    const trackMousePosition = useCallback((canvas) => {
        return (opt) => {
            const pointer = canvas.getPointer(opt.e);
            lastMousePos.current = { x: pointer.x, y: pointer.y };
        };
    }, []);

    /** SAVE HISTORY (call this after each change) */
    const saveHistory = useCallback((canvas) => {
        const json = canvas.toJSON();
        historyRef.current.push(json);
        redoStackRef.current = []; // Clear redo stack on new action
    }, []);

    /** UNDO */
    const undo = useCallback((canvas) => {
        if (historyRef.current.length > 1) {
            redoStackRef.current.push(historyRef.current.pop());
            canvas.loadFromJSON(historyRef.current[historyRef.current.length - 1], () => {
                canvas.renderAll();
            });
        }
    }, []);

    /** REDO */
    const redo = useCallback((canvas) => {
        if (redoStackRef.current.length > 0) {
            const state = redoStackRef.current.pop();
            historyRef.current.push(state);
            canvas.loadFromJSON(state, () => {
                canvas.renderAll();
            });
        }
    }, []);

    /** COPY */
    const copyObject = useCallback((canvas) => {
        if (!canvas) return;
        const activeObject = canvas.getActiveObject();
        if (activeObject) {
            activeObject.clone().then((cloned) => {
                clipboardRef.current = cloned;
            });
        }
    }, []);

    /** CUT */
    const cutObject = useCallback(
        (canvas) => {
            if (!canvas) return;
            const activeObject = canvas.getActiveObject();
            if (activeObject) {
                activeObject.clone((cloned) => {
                    clipboardRef.current = cloned;
                    canvas.remove(activeObject);
                    saveHistory(canvas);
                });
            }
        },
        [saveHistory],
    );

    /** PASTE */
    const pasteObject = useCallback(
        async (canvas) => {
            if (!canvas || !clipboardRef.current) return;

            const clonedObj = await clipboardRef.current.clone();
            canvas.discardActiveObject();

            clonedObj.set({
                left: clonedObj.left + 10,
                top: clonedObj.top + 10,
                evented: true,
            });
            if (clonedObj instanceof ActiveSelection) {
                // active selection needs a reference to the canvas.
                clonedObj.canvas = canvas;
                clonedObj.forEachObject((obj) => {
                    canvas.add(obj);
                });
                // this should solve the unselectability
                clonedObj.setCoords();
            } else {
                canvas.add(clonedObj);
            }
            clipboardRef.current.top += 10;
            clipboardRef.current.left += 10;
            canvas.setActiveObject(clonedObj);
            canvas.requestRenderAll();
            //
            //    clipboardRef.current.clone((clonedObj) => {
            //      canvas.discardActiveObject();
            //      const { x, y } = lastMousePos.current;
            //
            //      clonedObj.set({
            //        left: x,
            //        top: y,
            //        evented: true,
            //      });
            //
            //      if (clonedObj.type === "activeSelection") {
            //        clonedObj.canvas = canvas;
            //        clonedObj.forEachObject((obj) => {
            //          obj.set({
            //            left: obj.left + (x - clipboardRef.current.left),
            //            top: obj.top + (y - clipboardRef.current.top),
            //          });
            //          canvas.add(obj);
            //        });
            //        clonedObj.setCoords();
            //      } else {
            //        canvas.add(clonedObj);
            //      }
            //
            //      clipboardRef.current.left = clonedObj.left + 10;
            //      clipboardRef.current.top = clonedObj.top + 10;
            //
            //      canvas.setActiveObject(clonedObj);
            //      canvas.requestRenderAll();
            //      saveHistory(canvas);
            //    });
        },
        [saveHistory],
    );

    const deleteSelectedLayers = useCallback(
        (canvas) => {
            if (!canvas) return;

            const activeObjects = canvas.getActiveObjects();
            if (activeObjects.length === 0) return;

            saveHistory(canvas); // Save state before deletion

            activeObjects.forEach((obj) => canvas.remove(obj));
            canvas.discardActiveObject();
            canvas.renderAll();
        },
        [saveHistory],
    );

    return {
        trackMousePosition,
        saveHistory,
        copyObject,
        cutObject,
        pasteObject,
        undo,
        redo,
        deleteSelectedLayers,
    };
}
