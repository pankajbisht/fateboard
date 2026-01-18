// import React, { useEffect, useRef, useState } from 'react';
// import * as fabric from 'fabric';
// import { filters } from 'fabric';
// import { useStore } from '@/store';
// import LabeledSlider from '@/components/molecules/LabeledSlider';
// import Button from '@/components/atoms/Button';
// import IconButton from '@/components/atoms/IconButton';
// import { Tooltip } from '@/components/molecules/Tooltip';
// import ToggleButton from '@/components/atoms/ToggleButton';
// import LabeledToggle from '@/components/molecules/LabeledToggle';

// // const FILTER_INDEX = {
// //     brightness: 0,
// //     contrast: 1,
// //     saturation: 2,
// //     hue: 3,
// //     blur: 4,
// //     noise: 5,
// //     pixelate: 6,
// //     grayscale: 7,
// //     sepia: 8,
// //     invert: 9,
// // };

// const FILTER_INDEX = {
//   brightness: 0,
//   contrast: 1,
//   saturation: 2,
//   hue: 3,
//   blur: 4,
//   noise: 5,
//   pixelate: 6,
//   grayscale: 7,
//   sepia: 8,
//   invert: 9,
//   gamma: 10,
//   sharpen: 11,
//   edge: 12,
//   removeColor: 13,
//   colorMatrix: 14,
// } as const;

// /* ======================================================
//    CONVOLUTION KERNELS
// ====================================================== */
// const SHARPEN_KERNEL = [
//   0, -1, 0,
//  -1,  5, -1,
//   0, -1, 0,
// ];

// const EDGE_KERNEL = [
//  -1, -1, -1,
//  -1,  8, -1,
//  -1, -1, -1,
// ];

// /* ======================================================
//    COLOR MATRIX PRESETS
// ====================================================== */
// const COLOR_MATRICES = {
//   vintage: [
//     0.6279, 0.3202, -0.0396, 0, 0,
//     0.0253, 0.6441,  0.0326, 0, 0,
//     0.0466, -0.0851, 0.5242, 0, 0,
//     0, 0, 0, 1, 0,
//   ],
//   cold: [
//     1.1, 0,   0,   0, 0,
//     0,   1,   0,   0, 0,
//     0,   0, 0.9,   0, 0,
//     0,   0,   0,   1, 0,
//   ],
// };

// /* ======================================================
//    FILTER PRESETS (JSON)
// ====================================================== */
// const FILTER_PRESETS = {
//   none: {},

//   vivid: {
//     brightness: 0.05,
//     contrast: 0.35,
//     saturation: 0.5,
//   },

//   noir: {
//     grayscale: true,
//     contrast: 0.4,
//   },

//   warm: {
//     brightness: 0.1,
//     saturation: 0.3,
//     sepia: true,
//   },

//   blurGlass: {
//     blur: 0.35,
//     brightness: 0.1,
//   },

//   cinematic: {
//     contrast: 0.35,
//     saturation: 0.2,
//     gamma: 1.2,
//   },

//   sharpPro: {
//     sharpen: true,
//     contrast: 0.25,
//   },

//   vintageFilm: {
//     colorMatrix: "vintage",
//   },
// } as const;

// export default function Filters() {
//     const canvas = useStore((s) => s.canvas);
//     const [activePreset, setActivePreset] =
//       React.useState<keyof typeof FILTER_PRESETS | null>(null);

//     // ------------------------
//     // Helpers
//     // ------------------------

//     const getActiveImage = (): fabric.Image | null => {
//         const canvas = useStore.getState().canvas;
//         if (!canvas) return null;
//         const obj = canvas.getActiveObject();
//         if (obj instanceof fabric.Image) return obj;
//         return null;
//     };

//     const applyFilter = (filter: fabric.IBaseFilter | null, index: number) => {
//         const canvas = useStore.getState().canvas;
//         const img = getActiveImage();
//         if (!canvas || !img) return;

//         img.filters[index] = filter;
//         img.applyFilters();
//         canvas.requestRenderAll();
//     };

//     // ------------------------
//     // Filter handlers
//     // ------------------------

//     // const buildFilter = (type: string, value: number) => {
//     //   const map: Record<string, fabric.IBaseFilter> = {
//     //     brightness: new fabric.Image.filters.Brightness({ brightness: value }),
//     //     contrast: new fabric.Image.filters.Contrast({ contrast: value }),
//     //     saturation: new fabric.Image.filters.Saturation({ saturation: value }),
//     //     hue: new fabric.Image.filters.HueRotation({ rotation: value }),
//     //     blur: new fabric.Image.filters.Blur({ blur: value }),
//     //     noise: new fabric.Image.filters.Noise({ noise: value * 100 }),
//     //     pixelate: new fabric.Image.filters.Pixelate({
//     //       blocksize: Math.max(1, value),
//     //     }),
//     //   };

//     //   applyFilter(map[type], FILTER_INDEX[type as keyof typeof FILTER_INDEX]);
//     // };

//     // const onToggle = (type: string, enabled: boolean) => {
//     //   const map: Record<string, fabric.IBaseFilter | null> = {
//     //     grayscale: enabled ? new fabric.Image.filters.Grayscale() : null,
//     //     sepia: enabled ? new fabric.Image.filters.Sepia() : null,
//     //     invert: enabled ? new fabric.Image.filters.Invert() : null,
//     //   };

//     //   applyFilter(map[type], FILTER_INDEX[type as keyof typeof FILTER_INDEX]);
//     // };
//     //
//     // const onSlider = (type: string, value: number) => {
//     //     const map: Record<string, any> = {
//     //         brightness: new filters.Brightness({ brightness: value }),
//     //         contrast: new filters.Contrast({ contrast: value }),
//     //         saturation: new filters.Saturation({ saturation: value }),
//     //         hue: new filters.HueRotation({ rotation: value }),
//     //         blur: new filters.Blur({ blur: value }),
//     //         noise: new filters.Noise({ noise: value * 100 }),
//     //         pixelate: new filters.Pixelate({
//     //             blocksize: Math.max(1, value),
//     //         }),
//     //     };

//     //     applyFilter(map[type], FILTER_INDEX[type]);
//     // };
//     //

//     const buildFilter = (type: string, value: any) => {
//         switch (type) {
//           case "brightness":
//             return new filters.Brightness({ brightness: value });
//           case "contrast":
//             return new filters.Contrast({ contrast: value });
//           case "saturation":
//             return new filters.Saturation({ saturation: value });
//           case "hue":
//             return new filters.HueRotation({ rotation: value });
//           case "blur":
//             return new filters.Blur({ blur: value });
//           case "noise":
//             return new filters.Noise({ noise: value * 100 });
//           case "pixelate":
//             return new filters.Pixelate({ blocksize: Math.max(1, value) });
//           case "gamma":
//             return new filters.Gamma({ gamma: [value, value, value] });
//           case "grayscale":
//             return value ? new filters.Grayscale() : null;
//           case "sepia":
//             return value ? new filters.Sepia() : null;
//           case "invert":
//             return value ? new filters.Invert() : null;
//           case "sharpen":
//             return value ? new filters.Convolute({ matrix: SHARPEN_KERNEL }) : null;
//           case "edge":
//             return value ? new filters.Convolute({ matrix: EDGE_KERNEL }) : null;
//           case "removeColor":
//             return new filters.RemoveColor({
//               color: value,
//               distance: 0.2,
//             });
//           case "colorMatrix":
//             return new filters.ColorMatrix({
//               matrix: COLOR_MATRICES[value],
//             });
//           default:
//             return null;
//         }
//       };

//     // const applyPreset = (presetKey: keyof typeof FILTER_PRESETS) => {
//     //     const preset = FILTER_PRESETS[presetKey];

//     //     Object.entries(FILTER_INDEX).forEach(([key, index]) => {
//     //       const value = (preset as any)[key];
//     //       const filter =
//     //         value !== undefined ? buildFilter(key, value) : null;
//     //       applyFilter(filter, index);
//     //     });
//     //   };

//     // if (activePreset === presetKey) {
//     //     // turn off → reset all filters
//     //     Object.values(FILTER_INDEX).forEach((index) =>
//     //       applyFilter(null, index)
//     //     );
//     //     setActivePreset(null);
//     //   } else {
//     //     applyPreset(presetKey);
//     //     setActivePreset(presetKey);
//     //   }

//     const onToggle = (type: string, enabled: boolean) => {
//         const map: Record<string, any> = {
//             grayscale: enabled ? new filters.Grayscale() : null,
//             sepia: enabled ? new filters.Sepia() : null,
//             invert: enabled ? new filters.Invert() : null,
//         };

//         applyFilter(map[type], FILTER_INDEX[type]);
//     };

//     const convertToImage = async () => {
//         const canvas = useStore.getState().canvas;

//         const obj = canvas.getActiveObject();
//         if (!obj) return;

//         const dataURL = obj.toDataURL({ multiplier: 2 });

//         const img = await fabric.Image.fromURL(dataURL, { crossOrigin: 'anonymous' });

//         img.set({
//             left: obj.left,
//             top: obj.top,
//             angle: obj.angle,
//             scaleX: obj.scaleX,
//             scaleY: obj.scaleY,
//         });

//         canvas.remove(obj);
//         canvas.add(img);
//         canvas.setActiveObject(img);
//         canvas.requestRenderAll();
//     };

//     // ------------------------
//     // UI
//     // ------------------------

//     const applyPreset = (presetKey: keyof typeof FILTER_PRESETS) => {
//       // TOGGLE OFF
//       if (activePreset === presetKey) {
//         Object.values(FILTER_INDEX).forEach((index) => {
//           applyFilter(null, index);
//         });
//         setActivePreset(null);
//         return;
//       }

//       // APPLY PRESET
//       const preset = FILTER_PRESETS[presetKey];

//       Object.entries(FILTER_INDEX).forEach(([key, index]) => {
//         const value = (preset as any)[key];
//         const filter =
//           value !== undefined ? buildFilter(key, value) : null;
//         applyFilter(filter, index);
//       });

//       setActivePreset(presetKey);
//     };

//     return (
//         <div style={{ display: 'flex', gap: 20 }}>
//             <div
//                 className="flex-1"
//             >
//                 <div className="flex justify-between border border-neutral-200 rounded-md p-2 my-2">
//                     <h3 className="text-lg font-medium text-neutral-700">Filters</h3>
//                     <Tooltip position="bottom" content="Convert Shape to Image">
//                         <IconButton
//                             icon={<i className="fa-solid fa-image"></i>}
//                             onClick={convertToImage}
//                             title="Convert Shape to Image"
//                         />
//                     </Tooltip>
//                 </div>

//                 <section className="flex flex-col gap-4 w-full px-2 py-4 border border-neutral-200 rounded-md">
//                     <LabeledSlider
//                         label="Brightness"
//                         min={-1}
//                         max={1}
//                         step={0.01}
//                         onChange={(v) => {
//                             applyFilter(buildFilter("brightness", v), FILTER_INDEX.brightness)
//                         }}
//                     />

//                     <LabeledSlider
//                         label="Contrast"
//                         min={-1}
//                         max={1}
//                         step={0.01}
//                         onChange={(v) => {
//                             applyFilter(buildFilter("contrast", v), FILTER_INDEX.contrast)
//                         }}
//                     />

//                     <LabeledSlider
//                         label="Saturation"
//                         min={-1}
//                         max={1}
//                         step={0.01}
//                         onChange={(v) => {
//                             applyFilter(buildFilter("saturation", v), FILTER_INDEX.saturation)
//                         }}
//                     />

//                     <LabeledSlider
//                         label="Hue"
//                         min={0}
//                         max={Math.PI * 2}
//                         step={0.01}
//                         onChange={(v) => {
//                             applyFilter(buildFilter("hue", v), FILTER_INDEX.hue)
//                         }}
//                     />

//                     <LabeledSlider
//                         label="Blur"
//                         min={0}
//                         max={1}
//                         step={0.01}
//                         onChange={(v) => {
//                             applyFilter(buildFilter("blur", v), FILTER_INDEX.blur)
//                         }}
//                     />

//                     <LabeledSlider
//                         label="Noise"
//                         min={0}
//                         max={1}
//                         step={0.01}
//                         onChange={(v) => {
//                             applyFilter(buildFilter("noise", v), FILTER_INDEX.noise)
//                         }}
//                     />

//                     <LabeledSlider
//                         label="Pixelate"
//                         min={0}
//                         max={20}
//                         step={1}
//                         onChange={(v) => {
//                             applyFilter(buildFilter("pixelate", v), FILTER_INDEX.pixelate)
//                         }}
//                     />

//                     <LabeledSlider
//                         label="Gamma"
//                         min={0.2}
//                         max={2}
//                         step={0.01}
//                         onChange={(v) => {
//                             applyFilter(buildFilter("gamma", v), FILTER_INDEX.gamma)
//                         }}
//                     />

//                     {/*<LabeledSlider
//                         label="Grayscale"
//                         onChange={(v) => {
//                             applyFilter(buildFilter("grayscale", v), FILTER_INDEX.grayscale)
//                         }}
//                     />*/}

//                     {/*{toggle("Grayscale", (v) =>
//                               applyFilter(buildFilter("grayscale", v), FILTER_INDEX.grayscale)
//                             )}*/}
//                     {/*case "gamma":
//                       return new filters.Gamma({ gamma: [value, value, value] });
//                     case "grayscale":
//                       return value ? new filters.Grayscale() : null;
//                     case "sepia":
//                       return value ? new filters.Sepia() : null;
//                     case "invert":
//                       return value ? new filters.Invert() : null;
//                     case "sharpen":
//                       return value ? new filters.Convolute({ matrix: SHARPEN_KERNEL }) : null;
//                     case "edge":
//                       return value ? new filters.Convolute({ matrix: EDGE_KERNEL }) : null;
//                     case "removeColor":
//                       return new filters.RemoveColor({
//                         color: value,
//                         distance: 0.2,
//                       });
//                     case "colorMatrix":
//                       return new filters.ColorMatrix({
//                         matrix: COLOR_MATRICES[value],
//                       });*/}

//                     {Object.keys(FILTER_PRESETS).map((key) => (
//                         <LabeledToggle
//                             key={key}
//                             className="justify-between"
//                             label={key}
//                             onChange={() => applyPreset(key as any)}
//                         />
//                     ))}

//                     <LabeledToggle
//                         className="justify-between"
//                         label="Grayscale"
//                         onChange={(v) => {
//                             applyFilter(buildFilter("grayscale", v), FILTER_INDEX.grayscale)
//                         }}
//                     />

//                     <LabeledToggle
//                         className="justify-between"
//                         label="Sepia"
//                         onChange={(v) => {
//                             applyFilter(buildFilter("sepia", v), FILTER_INDEX.sepia)
//                         }}
//                     />

//                     <LabeledToggle
//                         className="justify-between"
//                         label="Invert"
//                         onChange={(v) => {
//                             applyFilter(buildFilter("invert", v), FILTER_INDEX.invert)
//                         }}
//                     />

//                     <LabeledToggle
//                         className="justify-between"
//                         label="Sharpen"
//                         onChange={(v) => {
//                             applyFilter(buildFilter("sharpen", v), FILTER_INDEX.sharpen)
//                         }}
//                     />

//                     <LabeledToggle
//                         className="justify-between"
//                         label="Edge Detect"
//                         onChange={(v) => {
//                             applyFilter(buildFilter("edge", v), FILTER_INDEX.edge)
//                         }}
//                     />

//                     {/*<LabeledToggle
//                         className="justify-between"
//                         label="Grayscale"
//                         onChange={(v) => onToggle('grayscale', v)}
//                     />

//                     <LabeledToggle
//                         className="justify-between"
//                         label="Sepia"
//                         onChange={(v) => onToggle('sepia', v)}
//                     />

//                     <LabeledToggle
//                         className="justify-between"
//                         label="Invert"
//                         onChange={(v) => onToggle('invert', v)}
//                     />*/}

//                     {/*<LabeledSlider
//                         label="Contrast"
//                         min={-1}
//                         max={1}
//                         step={0.01}
//                         onChange={(v) => buildFilter('contrast', v)}
//                     />

//                     <LabeledSlider
//                         label="Saturation"
//                         min={-1}
//                         max={1}
//                         step={0.01}
//                         onChange={(v) => buildFilter('saturation', v)}
//                     />

//                     <LabeledSlider
//                         label="Hue"
//                         min={0}
//                         max={Math.PI * 2}
//                         step={0.01}
//                         onChange={(v) => buildFilter('hue', v)}
//                     />

//                     <LabeledSlider
//                         label="Blur"
//                         min={0}
//                         max={1}
//                         step={0.01}
//                         onChange={(v) => buildFilter('blur', v)}
//                     />

//                     <LabeledSlider
//                         label="Noise"
//                         min={0}
//                         max={1}
//                         step={0.01}
//                         onChange={(v) => buildFilter('noise', v)}
//                     />

//                     <LabeledSlider
//                         label="Pixelate"
//                         min={0}
//                         max={20}
//                         step={1}
//                         onChange={(v) => buildFilter('pixelate', v)}
//                     />

//                     <LabeledToggle
//                         className="justify-between"
//                         label="Grayscale"
//                         onChange={(v) => onToggle('grayscale', v)}
//                     />

//                     <LabeledToggle
//                         className="justify-between"
//                         label="Sepia"
//                         onChange={(v) => onToggle('sepia', v)}
//                     />

//                     <LabeledToggle
//                         className="justify-between"
//                         label="Invert"
//                         onChange={(v) => onToggle('invert', v)}
//                     />*/}
//                 </section>
//             </div>
//         </div>
//     );
// }

import React, { useEffect, useState } from 'react';
import * as fabric from 'fabric';
import { filters } from 'fabric';
import { useStore } from '@/store';

import LabeledSlider from '@/components/molecules/LabeledSlider';
import LabeledToggle from '@/components/molecules/LabeledToggle';
import IconButton from '@/components/atoms/IconButton';
import { Tooltip } from '@/components/molecules/Tooltip';
import Label from '@/components/atoms/Label';

/* ======================================================
   TYPES
====================================================== */

type FilterKey =
    | 'brightness'
    | 'contrast'
    | 'saturation'
    | 'hue'
    | 'blur'
    | 'noise'
    | 'pixelate'
    | 'gamma'
    | 'grayscale'
    | 'sepia'
    | 'invert'
    | 'sharpen'
    | 'edge'
    | 'colorMatrix';

/* ======================================================
   FILTER INDEX
====================================================== */

const FILTER_INDEX: Record<FilterKey, number> = {
    brightness: 0,
    contrast: 1,
    saturation: 2,
    hue: 3,
    blur: 4,
    noise: 5,
    pixelate: 6,
    grayscale: 7,
    sepia: 8,
    invert: 9,
    gamma: 10,
    sharpen: 11,
    edge: 12,
    colorMatrix: 13,
};

/* ======================================================
   KERNELS
====================================================== */

const SHARPEN_KERNEL = [0, -1, 0, -1, 5, -1, 0, -1, 0];

const EDGE_KERNEL = [-1, -1, -1, -1, 8, -1, -1, -1, -1];

/* ======================================================
   COLOR MATRICES
====================================================== */

const COLOR_MATRICES = {
    vintage: [
        0.6279, 0.3202, -0.0396, 0, 0, 0.0253, 0.6441, 0.0326, 0, 0, 0.0466, -0.0851, 0.5242, 0, 0,
        0, 0, 0, 1, 0,
    ],
};

/* ======================================================
   PRESETS
====================================================== */

const FILTER_PRESETS = {
    none: {},

    vivid: {
        brightness: 0.05,
        contrast: 0.35,
        saturation: 0.5,
    },

    noir: {
        grayscale: true,
        contrast: 0.4,
    },

    cinematic: {
        contrast: 0.35,
        saturation: 0.2,
        gamma: 1.2,
    },

    sharpPro: {
        sharpen: true,
        contrast: 0.25,
    },

    vintageFilm: {
        colorMatrix: 'vintage',
    },
} as const;

/* ======================================================
   SLIDERS CONFIG
====================================================== */

const SLIDERS = [
    { key: 'brightness', label: 'Brightness', min: -1, max: 1, step: 0.01 },
    { key: 'contrast', label: 'Contrast', min: -1, max: 1, step: 0.01 },
    { key: 'saturation', label: 'Saturation', min: -1, max: 1, step: 0.01 },
    { key: 'hue', label: 'Hue', min: 0, max: Math.PI * 2, step: 0.01 },
    { key: 'blur', label: 'Blur', min: 0, max: 1, step: 0.01 },
    { key: 'noise', label: 'Noise', min: 0, max: 1, step: 0.01 },
    { key: 'pixelate', label: 'Pixelate', min: 0, max: 20, step: 1 },
    { key: 'gamma', label: 'Gamma', min: 0.2, max: 2, step: 0.01 },
] as const;

const PRESET_BUTTONS = Object.keys(FILTER_PRESETS) as (keyof typeof FILTER_PRESETS)[];
const FILTER_TOGGLES: { key: FilterKey; label: string }[] = [
    { key: 'grayscale', label: 'Grayscale' },
    { key: 'sepia', label: 'Sepia' },
    { key: 'invert', label: 'Invert' },
    { key: 'sharpen', label: 'Sharpen' },
    { key: 'edge', label: 'Edge Detect' },
];

/* ======================================================
   COMPONENT
====================================================== */

export default function Filters() {
    const canvas = useStore((s) => s.canvas);
    const [activePreset, setActivePreset] = useState<keyof typeof FILTER_PRESETS | null>(null);

    const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

    useEffect(() => {
        const canvas = useStore.getState().canvas;
        if (!canvas) return;

        const update = () => {
            const url = getSafeImageUrl(0.25); // safe small thumbnail
            setSelectedImageUrl(url);

            console.log('pdated', url);
        };

        update(); // initialize

        canvas.on('selection:created', update);
        canvas.on('selection:updated', update);
        canvas.on('selection:cleared', update);
        canvas.on('object:modified', update);

        return () => {
            canvas.off('selection:created', update);
            canvas.off('selection:updated', update);
            canvas.off('selection:cleared', update);
            canvas.off('object:modified', update);
        };
    }, []);

    /* ------------------------
     HELPERS
  ------------------------ */

    const getActiveImage = (): fabric.Image | null => {
        const obj = canvas?.getActiveObject();
        return obj instanceof fabric.Image ? obj : null;
    };

    const createFilter = (key: FilterKey, value: any): fabric.IBaseFilter | null => {
        switch (key) {
            case 'brightness':
                return new filters.Brightness({ brightness: value });
            case 'contrast':
                return new filters.Contrast({ contrast: value });
            case 'saturation':
                return new filters.Saturation({ saturation: value });
            case 'hue':
                return new filters.HueRotation({ rotation: value });
            case 'blur':
                return new filters.Blur({ blur: value });
            case 'noise':
                return new filters.Noise({ noise: value * 100 });
            case 'pixelate':
                return new filters.Pixelate({ blocksize: Math.max(1, value) });
            case 'gamma':
                return new filters.Gamma({ gamma: [value, value, value] });
            case 'grayscale':
                return value ? new filters.Grayscale() : null;
            case 'sepia':
                return value ? new filters.Sepia() : null;
            case 'invert':
                return value ? new filters.Invert() : null;
            case 'sharpen':
                return value ? new filters.Convolute({ matrix: SHARPEN_KERNEL }) : null;
            case 'edge':
                return value ? new filters.Convolute({ matrix: EDGE_KERNEL }) : null;
            case 'colorMatrix':
                return new filters.ColorMatrix({
                    matrix: COLOR_MATRICES[value],
                });
            default:
                return null;
        }
    };

    const applyFilter = (key: FilterKey, value: any) => {
        const canvas = useStore.getState().canvas;
        if (!canvas) return;

        const obj = canvas.getActiveObject();
        if (!(obj instanceof fabric.Image)) return;

        // REMOVE FILTER
        if (value === null || value === undefined) {
            obj.filters[FILTER_INDEX[key]] = null;
        }
        // APPLY FILTER
        else {
            const filter = createFilter(key, value);
            if (!filter) {
                obj.filters[FILTER_INDEX[key]] = null;
            } else {
                obj.filters[FILTER_INDEX[key]] = filter;
            }
        }

        obj.applyFilters();
        canvas.requestRenderAll();
    };

    /* ------------------------
     PRESETS
  ------------------------ */

    const applyPreset = (presetKey: keyof typeof FILTER_PRESETS) => {
        if (activePreset === presetKey) {
            (Object.keys(FILTER_INDEX) as FilterKey[]).forEach((key) => applyFilter(key, null));
            setActivePreset(null);
            return;
        }

        const preset = FILTER_PRESETS[presetKey];

        (Object.keys(FILTER_INDEX) as FilterKey[]).forEach((key) => {
            applyFilter(key, (preset as any)[key] ?? null);
        });

        // setActivePreset(presetKey);
        // selectedImageUrl, setSelectedImageUrl

        // const imgUrl = getSafeImageUrl(0.05); // small preview
        //  setSelectedImageUrl(imgUrl);
    };

    /* ------------------------
     CONVERT TO IMAGE
  ------------------------ */

    const convertToImage = async () => {
        const obj = canvas?.getActiveObject();
        if (!canvas || !obj) return;

        const dataURL = obj.toDataURL({ multiplier: 2 });
        const img = await fabric.Image.fromURL(dataURL, {
            crossOrigin: 'anonymous',
        });

        img.set({
            left: obj.left,
            top: obj.top,
            angle: obj.angle,
            scaleX: obj.scaleX,
            scaleY: obj.scaleY,
        });

        canvas.remove(obj);
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.requestRenderAll();
    };

    /* ------------------------
     UI
  ------------------------ */

    const getSelectedImageUrl = (): string | null => {
        const canvas = useStore.getState().canvas;
        if (!canvas) return null;

        const obj = canvas.getActiveObject();
        if (!(obj instanceof fabric.Image)) return null;

        return obj.toDataURL({
            multiplier: 0.25,
            format: 'png',
        });
    };

    /**
     * Get a safe image URL from the selected Fabric image.
     * Automatically scales down if it exceeds WebGL max texture size.
     *
     * @param multiplier Optional scale multiplier (default: 1)
     * @param safeForWebGL Optional flag to auto-fit GPU limits (default: true)
     * @returns data URL string or null if no image selected
     */
    const getSafeImageUrl = (
        multiplier: number = 1,
        safeForWebGL: boolean = true,
    ): string | null => {
        const canvas = useStore.getState().canvas;
        if (!canvas) return null;

        const obj = canvas.getActiveObject();
        if (!(obj instanceof fabric.Image)) return null;

        let finalMultiplier = multiplier;

        if (safeForWebGL) {
            try {
                // Detect WebGL max texture size
                const gl = document.createElement('canvas').getContext('webgl');
                const maxTex = gl?.getParameter(gl.MAX_TEXTURE_SIZE) ?? 1000;

                // Calculate the scale to fit within GPU max texture
                const width = obj.width! * multiplier * (obj.scaleX ?? 1);
                const height = obj.height! * multiplier * (obj.scaleY ?? 1);

                const maxDim = Math.max(width, height);

                if (maxDim > maxTex) {
                    finalMultiplier = (maxTex / maxDim) * multiplier;
                }
            } catch (err) {
                console.warn('Unable to detect WebGL max texture, using default multiplier.');
            }
        }

        return obj.toDataURL({
            multiplier: finalMultiplier,
            format: 'png',
        });
    };

    return (
        <div className="flex flex-col gap-4 p-2">
            <div className="flex justify-between border border-stone-200 p-2 rounded-md">
                <h3 className="text-lg font-medium">Filters</h3>
                <Tooltip content="Convert Shape to Image">
                    <IconButton
                        icon={<i className="fa-solid fa-image" />}
                        onClick={convertToImage}
                    />
                </Tooltip>
            </div>

            <section className="flex flex-col gap-4 border border-stone-200 p-3 rounded-md">
                <Label label="Filter" />
                {SLIDERS.map(({ key, ...props }) => (
                    <LabeledSlider key={key} {...props} onChange={(v) => applyFilter(key, v)} />
                ))}
            </section>

            <section className="flex flex-col gap-4 border border-stone-200 p-3 rounded-md">
                <Label label="Presets" />
                <PresetThumbnails
                    presets={PRESET_BUTTONS}
                    appliedPreset={activePreset} // parent state
                    appliedImageUrl={selectedImageUrl} // main image
                    onSelect={(preset) => applyPreset(preset as keyof typeof FILTER_PRESETS)}
                    createFilter={createFilter}
                    filterPresets={FILTER_PRESETS}
                />
            </section>

            <section className="flex flex-col gap-4 border border-stone-200 p-3 rounded-md">
                <Label label="Filter" />
                {FILTER_TOGGLES.map(({ key, label }) => (
                    <LabeledToggle
                        key={key}
                        label={label}
                        onChange={(v) => applyFilter(key, v)}
                        className="justify-between"
                    />
                ))}
            </section>
        </div>
    );
}

type PresetThumbnailsProps = {
    presets: (keyof typeof FILTER_PRESETS)[];
    appliedPreset?: string | null; // currently active preset
    appliedImageUrl: string | null; // main image URL
    onSelect?: (preset: string) => void;
    createFilter: (key: string, value: any) => fabric.IBaseFilter | null;
    filterPresets: typeof FILTER_PRESETS;
};

export function PresetThumbnails({
    presets,
    appliedImageUrl,
    appliedPreset = null,
    onSelect,
    createFilter,
    filterPresets,
}: PresetThumbnailsProps) {
    const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

    // Regenerate all thumbnails whenever main image changes
    useEffect(() => {
        if (!appliedImageUrl) return;

        let isMounted = true;

        const generateAll = async () => {
            const newThumbs: Record<string, string> = {};

            for (const presetKey of presets) {
                const preset = filterPresets[presetKey];
                try {
                    const thumb = await renderPresetThumbnail({
                        imageUrl: appliedImageUrl,
                        preset,
                        createFilter,
                    });
                    newThumbs[presetKey] = thumb;
                } catch (error) {
                    console.error(`Failed to generate thumbnail for ${presetKey}:`, error);
                }
            }

            if (isMounted) {
                setThumbnails(newThumbs);
            }
        };

        generateAll();

        return () => {
            isMounted = false;
        };
    }, [appliedImageUrl, presets, filterPresets, createFilter]);

    return (
        <section className="flex overflow-x-auto gap-3 p-3 rounded-md">
            {presets.map((preset) => {
                const isActive = appliedPreset === preset;
                const thumbnailImage = thumbnails[preset];

                return (
                    <div
                        key={preset}
                        className={`flex-shrink-0 p-1 rounded-md border-2 cursor-pointer transition-colors border-1 border-stone-200 ${
                            isActive ? 'border-blue-500' : 'hover:border-gray-300'
                        }`}
                        onClick={() => onSelect?.(preset)}
                    >
                        {thumbnailImage ? (
                            <img
                                src={thumbnailImage}
                                alt={preset}
                                className="w-16 h-16 object-cover rounded-md"
                            />
                        ) : (
                            <div className="w-16 h-16 bg-gray-200 rounded-md animate-pulse" />
                        )}
                        {/*<p className="text-center mt-1 text-xs font-medium truncate max-w-[64px]">
                            {preset}
                        </p>*/}
                    </div>
                );
            })}
        </section>
    );
}

/* ------------------------
   Thumbnail rendering helper
------------------------ */
type RenderArgs = {
    imageUrl: string;
    preset: Record<string, any>;
    createFilter: (key: string, value: any) => fabric.IBaseFilter | null;
};

export async function renderPresetThumbnail({
    imageUrl,
    preset,
    createFilter,
}: RenderArgs): Promise<string> {
    // Create static canvas
    const canvas = new fabric.StaticCanvas(null, {
        width: 60,
        height: 60,
        renderOnAddRemove: false,
    });

    try {
        // Load image (v6 supports Promise)
        const img = await fabric.Image.fromURL(imageUrl, {
            crossOrigin: 'anonymous',
        });

        if (!img) {
            throw new Error('Image failed to load');
        }

        // Fit image into canvas (maintain aspect ratio, cover mode)
        const scale = Math.max(60 / img.width, 60 / img.height);
        img.scale(scale);

        // Center the image
        img.set({
            left: (60 - img.width * scale) / 2,
            top: (60 - img.height * scale) / 2,
        });

        // Apply filters
        const filters = Object.entries(preset)
            .map(([key, value]) => createFilter(key, value))
            .filter(Boolean) as fabric.IBaseFilter[];

        if (filters.length > 0) {
            img.filters = filters;
            await img.applyFilters();
        }

        // Render
        canvas.add(img);
        canvas.renderAll();

        // Export thumbnail
        return canvas.toDataURL({
            format: 'png',
            quality: 0.8,
        });
    } finally {
        // Clean up canvas
        canvas.dispose();
    }
}

const DEFAULT_PREVIEW_IMAGE = `data:image/svg+xml;utf8,
<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">
  <rect width="60" height="60" rx="8" ry="8" fill="%23ffe066"/>
  <circle cx="30" cy="30" r="20" fill="%23ff6b6b" stroke="%23423e3e" stroke-width="2"/>
  <circle cx="22" cy="25" r="3" fill="%23fff"/>
  <circle cx="38" cy="25" r="3" fill="%23fff"/>
  <circle cx="22" cy="25" r="1.5" fill="%23000"/>
  <circle cx="38" cy="25" r="1.5" fill="%23000"/>
  <path d="M20,35 Q30,45 40,35" stroke="%23000" stroke-width="2" fill="none" stroke-linecap="round"/>
</svg>`;
