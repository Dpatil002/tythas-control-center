# Tythas Control Center — Full Site Structure, Wireframe & Tech Stack (Step-by-Step to Full Functionality)

This is the single "whole picture" document: every screen the finished platform will have, what each one looks like at a wireframe level, the complete tech stack end to end, and the phase-by-phase order to actually build it. Read `MASTER_BRAIN.md` first if you haven't — it explains how this fits with the other docs. This doc is the detailed IA/wireframe/stack layer that spec §83 asks for, spanning every phase, not just what's built so far.

---

## 1. Full site map (every screen, every phase)

```
TYTHAS CONTROL CENTER
│
├── AUTH  (Phase 1 — built)
│   ├── /login
│   ├── /signup                      (Owner-only, first-time org creation)
│   ├── /signup/mfa-setup
│   ├── /invite/accept               (token-based, Manager onboarding)
│   ├── /reset-password
│   └── /reset-password/confirm
│
├── ONBOARDING  (Phase 2 — specced, not yet built)
│   ├── Add Website — Step 1: Enter URL
│   ├── Add Website — Step 2: Analyzing (progress)
│   ├── Add Website — Step 3: Results (discovered pages/issues)
│   ├── Add Website — Step 4: Verify ownership (DNS / file / meta tag)
│   └── Add Website — Step 5: Connected / Audit Only
│
├── OVERVIEW
│   └── /dashboard                   (Phase 1 shell + empty states → Phase 2 fills with real health data)
│       ├── Site identity bar (name, domain, connection-state badge, freshness)
│       ├── Website health grid (SEO / Performance / Technical / Indexing / Forms&Leads / Tracking)
│       ├── "Things that need your attention" list
│       └── Quick actions (New page, New blog, Upload media, Create form, Add redirect, Add schema)
│
├── WEBSITE  (Phase 3 — CMS, specced + designed, not yet built)
│   ├── /pages                       (table: page, URL, SEO, status, indexing, updated)
│   │   └── /pages/:id/edit          (section-based editor: Hero, Features, CTA, etc. + Desktop/Tablet/Mobile preview)
│   ├── /blog                        (list: title, author, status, published date)
│   │   ├── /blog/:id/edit           (rich-text editor: headings, lists, tables, images, embeds, quotes, callouts, code, FAQ)
│   │   └── /blog/authors            (Author drawer: name, role, photo, bio, social links)
│   ├── /media                       (grid/list, folders, upload, alt text/caption/title fields, size/format warnings)
│   ├── /navigation                  (header/footer menu builder, drag-and-drop, nested items, preview)
│   ├── /forms                       (list of forms + status: deployed/not deployed)
│   │   └── /forms/:id/build         (field builder: text/email/phone/number/dropdown/checkbox/radio/date/file/hidden + actions: create lead / email / webhook / redirect)
│   └── /leads                       (Phase 5 — inbox: name, contact, source, campaign, landing page, status, date, assigned)
│       └── /leads/:id               (detail drawer: activity timeline, notes, attribution, status pipeline)
│
├── SEO  (Phase 4 — not yet built)
│   ├── /seo                         (per-page/blog SEO panel: title, description, slug, canonical, robots, OG fields, search preview)
│   │   └── SEO checklist            (missing title/description/H1, duplicates, alt text, broken internal links — technical vs. best-practice, clearly separated)
│   ├── /schema                      (visual builder: Organization, LocalBusiness, Article, FAQPage, Product, Service, Breadcrumb, etc. + "Create FAQ Schema" from FAQ content + Advanced JSON-LD)
│   ├── /technical-seo
│   │   ├── Sitemap (view/generate/regenerate/status)
│   │   ├── Robots.txt (Safe Mode guided / Advanced raw editor)
│   │   └── llms.txt (editor + preview)
│   └── /redirects                   (list, add, bulk import/export, chain/loop detection; 301/302/307/308)
│
├── WEBSITE ANALYSIS  (Phase 2 — specced, not yet built)
│   └── /websites/:id/analysis       (Technical / Performance / Content check groups, freshness timestamp, re-run)
│
├── INTEGRATIONS  (Phase 6 — not yet built)
│   ├── /integrations/tracking       (conversion-event manager: form submit, phone click, WhatsApp click, booking, etc. → primary/secondary)
│   ├── /integrations/google
│   │   ├── GA4        (connect → select property → confirm)
│   │   ├── GSC         (connect → select property → confirm)
│   │   ├── GTM          (connect → select container → confirm)
│   │   └── Google Ads    (connect → select account → configure conversion tracking only — no campaign UI)
│   └── /integrations/meta
│       ├── Business/Pixel connect → configure tracking
│       └── Conversion event configuration only — no campaign UI
│   (Microsoft Clarity and Google Business Profile live here too, per spec §47/§51)
│
├── SETTINGS
│   ├── /settings/website             (name, domain, logo, favicon, contact info, social links, timezone)
│   ├── /settings/business            (company name, address, phone, email, hours — feeds schema/local SEO/SEO defaults)
│   ├── /settings/seo-defaults        (default title template, meta description, OG defaults, robots defaults — Global → Page → Element inheritance)
│   ├── /settings/organization        (Phase 1 — built: member list, pending invitations, invite/revoke — Owner only)
│   └── /settings/security            (Phase 1 — built: active sessions, revoke, MFA status)
│
├── MONITORING & NOTIFICATIONS  (Phase 7 — not yet built)
│   ├── Notification center (new lead, connection error, website down, SSL expiry, SEO audit done, integration disconnected, publish completed)
│   └── Site health background checks (uptime, SSL expiry, crawl/indexing signals) feeding the dashboard's attention list
│
└── GLOBAL (present everywhere, Phase 1 — built)
    ├── Website switcher (header) — verified websites only, "+ Add website" always visible
    ├── Global search — ⌘/Ctrl+K, categorized results (pages/blogs/media/forms/leads/schema/redirects/settings)
    ├── Notification bell
    └── User menu (Profile & security, Organization settings, Log out)
```

Every module above carries its own `websiteId` and is invisible/disabled until that website is at least `AUDIT_ONLY` (read-only browsing of what the connector found) or `CONNECTED` (full editing) — never shown as if it works when it doesn't, per spec §77.

---

## 2. Wireframe notes per section

The **Design System**, **Dashboard Shell**, **Add Website**, **Website Analysis**, **Pages**, **Blog**, and **Media & Navigation** tabs already exist as high-fidelity screens in the published `Tythas Control Center` artifact — use those pixel-for-pixel, don't redesign them. Below is the wireframe-level layout intent for everything still **not** in that artifact, written so it can grow one tab at a time, in the same visual system (tokens, badges, table style, panel style already established). The four items already built are kept here too, marked **(built)**, as a record of what the artifact actually contains.

- **Pages list (built)** — same table pattern as the design reference's "Table row" component demo: Page name + URL stacked in one cell, then SEO/Status/Indexing badges, then relative-time "Updated." A row's name opens the editor in place; a "…" overflow button stands in for the fuller action set (SEO/Schema/Preview/Duplicate/Redirect/Archive) that Phase 4 wires up for real.
- **Page editor (built)** — two-pane: left is a vertical accordion of sections (Hero, Features, CTA...) each expandable into its fields; right is a live preview with Desktop/Tablet/Mobile tabs (reuses `.tabs-demo`). One primary action: **Publish**, secondary: **Save draft**.
- **Blog editor (built)** — single-pane rich-text canvas (toolbar: H1–H3, paragraph, list, table, image, embed, quote, callout, code, FAQ block) with a right-side panel for SEO fields, a "Create FAQ Schema" preview note, and a version-history list. "Add Link" as a full search-and-insert popover (spec §29) is still a Phase 4 refinement — the toolbar button exists, the popover behavior doesn't yet.
- **Media library (built)** — grid of thumbnails, a persistent upload drop-zone, a right-side metadata panel when an item is selected (filename, alt text, caption, dimensions/size/format) with inline warnings ("Alt text missing," "Unusually large").
- **Navigation manager (built)** — a reorderable list of top-level items with nested children indented underneath (drag handles shown, drag behavior itself is a Phase 3 build-time detail, not a design-time one); a live preview strip on the right mirrors the header as it would render.
- **Forms builder** — left: a palette of field types to drag in; center: the form-in-progress; right: field settings (label, placeholder, required, validation) when a field is selected; a separate "Actions" tab below configures what happens on submit. *(Phase 5 — not yet designed.)*
- **Leads inbox** — same list+filter+detail-drawer pattern as the Dashboard's attention list, but as a full page: filter bar (website already implied by context, so filter by status/source/date), table rows open a right-side drawer with the activity timeline (spec §43) stacked above notes and raw attribution. *(Phase 5 — not yet designed.)*
- **SEO panel** — a drawer or dedicated tab attached to a Page/Blog, not a separate top-level page: title/description/slug/canonical/robots fields on the left, a live Google-style search-result preview on the right (character counts as guidance, never hard limits, matching spec §30). *(Phase 4 — not yet designed; the Blog editor's current SEO side panel is a placeholder preview of this.)*
- **Schema builder** — a type picker (cards, like the Add-Website verification-method cards) → a form for that type's fields → a live JSON-LD preview pane → Validate/Save. FAQ content already entered in a blog's FAQ block shows a one-click "Create FAQ Schema" banner instead of asking the user to re-enter anything. *(Phase 4 — not yet designed; the FAQ block itself already exists in the Blog editor.)*
- **Technical SEO** — three tabs (Sitemap / Robots.txt / llms.txt) inside one page, each following the same warn-before-apply pattern already established in the Design System tab's "Safe-action confirmation" component. *(Phase 4 — not yet designed.)*
- **Redirects** — a table (From / To / Type / Created) with bulk import via CSV and a dedicated "chains & loops detected" banner at the top when applicable, in the same warning-banner style as the Website Analysis disclosures. *(Phase 4 — not yet designed.)*
- **Integrations** — one card per service (GA4, GSC, GTM, Clarity, Google Ads, Meta, Google Business Profile), each showing Connected/Not connected/Error state via the same connection badges already defined, with a single "Connect" primary action per unconnected card — never a multi-step form dumped inline. *(Phase 6 — not yet designed.)*
- **Settings** — plain grouped forms (no canvas/preview needed here), each section with one **Save** action, following the "one primary action per screen" rule. *(Not yet designed; low-risk to design whenever convenient since it's the simplest module.)*

---

## 3. Full tech stack (consolidated across every phase)

| Layer | Choice | Introduced in |
|---|---|---|
| Framework | Next.js 14+ (App Router), TypeScript | Phase 1 |
| Hosting | Vercel (Hobby) | Phase 1 |
| Database | Neon (serverless Postgres) / SQLite (dev) | Phase 1 |
| ORM | Prisma | Phase 1 |
| Auth | Auth.js v5 + `argon2` + `otpauth`/`qrcode` (MFA) | Phase 1 |
| Email | Resend | Phase 1 |
| Rate limiting | Upstash Redis + `@upstash/ratelimit` | Phase 1 |
| Styling | Tailwind CSS, tokens from the design reference | Phase 1 |
| Validation | Zod | Phase 1 |
| Testing | Vitest | Phase 1 |
| Background jobs | Inngest (or Vercel Cron + queue table) | Phase 2 |
| HTML parsing | `cheerio` | Phase 2 |
| Sitemap/robots parsing | `fast-xml-parser` + small custom robots parser | Phase 2 |
| DNS lookups | Node `dns/promises` | Phase 2 |
| WordPress connector | Companion WP plugin + REST API (Application Passwords) | Phase 2 |
| Rich text editor | **Tiptap** (ProseMirror-based, matches the structured-content model in spec §80) | Phase 3 |
| Drag-and-drop | **dnd-kit** (navigation manager, form builder, page-section reordering) | Phase 3 |
| Image storage/CDN | **Vercel Blob** or **Cloudinary** (recommend Cloudinary once image transforms/format warnings in §32 matter — free tier covers this scale) | Phase 3 |
| Schema/JSON-LD generation | Hand-rolled generator from typed schema forms (no third-party needed) | Phase 4 |
| Redirect/sitemap engine | Custom, backed by Postgres — no external service | Phase 4 |
| Forms/webhooks | Reuse Inngest for async actions (email/webhook/lead creation) | Phase 5 |
| GA4 / GSC / GTM | Official Google APIs (Analytics Data/Admin API, Search Console API, Tag Manager API) via OAuth | Phase 6 |
| Google Ads | Google Ads API (conversion tracking/tagging only, no campaign endpoints called) | Phase 6 |
| Meta | Meta Business/Conversions API (pixel + conversion events only) | Phase 6 |
| Microsoft Clarity | Clarity's project-connection flow (no public write API — mostly a "how to install" guided step) | Phase 6 |
| Uptime/SSL monitoring | Self-rolled cron via Inngest (HEAD request + TLS handshake) — avoid a paid third-party monitor until real usage justifies it | Phase 7 |
| Error monitoring | Sentry (free tier) | Phase 7, optional earlier |

Nothing above requires a paid tier at Tythas's current scale; the only recurring cost across the whole roadmap stays the domain (Phase 1 §2).

---

## 4. Step-by-step roadmap to full functionality

| Phase | Delivers | Build prompt |
|---|---|---|
| **1 — Foundation** | Multi-tenancy, auth + MFA, Owner/Manager roles, invitations, website switcher, app shell | `tythas-phase1-foundation-build-prompt.md` + `tythas-phase1-setup-and-backend-wireframe.md` — **Completed & Verified** |
| **2 — Website Connection** | Add Website flow, crawler/analysis engine, ownership verification, connector framework (WordPress + Custom), connection states | `tythas-phase2-website-connection-build-prompt.md` — **Ready to Build** |
| **3 — CMS** | Pages, page editor, Blog + rich-text editor + authors, Media library, Navigation manager, preview, publishing, scheduling, version history | `tythas-phase3-cms-build-prompt.md` — **Specced & Designed** |
| **4 — SEO** | Page/Blog SEO panel, SEO checklist, internal linking, Schema builder + FAQ schema, Technical SEO (sitemap/robots/llms.txt), Redirects | Specced & designed |
| **5 — Forms & Leads** | Form builder, form deployment (via connector), submissions, Leads inbox, pipeline, activity, attribution, conversion events | Spec §40–45 |
| **6 — Integrations** | GA4, GSC, GTM, Clarity, Google Ads (tracking only), Meta (tracking only), Google Business Profile where supported | Spec §46–51 |
| **7 — Monitoring & Polish** | Uptime/SSL/crawl monitoring, notifications content, empty/error states polish, accessibility pass, responsive pass, performance pass | Spec §52–54, §72–73 |
