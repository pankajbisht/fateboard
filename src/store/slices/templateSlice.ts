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

// ============================================================
// CONFIG
// ============================================================

/**
 * Space kept between the artboard and the edge of the viewport.
 */
const VIEW_PADDING = 40;

/**
 * Maximum zoom allowed when fitting the artboard.
 */
const MAX_FIT_ZOOM = 1;

/**
 * Minimum zoom allowed when fitting the artboard.
 */
const MIN_FIT_ZOOM = 0.05;

/**
 * Background color of the design/artboard.
 */
const ARTBOARD_COLOR = '#ffffff';

/**
 * When true, the complete template content is translated so that
 * its bounding box is centered inside the artboard.
 *
 * IMPORTANT:
 * This only TRANSLATES objects.
 * It does not resize or scale template content.
 */
const CENTER_CONTENT_IN_ARTBOARD = true;

// ============================================================
// TYPES / STATE
// ============================================================

export interface DesignArtboard {
    width: number;
    height: number;
}

export interface TemplateSlice {
    designTemplates: DesignTemplate[];

    designTemplateSearch: string;

    designTemplateCategory: DesignTemplateCategory | 'All';

    designTemplateSizeId: string | 'All';

    favoriteDesignTemplateIds: string[];

    /**
     * Size of the design area in design pixels.
     */
    designArtboard: DesignArtboard | null;

    /**
     * Current viewport zoom.
     */
    designViewZoom: number;

    setDesignTemplateSearch: (value: string) => void;

    setDesignTemplateCategory: (category: DesignTemplateCategory | 'All') => void;

    setDesignTemplateSize: (sizeId: string | 'All') => void;

    toggleFavoriteDesignTemplate: (templateId: string) => void;

    getDesignTemplateById: (templateId: string) => DesignTemplate | undefined;

    getFilteredDesignTemplates: () => DesignTemplate[];

    applyDesignTemplate: (templateId: string) => Promise<void>;

    /**
     * Resize the Fabric canvas to its host and fit the artboard.
     */
    fitDesignToViewport: () => void;
}

// ============================================================
// MODULE STATE
// ============================================================

/**
 * Objects that belong to the editor UI/artboard rather than
 * the actual design content.
 */
const ARTBOARD_OBJECTS = new WeakSet<FabricObject>();

/**
 * Prevents older async template loads from overwriting
 * a newer template selection.
 */
let applyRequestId = 0;

// ============================================================
// HELPERS
// ============================================================

function getCanvasHost(canvas: Canvas): HTMLElement | null {
    return canvas.wrapperEl?.parentElement ?? null;
}

/**
 * Pins Fabric's wrapper to the host so that the Fabric canvas
 * does not participate in normal layout sizing.
 *
 * This prevents:
 *
 * - host expanding because of canvas
 * - unwanted vertical overflow
 * - artboard appearing too high/low
 * - centering problems caused by flex/grid layout
 */
function pinCanvasToHost(canvas: Canvas, host: HTMLElement): void {
    const hostPosition = getComputedStyle(host).position;

    if (hostPosition === 'static') {
        host.style.position = 'relative';
    }

    host.style.overflow = 'hidden';

    const wrapper = canvas.wrapperEl;

    wrapper.style.position = 'absolute';
    wrapper.style.top = '0px';
    wrapper.style.left = '0px';
    wrapper.style.right = 'auto';
    wrapper.style.bottom = 'auto';
    wrapper.style.margin = '0';
    wrapper.style.width = '100%';
    wrapper.style.height = '100%';
}

/**
 * Keeps template objects interactive according to their
 * locked/selectable/evented configuration.
 */
function interactivity(object: { selectable?: boolean; evented?: boolean; locked?: boolean }) {
    return {
        selectable: object.selectable ?? !object.locked,

        evented: object.evented ?? !object.locked,
    };
}

/**
 * Returns true when the Fabric object belongs to the
 * editor artboard rather than the user's template.
 */
export function isArtboardObject(object: FabricObject): boolean {
    return ARTBOARD_OBJECTS.has(object);
}

// ============================================================
// SLICE
// ============================================================

export const createTemplateSlice: SliceCreator<TemplateSlice> = (set, get, _store) => ({
    // ========================================================
    // INITIAL STATE
    // ========================================================

    designTemplates: DESIGN_TEMPLATES,

    designTemplateSearch: '',

    designTemplateCategory: 'All',

    designTemplateSizeId: 'All',

    favoriteDesignTemplateIds: [],

    designArtboard: null,

    designViewZoom: 1,

    // ========================================================
    // SEARCH
    // ========================================================

    setDesignTemplateSearch: (value) => {
        set({
            designTemplateSearch: value,
        });
    },

    // ========================================================
    // CATEGORY
    // ========================================================

    setDesignTemplateCategory: (category) => {
        set({
            designTemplateCategory: category,
        });
    },

    // ========================================================
    // SIZE
    // ========================================================

    setDesignTemplateSize: (sizeId) => {
        set({
            designTemplateSizeId: sizeId,
        });
    },

    // ========================================================
    // FAVORITES
    // ========================================================

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

    // ========================================================
    // GET TEMPLATE
    // ========================================================

    getDesignTemplateById: (templateId) => {
        return get().designTemplates.find((template) => template.id === templateId);
    },

    // ========================================================
    // FILTER TEMPLATES
    // ========================================================

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

    // ========================================================
    // FIT ARTBOARD TO VIEWPORT
    // ========================================================

    fitDesignToViewport: () => {
        const { canvas, designArtboard } = get();

        if (!canvas || !designArtboard) {
            return;
        }

        const host = getCanvasHost(canvas);

        if (!host) {
            return;
        }

        /**
         * Important:
         * Pin the Fabric wrapper before measuring the host.
         */
        pinCanvasToHost(canvas, host);

        const viewWidth = Math.floor(host.clientWidth);

        const viewHeight = Math.floor(host.clientHeight);

        /**
         * Host may not have dimensions yet.
         *
         * This commonly happens when:
         * - tab is hidden
         * - modal is opening
         * - sidebar is being animated
         * - component is mounting
         */
        if (viewWidth <= 0 || viewHeight <= 0) {
            return;
        }

        /**
         * Make Fabric's viewport canvas exactly
         * the same size as its host.
         */
        if (canvas.getWidth() !== viewWidth || canvas.getHeight() !== viewHeight) {
            canvas.setDimensions({
                width: viewWidth,
                height: viewHeight,
            });
        }

        // ----------------------------------------------------
        // AVAILABLE VIEWPORT SPACE
        // ----------------------------------------------------

        const availableWidth = Math.max(viewWidth - VIEW_PADDING * 2, 1);

        const availableHeight = Math.max(viewHeight - VIEW_PADDING * 2, 1);

        // ----------------------------------------------------
        // CALCULATE FIT ZOOM
        // ----------------------------------------------------

        const widthZoom = availableWidth / designArtboard.width;

        const heightZoom = availableHeight / designArtboard.height;

        const zoom = Math.min(
            MAX_FIT_ZOOM,
            Math.max(MIN_FIT_ZOOM, Math.min(widthZoom, heightZoom)),
        );

        // ----------------------------------------------------
        // CENTER ARTBOARD IN VIEWPORT
        // ----------------------------------------------------

        const scaledWidth = designArtboard.width * zoom;

        const scaledHeight = designArtboard.height * zoom;

        const panX = (viewWidth - scaledWidth) / 2;

        const panY = (viewHeight - scaledHeight) / 2;

        canvas.setViewportTransform([zoom, 0, 0, zoom, panX, panY]);

        canvas.requestRenderAll();

        if (get().designViewZoom !== zoom) {
            set({
                designViewZoom: zoom,
            });
        }
    },

    // ========================================================
    // APPLY TEMPLATE
    // ========================================================

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

        const preset = SIZE_PRESETS.find((item) => item.id === template.sizeId);

        if (!preset) {
            console.warn(`Size preset not found: ${template.sizeId}`);
            return;
        }

        /**
         * Every apply operation gets a unique ID.
         *
         * If the user quickly selects:
         *
         * Template A
         * Template B
         * Template C
         *
         * and A finishes loading after C,
         * A will not overwrite C.
         */
        const requestId = ++applyRequestId;

        try {
            // ==================================================
            // CREATE TEMPLATE OBJECTS
            // ==================================================

            const created = await Promise.all(
                (template.objects ?? []).map((object) => createTemplateObject(object)),
            );

            // ==================================================
            // CANCEL OLD REQUEST
            // ==================================================

            if (requestId !== applyRequestId || get().canvas !== canvas) {
                return;
            }

            const objects = created.filter((item): item is FabricObject => item !== null);

            // ==================================================
            // CENTER CONTENT
            // ==================================================

            if (CENTER_CONTENT_IN_ARTBOARD) {
                centerObjectsOnArtboard(objects, preset.width, preset.height);
            }

            // ==================================================
            // RESET CANVAS
            // ==================================================

            canvas.discardActiveObject();

            canvas.clear();

            /**
             * Reset previous clip path.
             */
            canvas.clipPath = undefined;

            // ==================================================
            // CREATE ARTBOARD
            // ==================================================

            const artboard = new Rect({
                left: 0,
                top: 0,

                width: preset.width,

                height: preset.height,

                fill: ARTBOARD_COLOR,

                selectable: false,

                evented: false,

                hoverCursor: 'default',

                objectCaching: false,
            });

            ARTBOARD_OBJECTS.add(artboard);

            canvas.add(artboard);

            // ==================================================
            // ADD TEMPLATE OBJECTS
            // ==================================================

            objects.forEach((object) => {
                canvas.add(object);
            });

            // ==================================================
            // ARTBOARD CLIP
            // ==================================================

            canvas.clipPath = new Rect({
                left: 0,
                top: 0,

                width: preset.width,

                height: preset.height,

                absolutePositioned: true,

                selectable: false,

                evented: false,

                objectCaching: false,
            });

            // ==================================================
            // UPDATE STATE
            // ==================================================

            set({
                designArtboard: {
                    width: preset.width,

                    height: preset.height,
                },
            });

            // ==================================================
            // FIT ARTBOARD
            // ==================================================

            get().fitDesignToViewport();

            canvas.requestRenderAll();
        } catch (error) {
            console.error('Failed to apply design template:', error);
        }
    },
});

// ============================================================
// CENTER TEMPLATE CONTENT
// ============================================================

/**
 * Moves all template content so that the combined
 * visible bounding box is centered inside the artboard.
 *
 * IMPORTANT:
 *
 * - Objects are NOT scaled.
 * - Object dimensions are NOT changed.
 * - Only position is changed.
 * - Works with rotated objects.
 */
function centerObjectsOnArtboard(
    objects: FabricObject[],
    artboardWidth: number,
    artboardHeight: number,
): void {
    if (!objects.length) {
        return;
    }

    let minLeft = Infinity;

    let minTop = Infinity;

    let maxRight = -Infinity;

    let maxBottom = -Infinity;

    // ========================================================
    // CALCULATE COMPLETE CONTENT BOUNDS
    // ========================================================

    for (const object of objects) {
        object.setCoords();

        const bounds = object.getBoundingRect();

        minLeft = Math.min(minLeft, bounds.left);

        minTop = Math.min(minTop, bounds.top);

        maxRight = Math.max(maxRight, bounds.left + bounds.width);

        maxBottom = Math.max(maxBottom, bounds.top + bounds.height);
    }

    // ========================================================
    // VALIDATE BOUNDS
    // ========================================================

    if (
        !Number.isFinite(minLeft) ||
        !Number.isFinite(minTop) ||
        !Number.isFinite(maxRight) ||
        !Number.isFinite(maxBottom)
    ) {
        return;
    }

    const contentWidth = maxRight - minLeft;

    const contentHeight = maxBottom - minTop;

    if (contentWidth <= 0 || contentHeight <= 0) {
        return;
    }

    // ========================================================
    // CONTENT CENTER
    // ========================================================

    const contentCenterX = minLeft + contentWidth / 2;

    const contentCenterY = minTop + contentHeight / 2;

    // ========================================================
    // ARTBOARD CENTER
    // ========================================================

    const artboardCenterX = artboardWidth / 2;

    const artboardCenterY = artboardHeight / 2;

    // ========================================================
    // TRANSLATION
    // ========================================================

    const dx = artboardCenterX - contentCenterX;

    const dy = artboardCenterY - contentCenterY;

    // ========================================================
    // MOVE OBJECTS
    // ========================================================

    for (const object of objects) {
        const center = object.getCenterPoint();

        object.setPositionByOrigin(
            {
                x: center.x + dx,
                y: center.y + dy,
            },
            'center',
            'center',
        );

        object.setCoords();
    }
}

// ============================================================
// FABRIC OBJECT FACTORY
// ============================================================

/**
 * Creates a Fabric object from template data.
 *
 * Returns null when an object cannot be created.
 */
async function createTemplateObject(object: DesignTemplateObject): Promise<FabricObject | null> {
    switch (object.type) {
        // ====================================================
        // IMAGE
        // ====================================================

        case 'image': {
            try {
                const image = await FabricImage.fromURL(object.src, {
                    crossOrigin: 'anonymous',
                });

                const {
                    width: sourceWidth,

                    height: sourceHeight,
                } = image.getOriginalSize();

                if (!sourceWidth || !sourceHeight) {
                    console.warn('Template image has no size:', object.src);

                    return null;
                }

                // --------------------------------------------
                // TARGET SIZE
                // --------------------------------------------

                const targetWidth = object.width ?? sourceWidth;

                const targetHeight = object.height ?? sourceHeight;

                // --------------------------------------------
                // FIT MODE
                // --------------------------------------------

                const fit = object.fit ?? 'contain';

                let scaleX: number;

                let scaleY: number;

                // --------------------------------------------
                // COVER
                // --------------------------------------------

                if (fit === 'cover') {
                    const scale = Math.max(
                        targetWidth / sourceWidth,

                        targetHeight / sourceHeight,
                    );

                    scaleX = scale;

                    scaleY = scale;
                }

                // --------------------------------------------
                // FILL
                // --------------------------------------------
                else if (fit === 'fill') {
                    scaleX = targetWidth / sourceWidth;

                    scaleY = targetHeight / sourceHeight;
                }

                // --------------------------------------------
                // CONTAIN
                // --------------------------------------------
                else {
                    const scale = Math.min(
                        targetWidth / sourceWidth,

                        targetHeight / sourceHeight,
                    );

                    scaleX = scale;

                    scaleY = scale;
                }

                // --------------------------------------------
                // FINAL IMAGE SIZE
                // --------------------------------------------

                const scaledWidth = sourceWidth * scaleX;

                const scaledHeight = sourceHeight * scaleY;

                // --------------------------------------------
                // IMAGE POSITION
                // --------------------------------------------

                image.set({
                    left: object.left + (targetWidth - scaledWidth) / 2,

                    top: object.top + (targetHeight - scaledHeight) / 2,

                    scaleX,

                    scaleY,

                    cropX: 0,

                    cropY: 0,

                    angle: object.angle ?? 0,

                    opacity: object.opacity ?? 1,

                    ...interactivity(object),
                });

                // --------------------------------------------
                // COVER CLIPPING
                // --------------------------------------------

                if (fit === 'cover') {
                    image.clipPath = new Rect({
                        left: object.left,

                        top: object.top,

                        width: targetWidth,

                        height: targetHeight,

                        absolutePositioned: true,

                        selectable: false,

                        evented: false,

                        objectCaching: false,
                    });
                }

                image.setCoords();

                return image;
            } catch (error) {
                console.error('Unable to load template image:', object.src, error);

                return null;
            }
        }

        // ====================================================
        // TEXT
        // ====================================================

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

                ...interactivity(object),
            });

            text.setCoords();

            return text;
        }

        // ====================================================
        // RECTANGLE
        // ====================================================

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

                ...interactivity(object),
            });

            rect.setCoords();

            return rect;
        }

        // ====================================================
        // CIRCLE
        // ====================================================

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

                ...interactivity(object),
            });

            circle.setCoords();

            return circle;
        }

        // ====================================================
        // LINE
        // ====================================================

        case 'line': {
            const line = new Line([object.x1, object.y1, object.x2, object.y2], {
                left: object.left,

                top: object.top,

                stroke: object.stroke ?? '#000000',

                strokeWidth: object.strokeWidth ?? 2,

                angle: object.angle ?? 0,

                opacity: object.opacity ?? 1,

                ...interactivity(object),
            });

            line.setCoords();

            return line;
        }

        // ====================================================
        // UNKNOWN
        // ====================================================

        default:
            console.warn('Unsupported template object:', object);

            return null;
    }
}
