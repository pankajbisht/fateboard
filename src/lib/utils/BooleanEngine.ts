// /**
//  * BooleanEngine
//  * High-level boolean operations built on top of Paper.js
//  * Works with Path and CompoundPath
//  */


export const BooleanEngine = {
  // -----------------------------
  // BASIC HELPERS
  // -----------------------------

  cleanup(...paths: paper.Path[]) {
    paths.forEach(p => p && !p.removed && p.remove());
  },

  reorientSafe(path: paper.Path) {
    if (path && path.closed) path.reorient();
    return path;
  },

  intersects(a: paper.Path, b: paper.Path) {
    return a && b && a.intersects(b);
  },

  cloneSafe(path: paper.Path) {
    return path ? path.clone() : null;
  },

  simplifySafe(path: paper.Path, tolerance = 0.5) {
    if (path && path.simplify) path.simplify(tolerance);
    return path;
  },

  // -----------------------------
  // PRIMITIVE BOOLEAN OPERATIONS
  // -----------------------------

  union(a: paper.Path, b: paper.Path) {
    if (!a || !b) return null;
    const result = a.unite(b);
    this.cleanup(a, b);
    return this.reorientSafe(result);
  },

  intersect(a: paper.Path, b: paper.Path) {
    if (!a || !b) return null;
    const result = a.intersect(b);
    this.cleanup(a, b);
    return this.reorientSafe(result);
  },

  subtract(a: paper.Path, b: paper.Path) {
    if (!a || !b) return null;
    const result = a.subtract(b);
    this.cleanup(a, b);
    return this.reorientSafe(result);
  },

  exclude(a: paper.Path, b: paper.Path) {
    if (!a || !b) return null;
    const result = a.exclude(b);
    this.cleanup(a, b);
    return this.reorientSafe(result);
  },

  divide(a: paper.Path, b: paper.Path) {
    if (!a || !b) return [];
    const parts = a.divide(b);
    this.cleanup(a, b);
    return parts || [];
  },

  cut(target: paper.Path, cutter: paper.Path) {
    if (!target || !cutter) return [];
    const parts = target.divide(cutter);
    this.cleanup(target, cutter);
    return parts || [];
  },

  punch(base: paper.Path, hole: paper.Path) {
    if (!base || !hole) return null;
    const result = base.subtract(hole);
    this.cleanup(base, hole);
    return this.reorientSafe(result);
  },

  crop(shape: paper.Path, area: paper.Path) {
    if (!shape || !area) return null;
    const result = shape.intersect(area);
    this.cleanup(shape);
    return this.reorientSafe(result);
  },

  xorSplit(a: paper.Path, b: paper.Path) {
    if (!a || !b) return [];
    const xor = a.exclude(b);
    this.cleanup(a, b);

    if (xor.children && xor.children.length) {
      return xor.children.map(c => this.reorientSafe(c));
    }
    return [this.reorientSafe(xor)];
  },

  smartUnion(a: paper.Path, b: paper.Path) {
    if (!a || !b) return null;
    if (!this.intersects(a, b)) return null;
    return this.union(a, b);
  },

  // -----------------------------
  // POST-PROCESSING UTILITIES
  // -----------------------------

  keepLargest(paths: paper.Path[]) {
    if (!paths || !paths.length) return null;
    return paths.reduce((max, p) => (p.area > max.area ? p : max), paths[0]);
  },

  keepSmallest(paths: paper.Path[]) {
    if (!paths || !paths.length) return null;
    return paths.reduce((min, p) => (p.area < min.area ? p : min), paths[0]);
  },

  filterInside(paths: paper.Path[], container: paper.Path) {
    if (!paths || !container) return [];
    return paths.filter(p => container.contains(p.bounds.center));
  },

  filterOutside(paths: paper.Path[], container: paper.Path) {
    if (!paths || !container) return [];
    return paths.filter(p => !container.contains(p.bounds.center));
  },

  combine(paths: paper.Path[]) {
    if (!paths || paths.length === 0) return null;
    return paths.reduce((a, b) => a.unite(b));
  },

  snapToGrid(paths: paper.Path[], gridSize = 10) {
    if (!paths) return [];
    paths.forEach(p => {
      p.position.x = Math.round(p.position.x / gridSize) * gridSize;
      p.position.y = Math.round(p.position.y / gridSize) * gridSize;
    });
    return paths;
  }
};


// export const BooleanEngine = {
//   // -----------------------------
//   // BASIC HELPERS
//   // -----------------------------

//   cleanup(...paths) {
//     paths.forEach(p => p && !p.removed && p.remove());
//   },

//   reorientSafe(path) {
//     if (path && path.closed) {
//       path.reorient();
//     }
//     return path;
//   },

//   intersects(a, b) {
//     return a && b && a.intersects(b);
//   },

//   // -----------------------------
//   // PRIMITIVE WRAPPERS
//   // -----------------------------

//   union(a, b) {
//     const result = a.unite(b);
//     this.cleanup(a, b);
//     return this.reorientSafe(result);
//   },

//   intersect(a, b) {
//     const result = a.intersect(b);
//     this.cleanup(a, b);
//     return this.reorientSafe(result);
//   },

//   subtract(a, b) {
//     const result = a.subtract(b);
//     this.cleanup(a, b);
//     return this.reorientSafe(result);
//   },

//   exclude(a, b) {
//     const result = a.exclude(b);
//     this.cleanup(a, b);
//     return this.reorientSafe(result);
//   },

//   divide(a, b) {
//     const parts = a.divide(b);
//     this.cleanup(a, b);
//     return parts || [];
//   },

//   // -----------------------------
//   // ADVANCED OPERATIONS
//   // -----------------------------

//   // Knife / Cut tool
//   cut(target, cutter) {
//     const parts = target.divide(cutter);
//     this.cleanup(target, cutter);
//     return parts || [];
//   },

//   // Punch hole (donut, cutout)
//   punch(base, hole) {
//     const result = base.subtract(hole);
//     this.cleanup(base, hole);
//     return this.reorientSafe(result);
//   },

//   // Crop to area (mask-like)
//   crop(shape, area) {
//     const result = shape.intersect(area);
//     this.cleanup(shape);
//     return this.reorientSafe(result);
//   },

//   // XOR but keep split pieces
//   xorSplit(a, b) {
//     const xor = a.exclude(b);
//     this.cleanup(a, b);

//     if (xor.children) {
//       return xor.children.map(c => this.reorientSafe(c));
//     }

//     return [this.reorientSafe(xor)];
//   },

//   // Smart union (only if overlapping)
//   smartUnion(a, b) {
//     if (!a.intersects(b)) return null;
//     return this.union(a, b);
//   },

//   // -----------------------------
//   // POST-PROCESSING UTILITIES
//   // -----------------------------

//   keepLargest(paths) {
//     return paths.reduce((max, p) =>
//       p.area > max.area ? p : max
//     );
//   },

//   keepSmallest(paths) {
//     return paths.reduce((min, p) =>
//       p.area < min.area ? p : min
//     );
//   },

//   filterInside(paths, container) {
//     return paths.filter(p =>
//       container.contains(p.bounds.center)
//     );
//   },

//   filterOutside(paths, container) {
//     return paths.filter(p =>
//       !container.contains(p.bounds.center)
//     );
//   }
// };


// BooleanEngine.ts
// BooleanEngine.ts
// export const BooleanEngine = {
//   reducers: ['union', 'subtract', 'intersect', 'exclude'],
//   splitters: ['divide', 'cut'],

//   isReducer(op: string) {
//     return this.reducers.includes(op);
//   },

//   isSplitter(op: string) {
//     return this.splitters.includes(op);
//   },

//   applyReducer(op: string, a: paper.Path, b: paper.Path) {
//     const fn = (a as any)[op];
//     if (typeof fn !== 'function') return null;

//     const result = fn.call(a, b);
//     result?.reorient?.();

//     a.remove();
//     b.remove();

//     return result;
//   },

//   applySplitter(base: paper.Path, cutter: paper.Path): paper.Path[] {
//     const out = base.divide(cutter);

//     if (!out) {
//       return [base];
//     }

//     // ✅ normalize output
//     if (Array.isArray(out)) {
//       base.remove();
//       return out;
//     }

//     // CompoundPath → children paths
//     if (out.children && out.children.length) {
//       const parts = out.children.filter(
//         (c: any) => c && typeof c.divide === 'function'
//       );
//       base.remove();
//       out.remove();
//       return parts;
//     }

//     return [base];
//   }
// };

export function extractStyle(obj) {
    return {
        fill: obj.fill,
        stroke: obj.stroke,
        strokeWidth: obj.strokeWidth,
        strokeDashArray: obj.strokeDashArray,
        strokeLineCap: obj.strokeLineCap,
        strokeLineJoin: obj.strokeLineJoin,
        opacity: obj.opacity,
    };
}


// normalizePaths.ts
export function normalizeToPaths(input: any): paper.Path[] {
  if (!input) return [];

  if (Array.isArray(input)) {
    return input.filter(p => p && p.divide);
  }

  if (input.divide) {
    return [input];
  }

  if (input.children) {
    return input.children.filter((c: any) => c && c.divide);
  }

  return [];
}

export function applyBooleanOperation(scope, objects, operation) {
    let result = null;

    objects.forEach((obj, i) => {
        const item = scope.project.importSVG(obj.toSVG(), {
            expandShapes: true,
            insert: false,
        });

        // const path = item.children?.[0] ?? item;

        // path.fill = "black";
        // path.strokeColor = null;

        const path = convertStrokeToPath(item.children?.[0] ?? item);

        if (i === 0) {
            result = path;
        } else {
            // result = result[BooleanEngine[operation]](path);
            result = BooleanEngine[operation](result, path);
        }
    });

    return result;
}

// export function applyBooleanOperation(
//   scope: paper.PaperScope,
//   objects: fabric.Object[],
//   operation: string
// ): paper.Path[] {

//   let result: paper.Path[] = [];

//   objects.forEach((obj) => {
//     const item = scope.project.importSVG(obj.toSVG(), {
//       expandShapes: true,
//       insert: false,
//     });

//     const raw = convertStrokeToPath(item.children?.[0] ?? item);
//     const paths = Array.isArray(raw) ? raw : [raw];

//     paths.forEach((path) => {
//       if (!path || typeof path.divide !== 'function') return;

//       // seed
//       if (result.length === 0) {
//         result.push(path);
//         return;
//       }

//       // SPLITTER (divide / cut)
//       if (BooleanEngine.isSplitter(operation)) {
//         const next: paper.Path[] = [];

//         for (const base of result) {
//           const pieces = BooleanEngine.applySplitter(base, path);

//           for (const p of pieces) {
//             if (p && typeof p.divide === 'function') {
//               next.push(p);
//             }
//           }
//         }

//         result = next;
//         return;
//       }

//       // REDUCER
//       if (BooleanEngine.isReducer(operation)) {
//         const reduced = BooleanEngine.applyReducer(
//           operation,
//           result[0],
//           path
//         );
//         if (reduced) result = [reduced];
//       }
//     });
//   });

//   return result;
// }

function convertStrokeToPath(path) {
    if (!path.strokeWidth) return path;
    path.strokeColor = null;
    path.strokeWidth = 0;
    path.fill = 'black';
    path.closed = true;

    return path;
}


// export function exportPaperResult(
//   scope: paper.PaperScope,
//   result: paper.Path | paper.Path[]
// ): string | null {

//   // if (!result) return null;

//   // // Single path
//   // if (!Array.isArray(result)) {
//   //   return result.exportSVG({
//   //     asString: true,
//   //     bounds: 'content',
//   //     precision: 3,
//   //   });
//   // }

//   // if (result.length === 0) return null;

//   // // ✅ Wrap multiple paths
//   // const compound = new scope.CompoundPath({
//   //   children: result,
//   // });

//   // compound.reorient();

//   const svg = result.exportSVG({
//     asString: true,
//     bounds: 'content',
//     precision: 3,
//   });

//   // compound.remove();

//   return svg;
// }


export function exportPaperResult(
  scope: paper.PaperScope,
  result: paper.Path | paper.Path[],
  operation: string
): string | null {

  if (!result) return null;

  // Reducer → single path
  if (!Array.isArray(result)) {
    return result.exportSVG({
      asString: true,
      bounds: 'content',
      precision: 3,
    });
  }

  // Divider → multiple paths
  if (operation === 'divide' || operation === 'cut') {
    return result
      .map(p =>
        p.exportSVG({
          asString: true,
          bounds: 'content',
          precision: 3,
        })
      )
      .join('\n');
  }

  // Fallback → compound
  const compound = new scope.CompoundPath({ children: result });
  compound.reorient();

  const svg = compound.exportSVG({
    asString: true,
    bounds: 'content',
    precision: 3,
  });

  compound.remove();
  return svg;
}
