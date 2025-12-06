import * as fabric from "fabric";

export const createTransformSlice = (set, get) => ({
  transform: {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    flipX: false,
    flipY: false,
  },
  hasSelection: false,

  _isSyncing: false, // avoid circular updates

  updateFromFabric: (obj) => {
    if (!obj) {
      set({ hasSelection: false }); // disable inputs
      return;
    }

    if (get()._isSyncing) return;

    const round = (val) => Math.round(val ?? 0);

    const next = {
      x: round(obj.left),
      y: round(obj.top),
      width: round(
        obj.getScaledWidth?.() ??
          (obj.width || 0) * (obj.scaleX || 1)
      ),
      height: round(
        obj.getScaledHeight?.() ??
          (obj.height || 0) * (obj.scaleY || 1)
      ),
      rotation: round(obj.angle || 0),
      flipX: obj.scaleX < 0,
      flipY: obj.scaleY < 0,
    };

    const prev = get().transform;

    const changed =
      prev.x !== next.x ||
      prev.y !== next.y ||
      prev.width !== next.width ||
      prev.height !== next.height ||
      prev.rotation !== next.rotation ||
      prev.flipX !== next.flipX ||
      prev.flipY !== next.flipY;

    if (changed) {
      set({ transform: next, hasSelection: true });
    }
  },

  // ✅ Sync Fabric object FROM store
  updateFabricFromStore: () => {
    const { transform, canvas } = get();
    const obj = canvas?.getActiveObject();
    if (!obj) return;

    set({ _isSyncing: true });

    // ✅ Base scales from object’s natural dimensions
    const baseScaleX = (obj.width || 1) > 0 ? transform.width / (obj.width || 1) : 1;
    const baseScaleY = (obj.height || 1) > 0 ? transform.height / (obj.height || 1) : 1;

    obj.set({
      left: transform.x,
      top: transform.y,
      angle: transform.rotation,
      width: transform.width,
      height: transform.height,
      // ✅ flip logic: negative scale if flipped
      scaleX: transform.flipX ? -Math.abs(baseScaleX) : Math.abs(baseScaleX),
      scaleY: transform.flipY ? -Math.abs(baseScaleY) : Math.abs(baseScaleY),
    });

    console.log('great');

    obj.setCoords();
    canvas.requestRenderAll();

    set({ _isSyncing: false });
  },

  // ✅ Set any property in transform
  setTransform: (key, value) => {
    console.log(key, value)
    set((state) => ({
      transform: { ...state.transform, [key]: value },
    }));
    requestAnimationFrame(() => get().updateFabricFromStore());
  },

  // ✅ Flip X
  flipX: () => {
    set((state) => ({
      transform: { ...state.transform, flipX: !state.transform.flipX },
    }));
    requestAnimationFrame(() => get().updateFabricFromStore());
  },

  // ✅ Flip Y
  flipY: () => {
    set((state) => ({
      transform: { ...state.transform, flipY: !state.transform.flipY },
    }));
    requestAnimationFrame(() => get().updateFabricFromStore());
  },
});
