export const createUndoRedoSlice = (set, get) => ({
  undoStack: [],
  redoStack: [],
  MAX_HISTORY: 20,
  _isRestoring: false,

  // -------------------------------
  // Save current canvas state
  // -------------------------------
  saveState: () => {
    const { canvas, _isRestoring, undoStack } = get();
    if (!canvas || _isRestoring) return; // 🚫 skip if undo/redo in progress

    const state = JSON.stringify(canvas.toJSON()); // always string
    const newUndoStack = [...undoStack, state];

    set({
      undoStack: newUndoStack,
      redoStack: [], // clear redo on new change
    });

    // console.log("Save UndoStack:", get().undoStack, "RedoStack:", get().redoStack);
  },

  // -------------------------------
  // Undo last action
  // -------------------------------
  undo: () => {
    const { canvas, undoStack, redoStack } = get();
    if (!canvas || undoStack.length <= 1) return; // nothing to undo

    const currentState = JSON.stringify(canvas.toJSON());

    // Previous state is the one before the last
    const prevState = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);

    set({ _isRestoring: true });

    canvas.loadFromJSON(prevState, () => {
      set({
        undoStack: newUndoStack,
        redoStack: [currentState, ...redoStack],
        _isRestoring: false,
      });

      canvas.requestRenderAll();
    });
  },


  // -------------------------------
  // Redo last undone action
  // -------------------------------
  redo: () => {
    const { canvas, undoStack, redoStack } = get();
    if (!canvas || redoStack.length === 0) return;

    const currentState = JSON.stringify(canvas.toJSON());

    const nextState = redoStack[0];
    const newRedoStack = redoStack.slice(1);

    set({ _isRestoring: true });

    canvas.loadFromJSON(nextState, () => {
      set({
        undoStack: [...undoStack, currentState],
        redoStack: newRedoStack,
        _isRestoring: false,
      });

      canvas.requestRenderAll();
    });
  },


  // -------------------------------
  // Clear history
  // -------------------------------
  clearHistory: () => set({ undoStack: [], redoStack: [] }),
});
