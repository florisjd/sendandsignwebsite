# Send & Sign — Marketing Website & Brand Brief for Web Designer

> **Purpose:** Complete product overview, positioning, feature breakdown, trust/compliance proof points, and recommended website sitemap/copy blocks for designing and building the **Send & Sign** marketing website.
> **Product Baseline:** SharePoint Native Send & Sign Application (Australia, November 2026).
> **Before writing copy:** check **Section 8 — Claim Status**. Only claims marked *Live* may be presented as available today; *Roadmap* items must be labelled "coming soon" or tied to the Professional Package.

---

## 1. Elevator Pitch & Brand Positioning

**Product Name:** Send & Sign  
**Category:** Sovereign Australian SharePoint-Native Electronic Signature Platform  
**Tagline Options:**
- *"SharePoint-native e-signatures. Built for Australian law."*
- *"Zero guest logins. Signed back into SharePoint."* *(add "100% Australian sovereignty" only once hosting is verified as Australian; see §8)*
- *"Enterprise e-signing without leaving Microsoft 365—or Australia."*

**One-Paragraph Summary:**  
**Send & Sign** is an electronic signature platform built natively for Australian organisations using Microsoft 365 and SharePoint Online. Internal staff send PDFs or Office documents directly from any SharePoint library for **Simple Contract** execution under the *Electronic Transactions Act 1999 (Cth)* s 10 (single-party or multi-party `Parallel` / `Sequential` workflows). External clients sign in seconds through a branded, zero-sign-in web portal—no Microsoft guest accounts, no passwords, and no friction. Every signed document carries an A4 Audit Certificate with SHA-256 fingerprints and a tamper-evident, hash-chained audit trail, and the signed copy is saved straight back into the original SharePoint folder.

---

## 2. Who It Is For (Target Audience)

1. **Australian Businesses & Mid-Market Enterprises on Microsoft 365:** Teams tired of paying per-envelope fees to US-based SaaS platforms and manually downloading/re-uploading signed PDFs back into SharePoint.
2. **Commercial, Sales, HR & Operations Teams:** Send everyday agreements—quotes, proposals, NDAs, service agreements, employment contracts, and multi-party approvals—for fast, defensible *Electronic Transactions Act 1999 (Cth)* s 10 execution with single or multi-signature (`Parallel` / `Sequential`, up to 20 signers) workflows.
3. **Real Estate, Construction, Finance & Accounting:** High-volume commercial agreements and approvals where staff need to send from desktop or the **SharePoint Mobile App** and clients expect instant signing without creating an account.
4. **Government & Regulated Buyers:** Require Australian data residency (APP 8), encrypted and time-limited handling of documents, HSM-backed cryptography (Enterprise roadmap), and least-privilege Microsoft Graph security.

---

## 3. Core Differentiators (Why Send & Sign Wins)

| Pain Point with Legacy E-Sign Tools | How Send & Sign Solves It |
|---|---|
| **Documents leave SharePoint** into third-party US clouds, creating data-sovereignty and retention headaches. | **SharePoint-Native Storage & State:** Documents stay in your Microsoft 365 tenant; signed copies (`{OriginalName}_Signed.pdf`) return automatically to the exact originating SharePoint folder. |
| **External clients hate Microsoft B2B guest logins** and password resets. | **True Zero-Sign-In Portal:** External signers click a single-use cryptographic link + 6-digit OTP—no Microsoft account or app install required. |
| **Complex multi-party sign-offs stall in email threads** and require desktop-only admin tools. | **Multi-Signature Routing (Up to 20 Signers) & SharePoint Mobile App:** Route agreements in **Parallel** (all at once) or **Sequential** (`1 → 2 → 3`) order for up to 20 recipients—directly from SharePoint desktop or the **SharePoint Mobile App (iOS & Android)**. |
| **Basic visual "stamp" tools** give no evidence trail. | **Tamper-Evident Evidence Today, PAdES on the Roadmap:** SHA-256 fingerprints of the original and signed PDF, an RFC 8785 hash-chained audit trail, an A4 Certificate of Electronic Signature and an exportable JSON evidence pack. *Roadmap (Enterprise):* PAdES B-LT digital sealing with an Australian Azure Key Vault Managed HSM and RFC 3161 timestamps. |

---

## 4. How It Works (4-Step Visual Story for Homepage)

1. **Step 1 — Select & Convert in SharePoint**  
   Staff browse any permitted SharePoint site or library directly inside the **Send & Sign** web part (on desktop or in the SharePoint Mobile App). Select a PDF or Office file (`.docx`, `.xlsx`, `.pptx`, `.rtf`, `.odt`)—automatically converted to PDF and fingerprinted with a pre-signing SHA-256 hash.
2. **Step 2 — Multi-Signature Routing & Dispatch**  
   Choose **Single Signature** or **Multi-Signature** for **up to 20 recipients**—either **Parallel** (all signers receive their links simultaneously) or **Sequential** (`1 → 2 → 3` step-by-step routing where each signer automatically receives their link once the previous party signs)—and dispatch each recipient their own single-use 256-bit cryptographic link from your Microsoft 365 mailbox.
3. **Step 3 — Frictionless Zero-Sign-In Signing**  
   The external client opens your branded signing portal on mobile or desktop, verifies via a 6-digit e-mail OTP, accepts the electronic consent notice (with a paper opt-out option), and draws, types, or uploads their signature.
4. **Step 4 — Audit Certificate & Same-Folder Return**  
   The signed PDF is fingerprinted and paired with an A4 Audit Trail Certificate, everyone receives a completion e-mail with a download link, and the signed copy is saved back to the original SharePoint folder next to the untouched original.

---

## 5. Key Features to Highlight on the Website

### A. Seamless Microsoft 365 & SharePoint Experience
- **One-Click SharePoint Deployment (Zero PowerShell):** Upload the `.sppkg` to your App Catalog and add the web part to your **Send and Sign** site—tracking lists (`SendAndSignTracking`, `SendAndSignSettings`) and the central archive folder (`SendAndSign_Archive`) are automatically provisioned on first launch.
- **2-Step New Envelope Wizard with Supporting Email Attachments:**
  - **Step 1 — Choose Document:** Browse any permitted SharePoint site, library, or folder via interactive **Breadcrumb navigation** (with file type, size, and modified date metadata) to pick the contract requiring signature.
  - **Step 2 — Recipients & Supporting Attachments:** Choose **Single Signature** or **Multi Signature** (`Parallel` or `Sequential` `1 → 2 → 3` up to 20 recipients with responsive recipient cards) and optionally attach supporting reference files (via local computer upload or the collapsible **Attach from SharePoint** browser with a live `2.2 MB` attachment size indicator and removable file chips) as standard email attachments alongside the signing link.
- **Native Office-to-PDF Conversion:** Send Word, Excel, PowerPoint, RTF, or OpenDocument files directly—automatically converted to PDF (with macro-enabled `.docm` files safely blocked).
- **Interactive Click-to-Place & Keyboard Signature Positioning:** External signers view the PDF with zoom controls (`50%–300%`), click anywhere on the page (or use the keyboard **Place box** button and arrow keys) to position their signature box, and adopt a Retina high-DPI drawn, typed, or uploaded signature in light or dark mode.
- **Same-Folder Write-Back & Open Folder Workflow:** Original files remain untouched; `{OriginalName}_Signed.pdf` lands right next to the original (with optional major-version overwrite mode). Both the sender's completion email and the dashboard **Open folder** button link directly to the SharePoint folder holding both copies.
- **Live KPI Dashboard & Admin-Only Central Audit Archiving:** Filter active records via clickable KPI summary cards (`Awaiting signature`, `Signed`, `Reminder sent`, `Declined, revoked or expired`, plus an automatic red `Needs attention` card if a seal or save ever fails), switch between **Active** and **Archived** views, inspect plain-English Audit Trail timelines with one-click SHA-256 hash copy, send manual nudges, revoke unconsumed links, and let SharePoint Administrators archive completed batches via the **Admin** menu into a **SHA-256 Tamper-Evident Audit Ledger** (`SendAndSign_AuditArchive_YYYY-MM-DD_<hash>.json`) stored in one central SharePoint folder.
- **Multi-Signature Routing (Parallel & Sequential — Up to 20 Signers):**
  - **Parallel Signing:** Dispatch unique single-use links to up to 20 recipients simultaneously so everyone can sign in any order.
  - **Sequential Signing (`1 → 2 → 3 … → 20`):** Enforce strict signing order—only the active signer receives an active link, and Send & Sign automatically advances to the next recipient in the chain upon each completed signature.
  - Every signer receives their own recipient-tethered link, independent 6-digit email OTP verification, and dedicated entry on the A4 Certificate of Electronic Signature & Audit Trail.
- **Full SharePoint Mobile App Compatibility (iOS & Android):**
  - Because Send & Sign is built natively on **SPFx `1.24.1`** with responsive container queries (`@container`), adaptive multiline list rows (`Jane Doe +N more`), touch-friendly KPI filter cards, Breadcrumb folder navigation, and SharePoint `ThemeProvider` support, internal staff can use the full **Send & Sign** web part directly inside the **Microsoft SharePoint Mobile App (iOS & Android)**—with zero separate app install required.
  - On mobile, staff can browse SharePoint libraries, launch the 2-step **New Envelope** wizard, configure up to 20 parallel or sequential signers, track real-time envelope status, inspect plain-English audit timelines, send one-click reminders, or revoke links on the go.
  - Paired with the touch-optimised external signing portal (flex-responsive 6-digit OTP inputs, high-DPI Retina touch signature pad, zoomable PDF viewer, and automatic dark mode), both the **internal sender (SharePoint Mobile App)** and **external client (mobile browser)** enjoy a seamless mobile experience.
- **One-Click Reminders & Automatic Expiry:** Remind outstanding signers from the dashboard (each reminder sends a fresh, secure link and retires the old one); unsigned envelopes expire automatically. *(Automated 5-day reminders: roadmap.)*

### B. Built-In Australian Simple Contract Compliance
- **Simple Contracts & Commercial Agreements (*ETA 1999 (Cth)* s 10):** Full support for commercial contracts, quotes, proposals, NDAs, HR agreements, and service agreements across Australia—enforcing all four statutory pillars (Identity via 6-digit OTP, Intention, Reliability via SHA-256 + RFC 8785 hash-chained audit logs, and explicit Consent with paper opt-out).
- **Multi-Signature Workflows (Up to 20 Signers):** Single-party and multi-party (`Parallel` and `Sequential` up to 20 recipients) routing with per-recipient single-use cryptographic links and OTP challenges.
- **Case Law Engineered:** Recipient-tethered sessions (*Williams Group v Crocker*) and incremental PDF updates (`@libpdf/core`).

### C. Enterprise Security, Privacy & Sovereignty
- **Australian Data Residency (APP 8):** Designed for Azure **Australia East (Sydney)** with **Australia Southeast (Melbourne)** disaster recovery. *(Only state "hosted in Australia" once the live hosting location is verified; see §8.)*
- **Encrypted, Time-Limited Document Handling:** While a document is out for signature it is held encrypted (AES-256-GCM) and automatically deleted after a fixed retention period; your permanent copy lives in your own SharePoint.
- **Secure Links & Verification:** Single-use 256-bit links stored only as hashes (never in readable form, even in your SharePoint lists), 6-digit e-mail OTP with lockout. *(Roadmap: Australian SMS OTP and Digital ID—myID / AGDIS.)*
- **Microsoft Entra-Authenticated Sending:** Staff send using their Microsoft 365 sign-in; the signing service verifies every request against Microsoft Entra and keeps each organisation's envelopes isolated.
- **Tamper-Evident Audit Trail:** Every event is hash-chained using **RFC 8785 (JCS)** and embedded into an A4 Certificate of Electronic Signature, plus exportable as a verifiable JSON Evidence Pack.
- **Least-Privilege Microsoft Graph:** Read-only `Sites.Read.All` for browsing; signed copies are saved with the sender's own SharePoint permissions—zero SharePoint OAuth tokens ever touch external browsers.
- **White-Label Branding & Automatic Contrast:** Customise the external signing portal with your organisation's logo, brand colours (with automatic WCAG-compliant light/dark text contrast and system dark-mode support), and M365 email signature.

---

## 6. Recommended Website Sitemap & Section Structure

1. **Home (`/`)**
   - Hero section: Headline, sub-headline, primary CTA (*"Book a Demo"* / *"Start Pilot"*), and clean product mockup showing the SharePoint Web Part alongside the Zero-Sign-In Mobile/Desktop Signing Portal.
   - Trust strip: *"SharePoint Native • Zero Guest Logins • Tamper-Evident Audit Trail • Built for Australian Law"* *(add "Hosted in Australia" / "PAdES B-LT HSM" only when §8 marks them Live)*.
   - 4-Step *"How It Works"* visual flow.
   - 3-Column Value Cards (*SharePoint Native & Mobile Ready*, *Zero Sign-In for Clients*, *Multi-Signature up to 20 Signers*).
   - Interactive / tabbed feature showcase (Dashboard, Multi-Sign Routing, SharePoint Mobile App, Audit Certificate).
   - Final CTA banner.
2. **Features (`/features`)**
   - Deep dive into SharePoint discovery, Office-to-PDF conversion, **Parallel & Sequential multi-signature routing (up to 20 signers)**, **SharePoint Mobile App (iOS & Android)** compatibility, one-click reminders, link revocation, decline workflows, and white-label branding.
3. **Australian Compliance (`/compliance`)**
   - *Electronic Transactions Act 1999 (Cth)* s 10 4-pillar breakdown (Identity via 6-digit email OTP, Intention, Reliability via SHA-256 + RFC 8785 hash-chained audit trail, and Consent with paper opt-out).
   - Case-law protection callout (*Williams Group v Crocker* recipient-tethered sessions).
   - Clear scope positioning: built for Simple Contracts, everyday commercial agreements, quotes, NDAs, and internal/external multi-party sign-offs.
   - *Note for footer/page:* Include a clear *"General information only — not legal advice"* note.
4. **Security & Architecture (`/security`)**
   - Two-tier decoupled architecture diagram (Tier 1 Inside M365 vs. Tier 2 Signing Bridge).
   - **IT & SharePoint Admin Peace of Mind:** Explain `.sppkg` package transparency (standard inspectable ZIP archive, zero server-side farm code, strict 2026 SharePoint CSP compliance, `$0` Microsoft Graph API call fees, read-only `Sites.Read.All`, and zero-impact App Catalog removal).
   - Encrypted, time-limited document handling, Microsoft Entra-authenticated sending, single-use 256-bit tokens (`410 Gone` replay protection), 6-digit OTP verification, and OWASP ASVS 5.0 alignment (Azure Key Vault HSM / RFC 3161 timestamps on the Professional roadmap).
5. **Deployment & Pricing (`/pricing`)**
   - **Product Editions:**
     - **v1 (Current Release — Simple Contracts & Multi-Signature):** Built for fast, high-volume commercial agreements—includes Simple Contracts (*ETA 1999 (Cth) s 10*), Single & Multi-Signature routing (**Parallel & Sequential for up to 20 recipients**), per-recipient 6-digit OTP verification, interactive click-to-place PDF signing, full **SharePoint Mobile App (iOS & Android)** web part support, A4 Audit Certificate, SharePoint same-folder write-back, and Tamper-Evident Audit Ledger Archiving.
     - **Enterprise Roadmap:** Adds optional **Azure Key Vault Managed HSM PAdES B-LT** cryptographic sealing with RFC 3161 timestamps, automated 5-day reminders, SMS OTP, and real-time push notifications.
   - **Hosting Options:** **Multi-Tenant Australian SaaS** (fastest onboarding) vs. **Dedicated / Government SKU** (single-tenant customer Azure deployment).
   - Emphasise predictable pricing without punitive US-dollar per-envelope surprises.
6. **Contact / Book a Demo (`/contact`)**
   - Simple lead capture form (Name, Work Email, Company, M365 Tenant Size, State).

---

## 7. Visual & Design Direction for the Web Designer

- **Aesthetic:** Clean, authoritative, modern Australian enterprise SaaS—combining Microsoft 365 clarity with legal-tech trustworthiness.
- **Colour Palette Suggestion:**
  - Deep Navy / Slate (`#0F172A` or `#1B2A4A`) for trust and authority.
  - Crisp White / Warm Off-White (`#FFFFFF` / `#FAF9F8`) for readability and SharePoint harmony.
  - Microsoft-aligned Azure Blue (`#0078D4`) or Sovereign Emerald (`#107C10`) for primary CTAs and `"Verified / Signed"` badges.
- **Key Visual Assets to Create:**
  1. **Split-Screen Hero Graphic:** Left side showing an internal user selecting a contract in SharePoint (desktop or SharePoint Mobile App); right side showing a client signing smoothly on a mobile phone without a login screen.
  2. **Multi-Signature Routing Diagram:** Visual flow showing **Parallel** (all signers at once) vs. **Sequential** (`1 → 2 → 3 … → 20`) signing order with per-recipient OTP badges.
  3. **Audit Certificate Preview:** Stylised mockup of the A4 Certificate of Electronic Signature showing SHA-256 hashes, timestamps, and green `"Verified"` seal.
  4. **Architecture Trust Diagram:** Simplified 2-tier visual showing `"Your SharePoint Tenant"` ↔ `"Secure Signing Bridge (encrypted, auto-deleting)"` ↔ `"External Signer"`.

---

## 8. Claim Status & Marketing Copy Guardrails

### Claim Status (as of 19 November 2026 — keep in sync with `project_guide.md` §1.1)

| Claim | Status |
|---|---|
| SharePoint-native sending, same-folder signed copy, original untouched | **Live** |
| Zero-sign-in portal, single-use links, 6-digit **e-mail** OTP | **Live** |
| Single & multi-signer (**Parallel & Sequential, up to 20 signatures**) | **Live** |
| Responsive SPFx web part inside the **SharePoint Mobile App (iOS & Android)** | **Live** |
| A4 Audit Certificate, SHA-256 fingerprints, hash-chained audit trail, JSON evidence pack | **Live** |
| Encrypted (AES-256-GCM), time-limited document storage on the signing service | **Live** |
| Microsoft Entra-authenticated, tenant-isolated signing service | **Live** (once the customer approves the API permission) |
| One-click reminders with fresh links; automatic expiry | **Live** |
| "Hosted in Australia" / APP 8 data residency | **Do not claim** until the live hosting location is verified as Australian |
| PAdES B-LT digital seal, Managed HSM, RFC 3161 timestamps | **Roadmap** (Enterprise) — the PDF is not yet digitally signed |
| SMS OTP, Digital ID | **Roadmap** |
| Automated 5-day reminders, real-time (push) dashboard updates | **Roadmap** |
| "Zero disk persistence" / "memory only" | **Never claim** — retired by ADR-0002 |

### Copy Guardrails

- **Simple Contracts & Everyday Agreements Only:** Position Send & Sign strictly for Simple Contracts, quotes, proposals, NDAs, HR agreements, and multi-party commercial sign-offs under the *Electronic Transactions Act 1999 (Cth)* s 10. Do **not** claim support for deeds, witnessed instruments, wills, or statutory declarations.
- **Legal Review Note:** Have qualified Australian legal counsel review final public compliance claims prior to commercial launch.
