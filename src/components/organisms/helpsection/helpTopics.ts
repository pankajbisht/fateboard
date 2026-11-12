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
        icon: 'share-nodes',
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
        id: 'brush',
        group: 'Tools',
        title: 'Brush',
        icon: 'paintbrush',
        summary: 'Every brush as a picture: pick one and paint. Includes the Calligraphy pen.',
        keywords:
            'brush paintbrush picker calligraphy pen nib thinning fixation angle caps inkscape paint',
        open: { panel: 'brush', label: 'Open Brush' },
        sections: [
            {
                title: 'Pick and paint',
                items: [
                    'Press `B` or pick Brush in the left rail: each tile shows a sample stroke',
                    'Click a tile and drag on the board. Size, color and effects are in the Draw panel',
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
        icon: 'pencil',
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
        keywords: 'slides multi page thumbnail duplicate background',
        open: { panel: 'Pages', label: 'Open Pages' },
        sections: [
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
        id: 'layers',
        group: 'Organize',
        title: 'Layers',
        icon: 'layer-group',
        summary: 'See everything on the page, in stacking order, and control each piece.',
        keywords: 'z-order stack visibility hide rename blend mode opacity tree',
        open: { panel: 'layers', label: 'Open Layers' },
        sections: [
            {
                title: 'The list',
                items: [
                    'The top row is the object on top of the stack',
                    'Find a layer searches by name',
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
        icon: 'table-cells-large',
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
                title: 'Shadow',
                text: 'Set the color, opacity, blur and offset of a shadow behind a shape or text.',
            },
        ],
        related: ['color', 'filters'],
    },
    {
        id: 'tiling',
        group: 'Effects',
        title: 'Tiling Tools',
        icon: 'screwdriver-wrench',
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
        related: ['tiling', 'along-path'],
    },
    {
        id: 'along-path',
        group: 'Effects',
        title: 'Along Path',
        icon: 'bezier-curve',
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
        summary: 'Keyframes and ready-made motion on a timeline, exported as video.',
        keywords: 'animation timeline keyframe video mp4 webm motion preset entrance exit emphasis',
        open: { tab: 'animate', label: 'Open Animate' },
        demo: 'animate',
        sections: [
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
                title: 'Export video',
                items: [
                    'MP4 fast is frame-exact, in browsers that support it',
                    'Video realtime records as it plays, as MP4 or WebM where the browser allows',
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
                    'Canvas size: YouTube, Instagram, Facebook, LinkedIn, A4 or Presentation. New boards start at it, and the page you had open takes it when you go back to the editor (Undo brings the old size back)',
                    'Custom size: type a width and height in your units (1 to 10,000 px), then Apply size. It is used exactly as typed',
                    'Orientation: landscape or portrait for the canvas size',
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
