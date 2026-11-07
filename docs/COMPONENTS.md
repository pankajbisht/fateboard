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
| Page size / orientation | left **Canvas Size** panel | Pages panel "Page setup", Settings page size / orientation |
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

Kept on purpose: right-click / layer context menus and the command palette repeat commands by design (shortcuts to the same actions, not a second UI to maintain).

## Editor shell (mounted at `/draw`)

| Component | File | Props | Slices used |
|---|---|---|---|
| `EditorPage` | `pages/Editor/Editor.tsx` | `{ onToolChange?(tool) }` | Canvas (`canvas, activeTool, setActiveTool, selectedPreset, setSelectedPreset`), Text (`addText`), Brush (`color`*shared*, `width`), Setting (`settings.freehand`), `setWorkspaceMode` (*missing*) |
| `EditorTemplate` | `templates/Editor.template.tsx` | `{ header, leftSidebar, rightPanel, canvasBoard, footer }` (ReactNodes) | none |
| `Header` | `organisms/header/ui/Header.tsx` | none | none (composes TopToolbar + ShapeToolsHeader) |
| `TopToolbar` | `organisms/toolbars/ui/TopToolbar.tsx` | none | renders bars below |
| `FileBar` | `toolbars/ui/bars/FileBar.tsx` | none | Setting (`iconSize`), Canvas (`canvas`); config `FileBarConfig` → `clearBoard`, `saveBoard`; Open → `feature/import` |
| `EditBar` | `bars/EditBar.tsx` | none | config `EditBarConfig` → Layers (`copy, cut, paste, duplicate, clone, removeLayer`), Transform (`hasSelection`) |
| `AlignmentBar` | `bars/AlignmentBar.tsx` | none | config → Layers (`alignObjects`) |
| `GroupBar` / `LockBar` / `LayerControlBar` / `FlipBar` | `bars/*.tsx` | none | Layers (`groupLayers, ungroupSelected, isGroupSelected, lock, unlock, bring*/send*`), Canvas (`hasMultipleSelection`), Transform (`transform, setTransform`) |
| `UndoRedoBar` | `bars/UndoRedoBar.tsx` | none | **commented out of TopToolbar**; config `undo/redo` resolves to Animation (BUG-001) |
| `ExtraBar` | `bars/ExtraBar.tsx` | none | Notebook (`gridEnabled, snapEnabled, toggleGrid, toggleSnap`), Canvas; share via `localStorage`; navigates to help/settings |
| `OriginBar` → `OriginSelector` | `toolbars/ui/TopToolbar.tsx`, `molecules/OriginSelector.tsx` | `{ size?=24, value?='c', onChange?(OriginChoice) }` | Transform (`transform.id`, `setOrigin`) (fixed BUG-042) |
| `ShapeToolsHeader` | `organisms/ShapeToolsHeader.tsx` | none | Transform (`transform, setTransform, hasSelection, setRadius`), Canvas (`canvas`, `selectedObject` via `useStore()` **no selector**) |
| `EditorSidebar` | `organisms/editorsidebar/ui/EditorSidebar.tsx` | `EditorSidebarProps { items, initialActiveId?, railWidth?, panelWidth?, defaultExpanded?, className?, onActiveChange?, onToolChange? }` | none directly; items from `editorsidebar.config.tsx` |
| `SidebarRail` / `SidebarPanel` | `organisms/sidebar/ui/*.tsx` | `{ items, activeId, expanded, canExpand, width, onSelect, onToggle }` / `{ item, expanded, width, onClose }` | none |
| `CanvasBoard` | `organisms/board/ui/CanvasBoard.tsx` | `{ mode?: 'design'\|'whiteboard', pageSize?: CanvasPreset\|null }` | Canvas (`init, dispose, exportJSON, importJSON, canvas, selectedObject, selectedPreset, clearToolbar`), ContextMenu (`openMenu`), UndoRedo (`saveState, initHistory`), Setting (`settings.freehand`); mounts `useKeyboardShortcuts` |
| `Ruler` | `organisms/board/ui/Ruler.tsx` | `{ orientation, length, origin, scale, extent, pointer }` | none |
| `FloatingTextToolbar` | `organisms/FloatingTextToolbar.tsx` | `{ target }` | Text (`updateText`) via `useActiveText` |
| `DockRoot` | `organisms/DockRoot.tsx` | none | ShapeStyle (`handleColorChange, setActivePaint, setStrokeWidthN`) via selectors; hosts `ColorPicker`, `TabsRail`, `DockPanel`. The column left of the palette holds every non-swatch item, all as equal square boxes the size of a swatch (`data-dock-box`, `size-[var(--ui-swatch)]`: 18 / 20 / 24 px by Settings > Icon size): `PaletteTools` (All colors, custom picker, hex, eyedropper), then `RecentColors`. The fill / stroke toggles live in the footer (`PaintToggle`). There is no "painting" indicator here; the footer Fill/Stroke tiles (`StrokeControls`) and panel `PaintTargetSwatch`es choose what the palette paints.  |
| `ToastHost` | `organisms/ToastHost.tsx` | none | Dialog (`toast, dismissToast, runToastAction`). Mounted once in `RootLayout`. One toast at a time (`role="status"`), bottom centre above the footer (`bottom-16`), optional action button (e.g. Undo after applying a template, Q11), Dismiss ×, hides after `duration` (6 s). |
| `ErrorBoundary` | `organisms/ErrorBoundary.tsx` | `onReload?`, `onDownload?` (tests) | none: reads only `projectStorage`. Wraps the routed pages in `RootLayout` (`key` = path). On a render error shows Reload / Download autosave / Start with an empty board (inline confirm). |
| `DialogHost` | `organisms/DialogHost.tsx` | none | Dialog (`dialogQueue, resolveDialog`). Mounted once in `RootLayout`; renders the store's confirm/alert dialogs on `Modal`. Confirm button is always brand primary; `tone: 'danger'` only switches the icon to a red warning and focuses Cancel first. |
| `Icon` (atom) | `atoms/Icon.tsx` | `{ name: IconName, filled?, spin?, size? = '1.2em', className?, aria-label?, ...LucideProps }` | none. The only icon component (Lucide registry `ICONS`, keys kebab-case). Unknown names render nothing. |
| `Modal` + `ModalButton` (molecule) | `molecules/Modal.tsx` | `{ open, onClose, title, description?, children?, footer?, size?: 'sm'\|'md'\|'lg', role?, initialFocusRef?, closeOnBackdrop?, showClose?, icon?, tone? }` / `{ variant?: 'primary'\|'secondary'\|'danger', buttonRef?, ...button }` | none. The app's one modal shell: portal, focus trap, Escape/backdrop close, scroll lock, focus restore, stops key events reaching window shortcuts. `TemplatePreviewModal` does not use it yet (BUG-061). |
| `DockPanel` | `organisms/DockPanel.tsx` | `{ open, width?, snapPoints?, onToggle, onWidthChange?, scrollRef, onScrollSave, children }` | none |
| `TabsRail` | `organisms/tabs/ui/TabsLayout.tsx` | `{ tabs: TabConfig[], activeTab, panelOpen, onSelect, onRemove }` | none; tabs from `config/tabs.config.tsx` |
| `ColorPicker` (organism) | `organisms/ColorPicker.tsx` | none | **The app's only color picker.** Strip = White, Black, then every shade of the 22 Tailwind families (each family 900 → 50 in its own group with a divider; data in `lib/palette.ts`). Every swatch is a button named "Red 300 · #ffa2a2"; the current color (paint target, else active fill / stroke / shadow) gets a ring and is centered in the strip when it changes off screen. Also exports `PaletteTools` (All colors grid, Custom color + `#` → `ColorPickerPopover`, eyedropper) and `RecentColors` (last 8 picked colors, memory only), which `DockRoot` renders in the left column. The **All colors** grid (dialog left of the dock) shows the same colors as rows = families, columns = 50–900; stays open while trying colors; arrows move, Escape / outside click / the button close it. ShapeStyle (`handleColorChange, fill, stroke, activePaint, paintTarget`), Text (`shadowColor`), Brush (`recentColors, commitRecentColor`) |
| `ColorPickerPopover` | `organisms/ColorPickerPopover.tsx` | `{ anchor, color, onChange(hex), onClose(refocus), focusHex? }` | **In-app custom color picker** (replaced the browser `<input type=color>` dialog and the old hex box). Saturation / brightness square + hue slider (drag with pointer capture, 1 update per frame; arrow keys, Shift ×10, Home / End on hue), eyedropper, Original (click = revert) vs New, hex field (3 / 6 digits, Enter / blur apply, first Escape reverts the field) + R G B `NumberField`s, Recent colors. Keeps its own HSV so the hue does not jump on grays; follows outside changes (a palette click) unless it is its own echo. Opened by `PaletteTools`: changes apply live through `handleColorChange` (the 150 ms history debounce makes a drag one undo step); the final color goes to Recent once, on close. Reads Brush `recentColors`. |
| `PaintToggle` | `organisms/PaintToggle.tsx` | `{ paint: 'fill' \| 'stroke' }` | Footer toggle (16 px, right after the Fill / Stroke label via the `Tile` `after` slot; tooltip above) for the selection's fill / stroke: outlined square = stroke, solid square = fill; red slash = none (hover previews Add in brand blue), hover on a present one previews the slash. Name + tooltip = the action (`Remove stroke` ⇄ `Add stroke`, `Remove fill` ⇄ `Add fill`); disabled with nothing paintable (`Add or remove …`, tooltip says select an object). Re-reads on selection / modify / add / remove events and store fill / stroke / width / history changes. ShapeStyle (`toggleFill`, `toggleStroke`, `fill`, `stroke`, `strokeWidth`), UndoRedo (stack lengths). |
| `PaintTargetSwatch` (molecule) | `molecules/PaintTargetSwatch.tsx` | `{ id, label, value, onChange(hex), showLabel?, disabled?, tone?, className? }` | ShapeStyle (`paintTarget, setPaintTarget`). Used instead of a color input in every panel; releases its target on unmount. |
| `Footer` | `organisms/footer/ui/Footer.tsx` | none | left: `StrokeControls` (Fill / Stroke rows with `PaintToggle`, width, style, shape ops); right (`data-testid="footer-view"`): `ZoomControl` = **the app's one zoom control**: − slider + (log scale, page size under the slider), the visible % (click = 100%, `actualSize`), Fit (`fitToScreen`, `zoom-fit` icon), then `FullScreen`. 16 px inset both sides. |
| `StrokeControls` | `organisms/StrokeControls.tsx` | none | ShapeStyle (`activePaint, fill, stroke, strokeStyle, strokeStyleList, setStrokeStyle, setStrokeWidthN, setActivePaint, setOpacity`, `opacity` *shared*), Text (`strokeWidth` *shared*), Canvas (`hasActiveShape, geditor, canvas, selectedPreset, setSelectedPreset`), `workspaceMode/setWorkspaceMode` (*missing*) |
| `FullScreen` (molecule) | `molecules/FullScreen.tsx` | none | UI (`toggleFullscreen, isFullScreen`), Setting |
| `ContextMenu` | `organisms/ContextMenu.tsx` | none | ContextMenu (`visible, items, x, y, closeMenu`); filters items by `when()` |

## Left sidebar panels (`editorsidebar.config.tsx`)

Rendered inside `PanelLayout` by `SidebarPanel` (title, icon and close come from the config item). `fullSize: true`
(Canvas size, Templates, Font templates, Layers) = the panel keeps fixed bars and scrolls its own list; otherwise the
body scrolls with standard padding and section spacing.

| Item id | Kind | Component | Props | Slices used |
|---|---|---|---|---|
| `select`, `pan`, `node` | action | none | none | `setActiveTool` via `EditorPage.handleToolChange`. Rail pressed state comes from the store's `activeTool` (`EditorSidebar activeTool` prop): tools light up from the store, panels only while open; tooltips show the shortcut (`shortcut` on the item) |
| `draw` | panel (+tool `draw`) | `DrawPanel` (`organisms/DrawPanel.tsx`) | none | Brush (all), Canvas; reads `color`/`opacity`/`shadowColor`/`fillColor` (*shared*); `undo/redo` if present (Animation); window `[`/`]` keys |
| `shapes` | panel | `ShapePanel` | `{ closePanel?(type?) }` | Shape (`addShape` via `useShapeFactory`, `activeConnector, updateConnectorStyle, normalizePathData, customShapes, saveSelectionAsShape, saveCustomPath, removeCustomShape`), Text (`strokeWidth` *shared*) |
| `text` | panel (+tool `text` → `addText({})`) | `TextPanel` | none | Text (`addText`, `updateText`, `setTextCase`, `fonts`); reads the selection live via `hooks/useActiveText` (canvas events). Sections: Add text presets, Font (family, size, B/I/U/S, case, alignment), Spacing, Color (+ highlight), Effects (outline, shadow, opacity). |
| `canvas-size` | panel | `CanvasSizePanel` via container | `Partial<{ selectedPreset, onSelectPreset }>` | Canvas (`selectedPreset, setSelectedPreset`), `setWorkspaceMode` (*missing*, optional-called) |
| `templates` | panel | `TemplateGallery` | `{ className?, loading? }` | Template (all) |
| `fonttemplates` | panel | `FontTemplatePanel` | none | Canvas (`canvas, persist`), UndoRedo; `localStorage` `fateboard:fontTemplates` |
| `Pages` | panel | `PagePanel` | none | Pages (list, add / duplicate / delete / rename / reorder, PageUp / PageDown), Page (`pageBackground` via `PaintTargetSwatch`), Clear page. **No** page size (Canvas Size panel), zoom (footer), export (Export tab) or save / open (top bar File). |
| `layers` | panel | `LayersPanel` | none | Layers (`layers, selectedLayerIds, bindLayerEvents` + actions), Canvas |

## Right dock tabs (`config/tabs.config.tsx`)

Rendered inside `PanelLayout` by `DockRoot` (title = tab label, close collapses the dock; scroll position per tab).

| Tab id | Component | Slices used |
|---|---|---|
| `tiling` | `PathEffects` | advanceOperation (`repeatGrid, createPattern, previewPatternTile, applyPattern, clearPattern, deletePattern, patterns`), Canvas |
| `rotate` | `RepeatRadially` | advanceOperation (`repeatRadially`), Canvas |
| `along-path` | `RepeatAlongPath` | advanceOperation (`addObject, removeObject, repeatAlongPath`), Canvas, Page (`scale`) |
| `filter` | `Filters` (+ `useImageFilters`, `filterEngine`) | Canvas, UndoRedo (`saveState`) via `useImageFilters`; the Filter slice is **not** used by any mounted UI (only dead `Brightness.tsx`) |
| `export` | `ExportCanvas` | Canvas via `useStore()` no selector; own export pipeline (PNG/JPEG/SVG/JSON, crop, background) |
| `animate` | `AnimationPanel` (+ `CurveEditor { easing, bezier, onChange, mixed? }`, `useAnimationTheme`) | Animation (all), Canvas; React `onKeyDown` shortcuts (BUG-018) |

## Other routes

| Component | File | Props | Notes |
|---|---|---|---|
| `RootLayout` | `templates/RootLayout.tsx` | none | `db.local.get('fateboard-settings')` → `hydrate`; renders `<Outlet/>` after hydration |
| `WhiteboardMarketingSite`, `MiniWhiteboard`, `ImageSlider` | `pages/web/*` | none | marketing; `MiniWhiteboard` is a plain 2D `<canvas>` (no Fabric, no store) |
| `EditorSettingPage` → `Preferences` | `pages/Setting`, `organisms/settings/ui/Preferences.tsx` | none | Setting: Appearance (theme, colour theme, icon size), Canvas (Freehand on / off; points to the Canvas Size panel), Units, Reset. Only preferences the editor reads: page size, orientation, background pattern / colour, grid spacing and snap were removed (saved but never read; page size lives in Canvas Size, grid / snap in the top bar). |
| `CommandPalette` | `pages/Command/CommandPalette.tsx` | `{ commands }` | static `commandRegistry` |
| `SharePage` | `pages/SharePage/SharePage.tsx` | route `:docId`, `?mode=view` | own `fabric.Canvas`; `localStorage` `board:<id>`; v5 `loadFromJSON` callback (BUG-014) |
| `HelpPage` | `pages/HelpPage/HelpPage.tsx` | none | static help sections |
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
| organism | `FillShadowPanel` | `organisms/FillShadowPanel.tsx` | right dock tab **Fill & Shadow** (`appearance`): fill None / Solid / Linear / Radial, gradient stop bar (add / drag / select / delete / reverse, position, angle or center + size, presets, Edit on canvas), object opacity (moved from the footer; `previewOpacity` while dragging, `setOpacity` on release), shadow (presets, color, shadow opacity, blur, X/Y). Reads via `hooks/useSelectionStyle` (groups: the painted child); writes `setFill`, `applyGradientFill`, `setShadow`, `setGradientEditing`. Replaced the footer gradient toggles + `ShadowDropdown` (deleted). |
| molecule | `OverflowToolbar` | `molecules/OverflowToolbar.tsx` | `items: {id, node}[]`, `divider?`; one row, overflow into a "More tools" menu; each item mounted once |
| organism | `ColorThemePicker` | `organisms/settings/ui/ColorThemePicker.tsx` | `value`, `onChange`; radio cards (swatch + name, arrow keys) for Settings > Color theme |
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

`ColorSlider` (not mounted), `Swatch`, `Toast`, `GlowDivider`, `Brand`; molecules `Tooltip`, `TransformInput`,
`PaintTargetSwatch`, `Tile`, `BrandLogo`, `SearchInput`, `List`, `Card*`.
Props are local and simple; read the file. (`components/portals/*` is used only by the dead `organisms/Header.tsx`.)

## Hooks

| Hook | File | Purpose |
|---|---|---|
| `useKeyboardShortcuts` | `hooks/keyboard/useKeyboardShortcuts.ts` | window keydown → match `commands[].shortcut` (via `replaceToShortcut`) → `runCommand` |
| `useShapeFactory` | `hooks/shape/useShapeFactory.ts` | shape panel actions (add/drag-to-create shapes, connectors, custom shapes) |
| `useAnimationTheme` | `components/hooks/useAnimationTheme.ts` | light/dark CSS vars for AnimationPanel |
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

