# Platforms: browser extension, desktop, mobile and tablet

Plan for taking Fateboard beyond the website: a browser extension, installable desktop apps (Windows, macOS,
Linux) and mobile / tablet apps (iPadOS, iOS, Android). Also covers Claude (AI features, MCP) and other growth
items. Written 2026-11-14. Status: **plan, nothing built yet**. Owner decisions it needs are Q14–Q18 in
[DECISIONS.md](DECISIONS.md) "Open questions".

Agents: read the section you need (`grep -n '^## ' docs/PLATFORMS.md`), follow "Working rules" (last section)
for any platform work, and do the phases in order. Anything marked `UNKNOWN - verify` must be measured before it
is relied on.

## 1. Summary (the decisions in one screen)

| Question | Recommendation | Why, in one line |
|---|---|---|
| Overall approach | **One web codebase, several thin shells.** The editor stays React + Fabric in `src/`; each platform is a shell plus a small adapter | A canvas editor is ~100 % web code; rewriting it natively (React Native, Flutter, Swift) would throw away Fabric and every tool |
| First step | **PWA** (service worker, offline, install, file handling) | Installable on Windows, macOS, ChromeOS, Android and iPad home screens in days, no store, and it forces offline-first |
| Browser extension | **WXT** (Vite-based, Manifest V3), Chrome + Edge first, then Firefox | Same Vite / React / Tailwind toolchain; one config builds every browser |
| Desktop + mobile shell | **Tauri 2** for Windows, macOS, Linux, iOS, iPadOS, Android, after a spike passes (section 6) | One shell for all five systems, small installers, a strict permission model, a real file system |
| Fallback shell | **Electron** (desktop) + **Capacitor** (mobile) | If the system WebViews (WebKit) fail the spike; the adapter layer makes the swap one folder each |
| Architecture rule | **Ports and adapters**: everything platform-specific goes through `src/platform/` (like `@/lib/storage` today) | The editor never knows where it runs; a new platform is a new adapter, not a refactor |
| Repo layout | **Stay one package** (`src/` + `extension/` + `src-tauri/`); move to workspaces only when a trigger in section 9 happens | Today's guard tests, hooks and docs assume `src/`; a monorepo now is cost without benefit |
| AI | Claude through **your own small backend** (never a key in a client), editor commands exposed as **tools** | The command registry already describes every action, so Claude can draw with real editor commands |
| Backend | **Local-first**: the app never needs it. Supabase (auth, Postgres, storage) + our own **Hono** TypeScript API for AI proxy, sync, sharing, MCP; full plan in [BACKEND.md](BACKEND.md) | One managed vendor for a small team, an API we own keeps clients vendor-independent |
| MCP | A **Fateboard MCP server** (boards as resources, diagram tools), hosted by the desktop app first | Lets Claude Desktop / Claude Code read and create boards; same diagram schema as the in-app AI |

The biggest risk is not the shell, it is **WebKit**. iOS and iPadOS only allow WebKit (every iOS shell, Tauri
or Capacitor, uses WKWebView), Tauri uses WebKit on macOS and Linux too, and Fateboard is not tested on WebKit
today (PRODUCTION_READINESS "Browsers / devices"). Making the app WebKit-correct is required for any iPad
version, whatever shell is chosen, so it is Phase 0 work.

## 2. Why leave the browser (what each target unlocks)

| Limitation in the browser tab | PWA | Extension | Desktop app | Mobile / tablet app |
|---|---|---|---|---|
| Storage can be evicted (IndexedDB) | `navigator.storage.persist()` helps, not guaranteed | `unlimitedStorage` permission | Files on disk, never evicted | App sandbox + Files app / iCloud Drive |
| Real files (open, Save in place, Save As, recent files) | File System Access only in Chromium; `file_handlers` in the manifest | Same as web | Native dialogs, file association for `.fateboard`, double-click opens | Document picker, share sheet, "Open in Fateboard" |
| Keyboard shortcuts the browser takes (`mod+O`, `mod+N`, `mod+W`, `mod+T`) | Partly (installed window) | No | Yes, native menus | Hardware keyboard on iPad: yes |
| Offline | Service worker | Bundled | Bundled | Bundled |
| Memory / big canvases | Tab limits | Tab limits | More memory, GPU | iOS limits canvas memory hard (`UNKNOWN - verify` per device) |
| System fonts | Local Font Access only in Chromium, with a prompt | Same | Enumerate installed fonts natively | Limited |
| Pen / pressure / palm rejection | Pointer events | Same | Same | Apple Pencil, S Pen: the reason to ship a tablet app |
| Distribution and trust | Install prompt, no store | Web Store listing (discovery) | Signed installer, auto-update | App Store / Play Store |
| Work next to other web pages | No | **Side panel, page capture, context menu** | Second window | Split view (iPad) |

## 3. Target architecture

```
                         ┌────────────────────────── shared app (src/) ───────────────────────────┐
                         │  components → store (zustand slices) → lib (serialization, units, …)   │
                         │                      │                                                  │
                         │          uses only these ports ▼ (never browser / shell APIs directly)  │
                         │  @/lib/storage  ·  @/platform (files, clipboard, window, menu, share,  │
                         │                     updates, capabilities)  ·  @/app/routes (APP_ROUTES)│
                         └──────────────┬──────────────────┬──────────────────┬───────────────────┘
                                        │ adapter chosen at BUILD time (Vite alias by VITE_TARGET)
                ┌───────────────────────┼──────────────────┼──────────────────┼──────────────────────┐
                ▼                       ▼                  ▼                  ▼                      ▼
        platform/web            platform/extension    platform/tauri     (fallback) platform/electron, platform/capacitor
        IndexedDB, <a download>, chrome.* / browser.*  @tauri-apps/api +
        File System Access,      side panel, capture  plugins (fs, dialog,
        service worker           tabs, context menus  store, updater, deep-link)
                ▼                       ▼                  ▼
        GitHub Pages (today)     extension/ (WXT)      src-tauri/ (Rust shell: desktop + iOS + Android)
```

### 3.1 The platform port (`src/platform/`)

One interface, one implementation per target, picked at build time so the web bundle never contains Tauri or
extension code (keeps `fate-perf` numbers honest):

```ts
// src/platform/types.ts (sketch, names to settle in Phase 0)
export type Target = 'web' | 'extension' | 'tauri';

export interface Platform {
    target: Target;
    /** Feature flags the UI reads instead of sniffing the environment. */
    can: Record<'saveInPlace' | 'recentFiles' | 'nativeMenu' | 'multiWindow' | 'autoUpdate' | 'captureTab' | 'share', boolean>;
    files: {
        open(accept: string[]): Promise<OpenedFile | null>;              // dialog / <input type=file> / picker
        save(file: SaveRequest): Promise<SavedFile | null>;               // Save (in place if possible) / download
        saveAs(file: SaveRequest): Promise<SavedFile | null>;
        recent(): Promise<RecentFile[]>;
    };
    clipboard: { writeImage(blob: Blob): Promise<boolean>; writeText(text: string): Promise<boolean> };
    window: { setTitle(title: string): void; setDirty(dirty: boolean): void; openNew(path?: string): void };
    share?: (file: SaveRequest) => Promise<boolean>;
    onOpenFile(handler: (file: OpenedFile) => void): () => void;          // file association, deep links, drag-in
    auth: { signIn(): Promise<Session | null>; signOut(): Promise<void>; getToken(): Promise<string | null> }; // BACKEND.md 4.3
}
```

Rules (become a guard test, `platformBoundary.test.ts`, modelled on `storageBoundary.test.ts`):

- Only `src/platform/**` may use `@tauri-apps/*`, `chrome.*` / `browser.*`, `showOpenFilePicker` /
  `showSaveFilePicker`, `navigator.clipboard`, `navigator.share`, `window.open`, or create `<a download>`.
- Store actions call `platform.files.*`; they keep the error rule (catch, `console.error('[slice] …')`, return
  falsy) because every adapter can fail (permission denied, user cancelled = `null`, not an error).
- The UI asks `platform.can.x`, never "am I in Tauri?".

Inventory to migrate in Phase 0 (`createObjectURL` / download / file input today): `components/config/toolbars/fileActions.ts`,
`organisms/effects/ui/ExportCanvas.tsx`, `store/slices/createCanvasSlice.ts`, `animation/exportVideo.ts`,
`organisms/ErrorBoundary.tsx` (recovery download), clipboard users in `molecules/ColorFormatFields.tsx`,
`organisms/FillHarmony.tsx`, `GalleryTutorial/TutorialExtras.tsx`, `store/slices/createUiSlice.ts`. Re-run
`grep -rlE "createObjectURL|navigator\.clipboard|showOpenFilePicker|window\.open\(" src` before starting.

### 3.2 Storage per target

`@/lib/storage` already has contracts (`KeyValueBackend`, `SyncKeyValue`) and adapters; a target only swaps
wiring in `lib/storage/index.ts` (ARCHITECTURE "Storage layer"):

| Target | Autosaved project | Settings | Documents the user names |
|---|---|---|---|
| web / PWA | IndexedDB (today) + `navigator.storage.persist()` | opendb local (today) | download / File System Access |
| extension | IndexedDB in the extension origin (separate from the website's data) + `unlimitedStorage` | `chrome.storage.local` (shared by side panel, popup, background) | download |
| Tauri desktop | app-data file via the fs plugin (atomic write: temp file + rename) | Tauri store plugin | `.fateboard` files anywhere, file association |
| Tauri mobile | app sandbox file | store plugin | document picker / Files app |

### 3.3 Routing per target

`src/app/routes/appRoutes.tsx` gains a `targets` field per route, and `rootRouter.tsx` becomes
`createRouter(target)`:

| Target | Router | Routes | Start route |
|---|---|---|---|
| web | `BrowserRouter` (today) | all | `/` |
| extension | `HashRouter` (extension pages are static files: `chrome-extension://<id>/app.html#/draw`) | `/draw`, `/setting`, `/help` | `/draw` (side panel: compact layout) |
| Tauri | `HashRouter` (reload-safe without a server fallback) | `/draw`, `/setting`, `/help`, `/command-palette`, new `/home` (recent files) | `/home` |

Web-only pieces must not run elsewhere: `RouteSeo`, the prerender plugin, sitemap, `legacyHashUrl.ts` (it would
rewrite `#/draw` hash routes away), analytics (gtag is remote code: banned in MV3 extensions, unwanted in apps),
the landing and gallery routes.

### 3.4 Build targets

One `vite.config.ts` reading `VITE_TARGET` (`web` default). Per target: the `@/platform` alias, the route set,
and web-only plugins. Planned scripts (names to confirm, exact pinned versions per CLAUDE.md):

```
npm run build                      # web (today, unchanged)
npm run dev:extension / build:extension     # WXT, outputs dist-extension/<browser>/
npm run tauri dev / tauri build             # desktop installers
npm run tauri android dev|build / tauri ios dev|build
```

### 3.5 Document format (decide before native apps)

Native apps make `.fateboard` files visible on disk and shared between devices, so the format becomes a public
contract. Before Phase 3: add a `formatVersion` + migration step on load, keep the BUG-160 / Q13 rule (only
`data:` / `blob:` / same-origin images), and decide whether images stay inline as `data:` URLs (one JSON file,
large) or move to a zip container (JSON + `assets/`). Owner decision **Q17**.

## 4. Folder structure (target, end of Phase 3)

```
fate/
├── src/                          shared app, same layout as today (CLAUDE.md "Folder map")
│   ├── platform/                 NEW (Phase 0): the only code that knows where it runs
│   │   ├── types.ts              Platform port (3.1)
│   │   ├── index.ts              re-exports the adapter the build alias points to
│   │   ├── web/                  IndexedDB, downloads, File System Access, service worker registration
│   │   ├── extension/            chrome.* / browser.* wrappers (side panel, capture, storage)
│   │   ├── tauri/                @tauri-apps/api + plugin calls
│   │   └── __tests__/            contract tests every adapter must pass (fake shells)
│   ├── app/
│   │   ├── routes/               PATHS, APP_ROUTES (+ `targets`)
│   │   ├── createRouter.tsx      Browser / Hash router per target
│   │   └── seo/                  web only
│   └── …                         components, store, lib, hooks, animation, feature (unchanged)
├── extension/                    NEW (Phase 2): WXT entrypoints only, no editor code
│   ├── wxt.config.ts             manifest (permissions), reuses the app's Vite plugins
│   ├── entrypoints/
│   │   ├── background.ts         context menus, capture, open side panel
│   │   ├── sidepanel/            index.html + main.tsx → mounts the shared App (target 'extension')
│   │   ├── popup/                tiny launcher (new board, capture visible tab)
│   │   └── app/                  full-tab editor page
│   └── public/                   extension icons
├── src-tauri/                    NEW (Phase 3): Tauri shell (Rust), desktop + mobile
│   ├── tauri.conf.json           windows, CSP, bundle ids, file associations, updater endpoint
│   ├── capabilities/             least-privilege permissions per window
│   ├── src/lib.rs                plugin setup, few custom commands (fonts list, atomic save)
│   ├── icons/
│   └── gen/apple, gen/android    generated by `tauri ios|android init`, committed
├── e2e/                          web specs (+ webkit and tablet projects, Phase 0)
├── e2e-extension/                NEW: Playwright with the unpacked extension (Chromium)
├── public/                       web assets (+ service worker output in Phase 1)
└── docs/                         + PLATFORMS.md (this file), RELEASING.md (Phase 3)
```

## 5. Tool comparison (why these picks)

| | PWA | Electron | **Tauri 2** | Capacitor | React Native / Flutter |
|---|---|---|---|---|---|
| Windows / macOS / Linux | install from browser | ✅ | ✅ | community plugin (via Electron) | partial / ✅ (rewrite) |
| iOS / iPadOS / Android | Android ✅, iPad home screen (limited) | ❌ | ✅ | ✅ | ✅ (rewrite) |
| Rendering engine | user's browser | bundled Chromium, identical everywhere | system WebView: WebView2 (Chromium) on Windows, WebKit on macOS / iOS / Linux, Chromium WebView on Android | system WebView | native, Fabric unusable |
| Installer size | 0 | large (~100 MB+) | small (a few MB to ~15 MB) | small | medium |
| Memory | browser | high | lower | lower | lower |
| Native access | web APIs only | full Node.js (broad, risky) | Rust + plugins behind explicit capabilities | plugins | full |
| Fits Vite + React | ✅ | ✅ | ✅ | ✅ | ❌ |
| Biggest risk for Fateboard | iOS limits | size, no mobile | WebKit differences (macOS, iOS, Linux WebKitGTK) | two shells to run | full rewrite |

Decision: PWA now (cheap, useful everywhere), Tauri 2 for native after the spike, Electron + Capacitor as the
documented fallback. Electron alone cannot reach the tablets you want. React Native / Flutter would mean
rewriting the canvas engine.

Extension framework: **WXT** over hand-written MV3 (no HMR, per-browser manifests by hand) and over Plasmo (less
active, its own build pipeline). WXT runs on Vite like this repo.

## 6. Phases (do them in order; each has an exit check)

### Phase 0: foundation in this repo (no new product yet)

1. **WebKit in CI**: add a Playwright `webkit` project (desktop Safari) and a tablet project (iPad viewport,
   `hasTouch`, `isMobile`). Fix what fails or file bugs. Exit: core flows + axe green on WebKit.
2. **Platform port** (`src/platform/`, section 3.1) with the web adapter only; migrate the inventory; add
   `platformBoundary.test.ts`. No behaviour change on the web. Exit: guard test green, E2E unchanged.
3. **Target-aware build** (`VITE_TARGET`, alias, `targets` on routes, `createRouter`). Exit: `web` build
   byte-for-byte equivalent in features; `bundle-report.mjs` startup unchanged.
4. ~~**BUG-209**~~ done 2026-11-14: store and Fabric only on editor routes (`SiteLayout` / lazy `RootLayout`).
5. **Self-host fonts** (no Google Fonts request): required offline and in apps, also faster on the web.
6. **Touch and pen audit** (owner pulled it forward 2026-11-14; done: gestures BUG-211 / 212 / 213, hover-only UI
   BUG-214, every-screen layout BUG-215, menu a11y BUG-216; touch + layout specs also pass in Playwright WebKit;
   open: the device checklist in docs/TESTING.md on a real iPad / Android, BUG-217, BUG-218): two-finger pan, pinch zoom through the Page slice (`setZoom`, never a new zoom path,
   BUG-007), pen-only drawing with touch rejection while a pen is active, long-press context menu, no
   hover-only UI. Replace `SmallScreenNotice` with a tablet layout (compact rail, panels as sheets).
7. ~~**CSP check**~~ done 2026-11-14 (BUG-165): the built JS has no `eval` / `new Function`, and the full E2E suite
   runs under a hash-only `script-src`. Reuse `src/app/seo/csp.ts` for the extension and Tauri policies.

### Phase 1: PWA

Service worker (precache the app shell and route chunks, runtime cache for gallery / template images), offline
page, install prompt, manifest `file_handlers` for `.fateboard` (Chromium), `launch_handler`, update toast
("New version, reload"). Exit: Lighthouse PWA checks pass; editor works offline after one visit; an update never
breaks an open board (chunk-load error path tested).

### Phase 2: browser extension (WXT, MV3)

Features, smallest first:
1. **Side panel editor** (`chrome.sidePanel`; Firefox `sidebar_action`): sketch and take notes next to any page.
2. **Capture and annotate**: `tabs.captureVisibleTab` (permission `activeTab`) → new board with the screenshot
   as a locked background → arrows, text, highlights → export / copy.
3. **Context menu "Add image to Fateboard"**: the background fetches the image and stores it as `data:` (Q13 rule).
4. Later: draw directly on the page (content script + Shadow DOM overlay). Heavier review and permissions.

Permissions: `sidePanel`, `activeTab`, `contextMenus`, `storage`, `unlimitedStorage`. No `<all_urls>` host
permission at first (faster store review, more user trust). No remote code: no gtag, no CDN scripts.
Exit: Chrome Web Store + Edge Add-ons listings approved; `e2e-extension/` covers side panel open, capture,
save / reopen.

### Phase 3: desktop (Tauri 2)

**Spike first (2–3 days, throwaway branch)**: run the current build in Tauri on macOS (WebKit) and Windows
(WebView2), and Linux if Linux matters. Measure: 1500-object board frame time (same as the existing many-objects
spec), video export (WebCodecs on WebKit `UNKNOWN - verify`, MediaRecorder fallback exists), paper.js boolean ops,
text editing (IME), fonts, pen pressure. **Go** if macOS is within ~20 % of Chrome and nothing core is broken;
**no-go** → Electron for desktop (record in DECISIONS.md).

Then: native Open / Save / Save As / recent files, `.fateboard` file association and `fateboard://` deep link,
native menus with the editor's shortcuts (commands stay the source of truth), single instance (open file in the
running app), window state, unsaved-changes prompt on close, auto-update (updater plugin, signed), crash /
error reporting. Signing: Windows code-signing certificate (or a cloud signing service), Apple Developer ID +
notarization for macOS. Exit: signed installers for Windows and macOS from CI; update from version N to N+1
tested.

### Phase 4: tablet first, then phones (Tauri 2 mobile)

iPad first (Apple Pencil is the strongest reason for a native drawing app), then Android tablets, then phones
(view and light edits; the full editor is not a phone UI). Work: the tablet layout from Phase 0, Pencil
pressure / tilt via pointer events, Files app and share sheet, safe areas, the virtual keyboard while editing text
(`UNKNOWN - verify` with Fabric's hidden textarea on iOS), memory limits on large boards (cap the retina scale on
mobile, `lib/canvas` render ratio). App Store review rejects apps that are "just a website" (guideline 4.2), so
ship the native value (files, Pencil, offline, share) in version 1. Exit: TestFlight + Play internal testing
builds from CI; device checklist passed on one iPad, one Android tablet.

### Phase 5: accounts, sync, collaboration, AI

Full plan, stack, data model, sync and step order (5.0–5g): [BACKEND.md](BACKEND.md). Needs owner decisions
Q15, Q16, Q18, Q19. The AI proxy (5a) can ship before cloud sync.

## 7. Testing per target

| Target | Automated | Manual |
|---|---|---|
| Web (all engines) | Vitest (unchanged), Playwright Chromium + Firefox (today) + **WebKit + tablet** (Phase 0) | `npm run dev` |
| PWA | Playwright: offline reload, update flow | install on Android + desktop |
| Extension | Playwright persistent Chromium context with `--load-extension=dist-extension/chrome` (`e2e-extension/`) | Firefox temporary add-on |
| Platform adapters | contract tests in `src/platform/__tests__/` run against every adapter with a faked shell | n/a |
| Tauri desktop | WebDriver via `tauri-driver` works on Windows and Linux, not macOS (`UNKNOWN - verify` current support); the web E2E on WebKit covers most of macOS | release checklist per OS |
| Mobile | WebKit + tablet Playwright projects for layout and touch | device checklist (iPad, Android tablet), TestFlight / Play internal track |

## 8. CI / release

- Keep today's web pipeline. Add jobs: `Build / Extension` (zip per browser as an artifact), `Build / Desktop`
  (matrix windows-latest, macos-latest, ubuntu-latest using the official `tauri-apps/tauri-action`),
  `Build / Mobile` (Android on Linux, iOS on macOS).
- Signing secrets live in a GitHub **environment** with required reviewers; store uploads are manual approvals.
- One version number: `package.json` is the source; WXT reads it; a script writes it into `tauri.conf.json`
  (guard test: versions match).
- New doc at Phase 3: `docs/RELEASING.md` (version bump, changelog, sign, publish per store, rollback per
  store). New skill then: `fate-release`.
- Accounts the owner needs (costs change, check current prices): Chrome Web Store developer (one-time fee),
  Microsoft Partner Center (Edge Add-ons, free), Firefox AMO (free), Apple Developer Program (yearly), Google
  Play Console (one-time), a Windows code-signing option.

## 9. When to become a monorepo

Stay one package until one of these is true: a package must be published or versioned on its own (e.g. a
`@fateboard/diagram-spec` used by the MCP server and the backend), a backend lives in this repo, or builds of
one target are slowed by another. Then: npm workspaces with `apps/web`, `apps/extension`, `apps/native`,
`apps/mcp`, `packages/editor` (today's `src/`), `packages/diagram-spec`. Move guard tests and `.claude/rules`
paths in the same change (`claudeSetup.test.ts` checks rule paths exist).

## 10. Claude and MCP

### 10.1 Claude inside Fateboard (AI features)

Architecture: the client (web, extension, app) never holds an API key. Our API (BACKEND.md 4.4)
authenticates the user, checks the quota, holds the key, calls the Claude API with the official SDK
(`@anthropic-ai/sdk`) and streams the answer back. Owner decision **Q16** (who pays, quotas).

The fit: the command registry (`components/config/commandConfig`) already names every editor action. Generate
Claude **tool definitions** from it (plus a few compound tools), so Claude edits the board through the same
commands a user runs: undoable, validated, no new mutation path.

| Feature | How | Notes |
|---|---|---|
| Text → diagram (flowchart, mind map, wireframe) | tool use: `add_nodes`, `connect`, `apply_layout` with a JSON **diagram spec** | build on the existing connectors; spec = section 10.3 |
| Sketch → clean shapes | vision: send a PNG snapshot of the selection, get the diagram spec back | replace or place next to the sketch, undoable |
| Tidy up / align / explain board | tool use over a compact board summary (types, positions, text), not full Fabric JSON | keeps tokens low |
| Template from a prompt | structured output (diagram spec) | reuses template apply |
| Alt text for exports | single call with an image | accessibility win |

API practices (from the current Claude API guidance; re-check the live docs when building):
- Model: **`claude-opus-5-5`** by default. Cheaper routes (`claude-sonnet-5-5`, `claude-haiku-5-5`) are an owner
  choice, made per feature only after an eval shows quality holds.
- Opus 5.5 specifics: thinking cannot be turned off, control depth with `output_config.effort` (default
  `medium`); forced `tool_choice` (`any` / `tool`) returns a 400, so use `auto` + `strict: true` on tools, or
  structured outputs (`output_config.format`) when you only need JSON.
- Stream every request (`client.messages.stream(...)`); with client tools set `eager_input_streaming: true` and
  validate each tool input against its schema before running it.
- Prompt caching: tool definitions + system prompt first and frozen (no timestamps), volatile board state last;
  check `usage.cache_read_input_tokens`.
- Always check `stop_reason` (`refusal`, `max_tokens`) before using the content; enable the server-side
  `fallbacks` option for refusals.
- Treat board text as data: it can contain prompt-injection text; tools only act on the current board, every AI
  change is one undo step, and nothing leaves the device without the user starting it.
- Before shipping a feature: an eval set (`/claude-api build-eval`) with real prompts and graded outputs.

### 10.2 Fateboard MCP server (Claude Desktop, Claude Code and other MCP clients)

What it offers:
- **Resources**: boards (list, read as summary + SVG / PNG).
- **Tools**: `create_board_from_spec` (diagram spec), `add_elements`, `update_element`, `export_board`
  (png / svg / pdf), `list_templates`, `apply_template`.
- **Prompts** (optional): "diagram this codebase", "turn these notes into a mind map".

Where it runs:
1. **Desktop app first** (Phase 3+): the Tauri app ships a local server (stdio via `fateboard --mcp`, launched by
   the client; or Streamable HTTP on localhost with a per-install token). It reads and writes `.fateboard`
   files, so no cloud is needed. Example: Claude Code generates an architecture diagram of a repo straight into
   a board.
2. **Remote server** (Phase 5, needs sync): Streamable HTTP + OAuth, so claude.ai and other clients reach the
   user's cloud boards.

Build with the official MCP TypeScript SDK (`@modelcontextprotocol/sdk`), sharing the diagram spec and
validation with the in-app AI. Write tools / resources defensively: inputs validated, size limits, no file
paths outside the user's documents.

### 10.3 One schema for both

`diagram-spec` (JSON Schema + TypeScript types + a `specToObjects()` function in `lib/`): nodes (shape, text,
style), edges (connector, arrowheads), groups, layout hint. Used by the AI tools, the MCP server, template
generation and import. Unit-tested like `serialization.ts`; round-trip tests (spec → board → spec).

### 10.4 Claude for building Fateboard (dev workflow)

- Existing: skills `fate-task`, `fate-review`, `fate-refactor`, `fate-readiness`, `fate-new-slice`, `fate-seo`,
  `fate-perf`; agents `fate-reviewer`, `fate-architect`, `fate-verifier`, `fate-debugger`.
- Add when the phase starts: skill **`fate-platform`** (add a capability: port method → every adapter →
  contract test → `can` flag → docs) in Phase 0; skill **`fate-release`** in Phase 3; a `.claude/rules` file
  scoped to `src/platform/**`, `extension/**`, `src-tauri/**`.
- MCP for development, only where there is a concrete need (AGENT_WORKFLOW "Extending the framework"): a
  **Playwright MCP server** would let Claude drive and screenshot the running app for the Definition of done's
  "manually checked in `npm run dev`" step. Nothing else is needed now.

## 11. Other things that would grow the app

| Idea | Value | When |
|---|---|---|
| Remote error reporting (e.g. Sentry) | you cannot fix crashes you never see; required for native apps | Phase 0–1 (PRODUCTION_READINESS gap) |
| Accounts + cloud sync | the same boards on phone, tablet and desktop | Phase 5, Q15 |
| Real-time collaboration (CRDT, e.g. Yjs) | multiplayer whiteboard, offline edits merge | after sync; changes the document model, decide early (Q18) |
| Share read-only links | growth loop: every shared board advertises Fateboard | with sync (Share was removed, Q6) |
| Community gallery | users publish boards as tutorials; SEO pages for each (`/gallery` exists) | after accounts |
| Template packs / marketplace | content keeps users; possible revenue | after accounts |
| i18n | more markets, more search traffic | any time; extract strings first |
| Plugin API (brushes, generators, exporters) | community extends the editor | after the platform port is stable |
| Privacy-friendly product analytics | learn which tools are used | Phase 1, opt-in in apps |
| Pricing (free core, paid sync / AI credits) | pays for AI and sync servers | with Phase 5 |

## 12. Working rules (for Claude and contributors)

1. Phases in order; a phase starts only when the previous exit check is met or the owner says otherwise.
2. Shell-specific APIs only in `src/platform/**` (once it exists; until then, keep new file / clipboard /
   window code in one module per feature and add it to the inventory in 3.1).
3. Web-only code (SEO, prerender, analytics, landing, gallery) must stay web-only: check `targets` on new
   routes.
4. New dependencies for a platform: exact versions, at least two weeks old, recorded in DECISIONS.md;
   run `fate-perf` to prove the web bundle did not grow.
5. Every adapter passes the same contract tests; a feature that only one platform can do sets a `can` flag and
   the UI hides it elsewhere.
6. Anything measured on one engine (performance, memory, export) is `UNKNOWN - verify` on the others until
   measured there.
7. Update this file when a phase starts or ends, a decision is made, or a `UNKNOWN - verify` is resolved.
