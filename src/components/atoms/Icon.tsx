import clsx from 'clsx';
import type { LucideIcon, LucideProps } from 'lucide-react';
import {
    AlignCenter,
    AlignCenterHorizontal,
    AlignCenterVertical,
    AlignEndHorizontal,
    AlignEndVertical,
    AlignHorizontalDistributeCenter,
    AlignJustify,
    AlignLeft,
    AlignRight,
    AlignStartHorizontal,
    AlignStartVertical,
    AlignVerticalDistributeCenter,
    ArrowLeftRight,
    Bold,
    BringToFront,
    BriefcaseBusiness,
    Camera,
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    ChevronsDown,
    ChevronsUp,
    Circle,
    CircleQuestionMark,
    ClipboardPaste,
    Code,
    Copy,
    Download,
    Eraser,
    FilePlus2,
    Upload,
    CopyPlus,
    Ellipsis,
    Eye,
    File,
    FileOutput,
    FileText,
    FolderOpen,
    Grid2x2,
    Grip,
    GripHorizontal,
    GripVertical,
    Group,
    Hand,
    Heart,
    Image,
    Images,
    Info,
    Italic,
    Layers,
    LoaderCircle,
    Lock,
    LockOpen,
    Magnet,
    Maximize,
    Minimize,
    Minus,
    Monitor,
    MonitorPlay,
    MousePointer2,
    Palette,
    Pencil,
    Pipette,
    Plus,
    RotateCcw,
    RotateCw,
    Ruler,
    ScanSearch,
    Save,
    Scissors,
    Search,
    SendToBack,
    Settings,
    Shapes,
    Share,
    Share2,
    SlidersHorizontal,
    Spline,
    SquarePen,
    Star,
    Trash,
    Trash2,
    TriangleAlert,
    Tv,
    Type,
    Underline,
    Ungroup,
    Users,
    Video,
    WandSparkles,
    X,
    ZoomIn,
    ZoomOut,
    ALargeSmall,
    Baseline,
    CaseLower,
    CaseSensitive,
    CaseUpper,
    Crop,
    Crosshair,
    SquareDashed,
    SquareSplitHorizontal,
    SquaresExclude,
    SquaresIntersect,
    SquaresSubtract,
    SquaresUnite,
    Highlighter,
    Strikethrough,
    Diamond,
    DiamondMinus,
    DiamondPlus,
    CircleDot,
    SquareDot,
    Slash,
    Link2,
    Unlink,
    TrianglesCenterlineDashedHorizontal,
    TrianglesCenterlineDashedVertical,
    EyeOff,
    Pause,
    Play,
    Redo2,
    Repeat,
    Square,
    StepBack,
    StepForward,
    Undo2,
} from 'lucide-react';

/**
 * The app's icon set (Lucide). Keys are kebab-case names (most match the old Font Awesome names, so
 * configs read the same). Add an icon here before using it; `IconName` keeps every use type-checked.
 */
export const ICONS = {
    // text
    'align-center': AlignCenter,
    'align-justify': AlignJustify,
    'align-left': AlignLeft,
    'align-right': AlignRight,
    bold: Bold,
    font: Type,
    italic: Italic,
    'text-height': ALargeSmall,
    underline: Underline,

    // object alignment / layers / grouping
    'align-objects-left': AlignStartVertical,
    'align-objects-center': AlignCenterVertical,
    'align-objects-right': AlignEndVertical,
    'align-objects-top': AlignStartHorizontal,
    'align-objects-middle': AlignCenterHorizontal,
    'align-objects-bottom': AlignEndHorizontal,
    'distribute-horizontal': AlignHorizontalDistributeCenter,
    'distribute-vertical': AlignVerticalDistributeCenter,
    'bring-to-front': BringToFront,
    'send-to-back': SendToBack,
    'angle-up': ChevronUp,
    'angle-down': ChevronDown,
    'angles-up': ChevronsUp,
    'angles-down': ChevronsDown,
    'layer-group': Layers,
    'object-group': Group,
    'object-ungroup': Ungroup,
    lock: Lock,
    'lock-open': LockOpen,

    // edit / file
    clone: CopyPlus,
    copy: Copy,
    paste: ClipboardPaste,
    scissors: Scissors,
    trash: Trash,
    'trash-can': Trash2,
    file: File,
    'file-export': FileOutput,
    'file-lines': FileText,
    'floppy-disk': Save,
    'folder-open': FolderOpen,
    download: Download,
    upload: Upload,
    eraser: Eraser,
    'file-plus': FilePlus2,
    'pen-to-square': SquarePen,
    'share-from-square': Share,
    'share-nodes': Share2,

    // view
    'arrows-left-right': ArrowLeftRight,
    compress: Minimize,
    expand: Maximize,
    'zoom-fit': ScanSearch, // zoom to fit (distinct from fullscreen's expand)
    eye: Eye,
    'magnifying-glass': Search,
    'magnifying-glass-minus': ZoomOut,
    'magnifying-glass-plus': ZoomIn,
    'table-cells-large': Grid2x2,
    magnet: Magnet,
    'ruler-combined': Ruler,

    // tools
    'arrow-pointer': MousePointer2,
    'bezier-curve': Spline,
    'eye-dropper': Pipette,
    hand: Hand,
    palette: Palette,
    pencil: Pencil,
    rotate: RotateCw,
    'rotate-left': RotateCcw,
    'screwdriver-wrench': Settings,
    shapes: Shapes,
    sliders: SlidersHorizontal,
    'wand-magic-sparkles': WandSparkles,
    code: Code,
    grip: Grip,
    'grip-lines': GripHorizontal,
    'grip-lines-vertical': GripVertical,

    // media / formats (Lucide has no brand logos: generic stand-ins)
    image: Image,
    images: Images,
    video: Video,
    tv: Tv,
    display: Monitor,
    youtube: MonitorPlay,
    instagram: Camera,
    facebook: Users,
    linkedin: BriefcaseBusiness,

    // status / feedback
    check: Check,
    'circle-info': Info,
    'circle-question': CircleQuestionMark,
    'triangle-exclamation': TriangleAlert,
    spinner: LoaderCircle,
    gear: Settings,
    heart: Heart,
    star: Star,
    circle: Circle,

    // chrome
    'chevron-down': ChevronDown,
    'chevron-left': ChevronLeft,
    'chevron-right': ChevronRight,
    'chevron-up': ChevronUp,
    ellipsis: Ellipsis,
    minus: Minus,
    plus: Plus,
    xmark: X,

    // playback / animation
    play: Play,
    pause: Pause,
    stop: Square,
    'step-back': StepBack,
    'step-forward': StepForward,
    repeat: Repeat,
    undo: Undo2,
    redo: Redo2,
    'eye-slash': EyeOff,
    keyframe: Diamond,

    // node editing
    'node-add': DiamondPlus,
    'node-delete': DiamondMinus,
    'node-corner': SquareDot,
    'node-smooth': CircleDot,
    'segment-line': Slash,
    'segment-curve': Spline,
    'path-close': Link2,
    'path-open': Unlink,
    link: Link2,
    unlink: Unlink,
    // explicit shapes: in this Lucide version FlipHorizontal2 / FlipVertical2 are aliased the
    // other way round (FlipHorizontal2 = up/down triangles), which swapped the two flip icons
    'flip-horizontal': TrianglesCenterlineDashedVertical, // ◀┊▶ mirror left / right
    'flip-vertical': TrianglesCenterlineDashedHorizontal, // ▲┄▼ mirror top / bottom
    crosshairs: Crosshair,

    // boolean operations
    'boolean-union': SquaresUnite,
    'boolean-subtract': SquaresSubtract,
    'boolean-intersect': SquaresIntersect,
    'boolean-exclude': SquaresExclude,
    'boolean-divide': SquareSplitHorizontal,
    crop: Crop,
    mask: SquareDashed,

    // text
    strikethrough: Strikethrough,
    'case-upper': CaseUpper,
    'case-lower': CaseLower,
    'case-title': CaseSensitive,
    highlighter: Highlighter,
    outline: Baseline,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export interface IconProps extends Omit<LucideProps, 'ref'> {
    name: IconName;
    /** Solid version (fills the shape with currentColor), e.g. a favourited heart. */
    filled?: boolean;
    /** Rotate continuously (loading spinners). */
    spin?: boolean;
}

/**
 * Lucide icon sized in `em`, so it follows the surrounding font size like the old icon font did:
 * `text-xs`, `text-sm`, `text-[11px]` ... still control its size. Decorative unless `aria-label`
 * is given. Unknown names render nothing.
 */
export function Icon({
    name,
    filled = false,
    spin = false,
    size = '1.2em',
    strokeWidth = 2,
    className,
    ...rest
}: IconProps) {
    const Component: LucideIcon | undefined = ICONS[name];
    if (!Component) return null;

    const labelled = Boolean(rest['aria-label']);

    return (
        <Component
            size={size}
            strokeWidth={strokeWidth}
            fill={filled ? 'currentColor' : 'none'}
            aria-hidden={labelled ? undefined : true}
            role={labelled ? 'img' : undefined}
            focusable="false"
            className={clsx(
                'inline-block shrink-0 align-[-0.225em]',
                spin && 'animate-spin',
                className,
            )}
            {...rest}
        />
    );
}
