# Tythas Control Center — 21st.dev Component Map

Use this whenever a coding agent is implementing a screen that's already been designed in the `Tythas Control Center` artifact. It maps each screen to a specific starting component from **21st.dev** (installed via the `shadcn` CLI), so the agent isn't hand-rolling interaction logic (drag-and-drop, stepper state, table sorting, dropzone validation) that's already been built and tested elsewhere. This is an **implementation accelerator, not a design override**: every component below still gets re-skinned with Tythas's own design tokens (see `tythas-master-brain.md` §6 — Outfit/Karla/JetBrains Mono, the light/dark color set, radius/spacing scale) before it ships. Never ship a component in its original demo colors/fonts.

How to use this with a coding agent: paste the relevant row's `npx shadcn@latest add "<url>"` command into the phase build prompt's working notes, or hand the agent this whole file alongside the phase prompt and say "use these as the base for X screen, then apply our tokens."

---

## 1. App shell (Phase 1 — Dashboard Shell)

| Tythas screen | Component | Why it fits | Install |
|---|---|---|---|
| Sidebar + header shell, dual light/dark theme | **Dashboard Sidebar** (arunjdass) | Already dual-theme (Charcoal Ink dark / Alabaster light) with collapsible multi-tiered nav and workspace content frames — closest structural match to the artifact's Dashboard Shell tab. Swap its palette for Tythas's tokens; keep the collapse/expand and multi-tier nav logic. | `npx shadcn@latest add "https://21st.dev/r/arunjdass/dashboard-sidebar?api_key=$API_KEY_21ST"` |
| Loading state for the dashboard while data is fetching | **Sidebar Dashboard Skeleton** (cnippet-dev) | Mirrors the exact shape (nav rail, header actions, stat cards, list rows) so the loading state doesn't jump/reflow when real data arrives. | `npx shadcn@latest add "https://21st.dev/r/cnippet-dev/v-skeleton-8?api_key=$API_KEY_21ST"` |
| "Website health" KPI tiles on dashboard home | **Stat Card** (felipemenezes098) | Compact KPI card: value + icon + tinted trend badge vs. previous period — matches the dashboard's health-tile pattern. Use the trend badge sparingly (spec §31: never fake precision) — only show a trend when there are two real data points to compare. | `npx shadcn@latest add "https://21st.dev/r/felipemenezes098/card-05?api_key=$API_KEY_21ST"` |

---

## 2. Add Website flow (Phase 2)

| Tythas screen | Component | Why it fits | Install |
|---|---|---|---|
| The 5-step Add Website flow (URL → Analyzing → Results → Verify → Connected) | **Wizard Steps** (ddoemonn) | Clickable progress rail, direction-aware transitions between steps, keyboard nav, and a built-in completion state — maps directly onto the 5 steps in the design reference's Add Website tab. | `npx shadcn@latest add "https://21st.dev/r/ddoemonn/wizard-steps?api_key=$API_KEY_21ST"` |
| Alternative if you want review-then-confirm framing on Step 5 | **Onboarding Wizard Form** (cnippet-dev) | 3-step pattern ending in a review summary + success confirmation — useful shape specifically for Step 4→5 (verify → connected), where you want the person to see a summary before it locks in. | `npx shadcn@latest add "https://21st.dev/r/cnippet-dev/v-form-8?api_key=$API_KEY_21ST"` |

Do not use either wizard's own "success" copy as-is — the design reference's Step 5 copy ("Website added. Editing pages, SEO and forms unlocks as soon as the connector finishes its first sync") is specific and must be preserved verbatim per the Phase 2 build prompt §8.

---

## 3. Website Analysis (Phase 2)

The Technical/Performance/Content check-list groups with severity badges are specific enough (spec's "what we verified" vs. "best-practice recommendation" distinction) that no off-the-shelf list component matches well — keep this screen hand-built from the design reference's existing `.analysis-summary` / `.check-list` markup rather than forcing in a generic component here.

---

## 4. Pages editor (Phase 3)

| Tythas screen | Component | Why it fits | Install |
|---|---|---|---|
| Section list with drag-to-reorder (the Phase 3 build prompt already specifies **dnd-kit**) | **Sortable** (diceui) | Built directly on dnd-kit, not a competing DnD library — this is the one to use precisely because the Phase 3 doc already commits to dnd-kit as the dependency; picking a different DnD component here would mean two drag-and-drop libraries in the same app. | `npx shadcn@latest add "https://21st.dev/r/diceui/sortable?api_key=$API_KEY_21ST"` |
| Keyboard-accessible fallback / simpler section list if `Sortable` is heavier than needed | **Reorder List** (ddoemonn) | Full keyboard support (grab/arrow-move/drop/cancel) plus screen-reader announcements — good accessibility baseline to compare diceui's `Sortable` against. | `npx shadcn@latest add "https://21st.dev/r/ddoemonn/reorder-list?api_key=$API_KEY_21ST"` |

---

## 5. Blog editor (Phase 3 — Tiptap-based rich text)

| Tythas screen | Component | Why it fits | Install |
|---|---|---|---|
| The rich-text toolbar shell around Tiptap's editor instance | **Toolbar** (cnippet-dev, Base UI primitive) | Ships `Toolbar`, `ToolbarButton`, `ToolbarGroup`, `ToolbarSeparator` with a single roving-tabindex focus model — this is the *chrome* around Tiptap, not a competing editor; Tiptap still owns the actual document state and commands, this just gives you an accessible, keyboard-navigable button bar to wire Tiptap's `editor.chain().focus()...run()` calls into. | `npx shadcn@latest add "https://21st.dev/r/cnippet-dev/cnippet-toolbar?api_key=$API_KEY_21ST"` |
| FAQ block / blockquote formatting controls specifically | **Formatting Toolbar** (cnippet-dev) | Toggle buttons for strikethrough/inline code/blockquote/link with a live markdown preview — closest match for the FAQ block's simpler formatting subset (the FAQ block doesn't need full rich text, just structured Q/A with light formatting). | `npx shadcn@latest add "https://21st.dev/r/cnippet-dev/formatting-toolbar?api_key=$API_KEY_21ST"` |

Do not let either toolbar component bring in its own text-editing state — the Phase 3 build prompt is explicit that content is stored as structured Tiptap/ProseMirror JSON, never raw HTML; these components must only dispatch commands to the existing Tiptap `editor` instance.

---

## 6. Media library (Phase 3)

| Tythas screen | Component | Why it fits | Install |
|---|---|---|---|
| Upload surface (drag-and-drop into the media library) | **File Dropzone** (joyco) | Drag-and-drop with image preview, file-type/size validation, single or multiple file support — covers the upload half of the Media tab. | `npx shadcn@latest add "https://21st.dev/r/joyco/file-dropzone?api_key=$API_KEY_21ST"` |
| If you want visibility/bucket metadata captured at upload time | **File Upload Multi-File Dropzone** (ephraimduncan) | Adds bucket name + visibility fields and a removable file list alongside the dropzone — useful if Media items need a visibility flag before they're attached to a page. | `npx shadcn@latest add "https://21st.dev/r/ephraimduncan/file-upload-03?api_key=$API_KEY_21ST"` |

Wire either dropzone's `onUpload` to the Phase 3 build prompt's actual storage layer (Vercel Blob/Cloudinary + `sharp` for metadata) — the component only needs to own drag/drop/validation UI, not the upload transport.

---

## 7. Navigation manager (Phase 3)

| Tythas screen | Component | Why it fits | Install |
|---|---|---|---|
| Nested nav-item list with drag-to-reorder | **Sortable** (diceui) — same component as §4 | Reuse the same dnd-kit-based Sortable component here instead of a second DnD pattern, so Pages' section list and Navigation's item list behave identically and share one dependency. | (already installed from §4) |
| If nav items need visible rank numbers rather than pure drag feel | **Draggable Priority List** (nikhiljainsam) | Rank numbers + smooth transitions, native HTML5 DnD, full accessibility — an alternative worth comparing against diceui's `Sortable` specifically for the nav manager, where showing an explicit order number (1, 2, 3…) may read clearer than positional drag alone. | `npx shadcn@latest add "https://21st.dev/r/nikhiljainsam/draggable-priority-list?api_key=$API_KEY_21ST"` |

---

## 8. Generic admin tables (Website list, future Leads inbox — Phase 5)

| Tythas screen | Component | Why it fits | Install |
|---|---|---|---|
| Any sortable/searchable/filterable list of records (websites, leads, once Phase 5 exists) | **Data Table** (arihantcodes) | Typed React table: sortable columns, search, quick-filter pills, row selection, keyboard nav, animated row reordering/removal — built specifically for dashboards/admin panels, which is exactly this product category. | `npx shadcn@latest add "https://21st.dev/r/arihantcodes_1f7b8c4d/data-table?api_key=$API_KEY_21ST"` |
| If filters need AND/OR boolean logic (e.g. "leads from site X AND status = new") | **Advanced Data Table Filter Builder** (laziekiki) | AND/OR logic, multi-select values, searchable popovers, live results — worth reaching for once the Leads Hub graduates into the Control Center per its PRD §8 and filtering needs get more complex than a single dropdown. | `npx shadcn@latest add "https://21st.dev/r/laziekiki/advanced-data-table-filter-builder?api_key=$API_KEY_21ST"` |

---

## 9. Rules for using any of these

1. **Tokens win, always.** Re-theme every component to Tythas's font stack and light/dark color set from `tythas-master-brain.md` §6 before it ships — a component's demo styling is a starting point, never the final look.
2. **Don't duplicate a dependency.** Phase 3 already commits to dnd-kit for drag-and-drop and Tiptap for rich text — pick 21st.dev components that sit on top of those (diceui's `Sortable`, the toolbar-shell components) rather than ones that bring in a second, competing library for the same job.
3. **Component logic, not component copy.** Success/empty-state/error copy in the design reference (e.g. Phase 2's Step 5 message) is specific and spec-driven — keep that copy, only take the component's interaction behavior.
4. **Skip a component if the screen is already bespoke enough.** Website Analysis (§3) is the one screen in the current design where nothing off-the-shelf earns its place — hand-building from the artifact's existing markup is faster and more correct there than adapting a generic list component.
5. **Each `get_component` retrieval is rate-limited on the free tier** — pull code for a component only once you're actually about to implement that screen, not speculatively for the whole roadmap at once.
