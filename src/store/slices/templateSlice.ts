import type { Canvas, FabricObject } from 'fabric';
import { Circle, FabricImage, Line, Rect, Textbox } from 'fabric';

import { SIZE_PRESETS } from '@/components/organisms/effects/sizePresets';
import { DESIGN_TEMPLATES } from '@/components/organisms/effects/designTemplateData';

import type {
    DesignTemplate,
    DesignTemplateCategory,
    DesignTemplateObject,
} from '@/components/organisms/effects/designTemplate.types';

import type { SliceCreator } from '@/store/types';

// ------------------------------------------------------------
// CONFIG
// ------------------------------------------------------------

/** Scale the template down (never up) so it always fits the canvas. */
const FIT_TEMPLATE_TO_CANVAS = true;

/** Center the template on the canvas after fitting. */
const CENTER_TEMPLATE_ON_CANVAS = true;

/** Reset zoom/pan so a previous viewport can't make the canvas look cropped. */
const RESET_VIEWPORT_ON_APPLY = true;

/** Padding (px) kept around the template when fitting. */
const CANVAS_PADDING = 0;

export interface TemplateSlice {
    designTemplates: DesignTemplate[];
    designTemplateSearch: string;
    designTemplateCategory: DesignTemplateCategory | 'All';
    designTemplateSizeId: string | 'All';
    favoriteDesignTemplateIds: string[];

    setDesignTemplateSearch: (value: string) => void;
    setDesignTemplateCategory: (category: DesignTemplateCategory | 'All') => void;
    setDesignTemplateSize: (sizeId: string | 'All') => void;
    toggleFavoriteDesignTemplate: (templateId: string) => void;
    getDesignTemplateById: (templateId: string) => DesignTemplate | undefined;
    getFilteredDesignTemplates: () => DesignTemplate[];
    applyDesignTemplate: (templateId: string) => Promise<void>;
}

export const createTemplateSlice: SliceCreator<TemplateSlice> = (set, get, _store) => ({
    designTemplates: DESIGN_TEMPLATES,
    designTemplateSearch: '',
    designTemplateCategory: 'All',
    designTemplateSizeId: 'All',
    favoriteDesignTemplateIds: [],

    // ----------------------------------------------------------
    // SEARCH / CATEGORY / SIZE
    // ----------------------------------------------------------

    setDesignTemplateSearch: (value) => {
        set({ designTemplateSearch: value });
    },

    setDesignTemplateCategory: (category) => {
        set({ designTemplateCategory: category });
    },

    setDesignTemplateSize: (sizeId) => {
        set({ designTemplateSizeId: sizeId });
    },

    // ----------------------------------------------------------
    // FAVORITES
    // ----------------------------------------------------------

    toggleFavoriteDesignTemplate: (templateId) => {
        set((state) => {
            const exists = state.favoriteDesignTemplateIds.includes(templateId);

            return {
                favoriteDesignTemplateIds: exists
                    ? state.favoriteDesignTemplateIds.filter((id) => id !== templateId)
                    : [...state.favoriteDesignTemplateIds, templateId],
            };
        });
    },

    // ----------------------------------------------------------
    // GET TEMPLATE
    // ----------------------------------------------------------

    getDesignTemplateById: (templateId) => {
        return get().designTemplates.find((template) => template.id === templateId);
    },

    // ----------------------------------------------------------
    // FILTER
    // ----------------------------------------------------------

    getFilteredDesignTemplates: () => {
        const {
            designTemplates,
            designTemplateSearch,
            designTemplateCategory,
            designTemplateSizeId,
        } = get();

        const search = designTemplateSearch.trim().toLowerCase();

        return designTemplates.filter((template) => {
            const matchesSearch =
                !search ||
                template.name.toLowerCase().includes(search) ||
                template.description?.toLowerCase().includes(search) ||
                template.tags.some((tag) => tag.toLowerCase().includes(search));

            const matchesCategory =
                designTemplateCategory === 'All' || template.category === designTemplateCategory;

            const matchesSize =
                designTemplateSizeId === 'All' || template.sizeId === designTemplateSizeId;

            return matchesSearch && matchesCategory && matchesSize;
        });
    },

    // ----------------------------------------------------------
    // APPLY TEMPLATE
    // ----------------------------------------------------------

    applyDesignTemplate: async (templateId: string) => {
        const canvas = get().canvas;

        if (!canvas) {
            console.warn('Canvas is not available');
            return;
        }

        const template = get().designTemplates.find((item) => item.id === templateId);

        if (!template) {
            console.warn(`Template not found: ${templateId}`);
            return;
        }

        try {
            // 1. Find size
            const preset = SIZE_PRESETS.find((item) => item.id === template.sizeId);

            if (!preset) {
                console.warn(`Size preset not found: ${template.sizeId}`);
                return;
            }

            // 2. Clear canvas
            canvas.discardActiveObject();
            canvas.clear();

            if (RESET_VIEWPORT_ON_APPLY) {
                canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
            }

            // 3. Set canvas dimensions
            canvas.setDimensions({
                width: preset.width,
                height: preset.height,
            });

            // 4. Build template objects in order (keeps z-index correct)
            for (const object of template.objects ?? []) {
                await addTemplateObject(canvas, object);
            }

            // 5. Fit + center
            if (FIT_TEMPLATE_TO_CANVAS || CENTER_TEMPLATE_ON_CANVAS) {
                fitAndCenterObjects(canvas, preset.width, preset.height);
            }

            // 6. Render
            canvas.discardActiveObject();
            canvas.requestRenderAll();

            // 7. Optional: update editor state
            // get().saveHistory?.();
        } catch (error) {
            console.error('Failed to apply design template:', error);
        }
    },
});

// ============================================================
// FIT + CENTER
// ============================================================

/**
 * Visible bounds of an object. For clipped objects (cover-fit images)
 * the visible area is the clip box, not the overflowing image.
 */
function getVisibleBounds(object: FabricObject) {
    object.setCoords();
    const source = object.clipPath ?? object;
    return source.getBoundingRect();
}

/**
 * Applies one uniform scale + translation to every object
 * (and its clipPath), so the whole template keeps its layout.
 */
function fitAndCenterObjects(canvas: Canvas, canvasWidth: number, canvasHeight: number): void {
    const objects = canvas.getObjects();

    if (!objects.length) return;

    // Bounds of the whole template
    let minLeft = Infinity;
    let minTop = Infinity;
    let maxRight = -Infinity;
    let maxBottom = -Infinity;

    objects.forEach((object) => {
        const rect = getVisibleBounds(object);

        minLeft = Math.min(minLeft, rect.left);
        minTop = Math.min(minTop, rect.top);
        maxRight = Math.max(maxRight, rect.left + rect.width);
        maxBottom = Math.max(maxBottom, rect.top + rect.height);
    });

    const contentWidth = maxRight - minLeft;
    const contentHeight = maxBottom - minTop;

    if (contentWidth <= 0 || contentHeight <= 0) return;

    // Uniform scale: shrink only if the template is bigger than the canvas
    let scale = 1;

    if (FIT_TEMPLATE_TO_CANVAS) {
        const availableWidth = Math.max(canvasWidth - CANVAS_PADDING * 2, 1);
        const availableHeight = Math.max(canvasHeight - CANVAS_PADDING * 2, 1);

        scale = Math.min(1, availableWidth / contentWidth, availableHeight / contentHeight);
    }

    // Where the (scaled) content's top-left should land
    const scaledWidth = contentWidth * scale;
    const scaledHeight = contentHeight * scale;

    const targetLeft = CENTER_TEMPLATE_ON_CANVAS ? (canvasWidth - scaledWidth) / 2 : minLeft;

    const targetTop = CENTER_TEMPLATE_ON_CANVAS ? (canvasHeight - scaledHeight) / 2 : minTop;

    // Map a point from template space to canvas space
    const mapX = (x: number) => targetLeft + (x - minLeft) * scale;
    const mapY = (y: number) => targetTop + (y - minTop) * scale;

    objects.forEach((object) => {
        object.set({
            left: mapX(object.left ?? 0),
            top: mapY(object.top ?? 0),
            scaleX: (object.scaleX ?? 1) * scale,
            scaleY: (object.scaleY ?? 1) * scale,
        });

        if (object.clipPath) {
            const clip = object.clipPath;

            clip.set({
                left: mapX(clip.left ?? 0),
                top: mapY(clip.top ?? 0),
                scaleX: (clip.scaleX ?? 1) * scale,
                scaleY: (clip.scaleY ?? 1) * scale,
            });
        }

        object.setCoords();
    });
}

// ============================================================
// FABRIC OBJECT CREATOR
// ============================================================

async function addTemplateObject(canvas: Canvas, object: DesignTemplateObject): Promise<void> {
    switch (object.type) {
        // --------------------------------------------------------
        // IMAGE
        // --------------------------------------------------------

        case 'image': {
            try {
                const image = await FabricImage.fromURL(object.src, {
                    crossOrigin: 'anonymous',
                });

                const { width: sourceWidth, height: sourceHeight } = image.getOriginalSize();

                if (!sourceWidth || !sourceHeight) {
                    console.warn('Template image has no size:', object.src);
                    return;
                }

                // Fall back to the image's natural size if the template has none
                const targetWidth = object.width ?? sourceWidth;
                const targetHeight = object.height ?? sourceHeight;

                // Default "contain": the full image is always visible.
                // Only crop when the template explicitly asks for "cover".
                const fit = object.fit ?? 'contain';

                let scaleX: number;
                let scaleY: number;

                if (fit === 'cover') {
                    const s = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
                    scaleX = s;
                    scaleY = s;
                } else if (fit === 'fill') {
                    scaleX = targetWidth / sourceWidth;
                    scaleY = targetHeight / sourceHeight;
                } else {
                    const s = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
                    scaleX = s;
                    scaleY = s;
                }

                const scaledWidth = sourceWidth * scaleX;
                const scaledHeight = sourceHeight * scaleY;

                image.set({
                    // Center the scaled image inside its target box
                    left: object.left + (targetWidth - scaledWidth) / 2,
                    top: object.top + (targetHeight - scaledHeight) / 2,
                    scaleX,
                    scaleY,
                    cropX: 0,
                    cropY: 0,
                    angle: object.angle ?? 0,
                    opacity: object.opacity ?? 1,
                    selectable: object.selectable ?? !object.locked,
                    evented: object.evented ?? !object.locked,
                });

                // "cover" overflows its box, so clip to the target area
                if (fit === 'cover') {
                    image.clipPath = new Rect({
                        left: object.left,
                        top: object.top,
                        width: targetWidth,
                        height: targetHeight,
                        absolutePositioned: true,
                    });
                }

                canvas.add(image);
            } catch (error) {
                console.error('Unable to load template image:', object.src, error);
            }

            return;
        }

        // --------------------------------------------------------
        // TEXT
        // --------------------------------------------------------

        case 'text': {
            const text = new Textbox(object.text, {
                left: object.left,
                top: object.top,
                width: object.width ?? 500,
                angle: object.angle ?? 0,
                fontFamily: object.fontFamily ?? 'Arial',
                fontSize: object.fontSize ?? 32,
                fontWeight: object.fontWeight ?? 400,
                fill: object.fill ?? '#111827',
                textAlign: object.textAlign ?? 'left',
                lineHeight: object.lineHeight ?? 1.16,
                charSpacing: object.charSpacing ?? 0,
                backgroundColor: object.backgroundColor ?? 'transparent',
                opacity: object.opacity ?? 1,
                selectable: object.selectable ?? !object.locked,
                evented: object.evented ?? !object.locked,
            });

            canvas.add(text);
            return;
        }

        // --------------------------------------------------------
        // RECTANGLE
        // --------------------------------------------------------

        case 'rect': {
            const rect = new Rect({
                left: object.left,
                top: object.top,
                width: object.width,
                height: object.height,
                fill: object.fill ?? '#000000',
                stroke: object.stroke,
                strokeWidth: object.strokeWidth ?? 0,
                rx: object.rx ?? 0,
                ry: object.ry ?? 0,
                angle: object.angle ?? 0,
                opacity: object.opacity ?? 1,
                selectable: object.selectable ?? !object.locked,
                evented: object.evented ?? !object.locked,
            });

            canvas.add(rect);
            return;
        }

        // --------------------------------------------------------
        // CIRCLE
        // --------------------------------------------------------

        case 'circle': {
            const circle = new Circle({
                left: object.left,
                top: object.top,
                radius: object.radius,
                fill: object.fill ?? '#000000',
                stroke: object.stroke,
                strokeWidth: object.strokeWidth ?? 0,
                angle: object.angle ?? 0,
                opacity: object.opacity ?? 1,
                selectable: object.selectable ?? !object.locked,
                evented: object.evented ?? !object.locked,
            });

            canvas.add(circle);
            return;
        }

        // --------------------------------------------------------
        // LINE
        // --------------------------------------------------------

        case 'line': {
            const line = new Line([object.x1, object.y1, object.x2, object.y2], {
                left: object.left,
                top: object.top,
                stroke: object.stroke ?? '#000000',
                strokeWidth: object.strokeWidth ?? 2,
                angle: object.angle ?? 0,
                opacity: object.opacity ?? 1,
                selectable: object.selectable ?? !object.locked,
                evented: object.evented ?? !object.locked,
            });

            canvas.add(line);
            return;
        }
    }
}
