# Product Requirements & Software Requirements Document (PRS/SRD)

## 0) Executive Summary

**Working name:** Hiring Kit in a Day (SaaS)

**What it does:** A self-serve web app that turns a short role intake into a complete, bias-aware **Hiring Kit** (Scorecard, Job Post, Interview Pack with rubrics, Work Sample, Reference Script, Process Map, EEO guardrails). Optional "human-in-the-loop" (HITL) QA/Editing and an upgraded package that accepts a recorded intake interview transcript to seed the kit.

**Launch goal (today):** Ship an MVP that collects role info, generates a Hiring Kit, lets users lightly edit, and exports a polished PDF. Payments are per‑kit; no sales calls needed.

---

## 1) Product Vision & Goals

- **Vision:** Make structured, fair hiring the easy default for small orgs by packaging best‑practice hiring assets in minutes.
- **Primary goals (MVP):**
  - Intake → AI generation → on‑screen preview → PDF export → email receipt.
  - Per‑kit checkout with Stripe.
  - Optional HITL toggle (admin can route kits to QA before delivery).
- **Key outcomes:**
  - Time‑to‑first‑value < 10 minutes from landing to preview.
  - < 5 minutes from payment to downloadable kit.
  - 90% of generated kits require ≤ 10 edits to ship.

---

## 2) Personas

1. **Founder/Director/HR‑solo** (primary)
   - Needs a ready‑to‑run process now; values clarity, fairness, and speed.
2. **Hiring Manager** (secondary)
   - Wants tailored questions and rubrics that map to outcomes.
3. **Operations/People Generalist** (secondary)
   - Wants repeatable templates, governance, and clean exports.
4. **Internal QA Editor (us)**
   - Applies style guardrails, fixes edge‑case phrasing, approves delivery.

---

## 3) User Stories (MVP‑critical)

- As a user, I can **enter role basics** (title, org, outcomes, responsibilities, must/should‑haves, values) in one page.
- As a user, I can **preview** a fully assembled kit before paying.
- As a user, I can **checkout** and then **download** the final kit as PDF.
- As a user, I can **edit text** inline before exporting.
- As an admin, I can **flag orders to route through QA** and approve them.

**Post‑MVP user stories**

- Upload **intake audio or transcript**; app extracts structured inputs.
- Save **brand profile** (logo, colors) and **default hiring process** per org.
- Export as **Google Doc** bundle and **Canva‑ready** importable PDF.
- Version history and **compare changes** between AI and edits.

---

## 4) Scope (MVP vs. later)

**In‑scope (MVP):**

- Single‑page intake + live preview (two‑pane UI) with **sales‑safe gating** (see §6.7).
- Opinionated template that maps to the Hiring Kit content model.
- Payments: Stripe Checkout (one‑time purchase per kit).
- Export: **combined PDF** and **multi‑file ZIP** (separate PDFs by artifact) + email delivery.
- Simple admin: orders list, view kit, toggle HITL, approve/publish.
- **AI Pre‑Population:** Express Mode + per‑field suggestions.
- **Branding via Templates:** Master, locked layouts with placeholder tokens filled at runtime.

**Out‑of‑scope (MVP):**

- Teams/Seats & complex org RBAC.
- Multi‑brand theming; Docx export; true Canva API integration.
- Advanced analytics, SSO, SOC2.

---

## 4.1 Design System & Template Spec (Brand‑first)

**Goal:** Every kit renders into **approved, professional layouts**. The app only fills placeholders; it **never** changes the layout.

### A) Brand Profile (per org)

- Fields: `logo_url`, `brand_primary`, `brand_neutral`, `accent`, `font_heading`, `font_body`, `address_block`.
- Defaults: Heading **Montserrat** (or Outfit), Body **Inter**; Primary `#1F4B99`, Accent `#39B3A6`, Neutral bg `#F7F8FA`.

### B) Template Inventory (locked layouts)

1. **Cover** — big title, subtitle, logo, date, footer band.
2. **Quick Start** — 3‑column steps with icon chips.
3. **Scorecard** — two‑column grid + metrics table.
4. **Job Post** — hero hook, two columns (must / nice), callout card.
5. **Interview Stages (x3)** — question list + rubric table component.
6. **Work Sample** — instructions card + scoring table.
7. **Reference Script** — Q list with note lines.
8. **Process Map** — horizontal timeline with step chips.
9. **EEO & Bias Guardrails** — concise list + disclaimer block.

### C) Placeholder Token Map

- Examples: `{{org.name}}`, `{{role.title}}`, `{{scorecard.mission}}`, `{{job_post.summary}}`, `{{interview.stage1.questions}}`.
- Tokens render into **pre‑sized text boxes** with overflow rules (truncate → continue on next page).

### D) Rendering Paths

- **HTML→PDF (primary):** Server renders HTML with brand tokens → PDF via Playwright.
- **Multi‑file:** Each artifact has its own HTML template and header/footer. ZIP after render.
- **Canva handoff (post‑MVP):** Export a Canva‑importable PDF that mirrors the HTML layout.

### E) Quality Bars

- 8pt spacing scale, 12pt min touch targets, consistent header/footer bands, section color chips, and page numbers.
- Hard page breaks between artifacts. No widows/orphans in headings.

---

## 5) Content Model (Artifacts)

Each **Hiring Kit** includes:

1. **Role Scorecard** (mission, outcomes, responsibilities, competencies, success metrics 90/180/365)
2. **Job Post** (intro hook, summary, responsibilities, must‑have, nice‑to‑have, comp/benefits, how to apply)
3. **Interview Pack**
   - Stage 1: Screening + rubric
   - Stage 2: Deep‑dive + rubric
   - Stage 3: Culture/Alignment + rubric
4. **Work Sample/Case** (scenario, instructions, scoring guide)
5. **Reference Check Script**
6. **Process Map**
7. **EEO & Bias Guardrails**

> The MVP template elements align with our existing HTML one‑pager and Canva PDF template for consistency.

---

## 6) Functional Requirements

### 6.0 Preview Concept — How it Looks/Works (Sales‑safe)

**Objective:** Let users *see* the value without giving away the full content.

**What the user sees:**

- **First page only** of each artifact (Cover excluded).
- A diagonal **PREVIEW** watermark.
- **Truncated bullets** (first ~10–12 words) with an ellipsis chip: "··· unlock full".
- **Rubrics:** only the **3 = Meets** row is visible; rows 1–2 and 4–5 are blurred with locks.
- **Process Map:** timeline with steps visible but details blurred.
- A right‑rail **What you'll get** checklist and a **Unlock full kit** button.

**Why this deters copy/paste:**

- The preview pane is rendered as a **rasterized image** (canvas) — selection & copy disabled.
- `copy` and `contextmenu` events are intercepted to open a small paywall modal.
- Long content is **server‑side paginated**; only page 1 is fetched for preview.

**Micro‑interactions:**

- Hovering a blurred paragraph shows a tooltip: "Full content unlocks after payment."
- Attempting to copy shows a 2‑option modal: "Unlock" or "Continue preview".

---

### 6.1 Intake & Preview

- **Fields:** role title, org, reports to, department, location, employment type, mission, outcomes[], responsibilities[], core skills[], behavioral competencies[], values[], success metrics (90/180/365), job post intro, summary, must‑have[], nice‑to‑have[], compensation, how to apply, work‑sample scenario.
- **UX:** two‑pane (left intake, right preview). Auto‑updates preview on change. Preserves state (localStorage + DB after login/payment).

### 6.2 AI Generation

- **Method:** A structured prompt injects intake → returns JSON for each artifact + suggested copy edits & bias‑aware language checks.
- **Controls:** temperature low; max tokens sized per section; content guardrails (see §9).
- **Regeneration:** per‑section "Regenerate" with short deltas (e.g., change tone, tighten length, industry variant).

### 6.3 Editing & Review

- Inline rich‑text editing with minimal controls (bold, italics, bullets, H3/H4).
- Change badges (edited vs. AI) and quick "restore AI draft" per section.

### 6.4 Export

- **Combined export:** server‑side PDF (letter), consistent headers/footers, page breaks between sections.
- **Multi‑file export:** one ZIP bundle containing **separate PDFs** per artifact: 1) Scorecard, 2) Job Post/Ad, 3) Interview Stage 1, 4) Interview Stage 2, 5) Interview Stage 3, 6) Work Sample/Case, 7) Reference Script, 8) Process Map, 9) EEO & Bias Guardrails. (Editable Google Docs as a post‑MVP option.)
- Email with download link. Assets retained for 30 days (MVP), then archived.

### 6.5 Payments

- Stripe Checkout → webhooks → create order → unlock export → (optional) route to QA.

### 6.6 Admin & HITL

- Orders queue with statuses: **draft → awaiting_payment → paid → (qa_pending) → ready → delivered**.
- Admin can edit any section, leave reviewer notes, approve to publish.

### 6.7 Preview Gating & Anti‑Copy Strategy (Sales‑safe Preview)

- **Teaser depth:** show ~20–30% of copy per section, never the full text. For rubrics, show **only one anchored level** (e.g., the "3 = Meets" row); hide the full 1–5 anchors until payment.
- **Blur/Redact:** automatically truncate long bullets and add an inline blur/redaction after 10–12 words (e.g., "… pay to unlock").
- **Rasterized preview layer:** render the right‑pane preview as a low‑res image with a diagonal **"Preview – Not Final"** watermark; disable text selection and **intercept copy** events to show a paywall CTA. (Not perfectly tamper‑proof, but sufficiently deters casual copy/paste.)
- **Pagination lock:** show the **first page** of each section only; display a page count and checklist of what's included after payment.
- **CTA blocks:** persistent right‑rail summary of unlocked deliverables + money‑back guarantee; one‑click "Pay & Export".

### 6.8 AI Pre‑Population UX (Do‑It‑For‑Me)

- **Express Mode:** user provides *only* role title, org/industry, and 1–2 mission lines → app **autofills all fields** (outcomes, responsibilities, competencies, success metrics, job post, interview questions, rubrics, case prompt). User can accept as‑is or tweak.
- **Role Library:** presets for common roles (e.g., Ops Manager, Dev, AE, Marketing, Finance, Nonprofit Program Manager). Selecting a preset pre‑loads sensible defaults.
- **Smart Suggestions:** per‑field "Suggest" button to add/replace bullets (e.g., "Suggest 5 responsibilities for a faith‑aligned nonprofit Program Manager").
- **Tone/Variant Controls:** chips to toggle tone (concise/warm/formal), seniority (IC/Manager/Director), and context (nonprofit/for‑profit/faith‑based/remote‑first).
- **Reset & Compare:** "Reset to blank" and side‑by‑side compare between *Your edits* and *AI draft*.

## 7) Non‑Functional Requirements

- **Performance:** initial preview under 2s; generation under 45s typical.
- **Availability:** 99.5% (MVP best effort on Vercel/Supabase).
- **Security:** HTTPS, JWT sessions, RLS on DB tables, signed download URLs.
- **Privacy:** PII minimal; redact candidate names in templates by default.
- **Compliance:** bias‑aware copy guidelines; EEO guardrails included (not legal advice).

---

## 8) Architecture (proposed)

- **Frontend:** Next.js 14 (App Router), React, TypeScript, Tailwind.
- **Auth & DB:** Supabase (Postgres, RLS, Storage for PDFs).
- **AI:** OpenAI (text generation) with structured JSON outputs; optional Whisper/AssemblyAI for transcript (post‑MVP).
- **Payments:** Stripe Checkout + Webhooks (orders + receipts).
- **Email:** Resend (transactional).
- **Render:** Server‑side HTML → PDF (Playwright or Puppeteer) for predictable layout.
- **Hosting:** Vercel (frontend & functions), Supabase (DB/storage), optional worker for rendering if needed.

**Key services & flows:**

1. **Intake POST /api/kits** → create draft kit (JSON schema) → live preview.
2. **Generate POST /api/kits/:id/generate** → AI fills all artifacts.
3. **Checkout POST /api/checkout** → Stripe session → success URL.
4. **Webhook POST /api/stripe/webhook** → mark order paid → (optional) set qa_pending.
5. **Approve POST /api/kits/:id/approve** (admin) → ready.
6. **Export POST /api/kits/:id/export** → PDF → store → return signed URL.

---

## 9) Safety, Fairness & Guardrails

- Language filters to avoid protected‑class terms; neutral, inclusive phrasing.
- EEO page appended by default; fairness tips in Interview Pack; consistent rubrics.
- Model prompts include **bias‑reduction instruction** and **evidence‑first scoring**.
- Disclaimers: informational only, not legal advice; user responsible for final compliance.

---

## 10) Data Model (initial)

**Tables** (Supabase):

- `orgs` (id, name, brand_logo_url, brand_colors, created_at)
- `users` (id, email, name, org_id, role)
- `plans` (id, name, features_json, price_cents)
- `orders` (id, org_id, user_id, kit_id, status, stripe_session_id, total_cents, created_at)
- `kits` (id, org_id, user_id, title, status, intake_json, artifacts_json, edited_json, qa_required, qa_notes, created_at, updated_at)
- `exports` (id, kit_id, **kind** enum('combined_pdf','zip'), url, created_at)
- `export_assets` (id, export_id, **artifact** enum('scorecard','job_post','interview_stage1','interview_stage2','interview_stage3','work_sample','reference_check','process_map','eeo'), url, created_at)
- `audit_logs` (id, actor_id, kit_id, action, payload_json, created_at)

**Artifacts JSON schema (simplified):**

```json
{
  "scorecard": {"mission":"","outcomes":[],"responsibilities":[],"competencies":{"core":[],"behavioral":[],"values":[]},"success":{"d90":"","d180":"","d365":""}},
  "job_post": {"intro":"","summary":"","responsibilities":[],"must":[],"nice":[],"comp":"","apply":""},
  "interview": {"stage1": {"questions":[],"rubric":[]}, "stage2": {"questions":[],"rubric":[]}, "stage3": {"questions":[],"rubric":[]}},
  "work_sample": {"scenario":"","instructions":[],"scoring":[]},
  "reference_check": {"questions":[]},
  "process_map": {"steps":[],"pacing":[]},
  "eeo": {"principles":[],"disclaimer":""}
}
```

## 11) API (MVP shapes)

- `POST /api/kits` → { title, intake } → { kit_id }
- `POST /api/kits/:id/generate` → uses intake → returns `artifacts_json`
- `PATCH /api/kits/:id` → update edits per section
- `POST /api/checkout` → { kit_id } → { stripe_url }
- `POST /api/stripe/webhook` → updates `orders.status`
- `POST /api/kits/:id/export` → returns `{ pdf_url }`
- `GET /api/kits/:id` (RLS) → load for preview/edit
- Admin endpoints mirror with role checks.

---

## 12) Prompts (outline)

- **System:** You are a hiring operations specialist. Produce bias‑aware, evidence‑based hiring assets. Output strict JSON per schema. Avoid protected‑class language. Prefer concise, specific bullets.
- **User:** {intake_json + org tone/style}
- **Functions:** Per‑section validators (length, bullets 5–8, anchors in rubrics with 1–5 scale descriptors).

---

## 13) Pricing & Packaging (initial)

- **Solo (Self‑Serve):** $49 per kit (includes 1 export). Add‑on: $9 per extra export within 7 days.
- **Pro (HITL QA):** $129 per kit (editor review in 4 business hours).
- **Interview‑Led Add‑On:** $199 (user uploads audio; we transcribe + seed kit).
- Future: Subscriptions with credits + team seats.

---

## 14) Success Metrics

- Conversion to paid from preview; % kits edited; average edit count; time to export; refund rate; CSAT.

---

## 15) Acceptance Criteria (MVP)

- User can complete intake and see a **gated live preview** (blur/truncate + first‑page only + watermark; copy attempts trigger paywall modal).
- AI **Express Mode** can fully pre‑populate a kit from role title + 1–2 mission lines.
- After payment, user can **download** either a **combined PDF** or a **ZIP** with separate PDFs per artifact.
- Admin can **toggle HITL** on an order; if on, user sees "We're reviewing" and receives email on publish.
- Stripe webhook **unlocks export** reliably within 60 seconds of payment.

---

## 16) Risks & Mitigations

- **AI drift / hallucination:** strict JSON schema, per‑section token limits, validators.
- **Bias or risky language:** bias‑reduction instructions + post‑gen lint.
- **PDF layout issues:** controlled server‑side render with tested CSS page breaks.
- **Payment/webhook failures:** retry with idempotency keys; fall back support email.

---

## 17) Build Plan (Launch Today)

**Track A — Core UI (4–6 hrs)**

- Scaffold Next.js app; import two‑pane intake/preview (reuse one‑page MVP layout); local state → kit draft; minimal auth (magic link or none pre‑payment).

**Track B — AI & Export (3–5 hrs)**

- Implement `/api/kits/:id/generate` using OpenAI; map JSON → preview components; server PDF export (Playwright). Store to Supabase.

**Track C — Payments & Admin (2–3 hrs)**

- Stripe Checkout; webhook; order gating; simple admin page with approve.

**Track D — Email & Polish (1–2 hrs)**

- Resend emails (receipt, download link, HITL approved). Copy polish and empty‑state tips.

*Total day: 10–16 hrs. If time‑boxed, ship A+B today; add C/D tomorrow morning.*

---

## 18) Today's Launch Checklist

-

---

## 21) User Journey (Sales/Marketing Aware)

1. **Landing → Role Title** (hero form): Enter role title → click **Generate Preview**.
2. **Express Preview** (gated): See structure + partial copy with watermark. CTA: "Unlock Full Kit" with bullets of everything included.
3. **Upsell toggles:** HITL QA, Transcript Ingestion, Extra Exports.
4. **Checkout → Success**: Clear next steps; show timer/progress while export builds.
5. **Delivery**: Download combined PDF or ZIP; email receipt + link + quick start.
6. **Follow‑up**: Nudge to save Org Brand Profile and schedule a new role (retention).