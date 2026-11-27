/**
 * Every help topic, as data, so search can reach every line. Write only what the editor does today:
 * `__tests__/helpTopics.test.ts` fails on a panel without a topic and on known false claims.
 * Key marks are written in backticks and rendered as key caps: `mod+shift+U` (mod = ⌘ or Ctrl).
 */
import type { IconName } from '@/components/atoms/Icon';

export const HELP_GROUPS = [
    'Get started',
    'Tools',
    'Organize',
    'Effects',
    'Finish',
    'Reference',
] as const;

export type HelpGroup = (typeof HELP_GROUPS)[number];
export type HelpDemo =
    | 'node'
    | 'brushes'
    | 'shapes'
    | 'grid'
    | 'radial'
    | 'path'
    | 'filters'
    | 'animate'
    | 'export'
    | 'shortcuts';

export interface HelpSection {
    title: string;
    text?: string;
    items?: string[];
}

export interface HelpTopic {
    id: string;
    group: HelpGroup;
    title: string;
    icon: IconName;
    summary: string;
    /** Extra search words people may use. */
    keywords?: string;
    /** What the "open in the editor" button opens. */
    open?: { panel?: string; tab?: string; label: string };
    demo?: HelpDemo;
    sections: HelpSection[];
    related?: string[];
}

export const SHORTCUTS_TOPIC: HelpTopic = {
    id: 'shortcuts',
    group: 'Reference',
    title: 'Keyboard Shortcuts',
    icon: 'grip',
    summary:
        'Every key in the editor. Press a key to see what it does, or practice until they stick.',
    keywords: 'hotkeys keys keyboard commands cheat sheet',
    demo: 'shortcuts',
    sections: [],
    related: ['select', 'top-bar'],
};

export const HELP_TOPICS: HelpTopic[] = [
    {
        id: 'basics',
        group: 'Get started',
        title: 'Saving and Boards',
        icon: 'floppy-disk',
        summary: 'How your work is saved, opening files, and the two kinds of board.',
        keywords: 'autosave save open import upload file backup whiteboard design mode freehand',
        sections: [
            {
                title: 'Your work saves itself',
                items: [
                    'Every change is saved automatically in this browser, so you can close the tab and carry on later',
                    'Nothing is uploaded: your boards stay on this device',
                    "Clearing this browser's site data deletes them, so keep a file of anything important",
                ],
            },
            {
                title: 'Save and open files',
                items: [
                    '`mod+S` downloads the whole project (every page) as a .fateboard file',
                    '`mod+O` opens a .fateboard or .json board, or brings a PNG, JPEG, WebP or SVG onto the page',
                    '`mod+N` starts a new board',
                ],
            },
            {
                title: 'Design page or whiteboard',
                items: [
                    'Design is a fixed page with rulers. Choose its size in Settings > Canvas',
                    'Whiteboard is an endless canvas with no page edges',
                    'Switch with Settings > Canvas > Freehand',
                ],
            },
            {
                title: 'Undo',
                items: [
                    '`mod+Z` undoes and `mod+shift+Z` redoes',
                    'Each page keeps its own history of the last 20 steps',
                ],
            },
            {
                title: 'Screen size',
                text: 'The editor is built for a desktop or laptop. On a phone you get a notice, and Continue anyway opens it regardless.',
            },
        ],
        related: ['pages', 'export', 'settings'],
    },

    /* ------------------------------- tools ------------------------------- */
    {
        id: 'select',
        group: 'Tools',
        title: 'Select',
        icon: 'arrow-pointer',
        summary: 'Pick things up, move them, resize and rotate them.',
        keywords: 'selector pointer move resize rotate marquee multiple arrow',
        sections: [
            {
                title: 'Choose what to work on',
                items: [
                    'Press `V` or pick Select in the left rail',
                    'Click an object to select it',
                    '`shift` + click adds another object to the selection',
                    'Drag across an empty area to draw a selection box',
                    '`mod+A` selects everything except locked and hidden objects',
                    'Right-click for copy, paste, group, lock and more',
                ],
            },
            {
                title: 'Move, resize, rotate',
                items: [
                    'Drag an object to move it',
                    'Arrow keys nudge it 1 px at a time, and `shift` makes it 10 px',
                    'Drag a corner handle to resize: proportions stay the same',
                    'Hold `shift` on a corner to resize freely',
                    'Hold `alt` to resize from the center',
                    'Drag the rotate handle to turn it',
                    'Top bar fields set an exact X, Y, W, H and R. The anchor picker chooses the point they measure from',
                ],
            },
            {
                title: 'Double-click',
                items: [
                    'On a shape: edit its nodes',
                    'On a text shape or sticky note: type inside it',
                    'On a text box: edit its text',
                ],
            },
            {
                title: 'Remove and copy',
                items: [
                    '`Delete` or `Backspace` removes the selection',
                    '`mod+D` duplicates it on top of the original',
                    '`mod+C`, `mod+X` and `mod+V` copy, cut and paste',
                ],
            },
        ],
        related: ['arrange', 'node', 'clones'],
    },
    {
        id: 'hand',
        group: 'Tools',
        title: 'Hand',
        icon: 'hand',
        summary: 'Move around the board without touching anything on it.',
        keywords: 'pan navigate scroll zoom move view wheel trackpad pinch',
        sections: [
            {
                title: 'Move the view',
                items: [
                    'Press `H` or pick Hand in the left rail',
                    'Drag anywhere to move the view',
                    'Scroll with the mouse wheel or trackpad to move the board (`shift` + wheel moves sideways), with any tool',
                    'Press `V` to go back to Select',
                    'Hold `Space` to drag the view from the Select or Draw tool. Let go and you are back where you were, with your selection intact',
                ],
            },
            {
                title: 'Zoom from anywhere',
                items: [
                    '`mod` + wheel, or a trackpad pinch, zooms at the pointer',
                    '`mod+=` zooms in and `mod+−` zooms out',
                    '`mod+0` fits the board to the screen',
                    '`mod+1` shows it at actual size',
                    'The footer has the same controls',
                ],
            },
        ],
        related: ['top-bar', 'select'],
    },
    {
        id: 'node',
        group: 'Tools',
        title: 'Node Tool',
        icon: 'node-tool',
        summary: 'Reshape shapes and drawn paths by moving their nodes and curve handles.',
        keywords: 'bezier curve anchor point path vector edit reshape pen',
        demo: 'node',
        sections: [
            {
                title: 'What is a node?',
                text: 'Every outline is made of nodes (anchor points) joined by straight or curved segments. The Node tool lets you reshape any shape or drawn path by moving its nodes and their curve handles.',
            },
            {
                title: 'Start editing',
                items: [
                    'Pick the Node tool in the left rail (shortcut `A`)',
                    'Click a shape or a drawn path: its nodes appear (a shape that was already selected opens right away)',
                    'Click another shape to edit that one instead',
                    'From the Select tool, double-click a shape to edit its nodes; when you finish you are back in Select',
                    'Works on every shape in the Shapes panel (text shapes and sticky notes too: you reshape the outline, the text stays inside), lines and drawn paths',
                ],
            },
            {
                title: 'Edit nodes',
                items: [
                    'Drag a node to move it; its curve handles move with it',
                    'Drag a round handle to bend the curve next to the node',
                    'Double-click the outline to add a node (the shape does not change until you move it)',
                    'Double-click a node, or press `Delete` / `Backspace`, to remove it',
                    '`alt` + click a node to switch between a sharp corner and a smooth curve',
                    '`alt` + drag a handle to bend one side only; `shift` keeps a drag straight or at 45°',
                    'Arrow keys nudge the selected node (`shift` = 10 px)',
                ],
            },
            {
                title: 'Node toolbar',
                text: 'While you edit, a bar floats above the shape. Every button acts on the selected node.',
                items: [
                    'Add node / Delete node',
                    'Corner node (handles move on their own) or Smooth node (handles stay in line)',
                    'Straight segments / Curved segments on both sides of the node',
                    'Close path (join the two ends) or Open path at the node; Break path splits a path at the node',
                    'X / Y: type an exact position for the node',
                    'Cancel undoes every change since you started; Done keeps them',
                ],
            },
            {
                title: 'Finish',
                items: [
                    'Press `Enter` or Escape, or click an empty spot, to finish: the change is kept',
                    'Press Escape again, `V`, or pick another tool to go back to Select (`H` = Hand)',
                    'A shape you edit becomes a path. It keeps its name, colors and layer position',
                ],
            },
        ],
        related: ['select', 'draw', 'shapes', 'boolean'],
    },
    {
        id: 'pen',
        group: 'Tools',
        title: 'Pen',
        icon: 'pen-tool',
        summary:
            'Draw exact lines and curves point by point, like the pen in Figma or Illustrator.',
        keywords:
            'pen bezier vector path curve anchor point polygon outline curvature freeform arrow dashed',
        sections: [
            {
                title: 'Draw a path',
                items: [
                    'Pick the Pen in the left rail (shortcut `P`)',
                    'Click to place a corner point',
                    'Click and drag to place a smooth point: the drag pulls out its curve handles',
                    'Click the first point again to close the shape (the first point grows when you are on it)',
                    'Hold `shift` to keep the next segment (or the handle you drag) at 0°, 45° or 90°',
                    'Hold `alt` while dragging to move only the outgoing handle: a sharp curve corner',
                    'Press `Enter`, `Escape` or double-click to finish an open path',
                    '`Backspace` removes the last point while you draw',
                    'Click an end of an open path to keep drawing it (it stays one object)',
                ],
            },
            {
                title: 'Options bar',
                items: [
                    'While the Pen is active, the row under the top toolbar shows its options',
                    'Mode: Pen (click and drag points), Curvature (click; the curve bends smoothly through your points, `alt` + click = sharp corner) or Freeform (drag to draw by hand; it becomes an editable path)',
                    'Stroke: click the swatch, then pick a color in the palette; Width sets the outline',
                    'Stroke style: line ends (round, square, flat), corners (round, sharp, bevel), dashes and arrowheads; the button shows a preview',
                    'Path shape (like Inkscape): Triangle in, Triangle out or Ellipse turn an open path into one filled outline that is thin and thick along its length; Thickness sets the widest part',
                    'Fill: turn it on to fill closed shapes (open paths are never filled)',
                    'The hint on the right counts your points and lists the keys',
                ],
            },
            {
                title: 'After drawing',
                items: [
                    'The path is selected in the Select tool; it is one undo step',
                    'It uses the options bar stroke and fill: recolor it later with the palette or the footer',
                    'Edit its points later with the Node tool (`A`)',
                    'Picking another tool keeps a path that has two points or more',
                ],
            },
        ],
        related: ['node', 'pencil', 'shapes'],
    },
    {
        id: 'pencil',
        group: 'Tools',
        title: 'Pencil',
        icon: 'pencil-line',
        summary: 'Sketch freehand lines quickly, without opening the Draw panel.',
        keywords: 'pencil freehand sketch line draw scribble pressure stylus straight close',
        sections: [
            {
                title: 'Sketch',
                items: [
                    'Pick the Pencil in the left rail (shortcut `shift+P`)',
                    'Drag on the board to draw a smooth line; draw as many as you like',
                    'It draws in the drawing color; the palette changes it',
                    'Hold `shift` while drawing for a straight line',
                    'End a line near where it started and it closes into a shape (Auto-close)',
                    'Each line is one undo step and can be reshaped with the Node tool',
                ],
            },
            {
                title: 'Options bar',
                items: [
                    'While the Pencil is active, the row under the top toolbar shows its options',
                    'Size, Opacity and Smoothing (higher = steadier line)',
                    'Pressure: a stylus (Apple Pencil, Wacom) makes the line thinner or thicker; a mouse keeps one width',
                    'Auto-close: turn it off to keep loops open',
                    "These settings are the Pencil's own; brushes and effects stay in Draw",
                ],
            },
        ],
        related: ['draw', 'pen', 'node'],
    },
    {
        id: 'laser',
        group: 'Tools',
        title: 'Laser pointer',
        icon: 'laser-pointer',
        summary:
            'Point things out while you present or share your screen. Nothing is drawn on the board.',
        keywords: 'laser pointer present presentation highlight point show',
        sections: [
            {
                title: 'Point',
                items: [
                    'Pick the Laser pointer in the left rail (shortcut `K`)',
                    'Drag on the board: a red trail follows and fades away after a second',
                    'The trail is never saved, never exported and never added to undo',
                    'Press `Escape` or `V` to go back to Select',
                ],
            },
        ],
        related: ['hand', 'select'],
    },
    {
        id: 'bucket',
        group: 'Tools',
        title: 'Paint bucket',
        icon: 'paint-bucket',
        summary: 'Fill a closed shape, or any area your lines enclose, with one click.',
        keywords: 'paint bucket fill flood fill color area region gap tolerance coloring book',
        sections: [
            {
                title: 'Fill',
                items: [
                    'Press `G` or pick Paint bucket in the left rail, choose a color in its top bar and click',
                    'Auto: a closed shape under the click takes the color; an area enclosed by strokes, lines or shapes gets a new fill shape',
                    'Area always fills the enclosed area; Shape only recolors shapes',
                    'The fill goes under the lines around it, so they stay on top (On top puts it above everything)',
                ],
            },
            {
                title: 'Gaps and edges',
                items: [
                    'Gap closes small openings in your line art so the fill does not leak out',
                    'Tolerance sets how different a color may be and still count as the same area',
                    'Expand pushes the fill a little under the lines, so no thin white rim shows',
                    'On the whiteboard an area open to the edge of the view is not filled: close it, or raise Gap',
                ],
            },
        ],
        related: ['lasso', 'color', 'draw'],
    },
    {
        id: 'spray',
        group: 'Tools',
        title: 'Spray',
        icon: 'spray-can',
        summary: 'A spray can: paint builds up while you hold still.',
        keywords: 'spray can airbrush graffiti paint mist particles flow nozzle',
        sections: [
            {
                title: 'Spray',
                items: [
                    'Press `Shift+B` or pick Spray in the left rail and drag on the board',
                    'Hold the pointer still to build up paint, like a real can',
                    'Size is the nozzle; Flow how much paint per second; Particle the size of each drop',
                    'Softness makes the spray denser in the middle and fainter at the edge',
                    'More spray brushes (fine mist, coarse spray, glitter, dust) are in Brush > Spray',
                ],
            },
        ],
        related: ['brush', 'draw'],
    },
    {
        id: 'copySpray',
        group: 'Tools',
        title: 'Copy spray',
        icon: 'copy-spray',
        summary:
            'Spray copies of the selected objects along a drag: leaves, stars, confetti, crowds.',
        keywords:
            'copy spray symbol sprayer scatter duplicate clone stamp repeat confetti pattern random',
        sections: [
            {
                title: 'Spray copies',
                items: [
                    'Select one or more objects, then press `Shift+S` (or pick Copy spray in the left rail)',
                    'Drag on the board: copies of the selection land along the drag; a click places one copy',
                    'Each drag becomes one group named "Copy spray": one row in Layers and one undo step. Ungroup it to edit single copies',
                    'It keeps spraying what was selected when you chose the tool. To spray something else, press `V`, select it and press `Shift+S` again',
                    '`Esc` goes back to the Select tool',
                ],
            },
            {
                title: 'Settings',
                items: [
                    'Size is the copy size (100 % = the selection); Spacing the gap between copies along the drag',
                    'Spread scatters copies around the pointer (0 % = exactly on the drag)',
                    'Size, Rotation and Opacity jitter make every copy a little different',
                    'Align to stroke turns the copies to follow the direction you drag',
                    'One drag adds at most 400 objects (copies × the objects in the selection, counting those inside groups) and 30 photos',
                ],
            },
        ],
        related: ['spray', 'select', 'layers'],
    },
    {
        id: 'lasso',
        group: 'Tools',
        title: 'Lasso',
        icon: 'lasso',
        summary: 'Select objects by drawing a loop around them, or fill the loop.',
        keywords: 'lasso freehand selection loop select fill marquee',
        sections: [
            {
                title: 'Select',
                items: [
                    'Press `L` or pick Lasso in the left rail and draw a loop',
                    'Touching picks everything the loop touches; Inside only picks objects fully inside',
                    'Hold `Shift` to add to the selection and `Alt` to remove from it',
                    'After the loop the Select tool is back, so you can move the selection right away',
                ],
            },
            {
                title: 'Fill',
                text: 'With Fill, the loop becomes a filled shape in the drawing color.',
            },
        ],
        related: ['select', 'bucket'],
    },
    {
        id: 'drafter',
        group: 'Tools',
        title: 'Drafter',
        icon: 'drafter',
        summary:
            'A drafting machine: precise lines at set angles, with length and angle as you draw.',
        keywords:
            'drafter drafting machine technical drawing protractor angle ruler line parallel perpendicular dimension construction mechanical cad iso pen',
        sections: [
            {
                title: 'Draw lines',
                items: [
                    'Press `D` or pick Drafter in the left rail and drag from a point',
                    'The line snaps to the protractor steps (1° to 90°); hold `Alt` for any angle',
                    'Head turns the drafting head: steps count from that angle',
                    'The head shows the length in your units (Settings > Units) and the angle like a protractor',
                    'Starts snap to the ends of lines nearby; Pen width uses ISO technical pen sizes',
                ],
            },
            {
                title: 'Modes',
                items: [
                    'Parallel and Perpendicular follow the selected line (or the last one you drew)',
                    'Dimension draws a measured dimension line with arrows and the length',
                    'Construction line draws a light dashed guide line',
                    'Press `Escape` to go back to Select',
                ],
            },
        ],
        related: ['pen', 'settings'],
    },
    {
        id: 'brush',
        group: 'Tools',
        title: 'Brush',
        icon: 'brush-tool',
        summary:
            'Over 80 brushes in categories (sketching, inking, manga, painting, watercolor, airbrush, texture, spray, fire, smoke, sparkle, nature, calligraphy), each with its own settings.',
        keywords:
            'brush paintbrush picker calligraphy pen nib thinning fixation angle caps inkscape paint manga g-pen maru screentone hatching fire ember smoke steam fog sparkle glitter leaves grass watercolor airbrush charcoal pencil texture category settings pressure taper',
        open: { panel: 'brush', label: 'Open Brush' },
        sections: [
            {
                title: 'Pick and paint',
                items: [
                    'Press `B` or pick Brush in the left rail: each tile shows a sample stroke drawn by the brush itself',
                    'Pick a category (Fire & light, Smoke & air, Manga & comics, ...) or type in Search brushes',
                    'Click a tile and drag on the board. A stylus changes size and opacity with pressure',
                ],
            },
            {
                title: 'Brush settings',
                text: 'Library brushes show their settings under the tiles. Changes stay with that brush and apply to your next stroke; Reset goes back to the original.',
                items: [
                    'Tip: shape, hardness, roundness, angle, follow the stroke, wet edges',
                    'Stroke: spacing, flow, scatter and how many dabs each step',
                    'Dynamics: size and opacity jitter, pressure, speed, tapers, grow and rise (smoke)',
                    'Color: fire, gradient or rainbow color, second color, hue and lightness jitter',
                    'Texture & glow: paper grain, manga screentone, glow and how dabs blend',
                    'Strokes stay sharp when you zoom: each one is redrawn from the points you drew',
                ],
            },
            {
                title: 'Calligraphy pen',
                text: "A flat nib like Inkscape's Calligraphy tool. Its options show in the top bar while you paint with it.",
                items: [
                    'Width: the nib size',
                    'Thinning: fast strokes get thinner (negative values make them thicker)',
                    'Angle: the nib angle; Fixation 100% keeps it, 0% turns the nib across every stroke',
                    'Caps: round ends',
                ],
            },
        ],
        related: ['draw', 'pencil'],
    },
    {
        id: 'draw',
        group: 'Tools',
        title: 'Draw',
        icon: 'brush-settings',
        summary: 'Freehand brushes, from a clean pen to chalk, neon and spray.',
        keywords: 'pencil brush pen marker sketch freehand eraser highlighter mirror symmetry',
        open: { panel: 'draw', label: 'Open Draw' },
        demo: 'brushes',
        sections: [
            {
                title: 'Draw',
                items: [
                    'Pick Draw in the left rail, choose a brush and drag on the board',
                    '`[` and `]` change the brush size',
                    'Hold `shift` while drawing for a straight line',
                    'Press `V` to go back to Select. Strokes are normal objects you can move, resize and reshape',
                ],
            },
            {
                title: 'Brush settings',
                text: 'Which settings appear depends on the brush.',
                items: [
                    'Size, opacity and blend mode',
                    'Smoothing irons out a shaky hand',
                    'Line ends, corners and line style: solid, dash, dots or dash-dot',
                    'Taper at ends and nib angle for a calligraphy look',
                    'Shadow and glow, with Use brush color for a neon glow',
                ],
            },
            {
                title: 'Eraser',
                items: [
                    'Pixel erases only where you rub',
                    'Whole stroke removes an entire stroke at a touch',
                ],
            },
            {
                title: 'Drawing aids',
                items: [
                    'Straight lines keeps every stroke straight',
                    'Mirror drawing repeats you left-right, top-bottom or 4-way',
                    'Fill the drawn shape: draw a closed loop and it is filled',
                ],
            },
        ],
        related: ['node', 'color', 'layers'],
    },
    {
        id: 'shapes',
        group: 'Tools',
        title: 'Shapes and Connectors',
        icon: 'shapes',
        summary: 'A library of shapes, arrows that stay attached, and your own custom shapes.',
        keywords:
            'rectangle circle arrow star callout sticky note flowchart line connector custom svg',
        open: { panel: 'shapes', label: 'Open Shapes' },
        demo: 'shapes',
        sections: [
            {
                title: 'Add a shape',
                items: [
                    'Open Shapes in the left rail and click a shape to place it on the board',
                    'Search by name, or filter by category',
                    'Text shapes and sticky notes hold text: double-click to type',
                    'Lines and curves are there too. A plain line is drawn by dragging on the board; Escape cancels it',
                    'The 3D category has a cube, box, cylinder, cone, sphere, pyramid, prisms and a torus. Their edges are the stroke, so keep a stroke on to see the depth',
                ],
            },
            {
                title: 'Connectors',
                items: [
                    'The Connectors tab has simple, elbow and smooth connectors',
                    'Drag an end onto a shape to attach it. Dots show the points it can attach to',
                    'Attached connectors follow the shape when it moves',
                    'Select one to set its arrowheads (none, end or both), color, dashes and width',
                    'Drag the bend handle to curve it, double-click that handle to straighten it again',
                ],
            },
            {
                title: 'Make your own',
                items: [
                    '+ New shape saves a selected path, polygon, rectangle, circle or triangle',
                    'Or paste SVG path data',
                    'Allow text inside makes it a text shape',
                    'Saved shapes appear under My Shapes, in this browser',
                ],
            },
        ],
        related: ['node', 'boolean', 'fill-shadow', 'color'],
    },
    {
        id: 'text',
        group: 'Tools',
        title: 'Text',
        icon: 'font',
        summary: 'Headings, body text, and styling down to letter spacing and outlines.',
        keywords: 'font typography label heading bold italic underline align highlight outline',
        open: { panel: 'text', label: 'Open Text' },
        sections: [
            {
                title: 'Add text',
                items: [
                    'Clicking Text in the left rail adds a text box to the page',
                    'The panel also adds a ready-made heading, subheading or body text',
                    'Click outside the box to finish typing',
                ],
            },
            {
                title: 'Style it',
                items: [
                    'A bar floats above selected text with font, size, style and alignment',
                    '`mod+B`, `mod+I` and `mod+U` set bold, italic and underline',
                    'The panel adds strikethrough, UPPERCASE, lowercase and Title Case',
                    'Letter spacing and line height',
                    'Color, highlight, outline, shadow and opacity',
                ],
            },
            {
                title: 'Font pairings',
                text: 'Font Templates in the right dock apply a ready-made set of fonts to your text in one click.',
            },
        ],
        related: ['font-templates', 'color', 'shapes'],
    },
    {
        id: 'color',
        group: 'Tools',
        title: 'Color',
        icon: 'palette',
        summary:
            'The palette strip, custom colors, harmonies, color formats and what gets painted.',
        keywords:
            'swatch palette eyedropper hex recent fill stroke picker harmony complementary analogous triadic split monochromatic rgb hsl hsb cmyk copy',
        sections: [
            {
                title: 'Paint an object',
                items: [
                    'Select an object and click a swatch in the strip on the right',
                    'The Fill and Stroke tiles in the footer choose which of the two gets the color',
                ],
            },
            {
                title: 'Any color',
                items: [
                    'All colors opens the full grid',
                    'Custom color opens the picker: drag in the square, type a hex value, or use its eyedropper to pick a color from anywhere on the screen (in browsers that support it)',
                    'Wheel switches the picker to a color wheel: turn the hue on the ring, set saturation and brightness in the square inside, and pick a harmony (Complement, Analogous, Triad, Split) to see its colors on the ring; click one to use it',
                    'Recent colors keeps what you just used',
                ],
            },
            {
                title: 'Colors that go together',
                text: 'The custom color picker and the Color harmony section of Fill & Shadow show the harmonies of the current color: Complementary (high contrast), Analogous (calm), Triadic (colorful but balanced), Split-complementary (contrast, less harsh) and Monochromatic (always safe). Click a color to use it.',
            },
            {
                title: 'Color formats',
                text: 'In the custom color picker, switch between HEX, RGB, HSL, HSB and CMYK to type the color in that format; the button under the fields copies it, ready to paste.',
            },
            {
                title: 'Colors inside panels',
                text: 'To color something a panel owns (text, brush, connector, page, filters), click its swatch in the panel, then pick in the strip.',
            },
        ],
        related: ['fill-shadow', 'settings'],
    },

    /* ----------------------------- organize ------------------------------ */
    {
        id: 'pages',
        group: 'Organize',
        title: 'Pages',
        icon: 'file-lines',
        summary: 'Many pages in one project, each with its own background and history.',
        keywords:
            'slides multi page thumbnail duplicate background margin bleed slug crop marks trim page edge column facing spread master page number fit width',
        open: { panel: 'Pages', label: 'Open Pages' },
        sections: [
            {
                title: 'Page setup (bottom of the panel)',
                items: [
                    'Margins, columns, bleed and slug. Show guides (on by default) draws margins magenta, columns violet, the bleed red and the slug blue; guides are never exported',
                    'The bleed and slug frames sit outside the page edge; art that runs past the edge is not shown there on the board, but it is exported with the bleed',
                    'Show crop marks draws the trim lines at the page corners. In Export, turn off Crop to content and turn on Crop marks to add the bleed, slug and marks to the file',
                    'Facing pages: book spreads, inside margins at the spine, page 1 on the right',
                    'Fit width (`mod+alt+0`, the footer button next to Fit) fills the board with the page width: handy for tall portrait pages',
                    'This page is a master page: its content is drawn under every page that uses it',
                    'Master page: pick the master for the open page; edit a master by opening it',
                    'Insert page number adds a text that always shows the page number (masters are not counted)',
                ],
            },
            {
                title: 'Work with pages',
                items: [
                    'Add page creates a blank one',
                    'Click a thumbnail to open that page',
                    '`Page Up` and `Page Down` move between pages',
                    'Drag thumbnails to reorder them',
                    'Double-click a name to rename it',
                    'Duplicate or delete from each page row',
                ],
            },
            {
                title: 'Each page',
                items: [
                    'Page background sets its color',
                    'Clear page empties it, after asking you first',
                    'Undo stays on its own page and never brings another page in',
                ],
            },
        ],
        related: ['layers', 'settings', 'basics'],
    },
    {
        id: 'characters',
        group: 'Tools',
        title: 'Characters',
        icon: 'character',
        summary:
            'Make a rigged character, pose it from any angle, put up to five in a scene with a background, and place it on the page.',
        keywords:
            'character studio person people manga webtoon anime pose rig body cast avatar figure kid elder emotion face expression eyes mouth lip sync scene background place classroom city park perspective camera group',
        open: { panel: 'characters', label: 'Open Characters' },
        sections: [
            {
                title: 'Make a character',
                items: [
                    'Open Characters in the left rail, then Open Character Studio, or pick someone from the cast',
                    'Body style: Classic or Manga (7.5–8 heads tall with long legs; shonen, shojo or webtoon), with a side-by-side preview. It works with every art style. Body: age, gender, height, body fat, muscle, shoulders, hips, arm, leg and neck length, skin tone',
                    'Children get bigger heads for their size; elders stoop a little and their hair greys unless you pick its colour',
                    'Look: 44 hairstyles (short, medium, long, tied up, curly, older), hair colour and an optional second colour for the tips, eyes, brows, nose, mouth, eye colour, 51 tops (T-shirt, polo, shirt, sweater, hoodie, jacket, kurta, lab coat, raincoat, sherwani and more) and 42 bottoms (trousers, jeans, shorts, leggings, churidar, dhoti, palazzo, skirts and a lehenga) with their colours',
                    'Wardrobe: 76 outfit presets (everyday, school, work, traditional, sports, weather, party, army and combat, combat sports: boxing, Muay Thai, MMA, BJJ gi with belt colours), 13 kinds of shoes, and 34 accessories (glasses, caps, hats, berets, army helmet, scarf, tie, jewellery, watch, belt, backpack, apron, boxing and MMA gloves, hand wraps, mouthguard, head guard, mongkol, prajioud, ankle wraps, gi belt). Things that do not go together are kept apart and the studio says why',
                    'In the hands: a katana, sword, knife, bamboo staff, torch, bat, rifle or boxing gloves, in either hand. They follow the arms in every pose and from every side',
                    'Hands have real fingers and a thumb that bend with the hand shape; joints (shoulders, elbows, knees, ankles), chest or bust and hips show their shape from every side',
                    'Click a part of the character to select it, then change its colour on the right',
                    'Surprise me makes a new random person; `mod+Z` undoes studio changes',
                    'Art style: 19 looks, from Cartoon, Anime, Webtoon, Manga B/W (black, white and screentone) and Realistic to Chibi, Noir, Cyberpunk, Watercolor, Flat vector, Pencil sketch, Stick figure and more. Only the look changes; switch back any time',
                ],
            },
            {
                title: 'Face',
                items: [
                    'Face tab: 20 emotions (happy, laughing, sad, crying, angry, surprised, scared, embarrassed and more); Strength blends from the resting face to the full emotion',
                    'Look left / right and up / down move the eyes; Look straight ahead resets them. Eyes closed holds a blink',
                    'Mouth shape (M, A, E, I, O, U, F, TH) is for lip sync; Rest leaves the mouth to the emotion',
                    'Eyes, brows and mouth hide when they turn away from you, so a character seen from behind has no face',
                ],
            },
            {
                title: 'Pose and camera',
                items: [
                    'Poses: 278 poses (standing, gestures, walk and run, sitting, fight, sports, emotion, daily life, dance, work, lying down, action, boxing, Muay Thai and army). Search by name or tag',
                    'In a scene with two or more people, Together gives contact poses (hug, handshake, arm round a shoulder, high-five) that fit the heights of both people',
                    'Every pose fits every body: feet stay on the floor for a child, an adult or an elder',
                    'Mirror flips the pose left to right',
                    'Turn the camera all the way round, tilt it, and pick a shot: full body, knee, waist, bust or close-up',
                ],
            },
            {
                title: 'On the page',
                items: [
                    'Place on page puts the character, as the camera sees it, in the middle of the view',
                    'Select a character on the page and open the studio to edit it; Update on page keeps its place and size',
                    'Save to my characters keeps a character to use again in any project',
                ],
            },
            {
                title: 'Scenes',
                items: [
                    'New scene (Characters panel), or Scene at the top of the studio: your character stands in a place',
                    'Save to my scenes (top bar) keeps the scene for every project; Start › Your scenes opens it again, over the scene you are editing (Undo brings that back); saving again updates it',
                    'Start: 30 ready scenes (class photo, picnic, rooftop talk, temple festival, team photo, neon city and more); pick one and change anything, Undo brings your scene back',
                    'Place: 13 places (studio, classroom, room, school yard, road, city street, market, rooftop, park, river, jungle, temple, stadium), each with looks; Rearrange the place shuffles trees, people and buildings',
                    'Time of day, weather and season light the place and the characters with one light. Crowd (Place tab) adds up to 80 simple people standing in the background; the same crowd every time',
                    'Same style for everyone (Cast tab) keeps all characters in one art style, also new ones; switch it off to give one character its own style',
                    'Cast: add up to 5 characters, Edit character opens one in Character mode (changes come back to the scene), Facing and Looks at turn them',
                    'Group: Class photo puts the tallest at the back; Conversation, Face to face, V shape, Circle and more arrange everyone at once',
                    'Drag a character on the stage to walk it on the ground; arrow keys move the selected one, [ and ] turn it',
                    'Camera: Front, ¾ corner, Side, Back, High angle, Bird’s-eye, Worm’s-eye, Isometric, Over the shoulder and Point of view; or turn, tilt, raise it and change the lens',
                    'Frame: wide, square, phone or cinema shapes, rounded or round corners, a border. Export (Frame tab): Download layers (ZIP) gives the place, each character and the frame as separate pictures that line up exactly, plus the whole picture as a PNG (1920 px wide), a PDF (one page, the size of the frame) or an SVG, and the scene file (JSON) to open later',
                    'Place scene on page puts the picture on the page as one object; select it and Edit it later, Update scene on page keeps it in place',
                ],
            },
        ],
        related: ['comic', 'layers'],
    },
    {
        id: 'scene-objects',
        group: 'Tools',
        title: 'Scene Objects',
        icon: 'scene-objects',
        summary:
            'Manga scenery to drop on the page: 18 categories, from nature, buildings and a classroom to manga symbols, animals, fantasy items and full-panel backdrops.',
        keywords:
            'scene objects props library scenery background manga anime tree sakura pine bush grass flower rock mountain river pond cloud sun moon star rain snow lightning rainbow birds speed lines car bike bicycle cycle motorbike bus train taxi table chair sofa bed desk cup mug plate bowl ramen bento street light lamp traffic signal vending machine bench sign house village city building apartment skyscraper shop konbini school shrine castle classroom blackboard school desk locker randoseru sweat drop anger vein sparkles blush heart speech bubble thought bubble zzz manpu effects torii lantern daruma maneki neko onigiri kotatsu futon shoji fireworks sakura cat dog bird animal cake parfait bubble tea takoyaki burger sports ball soccer basketball baseball tennis trophy sword shield potion magic slime isekai fantasy phone laptop game console tv headphones snowman christmas halloween tanabata festival yatai station railway crossing road bridge airplane ship backdrop background sky sunset night hallway rooftop beach focus lines speed lines drag drop',
        open: { panel: 'sceneObjects', label: 'Open Scene Objects' },
        sections: [
            {
                title: 'Add a scene object',
                items: [
                    'Open Scene Objects in the left rail and pick a category: Nature, Sky, Vehicles, Furniture, Kitchen, Street, Buildings, Classroom, Effects, Japan, Animals, Food, Sports, Fantasy, Tech, Seasons, Travel or Backdrops',
                    'Backdrops are whole panel plates (skies, classroom, hallway, rooftop, street, beach, and manga flower, bubble, sparkle, focus-line and speed-line backgrounds): scale one to the panel and send it to the back',
                    'Effects are the manga symbols drawn next to a character: sweat drop, anger vein, sparkles, blush, tears, gloom lines, Zzz, and empty speech, thought and shout bubbles',
                    'Click a card to add it in the middle of the view, or drag the card onto the page to drop it where you want',
                    'Search looks through every category (try “cloud”, “bike”, “chair” or “street light”)',
                    'Signs and bubbles carry no lettering: add the words with the Text tool',
                ],
            },
            {
                title: 'Favorites, recent and your own props',
                items: [
                    'The star on a card adds it to Favorites; Favorites and Recent (the last 12 you added) come first in the category row',
                    'My props: Import SVG or PNG adds your own drawings (scripts and outside links are removed; a big PNG is made smaller). Click or drag them like any prop',
                    'Export pack saves all your props in one file to share; Import pack adds the props from a pack someone sent you',
                ],
            },
            {
                title: 'Style the selected object',
                items: [
                    'Select a scene object to see its settings at the top of the panel: Variant (other shapes, like a tall tree or a chair from the side), a colour for each part, Outline colour and width',
                    'Screentone turns it black and white like a manga page: light parts become paper, dark parts ink, the middle Dots, Lines or a Gradient; Tone density sets how dark',
                    'Shadow adds a soft shadow under it; Randomize picks another variant or colour',
                    'Trees, bushes, grass and flowers have Add wind sway, clouds Add drift: a looping animation on the timeline',
                ],
            },
            {
                title: 'Scenes, time of day and the ground line',
                items: [
                    'Scenes (Classroom, Rooftop, Forest, Street) place a whole set on three new layers: Background, Midground and Foreground',
                    'Time of day (Day, Sunset, Night) recolours every scene object on the page at once; new ones follow it',
                    'Snap to ground line: props you drag near the line stand on it; Ground line sets its height on the page',
                ],
            },
            {
                title: 'Work with it',
                items: [
                    'A scene object is one object: move, scale, turn, flip, layer, lock, group and animate it like any other',
                    'It saves with the page, and Undo removes it in one step (a restyle, a scene or a time-of-day change is one step too)',
                    'Clean ink outlines and flat colours, drawn as vectors: it stays sharp at any size',
                ],
            },
        ],
        related: ['comic', 'characters', 'layers'],
    },
    {
        id: 'comic',
        group: 'Tools',
        title: 'Comic',
        icon: 'comic-panels',
        summary: 'Manga and comic pages: panel layouts, balloons, screentones and effect lines.',
        keywords:
            'manga comic panel frame koma balloon bubble tone screentone speed focus lines burst',
        open: { panel: 'comic', label: 'Open Comic' },
        sections: [
            {
                title: 'Panels',
                items: [
                    'A layout tile fills the page margins with panels (it replaces the panels already there)',
                    'Draw on the Art layer: it is clipped to the panels, so nothing spills into the gutters',
                    'Select a panel frame and split it top / bottom or left / right',
                    'Gutter and Border set the space between panels and the frame line',
                ],
            },
            {
                title: 'Balloons, tones, effects',
                items: [
                    'Balloons are text shapes: double-click one to type in it',
                    'Screentones fill the selected shapes with dots, lines, cross-hatch or noise',
                    'Focus lines, speed lines and bursts fill the selected panel, else the page',
                ],
            },
        ],
    },
    {
        id: 'notes',
        group: 'Organize',
        title: 'Notes',
        icon: 'note',
        summary:
            'Pin notes to the page or to an object: to-dos, feedback and reminders, saved with the project.',
        keywords:
            'note notes comment comments pin feedback review todo checklist reply resolve annotate',
        open: { panel: 'notes', label: 'Open Notes' },
        sections: [
            {
                title: 'Add a note',
                items: [
                    'Press N (or Add note in the Notes panel), then click the board',
                    'Click an object to attach the note to it: the pin follows the object',
                    'Drag a free pin to move it; Esc goes back to Select',
                    'Pins are never printed or exported',
                ],
            },
            {
                title: 'Work with notes',
                items: [
                    'Click a pin to open it: text, colour tag, checklist, replies',
                    'Resolve a note when it is done; pin important ones to the top of the list',
                    'The Notes panel searches every note and filters by status, colour and page',
                    'Click a row to jump to its pin, also on another page',
                    'Every change can be undone, and notes are saved with the project file',
                ],
            },
        ],
        related: ['layers', 'pages'],
    },
    {
        id: 'layers',
        group: 'Organize',
        title: 'Layers',
        icon: 'layer-group',
        summary: 'See everything on the page, in stacking order, and control each piece.',
        keywords:
            'z-order stack visibility hide rename blend mode opacity tree page layers folder clip clipping reference merge flatten',
        open: { panel: 'layers', label: 'Open Layers' },
        sections: [
            {
                title: 'Page layers (top of the panel)',
                items: [
                    'Layers and folders hold objects; new shapes and strokes go to the highlighted layer',
                    'Hide, lock, opacity and blend apply to the whole layer; a hidden or locked folder covers what is inside',
                    'Clip to layer below: the layer shows only where the layer under it has paint',
                    'Reference layer: the paint bucket fills using only reference layers',
                    'Drag a layer onto a folder to put it inside; merge down, flatten, and move the selection to a layer from the toolbar',
                ],
            },
            {
                title: 'The object list',
                items: [
                    'The top row is the object on top of the stack',
                    'Find an object searches by name',
                    'Click to select, `shift` + click for a range, `mod` + click to add or remove one',
                    'Drag a row to change the stacking order',
                    'Double-click a name or press `F2` to rename it',
                ],
            },
            {
                title: 'On each row',
                items: [
                    'The eye hides or shows the layer',
                    'The padlock locks it. A locked object shows a padlock badge on the board',
                    'The arrow opens or closes a group',
                    'Right-click for Show only this layer, Show all layers and more',
                ],
            },
            {
                title: 'Selected layers',
                items: [
                    'Buttons along the top group, ungroup, duplicate, lock, delete and align',
                    'With one layer selected, set its blend mode and opacity',
                ],
            },
        ],
        related: ['arrange', 'pages', 'select'],
    },
    {
        id: 'templates',
        group: 'Organize',
        title: 'Templates',
        icon: 'templates',
        summary: 'Start from a finished design and make it yours.',
        keywords: 'gallery starter layout design ready made',
        open: { tab: 'templates', label: 'Open Templates' },
        sections: [
            {
                title: 'Use a template',
                items: [
                    'Search by name, or filter by category and size',
                    'Open one to preview it before you apply it',
                    'Applying sets the page size and places the content on the page',
                    'Changed your mind? The message that appears has an undo, and `mod+Z` works too',
                ],
            },
        ],
        related: ['font-templates', 'settings'],
    },
    {
        id: 'font-templates',
        group: 'Organize',
        title: 'Font Templates',
        icon: 'text-height',
        summary: 'Ready-made font pairings you can apply or save.',
        keywords: 'typography pairing fonts saved style',
        open: { tab: 'fonttemplates', label: 'Open Font Templates' },
        sections: [
            {
                title: 'Apply and save',
                items: [
                    'Search by name or font, or filter by category',
                    'Select text first to apply a template to it',
                    'Also change font size carries the template sizes over too',
                    'Select your own text and save it as a template for later',
                ],
            },
        ],
        related: ['text', 'templates'],
    },
    {
        id: 'arrange',
        group: 'Organize',
        title: 'Align and Arrange',
        icon: 'align-objects-center',
        summary: 'Line things up, group them, lock them and change what sits on top.',
        keywords:
            'align distribute group ungroup lock unlock order front back forward backward flip snap guides grid',
        sections: [
            {
                title: 'Align and distribute',
                items: [
                    'Align left, center, right, top, middle or bottom: several objects line up with each other, one object with the page (on a whiteboard, with what you see)',
                    'Distribute spaces three or more evenly',
                    'The buttons are in the top bar and the Layers panel',
                ],
            },
            {
                title: 'Group and lock',
                items: [
                    '`mod+G` groups and `mod+shift+U` ungroups',
                    '`mod+L` locks and `mod+shift+L` unlocks',
                    'A locked object cannot be moved, resized, aligned, grouped or ungrouped until you unlock it',
                    'Buttons that cannot act on the selection are greyed out',
                ],
            },
            {
                title: 'Stacking order',
                items: [
                    '`mod+↑` brings forward and `mod+↓` sends backward',
                    '`mod+shift+↑` brings to the front and `mod+shift+↓` sends to the back',
                ],
            },
            {
                title: 'Flip, grid and snap',
                items: [
                    'Flip horizontal or vertical from the top bar',
                    "`mod+'` shows the grid and `mod+;` turns snapping on or off",
                    'The arrow next to the grid button picks the grid style (graph, squares, dashed, dots, crosses, isometric, ruled) and its size; each mode remembers its own',
                    'Hold `alt` while dragging to ignore snapping for a moment',
                ],
            },
        ],
        related: ['layers', 'clones', 'select'],
    },
    {
        id: 'clones',
        group: 'Organize',
        title: 'Linked Clones',
        icon: 'link',
        summary: 'Copies that stay in sync: edit one and the rest follow.',
        keywords: 'clone linked instance symbol component copy sync',
        sections: [
            {
                title: 'Link and unlink',
                items: [
                    '`alt+D` makes a linked copy',
                    'Change the look of any copy and all of them follow',
                    'Each copy keeps its own position',
                    '`shift+alt+D` unlinks a copy, making it independent',
                ],
            },
            {
                title: 'From the right-click menu',
                items: [
                    'Select linked copies selects every copy in the set',
                    'Link copies links objects you already have: they take the look of the bottom one',
                ],
            },
        ],
        related: ['arrange', 'select'],
    },
    {
        id: 'boolean',
        group: 'Organize',
        title: 'Combine Shapes',
        icon: 'boolean-union',
        summary: 'Merge, cut and mask overlapping shapes into new ones.',
        keywords: 'boolean union subtract intersect exclude divide crop mask clip merge pathfinder',
        sections: [
            {
                title: 'How to combine',
                items: [
                    'Select two or more shapes that overlap',
                    'Open the shape operations menu in the footer',
                    'Stacking order decides the result, so change it if the outcome is backwards',
                    '`mod+Z` brings the originals back',
                ],
            },
            {
                title: 'Operations',
                items: [
                    'Union joins them into one shape',
                    'Subtract, Intersect and Exclude cut them against each other',
                    'Divide splits them into separate pieces',
                    'Crop trims the shapes below to the top one',
                    'Mask lets the top shape clip the one below',
                ],
            },
        ],
        related: ['node', 'shapes', 'layers'],
    },

    /* ------------------------------ effects ------------------------------ */
    {
        id: 'fill-shadow',
        group: 'Effects',
        title: 'Fill and Shadow',
        icon: 'palette',
        summary:
            'Solid colors, gradients you can drag on the object, color harmonies and soft shadows.',
        keywords:
            'gradient linear radial color stop shadow drop opacity harmony complementary analogous triadic split monochromatic palette',
        open: { tab: 'appearance', label: 'Open Fill & Shadow' },
        sections: [
            {
                title: 'Fill',
                items: [
                    'Pick None, Solid, Linear or Radial',
                    'Presets give you a gradient in one click',
                ],
            },
            {
                title: 'Gradients',
                items: [
                    'Click the bar to add a color stop, and drag stops to move them',
                    'Reverse flips the gradient and Rotate 90° turns it',
                    'Set the angle, or the center and size of a radial one',
                    'Edit on canvas lets you drag handles on the object; double-click a stop to remove it',
                ],
            },
            {
                title: 'Color harmony',
                items: [
                    'Shows the five color schemes of the fill color: Complementary, Analogous, Triadic, Split-complementary and Monochromatic',
                    'Click a swatch to fill the selection with that color; the schemes stay put, so you can try them all',
                    'Gradient turns a scheme into the fill gradient, and the copy button copies its hex values',
                ],
            },
            {
                title: 'Opacity and layer blur',
                items: [
                    'Opacity makes the whole object see-through',
                    'Layer blur blurs the object itself (shapes, text, strokes, groups); it shows in PNG, JPG, video and SVG exports',
                ],
            },
            {
                title: 'Shadow',
                text: 'Set the color, opacity, blur and offset of a shadow behind a shape or text. Shadow blur only softens the shadow; use Layer blur to blur the object.',
            },
        ],
        related: ['color', 'filters'],
    },
    {
        id: 'tiling',
        group: 'Effects',
        title: 'Tiling Tools',
        icon: 'tiling',
        summary: 'Repeat grids, seamless patterns and color rules.',
        keywords: 'repeat grid pattern tile seamless brick checkerboard recolour palette',
        open: { tab: 'tiling', label: 'Open Tiling Tools' },
        demo: 'grid',
        sections: [
            {
                title: 'Repeat Grid',
                items: [
                    'Select an object and set rows, columns and gaps',
                    'Brick offset shifts every second row',
                    'A color rule paints the copies: odd or even, checkerboard, every Nth, diagonal, a palette cycle or random',
                ],
            },
            {
                title: 'Create Pattern',
                items: [
                    'Build a tile from the selected object or a preset (dot, square, triangle, diamond, stripe, plus)',
                    'Set rows, columns, gaps, a brick offset and a tile background',
                    'Name it to keep it in your pattern list',
                ],
            },
            {
                title: 'Apply Pattern',
                items: [
                    'Apply to the selected shapes or the whole canvas background',
                    'Paint it as the fill or the stroke',
                    'Adjust scale, angle and offset',
                ],
            },
        ],
        related: ['rotate', 'along-path', 'fill-shadow'],
    },
    {
        id: 'rotate',
        group: 'Effects',
        title: 'Rotate Tools',
        icon: 'rotate',
        summary: 'Repeat Radially turns one object into rings, flowers and spirals.',
        keywords: 'radial repeat ring spiral mandala circular',
        open: { tab: 'rotate', label: 'Open Rotate Tools' },
        demo: 'radial',
        sections: [
            {
                title: 'Repeat Radially',
                items: [
                    'Select an object to repeat around a pivot',
                    'Ring spaces copies around a circle; Spiral widens with a gap per turn',
                    'Count includes the original',
                    'Pivot distance sets the radius and Start angle where it begins',
                ],
            },
            {
                title: 'Refine',
                items: [
                    'Scale step grows or shrinks each copy',
                    'Jitter adds a little randomness',
                    'Rotate copies with the ring, or keep them upright',
                    'Clockwise sets the direction and Fade opacity trails them off',
                ],
            },
        ],
        related: ['tiling', 'along-path', 'symmetry'],
    },
    {
        id: 'symmetry',
        group: 'Effects',
        title: 'Symmetry',
        icon: 'kaleidoscope',
        summary: 'Mirror and rotate what you draw, or make the other half of a shape.',
        keywords:
            'symmetry mirror reflect reflection rotational radial point kaleidoscope mandala flip axis copies',
        open: { tab: 'symmetry', label: 'Open Symmetry' },
        sections: [
            {
                title: 'Drawing symmetry',
                items: [
                    'Left-right, Top-bottom and 4-way mirror every stroke you draw',
                    'Any axis mirrors across a line at the angle you set',
                    'Radial repeats each stroke around the centre (2 to 24 copies); Point turns it half a turn',
                    'Kaleidoscope combines turns and mirrors, for mandalas',
                    'The axes show while a brush is active; Center on the view moves the centre',
                ],
            },
            {
                title: 'Reflect selection',
                items: [
                    'Select objects, pick a reflection type and press Reflect selection',
                    'Copies are made around the selection centre or the page centre, and selected with the originals',
                    'One undo step removes all the copies',
                ],
            },
        ],
        related: ['rotate', 'draw', 'brush'],
    },
    {
        id: 'along-path',
        group: 'Effects',
        title: 'Along Path',
        icon: 'along-path',
        summary: 'Place copies along any path, for borders, footsteps and tapered trails.',
        keywords: 'repeat follow path border footsteps taper scatter stroke',
        open: { tab: 'along-path', label: 'Open Along Path' },
        demo: 'path',
        sections: [
            {
                title: 'Set it up',
                items: [
                    'Pick a preset, or select a path and press Use selection as path',
                    'Then select the object to repeat',
                    'Show live preview draws the result before you commit',
                ],
            },
            {
                title: 'Placement',
                items: [
                    'Fixed spacing or fixed count',
                    'Start and end offset, and reverse direction',
                    'Follow path, keep angle or random orientation',
                    'Side offset and alternate sides, for footsteps',
                ],
            },
            {
                title: 'Style the run',
                items: [
                    'Scale and opacity from start to end, for tapers',
                    'Position, rotation and size jitter, with a seed',
                    'Group the result, or remove the path afterwards',
                ],
            },
        ],
        related: ['tiling', 'rotate', 'node'],
    },
    {
        id: 'filters',
        group: 'Effects',
        title: 'Filters',
        icon: 'sliders',
        summary: 'Photo presets and fine adjustments for your images.',
        keywords:
            'image photo brightness contrast saturation blur sepia grayscale duotone preset vintage noir',
        open: { tab: 'filter', label: 'Open Filter Tools' },
        demo: 'filters',
        sections: [
            {
                title: 'Presets',
                items: [
                    'Select an image and click a preset such as Vivid, Noir, Vintage or Sunset',
                    'Intensity sets how strongly it applies',
                    'Hold the compare button to see the original',
                    'Reset all filters takes everything off',
                ],
            },
            {
                title: 'Adjust',
                items: [
                    'Exposure, brightness, contrast, gamma and fade',
                    'Saturation, vibrance, hue, temperature and tint',
                    'Sharpen, blur, noise and pixelate',
                ],
            },
            {
                title: 'Effects',
                items: [
                    'Grayscale, sepia, invert, threshold, edge detect and emboss',
                    'Duotone, color overlay and remove color',
                ],
            },
            {
                title: 'Filtering a shape',
                text: 'Filters work on images. Convert shape to image turns a selected shape into one first.',
            },
        ],
        related: ['fill-shadow', 'export'],
    },

    {
        id: 'fractals',
        group: 'Effects',
        title: 'Fractals',
        icon: 'snowflake',
        summary:
            'Koch snowflake, Sierpinski triangle, fractal tree, dragon and Hilbert curves as vector paths.',
        keywords:
            'fractal koch snowflake sierpinski triangle tree dragon hilbert curve recursive generate',
        open: { tab: 'fractals', label: 'Open Fractals' },
        sections: [
            {
                title: 'Insert a fractal',
                items: [
                    'Pick a type, set Depth and Size, then Insert fractal',
                    'Higher depth adds detail; each type has its own maximum so the page stays fast',
                    'Fractal tree also has a Branch angle',
                ],
            },
            {
                title: 'After inserting',
                text: 'The fractal is one path: recolor it in Fill & Shadow, edit its nodes with the Node tool (A) or repeat it with the Tiling and Rotate tools.',
            },
        ],
        related: ['fill-shadow', 'automata'],
    },
    {
        id: 'automata',
        group: 'Effects',
        title: 'Cellular Automata',
        icon: 'cellular-automata',
        summary: 'Patterns grown from simple rules: Wolfram 1D rules and the Game of Life.',
        keywords:
            'cellular automata automaton rule 30 90 110 game of life conway glider gun pattern grid cells',
        open: { tab: 'automata', label: 'Open Cellular Automata' },
        sections: [
            {
                title: '1D rule',
                items: [
                    'Each row is the next generation of the row above',
                    'Rule 90 draws a Sierpinski triangle, Rule 30 looks random, Rule 110 builds structures',
                    'Random first row starts from noise instead of one cell',
                ],
            },
            {
                title: 'Game of Life',
                items: [
                    'Start from random soup, a glider, the Gosper glider gun or a pulsar',
                    'Generations runs the simulation forward before it is drawn; the edges wrap around',
                ],
            },
            {
                title: 'Result',
                text: 'Live cells are drawn as one filled path, sized by Cell size. Insert again for a new random result.',
            },
        ],
        related: ['fractals', 'fill-shadow'],
    },
    {
        id: 'macro',
        group: 'Effects',
        title: 'Macro',
        icon: 'macro',
        summary: 'Record a sequence of commands and replay it on the selection, several times.',
        keywords: 'macro record replay repeat automate steps actions batch shortcut',
        open: { tab: 'macro', label: 'Open Macro' },
        sections: [
            {
                title: 'Record',
                items: [
                    'Press Record, use keyboard shortcuts on the canvas (duplicate, group, lock, nudge…), then Stop recording',
                    'Or pick commands one by one in Add step',
                    'Remove a step with its × button; Clear empties the list',
                ],
            },
            {
                title: 'Play',
                text: 'Set Repeat and press Play macro: every step runs in order on the current selection. Steps that are not possible right now are skipped. Each step can be undone. Macros last for this session.',
            },
        ],
        related: ['shortcuts'],
    },

    /* ------------------------------- finish ------------------------------ */
    {
        id: 'animate',
        group: 'Finish',
        title: 'Animate',
        icon: 'video',
        summary:
            'Keyframes and ready-made motion on a timeline under the board, exported as video.',
        keywords:
            'animation timeline keyframe video mp4 webm motion preset entrance exit emphasis onion skin motion path dock bottom',
        open: { tab: 'animate', label: 'Open the timeline' },
        demo: 'animate',
        sections: [
            {
                title: 'The timeline',
                items: [
                    'The timeline sits under the board, as in other animation tools. Open it with the Timeline button in the footer or `mod+alt+T` (on Linux desktops where that key opens a terminal, use the button)',
                    'Drag its top edge to make it taller or shorter. Double-click the edge for the default height',
                    'Beside the timeline: Animate (presets), Keyframe (easing and values), View (onion skin, motion path) and Export',
                    'On a narrow screen the timeline and these panes take turns',
                    'Closing the timeline pauses playback and turns auto-key off',
                ],
            },
            {
                title: 'Onion skin and motion path',
                items: [
                    'Onion skin shows faint copies of the frames before (red) and after (green) the playhead while paused',
                    'Choose how many frames on each side, how far apart and how strong, in View',
                    'Motion path shows where an animated object travels: a dot per frame (closer dots = slower) and a diamond per keyframe',
                    'Both are guides on the board only. They are never exported',
                ],
            },
            {
                title: 'Presets',
                items: [
                    'Select objects and choose an Entrance, Emphasis or Exit. Hover a preset to preview it',
                    'Picking another preset of the same kind right away swaps it, so you can try several',
                    'Starts: at the playhead, at the start, or after the last keyframe of the object',
                    'Set the duration, and how often an emphasis repeats',
                    'With several objects selected, a delay staggers them: they start one after another',
                ],
            },
            {
                title: 'Keyframes',
                items: [
                    'With the timeline focused, press `K` to add a keyframe at the playhead',
                    'Double-click a row of the timeline to add a keyframe there',
                    'Auto-key records a keyframe whenever you change an object',
                    'Click a keyframe to jump to it and edit its values',
                    'Drag keyframes to retime them, `Delete` to remove them',
                    'Arrow keys step one frame, or nudge selected keyframes. `shift` makes bigger steps',
                ],
            },
            {
                title: 'Playback',
                items: [
                    '`Space` plays and pauses, `L` loops',
                    '`Home` and `End` jump to the start and finish',
                    '`I` and `O` set the work area',
                    'Set the timeline length and playback speed. `mod` + wheel zooms the timeline',
                    '`mod+Z` here undoes timeline changes, separately from the board',
                ],
            },
            {
                title: 'Export video or GIF',
                items: [
                    'MP4 fast is frame-exact, in browsers that support it',
                    'Video realtime records as it plays, as MP4 or WebM where the browser allows',
                    'GIF makes an animated GIF up to 30 s long, 320 to 800 px wide, 10 to 25 fps. Frames that do not change take no space',
                    'GIF options: loop forever or play once, dither for smoother gradients (larger file), transparent background (hard edges)',
                    'PNG saves the current frame',
                    'Choose resolution, frame rate, quality and background',
                    'Range exports the whole timeline or only the work area',
                ],
            },
        ],
        related: ['export', 'pages'],
    },
    {
        id: 'export',
        group: 'Finish',
        title: 'Export',
        icon: 'file-export',
        summary: 'Images sized for wherever they are going.',
        keywords: 'download png jpeg jpg svg json image save youtube instagram transparent',
        open: { tab: 'export', label: 'Open Export' },
        demo: 'export',
        sections: [
            {
                title: 'Formats',
                items: [
                    'PNG for crisp images and transparency',
                    'JPEG for smaller files, with a compression setting',
                    'SVG stays sharp at any size',
                    'JSON exports the canvas data',
                ],
            },
            {
                title: 'Size',
                items: [
                    'Presets for YouTube, Instagram, Facebook and X, or a custom size',
                    'Fit, Fill or Stretch decides how the board meets that size',
                    'Quality renders at 1×, 2× or 3×',
                ],
            },
            {
                title: 'Finishing touches',
                items: [
                    'Background: transparent, white, black or green',
                    'Crop to content removes unused canvas space',
                    'Preview before you download, and name the file',
                ],
            },
        ],
        related: ['animate', 'basics', 'settings'],
    },

    /* ----------------------------- reference ----------------------------- */
    {
        id: 'top-bar',
        group: 'Reference',
        title: 'Top Bar and Footer',
        icon: 'grip-lines',
        summary: 'What every button along the top and bottom of the editor does.',
        keywords: 'toolbar header footer buttons zoom flip transform position',
        sections: [
            {
                title: 'Top bar',
                items: [
                    'New, Open and Save',
                    'Undo and Redo',
                    'Copy, cut, paste, duplicate, clone and delete',
                    'Align, group, lock, stacking order and flip',
                    'X, Y, W, H and R for the selection',
                    'Grid, snap, Settings and Help',
                ],
            },
            {
                title: 'Footer',
                items: [
                    'Fill and Stroke tiles, with stroke width and style',
                    'The shape operations menu, to combine shapes',
                    'Zoom out, zoom in, 100% and Fit',
                ],
            },
        ],
        related: ['arrange', 'boolean', 'color'],
    },
    {
        id: 'settings',
        group: 'Reference',
        title: 'Settings',
        icon: 'gear',
        summary: 'Theme, color, icon size, board type, canvas size and orientation, units.',
        keywords:
            'preferences dark mode light theme units mm cm inches icon size canvas size page size custom size width height dimensions format preset youtube instagram orientation landscape portrait reset',
        sections: [
            {
                title: 'Appearance',
                items: [
                    'Theme: Light, Dark or System. Light is the default',
                    'Color theme changes the brand color for buttons and selections',
                    'Icon size: Small, Medium or Large',
                ],
            },
            {
                title: 'Canvas',
                items: [
                    'Freehand switches to an endless whiteboard',
                    'Canvas size: video, social media, paper (A4, A3, US Letter…), manga and comics (B4, B5, A5, US comic: they also set a 3 mm bleed and safe-area margins), webtoon, digital art or presentation. New boards start at it, and the page you had open takes it when you go back to the editor (Undo brings the old size back)',
                    'Custom size: type a width and height in your units (1 to 10,000 px), then Apply size. It is used exactly as typed',
                    'Orientation: landscape or portrait for the canvas size (each size is listed once). Portrait pages open a little taller than the board, so scroll down for the rest; Fit to screen shows the whole page',
                    'Units sets px, mm, cm or in for rulers and size fields',
                ],
            },
            {
                title: 'Reset',
                items: [
                    'Reset settings asks first, then restores Light, Fate Blue, Small icons, px, landscape and Presentation 16:9. The page you had open takes that size when you go back to the editor',
                ],
            },
        ],
        related: ['basics', 'pages'],
    },
    SHORTCUTS_TOPIC,
];

export const findTopic = (id: string | null): HelpTopic | null =>
    HELP_TOPICS.find((t) => t.id === id) ?? null;

/** Help text with key marks turned into words, for search and results. */
export const plainText = (text: string): string =>
    text
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\bmod\b/g, 'Ctrl')
        .replace(/\bshift\b/g, 'Shift')
        .replace(/\balt\b/g, 'Alt');

export const sectionSlug = (title: string): string =>
    title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

export const editorHref = (open: NonNullable<HelpTopic['open']>): string =>
    open.panel ? `/draw?panel=${open.panel}` : `/draw?tab=${open.tab}`;

/** Every word of a topic, key marks included (tests read it). */
export const topicText = (topic: HelpTopic): string =>
    [
        topic.title,
        topic.summary,
        ...topic.sections.flatMap((s) => [s.title, s.text ?? '', ...(s.items ?? [])]),
    ].join('\n');
