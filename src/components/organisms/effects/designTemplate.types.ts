export type DesignTemplateCategory =
    | 'YouTube'
    | 'Instagram'
    | 'Social'
    | 'Poster'
    | 'Presentation'
    | 'Marketing';

export type DesignTemplateObject =
    | DesignTemplateImage
    | DesignTemplateText
    | DesignTemplateRect
    | DesignTemplateCircle
    | DesignTemplateLine;

export interface BaseTemplateObject {
    id?: string;
    left: number;
    top: number;
    angle?: number;
    opacity?: number;
    visible?: boolean;
    selectable?: boolean;
    evented?: boolean;
    locked?: boolean;
}

export interface DesignTemplateImage extends BaseTemplateObject {
    type: 'image';
    src: string;

    width: number;
    height: number;

    fit?: 'cover' | 'contain';
    radius?: number;
}

export interface DesignTemplateText extends BaseTemplateObject {
    type: 'text';

    text: string;

    width?: number;
    height?: number;

    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string | number;

    fill?: string;

    textAlign?: 'left' | 'center' | 'right' | 'justify';

    lineHeight?: number;
    charSpacing?: number;

    backgroundColor?: string;
}

export interface DesignTemplateRect extends BaseTemplateObject {
    type: 'rect';

    width: number;
    height: number;

    fill?: string;
    stroke?: string;
    strokeWidth?: number;

    rx?: number;
    ry?: number;
}

export interface DesignTemplateCircle extends BaseTemplateObject {
    type: 'circle';

    radius: number;

    fill?: string;
    stroke?: string;
    strokeWidth?: number;
}

export interface DesignTemplateLine extends BaseTemplateObject {
    type: 'line';

    x1: number;
    y1: number;
    x2: number;
    y2: number;

    stroke?: string;
    strokeWidth?: number;
}

export interface DesignTemplate {
    id: string;

    name: string;

    category: DesignTemplateCategory;

    sizeId: string;

    thumbnail: string;

    preview?: string;

    description?: string;

    tags: string[];

    featured?: boolean;

    objects: DesignTemplateObject[];
}
