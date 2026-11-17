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
    ArrowDownToLine,
    ArrowLeftRight,
    ArrowRightToLine,
    Bold,
    BriefcaseBusiness,
    Camera,
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    ChevronsDown,
    ChevronsUp,
    CornerLeftDown,
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
    Folder,
    FolderOpen,
    FolderPlus,
    Grid2x2,
    Grid3x3,
    Grip,
    GripHorizontal,
    GripVertical,
    Hand,
    Heart,
    Image,
    Images,
    Info,
    Italic,
    Layers,
    LayoutDashboard,
    Layers2,
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
    UnfoldHorizontal,
    Save,
    Scissors,
    Search,
    Settings,
    Shapes,
    Snowflake,
    Paintbrush,
    ListVideo,
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
    Users,
    Video,
    WandSparkles,
    PenTool,
    PencilLine,
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
    Focus,
    PaintBucket,
    SprayCan,
    LassoSelect,
    Flame,
    Cloud,
    Sparkles,
    Leaf,
    Droplets,
    Waves,
    Wind,
    Zap,
    Feather,
    Brush,
    PenLine,
    LayoutTemplate,
    FlipHorizontal2,
    Blend,
    Stamp,
    Sun,
    MessageSquareText,
    Pin,
    PinOff,
    Reply,
    ListChecks,
    CircleCheck,
    SquareCheck,
} from 'lucide-react';
import {
    AlongPathIcon,
    BooleanDivideIcon,
    BooleanExcludeIcon,
    BooleanIcon,
    BooleanIntersectIcon,
    BooleanSubtractIcon,
    BooleanUnionIcon,
    BringForwardIcon,
    BringToFrontIcon,
    BrushToolIcon,
    CanvasGridIcon,
    FillAddIcon,
    FillNoneIcon,
    FillOnIcon,
    FillRemoveIcon,
    GroupObjectsIcon,
    SendBackwardIcon,
    SendToBackIcon,
    StrokeAddIcon,
    StrokeNoneIcon,
    StrokeOnIcon,
    StrokeRemoveIcon,
    UngroupObjectsIcon,
    BrushSettingsIcon,
    ColorWheelIcon,
    CopySprayIcon,
    DrafterIcon,
    GPenIcon,
    KaleidoscopeIcon,
    LaserPointerIcon,
    NodeToolIcon,
    PathCloseIcon,
    PathOpenIcon,
    SprayPatternIcon,
    SymmetryIcon,
    SymmetryPointIcon,
    SymmetryRadialIcon,
    TilingIcon,
} from './customIcons';

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
    'bring-to-front': BringToFrontIcon, // 2026-11-17: two objects + corner arrow, one set with the three below
    'bring-forward': BringForwardIcon,
    'send-backward': SendBackwardIcon,
    'send-to-back': SendToBackIcon,
    'angle-up': ChevronUp,
    'angle-down': ChevronDown,
    'angles-up': ChevronsUp,
    'angles-down': ChevronsDown,
    // page layers panel (2026-11-17)
    folder: Folder,
    'folder-plus': FolderPlus,
    'clip-below': CornerLeftDown,
    'merge-down': ArrowDownToLine,
    flatten: Layers2,
    'move-to-layer': ArrowRightToLine,
    'comic-panels': LayoutDashboard, // left rail Comic (2026-11-17)
    'layer-group': Layers,
    'object-group': GroupObjectsIcon, // 2026-11-17: shapes in selection brackets
    'object-ungroup': UngroupObjectsIcon, // each shape in its own frame
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
    'zoom-fit-width': UnfoldHorizontal, // fit the page width (2026-11-17)
    eye: Eye,
    focus: Focus, // distraction-free mode
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
    'pen-tool': PenTool,
    'pencil-line': PencilLine,
    'laser-pointer': LaserPointerIcon, // was Flashlight (2026-11-16 icon audit)
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

    // generators (right dock)
    snowflake: Snowflake,
    'cellular-automata': Grid3x3,
    macro: ListVideo,
    paintbrush: Paintbrush,

    // node editing
    'node-add': DiamondPlus,
    'node-delete': DiamondMinus,
    'node-corner': SquareDot,
    'node-smooth': CircleDot,
    'segment-line': Slash,
    'segment-curve': Spline,
    'path-close': PathCloseIcon, // was a chain link (2026-11-16 icon audit)
    'path-open': PathOpenIcon,
    link: Link2,
    unlink: Unlink,
    // explicit shapes: in this Lucide version FlipHorizontal2 / FlipVertical2 are aliased the
    // other way round (FlipHorizontal2 = up/down triangles), which swapped the two flip icons
    'flip-horizontal': TrianglesCenterlineDashedVertical, // ◀┊▶ mirror left / right
    'flip-vertical': TrianglesCenterlineDashedHorizontal, // ▲┄▼ mirror top / bottom
    crosshairs: Crosshair,

    // boolean operations
    boolean: BooleanIcon, // 2026-11-16 (2): Venn circles, the result shaded
    'boolean-union': BooleanUnionIcon,
    'boolean-subtract': BooleanSubtractIcon,
    'boolean-intersect': BooleanIntersectIcon,
    'boolean-exclude': BooleanExcludeIcon,
    'boolean-divide': BooleanDivideIcon,
    crop: Crop,
    mask: SquareDashed,

    // text
    strikethrough: Strikethrough,
    'case-upper': CaseUpper,
    'case-lower': CaseLower,
    'case-title': CaseSensitive,
    highlighter: Highlighter,
    outline: Baseline,
    // 2026-11-16 icon audit: tools and panels that had a borrowed icon, and the new drawing tools
    'node-tool': NodeToolIcon, // Node tool (was 'share-nodes', a share icon)
    tiling: TilingIcon, // Tiling tab (was the Settings gear, BUG-208)
    'along-path': AlongPathIcon, // Along Path tab (was the Settings gear, BUG-208)
    templates: LayoutTemplate, // Templates tab (was a plain grid, same as the grid toggle)
    'brush-settings': BrushSettingsIcon, // Draw panel (was a pencil, same as the Pencil tool)
    'brush-tool': BrushToolIcon, // Brush tool + rail (2026-11-16 (2))
    'canvas-grid': CanvasGridIcon, // header grid options (2026-11-16 (2))
    'fill-on': FillOnIcon, // footer fill / stroke toggles (2026-11-16 (2))
    'fill-none': FillNoneIcon,
    'fill-add': FillAddIcon,
    'fill-remove': FillRemoveIcon,
    'stroke-on': StrokeOnIcon,
    'stroke-none': StrokeNoneIcon,
    'stroke-add': StrokeAddIcon,
    'stroke-remove': StrokeRemoveIcon,
    'paint-bucket': PaintBucket,
    'spray-can': SprayCan,
    'spray-pattern': SprayPatternIcon,
    'copy-spray': CopySprayIcon,
    lasso: LassoSelect,
    drafter: DrafterIcon,
    symmetry: SymmetryIcon,
    'symmetry-radial': SymmetryRadialIcon,
    'symmetry-point': SymmetryPointIcon,
    kaleidoscope: KaleidoscopeIcon,
    reflect: FlipHorizontal2,
    'color-wheel': ColorWheelIcon,
    'g-pen': GPenIcon,
    'pen-line': PenLine,
    brush: Brush,
    flame: Flame,
    cloud: Cloud,
    sparkles: Sparkles,
    leaf: Leaf,
    droplets: Droplets,
    waves: Waves,
    wind: Wind,
    zap: Zap,
    feather: Feather,
    blend: Blend,
    stamp: Stamp,
    sun: Sun,
    // notes (2026-11-17)
    note: MessageSquareText,
    pin: Pin,
    'pin-off': PinOff,
    reply: Reply,
    'list-checks': ListChecks,
    'circle-check': CircleCheck,
    'check-empty': Square,
    'check-done': SquareCheck,
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
