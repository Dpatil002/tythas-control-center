# Tythas Control Center — Master Brain File

**This is the single source of truth for the whole build.** It holds everything that must stay consistent across every phase, every build prompt, and every design screen: the complete data model, the complete site map, the full tech stack, the roles/permissions rules, the connector architecture, and the non-negotiable constraints. Every other document in this project (the spec, the phase build prompts, the design artifact) is either the *origin* of something recorded here or the *detailed how-to* for something summarized here — this file is what to check first, and what to update the moment a new decision is made anywhere else.

**How to use this file — read this part first:**
- Before adding a new field, model, screen, role, or rule anywhere in this project, check here first. If it's already decided here, follow what's written — don't quietly introduce a different name, shape, or convention "because it seemed reasonable in the moment."
- If a new build prompt or design change needs something not yet decided here, decide it once, write it here, and only then use it elsewhere. This file should never fall behind what's actually been decided.
- If something here ever conflicts with a phase build prompt, that's a bug in one of the two documents — fix it immediately (the way the Phase 3 relation gap was caught and fixed on 2026-09-18) rather than letting both versions keep existing.
- This file describes the *plan*, not what's been *built*. "Decided" and "designed" are not the same as "coded and deployed" — §3 tracks that distinction explicitly.

---

## 1. What this project is

Tythas is Digambar Patil's digital agency in Pune, brand name **Tythas**. It builds and maintains websites for D2C/service clients — Amary Beaute, Finansh, Mini Garage, Soché, Therma by Eureka, and growing. This project is the **Tythas Control Center**: an internal admin platform so Tythas can manage every client website's content, SEO, forms, leads, and tracking from one dashboard, without logging into each website's own CMS.

It is explicitly **not**: an analytics replacement (GA4/GSC stay GA4/GSC), an ad-management platform (campaigns stay in Google Ads/Meta), an AI chatbot, an audit-log product, a backup/snapshot system, or a client-facing portal. Re-check this list before adding any feature that sounds adjacent to one of these — scope creep is the single biggest risk called out throughout the source spec.

### Two parallel tracks
- **Leads Hub** — a tiny, already-specced, no-code Supabase/Lovable app that just unifies contact-form leads from every client site into one inbox. Ships in days, not months. Its own separate schema (`websites`/`leads`/`profiles`) is intentionally compatible with the Control Center's future Leads module so it can graduate in later rather than being thrown away.
- **Control Center** — the real, multi-tenant, phased platform this file is mostly about.

---

## 2. Roles & permissions (fixed for V1 — do not add a third role)

| Capability | Owner | Manager |
|---|---|---|
| Access all websites in the org | ✅ | Only websites explicitly granted via `WebsiteAccess` |
| Edit pages/blogs/media/navigation | ✅ | ✅ |
| Manage SEO, schema, redirects | ✅ | ✅ |
| Manage forms, leads | ✅ | ✅ |
| Configure integrations/tracking | ✅ | ✅ |
| Invite / remove users, change roles | ✅ | ❌ |
| Manage website access grants | ✅ | ❌ |
| Manage org/security settings | ✅ | ❌ |

Every permission check happens **server-side**, never only in the UI. A Manager blocked from an action must get a 403/404 from the API directly, not just a hidden button.

---

## 3. Phase status (update this table the moment a phase's status changes)

| Phase | Delivers | Status | Build prompt(s) |
|---|---|---|---|
| **1 — Foundation** | Multi-tenancy, auth + MFA, roles, invitations, website switcher, app shell | Coded & verified locally. | `tythas-phase1-foundation-build-prompt.md` + `tythas-phase1-setup-and-backend-wireframe.md` |
| **2 — Website Connection** | Add Website flow, crawler/analysis, ownership verification, connector framework, connection states | Coded & verified locally. | `tythas-phase2-website-connection-build-prompt.md` |
| **3 — CMS** | Pages, Blog + authors, Media library, Navigation | Coded & verified locally. | `tythas-phase3-cms-build-prompt.md` |
| **4 — SEO** | SEO panel, SEO checklist, Schema builder, Technical SEO, Redirects | Coded & verified locally. | `tythas-phase4-seo-build-prompt.md` |
| **5 — Forms & Leads** | Form builder + deployment, Leads inbox/pipeline/attribution | Coded & verified locally. | `tythas-phase5-forms-and-leads-build-prompt.md` |
| **6 — Integrations** | GA4, GSC, GTM, Clarity, Google Ads, Meta, GBP, Custom Scripts | Coded & verified locally. | `tythas-phase6-integrations-build-prompt.md` |
| **7 — Monitoring & Polish** | Uptime/SSL/crawl monitoring, notifications, accessibility/responsive/performance pass | Coded & verified locally. | `tythas-phase7-monitoring-build-prompt.md` |

Design reference: the **`Tythas Control Center`** artifact (private, published) currently has 7 tabs — Design System, Dashboard Shell, Add Website, Website Analysis, Pages, Blog, Media & Navigation. Component implementation mappings are defined in [`COMPONENT_MAP.md`](file:///Users/dinuu/Tythas%20admin/COMPONENT_MAP.md).

---

## 4. Complete data model (all phases, merged — this is the definitive schema)

Tenancy shape: `Organization → Client → Website`, and every website-scoped model carries a `websiteId`. Every API request re-derives org/website access from the authenticated session server-side — **never** trust a client-supplied `organizationId`/`websiteId`. A resource outside the caller's scope returns `404`, never `403` (don't confirm to an attacker that an ID exists elsewhere).

```prisma
// ============ PHASE 1: Foundation ============

model Organization {
  id          String   @id @default(cuid())
  name        String
  createdAt   DateTime @default(now())

  members     OrganizationMember[]
  clients     Client[]
  websites    Website[]
  invitations Invitation[]
}

model User {
  id             String    @id @default(cuid())
  email          String    @unique
  passwordHash   String
  mfaSecret      String?   // encrypted at rest (AES-256-GCM)
  mfaEnabled     Boolean   @default(false)
  mfaBackupCodes String    @default("[]") // JSON stringified array of hashed backup codes
  createdAt      DateTime  @default(now())
  lastLoginAt    DateTime?

  memberships    OrganizationMember[]
  websiteAccess  WebsiteAccess[]
  loginEvents    LoginEvent[]
  sessions       Session[]
}

model OrganizationMember {
  id             String   @id @default(cuid())
  organizationId String
  userId         String
  role           String   @default("MANAGER") // "OWNER" | "MANAGER"
  status         String   @default("ACTIVE")  // "ACTIVE" | "SUSPENDED"
  createdAt      DateTime @default(now())

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([organizationId, userId])
}

model Invitation {
  id              String    @id @default(cuid())
  organizationId  String
  email           String
  role            String    @default("MANAGER") // "OWNER" | "MANAGER"
  tokenHash       String    @unique
  invitedByUserId String
  expiresAt       DateTime
  acceptedAt      DateTime?
  revokedAt       DateTime?
  createdAt       DateTime  @default(now())

  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId, email])
}

model Client {
  id                 String   @id @default(cuid())
  organizationId     String
  name               String
  primaryContactName String?
  contactEmail       String?
  contactPhone       String?
  status             String   @default("ACTIVE") // "ACTIVE" | "PAUSED" | "ARCHIVED"
  notes              String?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  organization       Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  websites           Website[]
}

// --- Website: the definitive merged model — Phase 1 base + Phase 2 + Phase 3 fields ---
model Website {
  id                  String          @id @default(cuid())
  organizationId      String
  clientId            String
  name                String
  domain              String
  timezone            String          @default("Asia/Kolkata")
  connectorType       String          @default("UNCONNECTED")  // "UNCONNECTED" | "WORDPRESS" | "CUSTOM"
  connectionState     String          @default("DISCONNECTED") // "ANALYZING" | "AUDIT_ONLY" | "CONNECTED" | "SYNCING" | "CONNECTION_ERROR" | "DISCONNECTED"
  ownershipVerifiedAt DateTime?       // null = not verified; switcher only lists verified websites
  latestAnalysisId    String?         // Phase 2 — soft pointer, not a formal relation
  createdAt           DateTime        @default(now())
  updatedAt           DateTime        @updatedAt

  organization        Organization    @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  client              Client          @relation(fields: [clientId], references: [id], onDelete: Cascade)
  access              WebsiteAccess[]
  analyses            WebsiteAnalysis[]        // Phase 2
  verifications       OwnershipVerification[]  // Phase 2
  credential          ConnectorCredential?      // Phase 2
  pages               Page[]                    // Phase 3
  blogPosts           BlogPost[]                // Phase 3
  authors             Author[]                  // Phase 3
  media               Media[]                   // Phase 3
  navigationMenus     NavigationMenu[]          // Phase 3

  @@index([organizationId])
  @@unique([organizationId, domain])
}

// Explicit per-Manager website assignment. Owners implicitly have access to
// every website in their organization and do not need rows here.
model WebsiteAccess {
  id        String   @id @default(cuid())
  websiteId String
  userId    String
  grantedAt DateTime @default(now())

  website   Website  @relation(fields: [websiteId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([websiteId, userId])
}

// Narrow, auth-only activity log. NOT a general audit-log system (spec forbids that in V1).
model LoginEvent {
  id        String   @id @default(cuid())
  userId    String
  type      String   // "login_success" | "login_failed" | "password_reset" | "mfa_enabled" | "session_revoked"
  ip        String?
  userAgent String?
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Session {
  id           String   @id @default(cuid())
  userId       String
  sessionToken String   @unique
  ip           String?
  userAgent    String?
  createdAt    DateTime @default(now())
  lastSeenAt   DateTime @default(now())
  expiresAt    DateTime

  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// ============ PHASE 2: Website Connection ============

model WebsiteAnalysis {
  id              String    @id @default(cuid())
  websiteId       String
  status          String    @default("QUEUED") // "QUEUED" | "RUNNING" | "COMPLETE" | "FAILED"
  startedAt       DateTime?
  completedAt     DateTime?
  pagesFound      Int?
  indexableCount  Int?
  detectedCms     String?
  detectedBuilder String?
  sslValid        Boolean?
  sitemapFound    Boolean?
  robotsFound     Boolean?
  errorMessage    String?
  createdAt       DateTime  @default(now())

  website         Website         @relation(fields: [websiteId], references: [id], onDelete: Cascade)
  issues          AnalysisIssue[]
  pages           AnalyzedPage[]

  @@index([websiteId, createdAt])
}

model AnalysisIssue {
  id            String   @id @default(cuid())
  analysisId    String
  category      String   // "TECHNICAL" | "PERFORMANCE" | "CONTENT"
  severity      String   // "CRITICAL" | "ATTENTION" | "HEALTHY" | "NOT_CONFIGURED"
  checkKey      String   // stable key, e.g. "missing_meta_description"
  title         String
  detail        String
  affectedCount Int      @default(0)
  createdAt     DateTime @default(now())

  analysis      WebsiteAnalysis @relation(fields: [analysisId], references: [id], onDelete: Cascade)

  @@index([analysisId, category])
}

model AnalyzedPage {
  id               String   @id @default(cuid())
  analysisId       String
  url              String
  httpStatus       Int?
  metaTitle        String?
  metaDescription  String?
  h1               String?
  canonical        String?
  isIndexable      Boolean?
  missingAltImages Int      @default(0)
  wordCount        Int?

  analysis         WebsiteAnalysis @relation(fields: [analysisId], references: [id], onDelete: Cascade)

  @@index([analysisId])
}

model OwnershipVerification {
  id          String    @id @default(cuid())
  websiteId   String
  method      String    // "DNS_TXT" | "FILE_UPLOAD" | "META_TAG" | "CONNECTOR"
  token       String
  status      String    @default("PENDING") // "PENDING" | "VERIFIED" | "FAILED" | "EXPIRED"
  attemptedAt DateTime?
  verifiedAt  DateTime?
  createdAt   DateTime  @default(now())

  website     Website   @relation(fields: [websiteId], references: [id], onDelete: Cascade)

  @@index([websiteId])
}

// Scoped, encrypted connector credentials — never a raw platform password.
model ConnectorCredential {
  id            String   @id @default(cuid())
  websiteId     String   @unique
  connectorType String   // "WORDPRESS" | "CUSTOM"
  encryptedData String   // AES-256-GCM blob
  scopes        String   @default("[]") // JSON stringified array e.g. ["read:content","write:content","write:seo"]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  website       Website  @relation(fields: [websiteId], references: [id], onDelete: Cascade)
}

// ============ PHASE 3: CMS ============

model Page {
  id          String        @id @default(cuid())
  websiteId   String
  slug        String
  title       String
  status      String        @default("DRAFT") // "DRAFT" | "SCHEDULED" | "PUBLISHED"
  scheduledAt DateTime?
  publishedAt DateTime?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  website     Website       @relation(fields: [websiteId], references: [id], onDelete: Cascade)
  sections    PageSection[]
  versions    PageVersion[]

  @@unique([websiteId, slug])
}

model PageSection {
  id      String @id @default(cuid())
  pageId  String
  type    String // "hero" | "features" | "cta" | ...
  order   Int
  content String // JSON stringified structured component content

  page    Page   @relation(fields: [pageId], references: [id], onDelete: Cascade)

  @@index([pageId, order])
}

model PageVersion {
  id        String   @id @default(cuid())
  pageId    String
  snapshot  String   // JSON stringified snapshot
  summary   String
  createdAt DateTime @default(now())
  createdBy String

  page      Page     @relation(fields: [pageId], references: [id], onDelete: Cascade)
}

model Author {
  id           String   @id @default(cuid())
  websiteId    String
  name         String
  roleLabel    String?
  bio          String?
  photoMediaId String?
  xUrl         String?
  instagramUrl String?
  linkedinUrl  String?
  createdAt    DateTime @default(now())

  website      Website    @relation(fields: [websiteId], references: [id], onDelete: Cascade)
  posts        BlogPost[]
}

model BlogPost {
  id             String    @id @default(cuid())
  websiteId      String
  authorId       String?
  slug           String
  title          String
  content        String    // JSON stringified Tiptap document JSON
  status         String    @default("DRAFT") // "DRAFT" | "SCHEDULED" | "PUBLISHED"
  scheduledAt    DateTime?
  publishedAt    DateTime?
  seoTitle       String?
  seoDescription String?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  website        Website           @relation(fields: [websiteId], references: [id], onDelete: Cascade)
  author         Author?           @relation(fields: [authorId], references: [id])
  versions       BlogPostVersion[]

  @@unique([websiteId, slug])
}

model BlogPostVersion {
  id        String   @id @default(cuid())
  postId    String
  snapshot  String   // JSON stringified snapshot
  summary   String
  createdAt DateTime @default(now())
  createdBy String

  post      BlogPost @relation(fields: [postId], references: [id], onDelete: Cascade)
}

model Media {
  id        String   @id @default(cuid())
  websiteId String
  url       String
  filename  String
  folder    String?
  altText   String?
  caption   String?
  title     String?
  width     Int?
  height    Int?
  sizeBytes Int?
  format    String?  // "jpg" | "png" | "webp" | ...
  createdAt DateTime @default(now())

  website   Website  @relation(fields: [websiteId], references: [id], onDelete: Cascade)

  @@index([websiteId, folder])
}

model NavigationMenu {
  id        String           @id @default(cuid())
  websiteId String
  location  String           // "HEADER" | "FOOTER"
  items     NavigationItem[]

  website   Website          @relation(fields: [websiteId], references: [id], onDelete: Cascade)

  @@unique([websiteId, location])
}

model NavigationItem {
  id       String          @id @default(cuid())
  menuId   String
  parentId String?
  label    String
  url      String?          // external or internal path
  pageId   String?          // set instead of `url` when linking to a managed Page
  order    Int

  menu     NavigationMenu   @relation(fields: [menuId], references: [id], onDelete: Cascade)
  parent   NavigationItem?  @relation("NavChildren", fields: [parentId], references: [id], onDelete: Cascade)
  children NavigationItem[] @relation("NavChildren")

  @@index([menuId, parentId, order])
}
```

---

## 5. Complete site map

```
TYTHAS CONTROL CENTER
├── AUTH                      /login · /signup · /signup/mfa-setup · /invite/accept · /reset-password(/confirm)
├── ONBOARDING (Add Website)  Step 1 Enter URL → 2 Analyzing → 3 Results → 4 Verify ownership → 5 Connected/Audit Only
├── OVERVIEW                  /dashboard — site identity + connection badge, Website health grid, "Needs attention" list, Quick actions
├── WEBSITE
│   ├── Pages                 list → section-based editor (Hero/Features/CTA/…) + Desktop/Tablet/Mobile preview
│   ├── Blog                  list → rich-text editor (H1–H3, lists, tables, images, embeds, quotes, callouts, code, FAQ) + Authors + version history
│   ├── Media                 grid, upload, folders, alt text/caption/title, size/format warnings
│   ├── Navigation             header/footer menu builder, drag-and-drop, nested items, live preview
│   ├── Forms                  (Phase 5) field builder + actions (create lead / email / webhook / redirect)
│   └── Leads                  (Phase 5) inbox, pipeline, activity timeline, attribution
├── WEBSITE ANALYSIS          Technical / Performance / Content check groups, freshness timestamp, re-run
├── SEO                        (Phase 4) SEO panel per page/post, checklist, internal linking
├── SCHEMA                     (Phase 4) visual builder (Organization/LocalBusiness/Article/FAQPage/Product/…), FAQ→schema, JSON-LD preview
├── TECHNICAL SEO              (Phase 4) Sitemap, Robots.txt (safe/advanced), llms.txt
├── REDIRECTS                  (Phase 4) 301/302/307/308, bulk import/export, chain/loop detection
├── INTEGRATIONS               (Phase 6) Tracking/conversion events, Google (GA4/GSC/GTM/Ads), Meta, Clarity, Google Business Profile
├── SETTINGS                    Website settings, Business info, SEO defaults, Organization (members/invites), Security (sessions/MFA)
├── MONITORING & NOTIFICATIONS  (Phase 7) uptime/SSL/crawl checks, notification center
└── GLOBAL (everywhere)         Website switcher (verified sites + always-visible "+ Add website"), ⌘/Ctrl+K search, notification bell, user menu
```

---

## 6. Design system (tokens)

**Fonts:** Outfit (headings/UI: 500/600/700) · Karla (body: 400/500/600) · JetBrains Mono (domains, counts, code: 400/500).

**Color — light:**
`bg #F4F6FB` · `surface #FFFFFF` · `surface-2 #E9EDF6` · `border #DEE3EE` · `border-strong #C5CCDD` · `text-primary #0E1220` · `text-secondary #565F76` · `text-tertiary #8991A6` · `accent #2F62E0` · `accent-light #5B8DFF` · `accent-2 #1B3FB0` · `accent-hover #2550BE` · `accent-soft #E3EAFC` · `accent-soft-text #1D3F9E` · `success #2E8F62` · `warning #B8862A` · `critical #D8383F` · `info #6B7280`

**Color — dark:**
`bg #090C15` · `surface #121729` · `surface-2 #171E34` · `border #232C47` · `border-strong #2E3A5C` · `text-primary #EEF1FA` · `text-secondary #A6AEC6` · `text-tertiary #6D7692` · `accent #5B8DFF` · `accent-light #8FB3FF` · `accent-2 #3D6CF0` · `accent-hover #7AA2FF` · `accent-soft #182246` · `accent-soft-text #A9C3FF` · `success #59B889` · `warning #D9AC55` · `critical #E67278` · `info #8891AA`

**Sidebar** — always dark navy: `bg #090C16` · `hover #141A2C` · `active #1B2338` · `text #C4CBDE` · `text-dim #6B7390` · `border #1B2136`.

---

## 7. Change log

- 2026-09-18 — Phase 1 (Foundation) coded, tested, and running locally with SQLite zero-config local database and seeded demo data.
- 2026-09-18 — Master brain file saved to repository root as the definitive single source of truth for Phases 1–7.
