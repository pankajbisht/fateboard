# Components

Atomic layout: `atoms/` → `molecules/` → `organisms/` → `templates/` → `pages/`. Feature folders under
`organisms/<feature>/` use `index.ts` + `ui/` + `<feature>.config.ts(x)` + `<feature>.type.ts`.

"Slices used" lists the keys each file reads or calls (static scan). Keys marked *shared* are collision keys (see
[STATE.md](STATE.md#key-collisions)), so the slice named is only the *last* writer. Keys marked *missing* exist in no
slice.

## Feature placement (one place per feature)

Owner decision 2026-11-07; guarded by `src/__tests__/featurePlacement.test.ts`.

| Feature | The one place | Removed copies |
|---|---|---|
| Canvas size + orientation | **Settings > Canvas** (new boards start at it; the open page takes it when the editor loads again) | left-rail Canvas Size panel (removed 2026-11-11), Pages panel "Page setup" |
| Zoom (in / out / %, 100%, fit) | **footer** `ZoomControl` (+ keyboard) | top Zoom bar, Pages panel "View" |
| Save / Open | top bar **File** (whole project, all pages; old single-board files still open) | Pages panel "Save project / Open project" |
| Export image / video | right dock **Export** tab | Pages panel "Export PNG" |
| Grid / snap toggles | top bar (Extra) | Settings background pattern / colour / grid spacing / snap (never read) |
| Text formatting | **text float** (font, size, B I U, align) + **Text panel** (everything) | header text tools (`TextToolsHeader`, deleted) |
| Fill / stroke on / off | footer Fill / Stroke rows | dock tools column copies |
| Colours | right dock palette (+ All colors grid, custom picker) | panel colour inputs |
| Node editing controls | **node float** (`NodeToolbar`, above the edited shape, only while editing nodes) | n/a |
| Duplicate / clone / link | top bar Edit (Duplicate ⌘D, Clone ⌥D); right-click: Select linked copies, Unlink clone (⇧⌥D), Link copies (`LinkBarConfig`, shown only when they apply) | n/a |
| Undo / redo | top bar `UndoRedoBar` (enabled from `canUndo` / `canRedo`) + ⌘Z / ⌘⇧Z | n/a |
| Tool switching | left rail Select / Hand / Node (shortcuts V / H / A in the command registry, `ToolBarConfig`) | n/a |
| Pen / Pencil options | **header context row** (`ToolContextBar`: replaces X / Y / W / H while Pen or Pencil is active) | n/a (new 2026-11-13) |

Kept on purpose: right-click / layer context menus and the command palette repeat commands by design (shortcuts to the same actions, not a second UI to maintain).

## Editor shell (mounted at `/draw`)

| Component | File | Props | Slices used |
|---|---|---|---|
| `EditorPage` | `pages/Editor/Editor.tsx` | `{ onToolChange?(tool) }` | Canvas (`canvas, activeTool, setActiveTool, selectedPreset, setSelectedPreset`), Text (`addText`), Brush (`color`*shared*, `width`), Setting (`settings.freehand`), `setWorkspaceMode` (*missing*) |
| `EditorTemplate` | `templates/Editor.template.tsx` | `{ header, leftSidebar, rightPanel, canvasBoard, footer }` (ReactNodes) | none |
| `Header` | `organisms/header/ui/Header.tsx` | none | none (composes TopToolbar + `ToolContextBar`) |
| `ToolContextBar` | `organisms/toolbars/ui/bars/DrawToolOptions.tsx` | none | Canvas (`activeTool`): `PenOptions` while Pen, `PencilOptions` while Pencil, `NibOptions` while Draw with the Calligraphy pen brush (`nib`), else `ShapeToolsHeader` |
| `NibOptions` | `organisms/toolbars/ui/bars/NibOptions.tsx` | none | DrawingTools (`nibStyle, setNibStyle`), Brush (`color, width, updateBrush`). Calligraphy pen (Inkscape Calligraphy tool): color, width, thinning, angle, fixation, caps + hint |
| `PenOptions` | `organisms/toolbars/ui/bars/PenOptions.tsx` | none | DrawingTools (`penMode, setPenMode, penStyle, setPenStyle, penPointCount`). Toolbar "Pen options": mode (Pen / Curvature / Freeform), stroke swatch + width, **Stroke style** popover (line ends, corners, dash, arrowheads; button shows a live preview), Fill switch + swatch, hint per mode / point count. Pieces shared with Pencil in `drawToolParts.tsx`. Path shape popover (2026-11-13): None / Triangle in / Triangle out / Ellipse + Thickness (`penStyle.shape`, `shapeWidth`) |
| `PencilOptions` | `organisms/toolbars/ui/bars/PencilOptions.tsx` | none | DrawingTools (`pencilStyle, setPencilStyle`), Brush (`color, updateBrush`). Toolbar "Pencil options": drawing color, size, opacity, smoothing, Pressure, Auto-close, Shift hint |
| `TopToolbar` | `organisms/toolbars/ui/TopToolbar.tsx` | none | renders bars below |
| `FileBar` | `toolbars/ui/bars/FileBar.tsx` | none | Setting (`iconSize`), Canvas (`canvas`); config `FileBarConfig` → `clearBoard`, `saveBoard`; Open → `feature/import` |
| `EditBar` | `bars/EditBar.tsx` | none | config `EditBarConfig` → Layers (`copy, cut, paste, duplicate, clone, removeLayer`), Transform (`hasSelection`) |
| `AlignmentBar` | `bars/AlignmentBar.tsx` | none | config → Layers (`alignObjects`); disabled per `ARRANGE_RULES` (align: 1 unlocked object, distribute: 3) via `useArrangeState` |
| `LayerControlBar` / `FlipBar` | `bars/*.tsx` | none | Layers (`bring*/send*`), Transform (`transform, setTransform`) |
| `ArrangeButton` | `bars/ArrangeButton.tsx` | `{ action, state }` | Shared header button of Align / Group / Lock: tooltip + shortcut, disabled when `ARRANGE_RULES[action.rule](state)` is false. `GroupBar`: Group (2 unlocked), Ungroup (an unlocked group). `LockBar`: **one toggle** (Unlock when everything selected is locked, else Lock). State from `hooks/useArrangeState` (canvas selection events + `layers`); the right-click menu and keys use the same rules (`config/toolbars/ui/arrangeWhen.ts`), and so do the Layers panel Group / Ungroup button and menu items (`useArrangeCan`) |
| `UndoRedoBar` | `bars/UndoRedoBar.tsx` | none | **commented out of TopToolbar**; config `undo/redo` resolves to Animation (BUG-001) |
| `ExtraBar` | `bars/ExtraBar.tsx` | none | Notebook (`gridEnabled, snapEnabled, toggleGrid, toggleSnap`), grid / snap shortcuts (⌘' / ⌘;, paused under a modal); navigates to help/settings. Share removed (Q6). Renders `GridMenu` right after the grid toggle |
| `GridMenu` | `bars/GridMenu.tsx` | none | Chevron "Grid options" next to the grid toggle: a non-modal popover portaled to `<body>` (the top bar clips overflow) with a show-grid switch, 7 style tiles (picking one shows the grid), a Size slider (4–100 px, shown in Settings > Units) and a Snap switch. Notebook (`gridEnabled, gridStyle, gridSize, snapEnabled` + setters), `settings.unit`. Closes on Escape / click outside |
| `OriginBar` → `OriginSelector` | `toolbars/ui/TopToolbar.tsx`, `molecules/OriginSelector.tsx` | `{ size?=24, value?='c', onChange?(OriginChoice) }` | Transform (`transform.id`, `setOrigin`) (fixed BUG-042) |
| `ShapeToolsHeader` | `organisms/ShapeToolsHeader.tsx` | none | Transform (`transform, setTransform, hasSelection, setRadius`), Canvas (`canvas`, `selectedObject` via `useStore()` **no selector**) |
| `EditorSidebar` | `organisms/editorsidebar/ui/EditorSidebar.tsx` | `EditorSidebarProps { items, initialActiveId?, railWidth?, panelWidth?, defaultExpanded?, className?, onActiveChange?, onToolChange? }` | none directly; items from `editorsidebar.config.tsx` |
| `SidebarRail` / `SidebarPanel` | `organisms/sidebar/ui/*.tsx` | `{ items, activeId, expanded, canExpand, width, onSelect, onToggle }` / `{ item, expanded, width, onClose }` | none |
| `CanvasBoard` | `organisms/board/ui/CanvasBoard.tsx` | `{ mode?: 'design'\|'whiteboard', pageSize?: CanvasPreset\|null }` | Canvas (`init, dispose, exportJSON, importJSON, canvas, selectedObject, selectedPreset, clearToolbar`), ContextMenu (`openMenu`), UndoRedo (`saveState, initHistory`), Setting (`settings.freehand`); mounts `useKeyboardShortcuts` |
| `Ruler` | `organisms/board/ui/Ruler.tsx` | `{ orientation, length, origin, scale, extent, pointer }` | none |
| `FloatingTextToolbar` | `organisms/FloatingTextToolbar.tsx` | `{ target }` | Text (`updateText`) via `useActiveText` |
| `DockRoot` | `organisms/DockRoot.tsx` | none | ShapeStyle (`handleColorChange, setActivePaint, setStrokeWidthN`) via selectors; hosts `ColorPicker`, `TabsRail`, `DockPanel`. The column left of the palette holds every non-swatch item, all as equal square boxes the size of a swatch (`data-dock-box`, `size-[var(--ui-swatch)]`: 18 / 20 / 24 px by Settings > Icon size): `PaletteTools` (All colors, Custom color), then `RecentColors`. The fill / stroke toggles live in the footer (`PaintToggle`). There is no "painting" indicator here; the footer Fill/Stroke tiles (`StrokeControls`) and panel `PaintTargetSwatch`es choose what the palette paints.  |
| `ToastHost` | `organisms/ToastHost.tsx` | none | Dialog (`toast, dismissToast, runToastAction`). Mounted once in `RootLayout`. One toast at a time (`role="status"`), bottom centre above the footer (`bottom-16`), optional action button (e.g. Undo after applying a template, Q11), Dismiss ×, hides after `duration` (6 s). |
| `ErrorBoundary` | `organisms/ErrorBoundary.tsx` | `onReload?`, `onDownload?` (tests) | none: reads only `projectStorage`. Wraps the routed pages in `RootLayout` (`key` = path). On a render error shows Reload / Download autosave / Start with an empty board (inline confirm). |
| `DialogHost` | `organisms/DialogHost.tsx` | none | Dialog (`dialogQueue, resolveDialog`). Mounted once in `RootLayout`; renders the store's confirm/alert dialogs on `Modal`. Confirm button is always brand primary; `tone: 'danger'` only switches the icon to a red warning and focuses Cancel first. |
| `Icon` (atom) | `atoms/Icon.tsx` | `{ name: IconName, filled?, spin?, size? = '1.2em', className?, aria-label?, ...LucideProps }` | none. The only icon component (Lucide registry `ICONS`, keys kebab-case). Unknown names render nothing. |
| `Modal` + `ModalButton` (molecule) | `molecules/Modal.tsx` | `{ open, onClose, title, description?, children?, footer?, size?: 'sm'\|'md'\|'lg', role?, initialFocusRef?, closeOnBackdrop?, showClose?, icon?, tone? }` / `{ variant?: 'primary'\|'secondary'\|'danger', buttonRef?, ...button }` | none. The app's one modal shell: portal, focus trap, Escape/backdrop close, scroll lock, focus restore, stops key events reaching window shortcuts. `TemplatePreviewModal` does not use it yet (BUG-061). |
| `DockPanel` | `organisms/DockPanel.tsx` | `{ open, width?, children }` | none. The dock's panel frame (fixed width; the old drag-to-resize handle was removed). Below `lg` it overlays the canvas left of the dock (`dockPanelSize`, BUG-215); on an upright phone a bottom sheet (`phoneSheet`, BUG-219) |
| `TabsRail` | `organisms/tabs/ui/TabsLayout.tsx` | `{ tabs: TabConfig[], activeTab, panelOpen, onSelect, onRemove }` | none; tabs from `config/tabs.config.tsx`. A vertical `role="toolbar"` named "Dock panels" of `aria-pressed` toggle buttons (not a tablist: it also holds close / more / collapse buttons) |
| `ColorPicker` (organism) | `organisms/ColorPicker.tsx` | none | **The app's only color picker.** Strip = White, Black, then every shade of the 22 Tailwind families (each family 900 → 50 in its own group with a divider; data in `lib/palette.ts`). Every swatch is a button named "Red 300 · #ffa2a2"; the current color (paint target, else active fill / stroke / shadow) gets a ring and is centered in the strip when it changes off screen. Also exports `PaletteTools` (All colors grid, Custom color → `ColorPickerPopover`, which holds the hex field and the eyedropper, so they have no dock box of their own) and `RecentColors` (last 8 picked colors, memory only), which `DockRoot` renders in the left column. The **All colors** grid (dialog left of the dock) shows the same colors as rows = families, columns = 50–900; stays open while trying colors; arrows move, Escape / outside click / the button close it. ShapeStyle (`handleColorChange, fill, stroke, activePaint, paintTarget`), Text (`shadowColor`), Brush (`recentColors, commitRecentColor`) |
| `ColorPickerPopover` | `organisms/ColorPickerPopover.tsx` | `{ anchor, color, onChange(hex), onClose(refocus) }` | **In-app custom color picker** (replaced the browser `<input type=color>` dialog and the old hex box). Saturation / brightness square + hue slider (drag with pointer capture, 1 update per frame; arrow keys, Shift ×10, Home / End on hue), eyedropper, Original (click = revert) vs New, hex field (3 / 6 digits, Enter / blur apply, first Escape reverts the field) and a format switch HEX / RGB / HSL / HSB / CMYK with editable channels and a copy button (`ColorFormatFields`), Harmonies (`ColorHarmonies`), Recent colors. Re-placed when its height changes (`ResizeObserver`) and scrolls when taller than the window. Keeps its own HSV so the hue does not jump on grays; follows outside changes (a palette click) unless it is its own echo. Opened by `PaletteTools`: changes apply live through `handleColorChange` (the 150 ms history debounce makes a drag one undo step); the final color goes to Recent once, on close. Reads Brush `recentColors`. |
| `ColorFormatFields` (molecule) | `molecules/ColorFormatFields.tsx` | `{ hex, hsv, onHex(hex), onHsv(hsv) }` | none. Hex field + `SegmentedControl` HEX / RGB / HSL / HSB / CMYK (default RGB, memory only) with the channels of that format as `NumberField`s (HSL / HSB fields and their copy text come from the picker's exact HSV, so typed values and a gray's hue are kept and the text rounds to the same hex) + a copy button with the color in that format (`formatColor`: `#2B7FFF`, `rgb(43, 127, 255)`, `hsl(216, 100%, 58%)`, `hsb(216, 83%, 100%)`, `cmyk(83%, 50%, 0%, 0%)`). CMYK is the plain device formula, no print profile. Math in `lib/colorMath.ts`. |
| `ColorHarmonies` (molecule) | `molecules/ColorHarmonies.tsx` | `{ color, onPick(hex) }` | none. One row per scheme (`lib/colorHarmony.ts`): Complementary (+180°), Analogous (±30°), Triadic (+120° / +240°), Split-complementary (+150° / +210°), Monochromatic (5 lightness steps incl. the base); hue turns on the RGB / HSL wheel. A click applies the color; the base follows the picker except for the echo of a pick made here (one-shot, `hooks/useHarmonyBase`, shared with `FillHarmony`). Grays show only Monochromatic + a hint. |
| `PaintToggle` | `organisms/PaintToggle.tsx` | `{ paint: 'fill' \| 'stroke' }` | Footer toggle (16 px, right after the Fill / Stroke label via the `Tile` `after` slot; tooltip above) for the selection's fill / stroke: outlined square = stroke, solid square = fill; red slash = none (hover previews Add in brand blue), hover on a present one previews the slash. Name + tooltip = the action (`Remove stroke` ⇄ `Add stroke`, `Remove fill` ⇄ `Add fill`); disabled with nothing paintable (`Add or remove …`, tooltip says select an object). Re-reads on selection / modify / add / remove events and store fill / stroke / width / history changes. ShapeStyle (`toggleFill`, `toggleStroke`, `fill`, `stroke`, `strokeWidth`), UndoRedo (stack lengths). |
| `PaintTargetSwatch` (molecule) | `molecules/PaintTargetSwatch.tsx` | `{ id, label, value, onChange(hex), showLabel?, disabled?, tone? }` | ShapeStyle (`paintTarget, setPaintTarget`). Used instead of a color input in every panel; releases its target on unmount. |
| `Footer` | `organisms/footer/ui/Footer.tsx` | none | left: `StrokeControls` (Fill / Stroke rows with `PaintToggle`, width, style, shape ops); right (`data-testid="footer-view"`): `ZoomControl` = **the app's one zoom control**: − slider + (log scale, page size under the slider), the visible % (click = 100%, `actualSize`), Fit (`fitToScreen`, `zoom-fit` icon), then `FullScreen`. 16 px inset both sides. |
| `StrokeControls` | `organisms/StrokeControls.tsx` | none | ShapeStyle (`activePaint, fill, stroke, strokeStyle, strokeStyleList, setStrokeStyle, setStrokeWidthN, setActivePaint, setOpacity`, `opacity` *shared*), Text (`strokeWidth` *shared*), Canvas (`hasActiveShape, geditor, canvas, selectedPreset, setSelectedPreset`), `workspaceMode/setWorkspaceMode` (*missing*) |
| `FullScreen` (molecule) | `molecules/FullScreen.tsx` | none | UI (`toggleFullscreen, isFullScreen`), Setting |
| `ContextMenu` | `organisms/ContextMenu.tsx` | none | ContextMenu (`visible, items, x, y, closeMenu`); filters items by `when()`. `role="menu"` with `menuitem`s, arrow-key focus, kept on screen (BUG-216); opened by right-click or a long press on touch |

## Left sidebar panels (`editorsidebar.config.tsx`)

Rendered inside `PanelLayout` by `SidebarPanel` (title, icon and close come from the config item). `fullSize: true`
(Canvas size, Pages, Layers) = the panel keeps fixed bars and scrolls its own list; otherwise the
body scrolls with standard padding and section spacing.

| Item id | Kind | Component | Props | Slices used |
|---|---|---|---|---|
| `select`, `pan`, `node`, `pen`, `pencil`, `laser` | action | none | none | `setActiveTool` via `EditorPage.handleToolChange` (keys V, H, A, P, Shift + P, K; commands in `ToolBarConfig`). Rail pressed state comes from the store's `activeTool` (`EditorSidebar activeTool` prop): tools light up from the store, panels only while open; tooltips show the shortcut (`shortcut` on the item) |
| `brush` | panel (+tool `draw`, key B) | `organisms/brush/BrushPickerPanel` (+ `BrushPreview`: sample stroke per engine, drawn with `penShape` / `nibOutline`) | none | Brush (`brush`, `setBrush`), Canvas (`activeTool`, `setActiveTool`). A tile picks the brush and switches to Draw. Shares the Draw tool with `draw`: the rail lights up only the item last picked (`EditorSidebar` `isPressed`) |
| `draw` | panel (+tool `draw`) | `DrawPanel` (`organisms/DrawPanel.tsx`) | none | Brush (all), Canvas; reads `color`/`opacity`/`shadowColor`/`fillColor` (*shared*); `undo/redo` if present (Animation); window `[`/`]` keys |
| `shapes` | panel | `ShapePanel` (section titles / hints: `SHAPE_CATEGORY_INFO` in `hooks/shape/shapeCatalog.ts`) | `{ closePanel?(type?) }` | Shape (`addShape` via `useShapeFactory`, `activeConnector, updateConnectorStyle, normalizePathData, customShapes, saveSelectionAsShape, saveCustomPath, removeCustomShape`), Text (`strokeWidth` *shared*) |
| `text` | panel (+tool `text` → `addText({})`) | `TextPanel` | none | Text (`addText`, `updateText`, `setTextCase`, `fonts`); reads the selection live via `hooks/useActiveText` (canvas events). Sections: Add text presets, Font (family, size, B/I/U/S, case, alignment), Spacing, Color (+ highlight), Effects (outline, shadow, opacity). |
| `Pages` | panel (`fullSize`) | `PagePanel` + `page/PageCard` (one card) | none | Layout (2026-11-12): fixed top bar (‹ n of m › + Add page), scrolling 2-column grid of `PageCard`s, fixed "This page" bar (`pageBackground` via `PaintTargetSwatch` + Clear page). A card = thumbnail in the page's own aspect ratio (open page: `selectedPreset`; others: `page.preset`) on the page background, a rename / duplicate / delete pill named after the page (shown and clickable on hover / focus only, so a tap on the thumbnail opens the page; always on for the open page), number + name (Rename button or double-click). Pages (`switchPage`, add / duplicate / delete / rename / reorder by drag, PageUp / PageDown). `<ul aria-label="Pages">`, open page `aria-current="page"`. **No** page size (Settings > Canvas), zoom (footer), export (Export tab) or save / open (top bar File). |
| `layers` | panel | `LayersPanel` (rows windowed, see CANVAS "Performance notes") | none | Layers (`layers, selectedLayerIds, bindLayerEvents` + actions), Canvas |

## Right dock tabs (`config/tabs.config.tsx`)

Rendered inside `PanelLayout` by `DockRoot` (title = tab label, close collapses the dock; scroll position per tab;
`fullSize` tabs scroll their own list, like the left rail).

| Tab id | Component | Slices used |
|---|---|---|
| `templates` | `TemplateGallery` (`fullSize`: scrolls itself) | Template (all). Moved from the left rail 2026-11-13 |
| `fonttemplates` | `FontTemplatePanel` (`fullSize`) | Canvas (`canvas, persist`), UndoRedo; `localStorage` `fateboard:fontTemplates`. Moved from the left rail 2026-11-13 |
| `tiling` | `PathEffects` | advanceOperation (`repeatGrid, createPattern, previewPatternTile, applyPattern, clearPattern, deletePattern, patterns`), Canvas |
| `rotate` | `RepeatRadially` | advanceOperation (`repeatRadially`), Canvas |
| `along-path` | `RepeatAlongPath` | advanceOperation (`addObject, removeObject, repeatAlongPath`), Canvas, Page (`scale`) |
| `filter` | `Filters` (+ `useImageFilters`, `filterEngine`) | Canvas, UndoRedo (`saveState`) via `useImageFilters`; the Filter slice is **not** used by any mounted UI (only dead `Brightness.tsx`) |
| `fractals` | `organisms/generators/FractalPanel` | Generator (`insertFractal`), Canvas (`canvas`) |
| `automata` | `organisms/generators/AutomataPanel` | Generator (`insertAutomaton`), Canvas (`canvas`) |
| `macro` | `organisms/generators/MacroPanel` | Macro (all), Command (`commands`, for the Add step list) |
| `export` | `ExportCanvas` | Canvas via `useStore()` no selector; own export pipeline (PNG/JPEG/SVG/JSON, crop, background) |
| `animate` | `organisms/animation/AnimationPanel` (composition; parts below) | Animation (all), Canvas; React `onKeyDown` shortcuts (BUG-018) |

## Other routes

| Component | File | Props | Notes |
|---|---|---|---|
| `RootLayout` | `templates/RootLayout.tsx` | none | Editor routes only, **lazy chunk** (BUG-209). On load: `applyFabricChrome()` and (e2e build) the test hook. `settingsStorage.load()` → `hydrate`; renders `<Outlet/>` after hydration inside `ErrorBoundary`; `DialogHost` + `ToastHost`. Wrapped in an `ErrorBoundary` in `rootRouter` (failed chunk) |
| `SiteLayout` | `templates/SiteLayout.tsx` | none | Landing, `/gallery`, `/gallery/:id`: `ErrorBoundary` (keyed by path) + `<Outlet/>`. No store, so no dialogs / toasts there; a site page that needs them must move to `RootLayout` |
| `WhiteboardMarketingSite`, `MiniWhiteboard`, `BuildStage` | `pages/web/*` | none | marketing; `MiniWhiteboard` is a plain 2D `<canvas>` (no Fabric, no store). `BuildStage` ("From thought to visual") builds a launch poster live with the Help picture language (`buildStory.ts` + `StageView`, which reuses `ExampleScene`): the three steps beside it light up in sync and jump on click; Watch autoplays (not under reduced motion, paused on hover) with a time-lapse scrubber that blends steps; Compare wipes between the sketch and the poster; a zoom lens follows the mouse. Arrow keys only on the focused stage. Inside `.theme-light` (light tokens pinned: the page is light-only). Must not import `helpShortcuts` / `commandConfig` (`landingBundle.test.ts`): help text pieces it needs live in `helpsection/keyCaps.ts` and `ui/RichText.tsx` |
| `GalleryPage` | `pages/Gallery/GalleryPage.tsx` | none | `/gallery`, lazy route, prerendered + indexable. Light-only (`theme-light`): `GalleryHeader` (logo home, Start Drawing) + `GallerySection` in `<main>`. Test `GalleryPage.test.tsx` |
| `GalleryHeader`, `GalleryTeaser` | `pages/web/gallery/*` | `back?: { to, label }` / none | header shared by `/gallery` and `/gallery/:id` (tutorial passes All pieces → `/gallery`); `GalleryTeaser` is the landing's text-only pointer (Browse the gallery), no images |
| `GallerySection` | `pages/web/gallery/*` | none | `/gallery` page content: "Made with Fateboard" `h1`, card titles `h2` (axe heading-order); landing header link Gallery → `/gallery`. Data in `galleryData.ts` (`GALLERY_ITEMS`: 4 cartoon, 4 manga, 4 scenery, 3 flow diagrams, 3 design; `CATEGORY_LABEL`, `galleryImage`, `galleryPath`, `findGalleryItem`); artwork is static SVG in `public/gallery/<id>.svg` (480 × 360, lazy `<img>`, no bundle cost). Category filter pills (`aria-pressed`, name "Manga 4 pieces"), card grid with a stretched link "How to make …" (inset focus ring) to the piece's tutorial. `galleryData.test.ts` keeps the mix, sizes and Fabric-importable SVG |
| `GalleryTutorialPage` (+ `TutorialStage`, `TutorialSteps`, `TutorialExtras`, `useArtwork`, `artwork.ts`) | `pages/GalleryTutorial/*` | none | `/gallery/:id`, lazy route, one prerendered page per piece. Light-only (`theme-light`); All pieces / breadcrumb / unknown-id link → `/gallery`. Content in `pages/web/gallery/galleryTutorials.ts` (data file: level, minutes, intro, one step per `<g id="step-N">` group in the SVG with text + optional trick, takeaways; backticks = key caps via `RichText`). `TutorialStage` fetches the SVG, shows it inline and sets `data-state` done / current / next on each step group (CSS hides next; Ghost shows it at 12%, Spotlight dims done to 30%); Previous / Play (opt-in, stops at the end) / Next, step bar, Home / End / arrows on the focused stage (modifier chords ignored), live step caption. `TutorialSteps` highlights the current card and jumps the stage. Extras: takeaways, palette (top colours from the SVG, click to copy), Make it yours (Download SVG, `mod+O`, `mod+shift+U`), previous / next piece. Unknown id = message + link back. Tests: `galleryTutorials.test.ts` (step counts = SVG groups, only real key marks), `GalleryTutorialPage.test.tsx`, `artwork.test.ts` |
| `EditorSettingPage` → `Preferences` | `pages/Setting`, `organisms/settings/ui/Preferences.tsx` | none | Setting (+ Dialog `confirmDialog`): Appearance (theme, colour theme, icon size), Canvas (Freehand on / off; Orientation = landscape / portrait; Canvas size = a `Select` of `CANVAS_PRESETS` shown in that orientation and unit, plus Custom size (width / height `Input`s in Settings > Units and Apply size; px must be whole, other units round to px; 1–10,000 px). The only place to choose a size: new boards start at it and the open page takes it when the editor loads again), Units, Reset (`Button variant="danger-outline"`, asks with the app's confirm dialog, then `resetSettings`). Only preferences the editor reads: page size, orientation, background pattern / colour, grid spacing and snap were removed (saved but never read; grid / snap live in the top bar). |
| `CommandPalette` | `pages/Command/CommandPalette.tsx` | `{ commands }` | static `commandRegistry` |
| `HelpPage` | `pages/HelpPage/HelpPage.tsx` | none | shell (search, topic nav, `?topic=` / `&section=`). Content is data in `organisms/helpsection/helpTopics.ts`; keys in `helpShortcuts.ts` (commands read from the registry); views in `helpsection/ui/` (`HelpHome`, `EditorMap`, `QuickStart`, `TopicView`, `ShortcutExplorer`, `demos/`). Real-world examples are data in `helpExamples.ts` (topic id → projects; each step has a caption, the control it uses `ui` and a cursor point `at`, and each example a `scene` written with the builders of `helpScene.ts`: shapes that appear at a step, or between two). `ExampleSlider` shows one example per slide; inside, `ExampleSteps` slides the captions and `ExampleScene` draws the board at that step (new shapes draw or pop in, a cursor clicks where to act, a label names the control; transitions are `motion-safe`). Play is opt-in and stops on a manual step or when the example slides away. Search indexes examples as `Example: <title>` sections and `&section=example-…` opens one. Artwork may use hex colors; text on light artwork uses the fixed dark `ON_LIGHT`, since `ink` turns light in dark mode. Every topic but Shortcuts needs an example, every step must change the picture, and no theme-colored text may sit on hex artwork, or `helpExamples.test.ts` fails. A new left rail panel or dock tab needs a topic, or `helpTopics.test.ts` fails |
| `NotFoundPage` | `pages/NotFound/NotFoundPage.tsx` | none | keyboard mini-game |

## Panel design system (atoms → molecules → template)

Every editor panel is built from these (rules and look: [DESIGN.md](DESIGN.md#panels)). All use semantic tokens, so
they work in light and dark mode. Tests: `atoms/__tests__/{Select,controls}.test.tsx`,
`molecules/__tests__/panelMolecules.test.tsx`, `__tests__/panelConsistency.test.ts` (guard).

| Layer | Component | File | Props (main) |
|---|---|---|---|
| atom | `Button` | `atoms/Button.tsx` | `variant: primary\|secondary\|ghost\|danger`, `size: sm\|md\|lg`, `icon?`, `trailingIcon?`, `loading?`, `block?`, button props |
| atom | `IconButton` | `atoms/IconButton.tsx` | `icon: ReactNode`, `active?` (aria-pressed), `size?`, `tone?: 'danger'`, button props |
| atom | `Select` | `atoms/Select.tsx` | `options: {value,label,icon?,description?,disabled?}[]`, `value`, `onChange`, `size?`, `block?`, `placeholder?`, aria. Custom popover listbox (portal, keyboard, type-ahead) |
| atom | `Dropdown` | `atoms/Dropdown.tsx` | toolbar wrapper on `Select` (string values, inline label) |
| atom | `Slider` | `atoms/Slider.tsx` | `min, max, step?, value, onChange, onCommit?` (release), `disabled?`, aria |
| atom | `Switch` / `Toggle` | `atoms/Switch.tsx` / `Toggle.tsx` | `checked, onChange, size?` (role=switch). `Toggle` = deprecated alias |
| atom | `Input`, `LabeledInput` | `atoms/Input.tsx`, `LabeledInput.tsx` | `label?, error?, size?` + input props / compact numeric `label value unit` |
| atom | `Badge` | `atoms/Badge.tsx` | `tone: neutral\|primary\|accent\|success\|danger`, `icon?` |
| atom | `control.styles` | `atoms/control.styles.ts` | `FOCUS_RING`, `CONTROL_SIZE`, `CONTROL_BOX` shared class recipes |
| molecule | `Field` | `molecules/Field.tsx` | `label, htmlFor?, trailing?, hint?, inline?, wrap?, disabled?` |
| molecule | `SliderField` (= `LabeledSlider`) | `molecules/LabeledSlider.tsx` | `label, min, max, step?, value, onChange, onCommit?, defaultValue?` (double-click reset), `unit?`, `format?` |
| molecule | `LabeledToggle` (= `SwitchField`) | `molecules/LabeledToggle.tsx` | `label, checked, onChange, hint?` |
| molecule | `SelectField` | `molecules/SelectField.tsx` | `label, options, value, onChange, inline?, hint?` |
| molecule | `SegmentedControl` | `molecules/SegmentedControl.tsx` | `options: {value,label?,icon?,disabled?}[]`, `value`, `onChange`, `size?`, `block?`, `aria-label` (radiogroup) |
| molecule | `PanelSection` | `molecules/PanelSection.tsx` | `title?, description?, actions?, onReset?, collapsible?, defaultOpen?` |
| atom | `IconButton size="chrome"` | `atoms/IconButton.tsx` | toolbar / footer icon button sized by Settings > Icon size (`--ui-btn`, `--ui-icon`) |
| organism | `FillShadowPanel` | `organisms/FillShadowPanel.tsx` | right dock tab **Fill & Shadow** (`appearance`): fill None / Solid / Linear / Radial, gradient stop bar (add / drag / select / delete / reverse, position, angle or center + size, presets, Edit on canvas), **Color harmony** (`FillHarmony`), object opacity (moved from the footer; `previewOpacity` while dragging, `setOpacity` on release), shadow (`ShadowControls`: presets, color, shadow opacity, blur, X/Y). Reads via `hooks/useSelectionStyle` (groups: the painted child); writes `setFill`, `applyGradientFill`, `setShadow`, `setGradientEditing`. Replaced the footer gradient toggles + `ShadowDropdown` (deleted). |
| organism | `FillHarmony` | `organisms/FillHarmony.tsx` | Fill & Shadow **Color harmony** section (`{ fill, onSolid(hex), onGradient(g) }`): the five schemes of the fill color (solid color, or the first gradient stop), one card each with name + hint, a joined swatch strip (check mark on the current fill) and hex values. Swatch = solid fill (`setFill`), **Gradient** = the scheme as evenly spaced stops (`harmonyGradient`, keeps the current gradient's type / angle / center; `applyGradientFill`), copy = hex values `#FF0000, #00FF00, …`. Base anchoring shared with the picker (`hooks/useHarmonyBase`). No fill: a hint; grays: Monochromatic only + hint. |
| organism | `ShadowControls` | `organisms/ShadowControls.tsx` | Fill & Shadow **Shadow** section (`{ shadow, onChange(s, history?) }`), split out of `FillShadowPanel` unchanged. |
| molecule | `OverflowToolbar` | `molecules/OverflowToolbar.tsx` | `items: {id, node}[]`, `divider?`; one row, overflow into a "More tools" menu; each item mounted once |
| organism | `ColorThemePicker` | `organisms/settings/ui/ColorThemePicker.tsx` | `value`, `onChange`; radio cards (swatch + name, arrow keys) for Settings > Color theme |
| molecule | `ToolbarPopover` | `molecules/ToolbarPopover.tsx` | `label` (button + dialog name, tooltip), `trigger` (button content; a chevron is added), `children`, `className?`. Panel portalled under the button, closes on outside click / Escape (focus back to the button), opening focuses the checked option. Used by the Pen "Stroke style". `GridMenu` has its own copy of this logic (follow-up: BUG-203) |
| molecule | `OriginSelector` | `molecules/OriginSelector.tsx` | `value` (anchor id), `onChange({ id, originX, originY })`, `size?`; 9-point radiogroup "Anchor point" drawn as a mini selection box (dashed box + 9 square handles, chosen one filled), arrow keys; `ANCHOR_POINTS`. Lives in `ShapeToolsHeader` right before X / Y / W / H / R (removed from the top toolbar) |
| atom | `NumberField` | `atoms/NumberField.tsx` | `value`, `onCommit(n)` (once per finished edit / step), `min?`, `max?`, `step?`, `precision?`, `label?` (inside, left), `unit?`, `stepper?` (`'inline'` = [− value +] default, `'stack'` = small ▲▼ on the right for dense rows, `false`), `incrementLabel?` / `decrementLabel?`, `size?` (`'panel'` = 28 px default, `'toolbar'` = follows Settings > Icon size via `--ui-btn`), `aria-label`. Button icons are sized as a % of the button (never cut at sm / md / lg). Figma-style typing (Enter / blur / click outside apply, Escape cancels, empty reverts, ↑↓ nudge). The outside click commits on `pointerdown` (capture), before the canvas changes the selection. Buttons: click = step, Shift = ×10, press and hold repeats (400 ms, then every 60 ms), disabled at min / max, never take focus (step from the typed draft). Used by the transform row (`stack`, `toolbar`, 96 px), Text panel / float font size and `LabeledInput` / `TransformInput` (`inline`) |
| organism | `FloatingTextToolbar` | `organisms/FloatingTextToolbar.tsx` | `target`; **the one text float of the app**: text boxes, text shapes and sticky notes (CanvasBoard shows it when `isTextFloatTarget(selectedObject)`). macOS capsule: **Font** (borderless pop-up) \| **Size** (`NumberField` pill, − / + step 1, 1–1000) \| **Style** (B / I / U, `aria-pressed`) \| **Alignment**. No colours (Text panel / palette). Writes through `updateText` (text shapes are re-fitted); `data-text-float` keeps the shape text editor open while the focus is in it, and after a change the focus goes back to the text being typed. Look: `lib/floatChrome.ts`. |
| organism | `BooleanOperations` | `organisms/BooleanOperationsDropdown.tsx` | footer shape operations: one compact "Shape ops" dropdown (action menu, never keeps a value) with Union / Subtract / Intersect / Exclude / Divide / Crop / Mask (icon + description); disabled until 2 non-text shapes selected; geometry in `lib/booleanOps.ts` |
| atom | `Chip` | `atoms/Chip.tsx` | filter pill: `active`, `icon?`, button props (aria-pressed) |
| atom | `Textarea` | `atoms/Textarea.tsx` | `label?`, `mono?`, textarea props; same box as `Input` |
| atom | `ControlSizeContext` / `useControlSize` | `atoms/controlSize.ts` | default control size; `PanelLayout` provides `sm` |
| molecule | `PanelAction` | `molecules/PanelAction.tsx` | final action of a panel: `Button` props + required `icon`; always primary, `lg`, full width |
| molecule | `EmptyState` | `molecules/EmptyState.tsx` | `icon?, title, description?, action?` |
| template | `PanelLayout` | `templates/PanelLayout.tsx` | `title, icon?, actions?, onClose?, footer?, padded?, fullSize?, scrollRef?, onScroll?`. The only panel header; used by `SidebarPanel` and `DockRoot` |

Removed (replaced by the above): `PanelHeader`, `CloseButton`, `templates/Dock.template` (they drew a second header).

## Other shared atoms/molecules (reachable)

`Swatch`, `GlowDivider`, `Brand`; molecules `Tooltip`, `TransformInput`,
`PaintTargetSwatch`, `Tile`, `BrandLogo`, `SearchInput`, `List`, `Card*`.
Props are local and simple; read the file. (`components/portals/*` is used only by the dead `organisms/Header.tsx`.)

## Hooks

| Hook | File | Purpose |
|---|---|---|
| `useKeyboardShortcuts` | `hooks/keyboard/useKeyboardShortcuts.ts` | window keydown → match `commands[].shortcut` (via `replaceToShortcut`) → `runCommand` |
| `useShapeFactory` | `hooks/shape/useShapeFactory.ts` | shape panel actions (add/drag-to-create shapes, connectors, custom shapes) |
| `useAnimationTheme` | `components/hooks/useAnimationTheme.ts` | light/dark CSS vars for the Animation panel |
| `useActiveObjects` | `organisms/effects/ui/useActiveObjects.ts` | subscribe to canvas selection |
| `useImageFilters` | `organisms/filter/ui/useImageFilters.ts` | apply filters to selected images, flush to history |
| `useSearch` | `hooks/useSearch.tsx` | command palette search |
| `usePageTitle` | `lib/utils/usePageTitle.ts` | `document.title` |

## Dead code

Deleted in batch 1 (approved, DECISIONS Q8): 95 files unreachable from `src/main.tsx` plus the old
`components/store/slices/layersSlice.ts` (LayersPanel now imports its types from `createLayersSlice`), and the Fabric
type shims in `src/types/`. Backups of the deleted files: `.dead-code-backup-2026-11-06.tar.gz` and
`.dead-code-backup-2026-11-06-b.tar.gz` in the repo root (git-ignored; delete them once you're happy).
`organisms/Header.tsx`, `PanelManager`, `LayerPanel1`, `ShapePanel1`, `Editor1`, `CanvasBoardFreeHand`,
`DesignFrame/*`, the Redux leftovers and the old `effects/ui/Engine.tsx` no longer exist.
Every remaining file under `src/` is reachable from `main.tsx` (checked with an import-graph scan).

## Node float (`organisms/NodeToolbar.tsx`)

Shown by `CanvasBoard` above the edited shape while `nodeMode` (same anchor logic as the text float; 16 px gap,
there is no rotation handle). Capsule (`FLOAT_BAR_CLASS`). Reads `nodeMode`, `selectedNode`; calls NodeEditor
`addNodeToPath`, `deleteSelectedNode`, `setSelectedNodeType`, `setSelectedSegments`, `setPathClosed`,
`breakPathAtSelectedNode`, `moveSelectedNode`, `exitNodeMode` (Done), `cancelNodeMode` (Cancel). Disabled states
from `selectedNode.canDelete / canBreak`; Close / Open path swaps on `selectedNode.closed`.

## Animation panel (`organisms/animation/`)

The Animate tab is laid out in the order people work: what is selected, add an animation, timeline, keyframe,
export. `AnimationPanel.tsx` only composes; each part reads the store with its own selectors.

| File | Job |
|---|---|
| `AnimationPanel.tsx` | Composition, `bindAutoKey`, "Clear all animations". Leaving the tab pauses playback and turns auto-key off (BUG-181) |
| `SelectionSummary.tsx` | What is selected on the canvas, whether it is animated, remove its animation |
| `PresetPicker.tsx` + `PresetTile.tsx` + `presetDemos.ts` | Presets as tiles that play on hover. The preset just added is swapped by the next pick of the same kind, and re-timed by the timing fields, until another edit, another selection or the playhead leaving it. Starts: playhead / start / after last. Preview = `previewRange` |
| `Transport.tsx` | Play, step, loop, keyframe undo / redo, snap, speed, timecode |
| `Timeline.tsx` + `TimelineRuler.tsx` + `TimelineTrack.tsx` | Ruler (scrub, work area), one row per track (name, mute / remove on hover, keyframes, property rows), timeline length, zoom. Click a keyframe = select + seek; double-click a row = keyframe there |
| `KeyframeTools.tsx` | "Keyframe at playhead", Auto-key |
| `KeyframeInspector.tsx` + `CurveEditor.tsx` | Easing (named or custom bezier), time and values of one keyframe (lengths in Settings > Units, scale / opacity in %) |
| `ExportSection.tsx` + `export.config.ts` | Video / PNG export settings and progress |
| `animation.logic.ts` | Pure: timecode, ruler ticks, snapping, preset start / end, `keyCommand` (key → panel command) |
| `animation.labels.ts` | Names for properties and easings, value formatting |
| `useAnimationCanvas.ts` | `useCanvasSelection` (selection events), `usePresentIds` (object added / removed) |
| `useAnimationKeys.ts` | Runs `keyCommand`; handled keys stop here (BUG-018); Space rule = `useSpacePan` (BUG-178) |
| `useKeyframeDrag.ts` | Select / drag keyframe markers (3 px before a press becomes a drag; one undo step per drag) |
