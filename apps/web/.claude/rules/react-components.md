---
paths:
    - 'src/components/**'
    - 'src/hooks/**'
---

# React components

Full rules: docs/CONVENTIONS.md, docs/DESIGN.md (tokens, dark mode, contrast), docs/COMPONENTS.md (every panel).

- Read state with a selector: `useStore((s) => s.x)`; several keys with `useShallow`. Never `useStore()` bare
  (`storeSelectors.test.ts`). Mutate through store actions only.
- Panels: content only, inside `templates/PanelLayout`. Build with `PanelSection` / `Field` / `SliderField` /
  `Select` / `Switch` / `SegmentedControl` / `Chip` / `Input` / `Textarea` / `Button`; panel action = `PanelAction`.
  No raw `<select>` / range / checkbox, no local toggle or chip copies (`formControls.test.ts`,
  `panelConsistency.test.ts`).
- Colours, text, radius: brand tokens only (`bg-primary-600`, `text-primary-ink`, `text-ink`, `bg-surface`,
  `border-line`, `rounded-md`). No `gray-*` / `white` in the editor, so dark mode works (`darkMode.test.ts`).
  Light-only pages (landing, gallery) wrap content in `theme-light` and avoid the translucent `primary-50…200`
  tints there.
- Icons: `<Icon name="…" />` (Lucide registry). Never Font Awesome classes (`noFontAwesome.test.ts`).
- Modals: `molecules/Modal` (+ `ModalButton`); yes / no and notices via store `confirmDialog` / `alertDialog`.
- Keyboard: shortcuts are commands (`shortcut`, `keys`, `enabled`, `allowWhileTyping`); other canvas key listeners
  return early on `canvasKeysBlocked()`. Ignore modifier chords you do not handle (browser Back, etc.).
- Sizes shown to users go through `lib/units`.
- Accessibility (axe runs in E2E on `/`, `/draw`, `/setting`, `/help`, a gallery page, light + dark): every control
  has an accessible name that contains its visible text, focus is visible (inset rings inside `overflow-hidden`),
  text contrast ≥ 4.5:1 (`text-ink-subtle` is for large or decorative text only), motion respects
  `prefers-reduced-motion`, no autoplay.
- Performance: new routes are `lazy()` chunks (`codeSplitting.test.ts`); the landing page must not import the
  command registry (`landingBundle.test.ts`); images `loading="lazy"` with width / height.
- Size budget: `.tsx` ≤ 300 lines, `.ts` ≤ 400 (`fileBudget.test.ts`). Split before you grow; data tables go in
  `DATA_FILES`.
- Effects return nothing or a cleanup function: write `useEffect(() => { doThing(); }, [])`, never
  `useEffect(() => doThing(), [])`.
