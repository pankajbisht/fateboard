# Design system

Brand tokens for fateboard's UI. Source of truth: the `@theme` block in `src/index.css` (Tailwind 4 turns each token
into utilities). Canvas / inline-style code uses the mirror `BRAND` in `src/lib/theme.ts`.
`src/__tests__/theme.test.ts` keeps the two in sync and fails on raw `blue-*` / `indigo-*` / `violet-*` / `sky-*`
classes in UI code.

Colors come from the logo (`public/fate.svg`, `public/fateicon.svg`): blue gradient `#22a7ff → #0a60d6` on a
`#e0f0ff` circle, with an orange pencil dot `#ff7f0e`.

## The 5 core colors

| # | Name | Token / class | Hex | Use for |
|---|---|---|---|---|
| 1 | **Fate Blue** | `primary-600` | `#0a60d6` | Primary buttons, active tab/tool, links, selection handles, focus |
| 2 | **Sky** | `primary-400` | `#22a7ff` | Highlights, hover glow, gradients (`from-primary-400 to-primary-600` = logo gradient) |
| 3 | **Mist** | `primary-100` / `primary-50` | `#e0f0ff` / `#f0f8ff` | Selected rows, active chip background, info panels |
| 4 | **Pencil Orange** | `accent-500` | `#ff7f0e` | Rare highlights only: "New"/"Pro" badges, recording, a single call-out per screen |
| 5 | **Ink** | `ink` / `ink-muted` / `ink-subtle` | `#0f1b2d` / `#4a5568` / `#8a94a6` | Text: headings / secondary text / placeholders and icons |

Supporting tokens:

| Group | Classes | Hex |
|---|---|---|
| Surfaces | `bg-surface`, `bg-surface-muted` | `#ffffff`, `#f5f8fc` |
| Lines | `border-line`, `border-line-strong` | `#e3e8ef`, `#cbd3df` |
| Status | `text-success` / `bg-success`, `warning`, `danger` (+ `danger-hover`) | `#16a34a`, `#f59e0b`, `#dc2626` (`#b91c1c`) |

Full scales: `primary-50 … primary-950` and `accent-50 … accent-950`. Neutral greys stay Tailwind `gray-*`/`slate-*`
where no semantic token fits.

### Contrast rules (WCAG AA, measured)

| Pair | Ratio | Rule |
|---|---|---|
| white on `primary-600` | 5.74 | ✅ default for filled buttons |
| white on `primary-700` | 7.73 | ✅ hover / pressed |
| white on `primary-500` | 3.80 | ⚠️ large text or icons only (old `blue-500` was 3.68) |
| `primary-600` text on white | 5.74 | ✅ links, active labels |
| `primary-600` on `primary-100` | 4.94 | ✅ selected chip / row |
| white on `accent-500` | 2.53 | ❌ never. Put `text-ink` on orange (6.83) |
| `accent-700` text on white | 4.63 | ✅ orange text |
| `ink-muted` on white | 7.53 | ✅ secondary text |
| `ink-subtle` on white | 3.06 | ⚠️ placeholders, icons, disabled only |
| white on `danger` | 4.83 | ✅ destructive buttons |

### Accessibility checks

`e2e/a11y.spec.ts` runs axe (WCAG 2.1 A / AA + best-practice landmarks) on `/`, `/draw`, `/setting`, `/help` in light
and dark mode with reduced motion; it must stay at zero violations. Rules it enforced (2026-11-07):
- `ink-subtle` only for placeholders, icons and disabled text; information (e.g. the footer page size) uses `ink-muted`.
- Controls that are dimmed because they are inactive sit in a group with `aria-disabled` (footer paint tiles).
- Brand text on a tinted background: `primary-ink` on `primary-100` or lighter (`primary-200` is 4.15:1).
- Every image has `alt` (`Brand` defaults to "Fateboard"; `alt=""` inside a labelled button).
- One `<header>` / `<main>` / `<footer>` landmark per page; organisms inside a template use `div`.

## Text styles

Each sets size, line height, weight and letter spacing. Add a color class (`text-ink`, `text-ink-muted`).

| Class | Size / line | Weight | Use |
|---|---|---|---|
| `text-display` | 24px / 1.25, -0.02em | 700 | Page and marketing headings |
| `text-title` | 16px / 1.35, -0.01em | 600 | Modal and panel titles |
| `text-body` | 13px / 1.55 | 400 | Paragraphs, descriptions, form text |
| `text-label` | 11px / 1.3, +0.06em | 600 | Section labels (pair with `uppercase`), field labels |
| `text-caption` | 11px / 1.45 | 400 | Hints, metadata, helper text |

Font: `font-sans` = Inter when installed, else the system UI font (no web-font download).

## Shape and depth

| Token | Value | Use |
|---|---|---|
| `rounded-sm` | 4px | Inputs inside dense panels, swatches |
| `rounded-md` | 6px | Buttons, chips, icon buttons |
| `rounded-lg` | 8px | Cards, popovers, **modals** |
| `rounded-xl` | 10px (was 12px) | Large cards only |
| `rounded-2xl` / `3xl` | 12px / 16px (were 16px / 24px) | Marketing pages only |
| `rounded-full` | | Avatars, toggles, pills |

Shadows: `shadow-sm` for cards, `shadow-lg` for popovers, `shadow-xl` for modals. Borders: `border-line`.

## Component recipes

```tsx
// Primary button
'h-8 rounded-md bg-primary-600 px-3.5 text-xs font-semibold text-white hover:bg-primary-700
 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400'
// Secondary button
'h-8 rounded-md border border-line-strong bg-surface px-3.5 text-xs font-semibold text-ink hover:bg-surface-muted'
// Danger button
'h-8 rounded-md bg-danger px-3.5 text-xs font-semibold text-white hover:bg-danger-hover'
// Selected list row / chip
'bg-primary-50 text-primary-700 ring-1 ring-primary-200'
// Badge (accent)
'rounded-sm bg-accent-100 px-1.5 text-label uppercase text-accent-700'
```

Modals: always `molecules/Modal.tsx` + `ModalButton` (see COMPONENTS.md). Confirms and alerts: `confirmDialog` /
`alertDialog`.

## Color themes

Settings > Appearance > **Color theme**: Fate Blue (default), Ocean, Violet, Rose, Emerald, Graphite. `applyColorTheme()` sets `data-theme` on `<html>`; `index.css` swaps the `--color-primary-50…950` scale in `:root[data-theme='…']` blocks. Everything built on the tokens follows (buttons, selections, sliders, focus rings, tints, brand text, rail highlight, the board). Rules:

- Only the **primary** scale changes; accent, status and neutrals stay. The logo stays Fate Blue.
- Per theme, 600 / 700 / 800 carry white text (≥ 4.5:1) and 300 is brand text in dark mode (≥ 4.5:1), tested in `colorThemes.test.ts`. Scales were shifted one step darker where the plain Tailwind 600 failed (Ocean, Emerald).
- Theme-relative tokens: `--color-primary-ink` = `var(--color-primary-600)` (dark: `-300`); dark tints = `color-mix(var(--color-primary-400) N%, transparent)`; `--color-workspace` and `--color-board` (whiteboard paper) are `color-mix` of the theme with a neutral, so the board is tinted, not flat gray.
- `:root.dark` (not `.dark`) so dark tokens win over the theme blocks (same specificity, later in the file).
- Canvas-painted chrome reads the tokens at draw time: selection handles (`lib/fabricChrome.selectionChrome`, restyled on theme change by CanvasBoard), ruler pointer, origin selector.

## Dark mode

- **Brand text uses `text-primary-ink`** (light `#0a60d6`, dark `#7cc8ff`). The `primary-600…900` scale is never redefined in `.dark`: it is the hover / pressed background of white-text buttons. (Redefining 700/800 made hovered buttons light blue with white text.)
- Dark text tokens all pass AA (4.5:1) on `surface`, `surface-muted` and `surface-strong`; `line` ≥ 1.6:1 and `line-strong` ≥ 2:1 on `surface`.
- Floating things (tooltips, menus) use `bg-surface-raised` + `border-line-strong`: shadows are invisible on dark backgrounds.
- Floating format bars (`lib/floatChrome.ts`) follow macOS: translucent raised surface with blur + saturate, hairline `border-line/80`, **capsule shape** (`rounded-full`; inner tracks, buttons and fields are concentric pills, ends padded so text clears the curve), layered shadow, 28 px controls grouped in inset tracks (`bg-surface-strong`, on = raised `bg-surface` pill), short 16 px dividers, 120 ms fade + lift in (`motion-safe:animate-float-in`). Tooltips name the action only; show a shortcut only if one is wired.
- Things that paint colors themselves read tokens at draw time: rulers (`rulerColors()` + `useThemeVersion()` repaint). SVG previews use `fill-surface` / `stroke-ink` classes, inline styles use `var(--color-…)`.
- Fabric selection handles (`lib/fabricChrome.ts`): brand-blue frame, solid white corners with a blue edge, visible on the page and the dark workspace.
- **Icons:** Lucide outline icons only (custom filled glyphs with half-opacity parts fade out on dark; the old flip icon was replaced by `flip-horizontal` / `flip-vertical`).
- **Disabled:** buttons / inputs fade a bit less in dark (`dark:disabled:opacity-55/60`). A group faded as a whole carries `data-dimmed`; controls inside it don't fade a second time (`[[data-dimmed]_&]:disabled:opacity-100`).
- **Secondary text** is always `text-ink-muted` / `text-ink-subtle`, never `opacity-60` (that gave a different grey per place).
- No formatting UI is built outside React: the old plain-DOM shape float was replaced by the one React text float.
- Verified with real screenshots (headless Chrome, dark class on `<html>`): toolbars, rails, Text / Shapes / Layers panels, dock, footer.
- Guarded by `src/__tests__/darkMode.test.ts` (no fixed neutral classes, no hex in chrome components, contrast of every token pair).

Settings → Theme (Light / Dark / System; Light is the default, so a new visitor on a dark device still starts light) runs `applyTheme()`, which toggles `.dark` on `<html>`. In `index.css`:

- `@custom-variant dark (&:where(.dark, .dark *))`, so `dark:` follows the app setting, not only the OS.
- `.dark { … }` re-defines the semantic tokens: `surface` `#0f1726`, `surface-muted` `#172135`,
  `surface-strong` `#1f2b42`, `surface-raised` `#18233a`, `line` `#26324a` / `line-strong` `#34425e`,
  `ink` `#e6ebf3` / `ink-muted` `#a3adc2` / `ink-subtle` `#7d899f` (5.1:1 on surface), `workspace` `#0a101c`.
  `primary-50…200` become translucent blue tints and `primary-700…900` light blues, so "selected" styles stay readable.
- **So: build UI with tokens and it is dark-mode ready.** Raw `gray-*` / `white` classes do not switch. Do not add
  `dark:` overrides for neutrals; the tokens already change.
- Not themed on purpose: the page / artboard, palette swatches and user content. Marketing site (`pages/web`) is
  light only.

## Panels

Atomic layers (inventory with props in [COMPONENTS.md](COMPONENTS.md#panel-design-system-atoms--molecules--template)):

- **Template** `PanelLayout`: the one header (icon, title, actions, ✕), padded scroll body (`p-4`, `gap-4`), optional
  footer. `SidebarPanel` and `DockRoot` render it; **panels never draw their own title bar.**
- **Molecules**: `PanelSection` (titled group, hairline between groups, optional Reset / collapse), `Field` (label +
  control + hint), `SliderField`, `SelectField`, `LabeledToggle`, `SegmentedControl`, `EmptyState`.
- **Atoms**: `Button`, `IconButton`, `Select`, `Slider`, `Switch`, `Input`, `LabeledInput`, `Badge`, sharing
  `control.styles` (heights 28/32 px, `rounded-md`, `border-line-strong`, primary focus ring).

Rules (enforced by `__tests__/panelConsistency.test.ts`):

- No raw `<select>`, `<input type="range">`, `<input type="checkbox">` in panels: use `Select`, `Slider`, `Switch`.
- No `<h2>` title bars, `PanelHeader` or `DockTemplate` in panels.
- No `bg-white`, neutral `bg-*-50…200` or dark `bg-*-700…950` in panels: use `surface*` tokens.
- Status colours are `danger` / `success` / `accent` (warnings), never raw red / green / amber / teal.
- **Icon size (Settings > Small / Medium / Large; Small is the default)** drives every editor chrome icon through one mechanism: `applyIconSize()` sets `data-icon-size` on `<html>`, and `index.css` maps it to `--ui-btn` / `--ui-icon` (top toolbars, text toolbar groups, footer) and `--ui-rail` / `--ui-rail-btn` / `--ui-rail-icon` (left and right rails). Toolbar/footer icon buttons use `IconButton size="chrome"`; rail buttons use `railButtonBase`. Never read `settings.iconSize` in a component to size icons (guarded by `iconSize.test.tsx`). Panels keep their fixed density.
- **Bottom bar (`footer/ui/Footer.tsx`)**: 16 px inset on both sides (`px-4`, same as panel content), 12 px between the style controls and the view group, which starts after a divider (`pl-3`). Guarded by `Footer.test.tsx`.
  | Size | toolbar button / icon | rail width / button / icon |
  |---|---|---|
  | Small | 24 / 13 px | 44 / 32 / 16 px |
  | Medium (default) | 28 / 15 px | 52 / 40 / 19 px |
  | Large | 34 / 19 px | 60 / 48 / 23 px |
- **Nothing gets cut off:** the top toolbar is a `molecules/OverflowToolbar`: groups that do not fit (narrow window, Medium/Large icons) move into a "More tools" (…) menu and come back when there is room. Each group is mounted once (in the row or in the menu, which stays mounted while closed) because toolbar groups register global shortcuts. The bottom bar wraps to a second line on wide screens and scrolls sideways on phones (`max-md` and screens under 500 px tall); the header's context row (X / Y / W / H, tool options) scrolls sideways. Left rail scrolls; right rail uses its own "More tabs" menu.
- **Every screen size (BUG-215, `e2e/responsive.spec.ts`):** below `lg` (1024 px) a side panel overlays the canvas next to its rail instead of squeezing it, never wider than the screen minus its rail (`leftPanelSize` / `dockPanelSize` in `sidebar.const.tsx`); the dock panel leaves the left rail uncovered, the left panel may cover the dock. Rulers hide on phones (`RULER_HIDDEN`), the page margin is 16 px when the board's shorter side is under 480 px, the zoom slider hides under `sm`. No "use a larger screen" notice.
- **Upright phones (below `sm`, BUG-219):** the board takes the full width. The tool rail, the dock tabs and the color strips become horizontal bars under it (order: board, dock tabs, colors, tools, footer; `phoneRailBar` / `phoneActiveBar`), rails scroll sideways, the dock keeps its "More tabs" menu (opens upward), and a panel is a bottom sheet (`phoneSheet`, 55 dvh, over the board). Popovers from the dock color tools use `lib/placeBeside.ts`. Phones in landscape and tablets keep the side rails.
- **Touch (BUG-214):** never hide a control behind hover alone: whatever `group-hover` reveals is also shown on `[@media(hover:none)]` (guard `noHoverOnlyControls.test.ts`). Menu rows get `pointer-coarse:py-3`.
- **Left sidebar and right dock are one system** (`organisms/sidebar/sidebar.const.tsx`): same rail width (`SIDE_RAIL_WIDTH` 52), panel width (`SIDE_PANEL_WIDTH` 360), rail buttons (`railButtonBase` / `activeButton` / `inactiveButton`, 3px accent bar on the outer edge), panel frame and 200 ms width animation (`sidePanelFrame`), and a bottom chevron to collapse. The left side is the reference; the dock only mirrors the border and bar side.
- **Buttons: one system** (guarded by `panelConsistency.test.ts`):
  1. Panel-level action (stands alone across the panel: Export, Apply, Save, Clear all) = `molecules/PanelAction`: large, full width, always an icon. `tone="primary"` (brand blue) or `tone="danger"` (red outline). Same shape everywhere.
  2. Every other button in a panel = `Button size="sm"`: `secondary` by default, `danger-outline` when destructive, `ghost` only for list rows. Brand-filled buttons appear only as `PanelAction`.
  3. Icon-only = `IconButton` (`tone="danger"` for delete, `tone="primary"` only for Play).
  4. Dialog footers = `ModalButton` (the `Button` atom at size md).
  5. Custom `<button>` only for selectable cards / tiles / chips, overlay badges on thumbnails, and menu items.
- **Form controls: one component per job** (guarded by `src/__tests__/formControls.test.ts`, app-wide):
  | Job | Use | Never |
  |---|---|---|
  | Text / number / search | `Input` (`leadingIcon`, `suffix`), `LabeledInput` (inline label, built on `Input`) | raw `<input>` (only `type="file"` / `"color"` stay native) |
  | Multi-line text | `Textarea` | raw `<textarea>` |
  | Pick from a list | `Select` / `SelectField` (`Dropdown` in toolbars) | `<select>` |
  | On / off | `Switch`, or `LabeledToggle` with a label | checkboxes, local switch copies |
  | Pick one of 2–5 | `SegmentedControl` | local `Segmented`, tab rows |
  | Filter pills | `Chip` | hand-styled rounded-full buttons |
  | Toolbar multi-toggles (B / I / U) | `ToggleGroup` (same track look as `SegmentedControl`) | |
- **One density:** `PanelLayout` provides `ControlSizeContext = "sm"`, so every `Input`, `Select`, `SegmentedControl` and `Button` inside a panel is h-7 without a `size` prop. Outside panels (dialogs, Settings) the default is md (h-8). An explicit `size` prop still wins.
- Panel-scoped CSS must never set `color` on `button` / `input` / `select` (it overrides the tokens).
- Selected chips / rows: `bg-primary-100 text-primary-700` (or `border-primary-500 bg-primary-50` for cards).
  The main action is one primary `Button` per section; everything else `secondary` or `ghost`.
- Small text is never below 11 px (`text-caption` / `text-label`).

## Icons

Lucide (`lucide-react`), through one atom: `<Icon name="trash" className="text-xs" />` from
`components/atoms/Icon.tsx`. Font Awesome was removed (CDN and npm); `noFontAwesome.test.ts` keeps it out.

- **Size follows text:** icons are `1.2em`, so `text-xs` / `text-sm` / `text-[11px]` size them like the old icon font.
  Color is `currentColor`.
- `filled` for solid states (favourited heart, featured star), `spin` for loaders.
- Decorative by default (`aria-hidden`); pass `aria-label` when the icon is the only content of a control.
- Configs store an `IconName` string (`icon: 'gear'`); `IconName` is type-checked, so a typo fails `type-check`.
- New icon: import it from `lucide-react` and add a kebab-case key to `ICONS`.
- Lucide has no brand logos: canvas-size presets use stand-ins (YouTube → `MonitorPlay`, Instagram → `Camera`,
  Facebook → `Users`, LinkedIn → `BriefcaseBusiness`).

## Rules

- Icons = `<Icon name>` only. No `<i className="fa-…">`, no inline SVG for standard glyphs.
- UI color = a token. No raw `blue-*`, `indigo-*`, `violet-*`, `sky-*` classes (test-enforced) and no new hex
  values in components. Canvas code: `BRAND.*` from `@/lib/theme`.
- Orange is an accent, not a second primary: at most one orange element in view.
- **User content is not themed.** Palette swatches, brush presets, template fills and default shape colors are paint,
  not UI. Do not replace them with tokens.
