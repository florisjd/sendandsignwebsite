# Send & Sign — SharePoint Administrator API, Cost & Risk Assessment Guide

> **Audience:** SharePoint Administrators, Microsoft 365 Global Administrators, and Enterprise Security / IT Governance Teams.  
> **Scope:** Explains why each API permission appears during App Catalog deployment and on the **API access** page, what it can and cannot do, API call costs, security risks & mitigations, and why the app cannot crash SharePoint or overwrite/corrupt your existing data.

---

## 1. Quick Executive Summary

| Question | Short Answer |
|---|---|
| **Does this app cost extra per Microsoft Graph / SharePoint API call?** | **No (\$0 per API call).** All SharePoint REST and Microsoft Graph endpoints used by Send & Sign are included in your existing Microsoft 365 licensing. |
| **Can the app read or delete files a user doesn't have access to?** | **No.** The SPFx web part runs strictly under the **signed-in user's delegated identity**. It inherits SharePoint's existing permissions and cannot bypass them. |
| **Can the app overwrite or delete my original contracts?** | **No.** Original files are read-only. Signed documents are saved as a separate copy (`{OriginalName}_Signed.pdf` or `{OriginalName}_Signed.html`), leaving the original file untouched. |
| **Can this app crash or bring down SharePoint Online?** | **No.** SPFx `1.24.1` runs client-side in the user's browser sandbox with zero SharePoint server-side code and zero host DOM/CSS modification. |
| **Can we cleanly remove it if needed?** | **Yes.** Removing the `.sppkg` from the App Catalog immediately disables the web part, while all your signed PDFs and tracking lists remain intact in SharePoint. |

---

## 2. API Permissions Explained (Why Each One Is Required)

When you upload `spfx-send-and-sign.sppkg` to the SharePoint App Catalog, Microsoft 365 displays the permissions declared in `package-solution.json`. Depending on whether you are deploying the **Intermediate Package** (SharePoint + Local/Standard Bridge) or the **Production Enterprise / SaaS Mode**, you may see the following permissions:

### A. Active SPFx Web Part Permissions (Delegated — User Context)

| API & Scope | Type | Why Send & Sign Needs It | What It Allows | What It CANNOT Do |
|---|---|---|---|---|
| **Microsoft Graph — `User.Read`** | Delegated | Identifies the internal sender (`displayName`, `email`) for audit trails and email invitations. | Read the signed-in user's basic M365 profile. | Cannot read other users' passwords, emails, or directory objects. |
| **Microsoft Graph — `Mail.Send`** | Delegated | Sends signing invitation emails and manual reminder nudges from the sender's own M365 mailbox (`/me/sendMail`) so external clients trust the sender. | Send emails as the signed-in user (saved to their Sent Items). | Cannot read the user's inbox, read other people's mailboxes, or send email silently without user action. |
| **Microsoft Graph — `Sites.Read.All`** *(Read-Only)* | Delegated | Lets users browse SharePoint sites they already have access to and converts Office files (`.docx`, `.xlsx`, `.pptx`, `.rtf`, `.odt`) to PDF via Graph `?format=pdf`. | **Read-only** discovery and PDF conversion for files the signed-in user already has SharePoint permission to view. | **Cannot** write, edit, overwrite, or delete any SharePoint file, list, or site via Graph. Cannot bypass SharePoint ACLs. |
| **`esign-api` — `Envelope.ReadWrite`** | Delegated *(Send & Sign's own Entra app, `api://esign`)* | Authenticates the web part to the Signing Bridge with the signed-in user's Entra token, so no static API key or secret is stored in SharePoint. **Required:** without it the web part cannot send documents for signature. | Only lets the user register, check, remind and revoke **their own tenant's** Send & Sign envelopes. Grants no access to SharePoint or Microsoft Graph. The bridge verifies the token's signature, audience, issuer, tenant (`tid`) and scope; non-onboarded tenants receive `HTTP 403` and other tenants' envelopes are invisible (`HTTP 404`). |

> **Where signed copies are saved from:** today, the signed copy (`{OriginalName}_Signed.pdf` or `{OriginalName}_Signed.html`) is uploaded **by the web part, using the signed-in user's own SharePoint permissions** (`SPHttpClient`), when the dashboard syncs with the bridge. No extra Graph write scope is involved, but a signed copy only lands in SharePoint once someone with write access to that folder opens the dashboard.
>
> **Claude MCP Connector (`v2.0`) requires zero additional Microsoft Graph scopes:** When a user connects Claude via **Connect to Claude** (`https://bridge.sendandsign.online/mcp`), Claude authenticates per-user using the exact same Entra app (`esign-api` / `Envelope.ReadWrite`) via RFC 9728 OAuth 2.0 Protected Resource Metadata (`/.well-known/oauth-protected-resource`). Claude can only stage encrypted HTML proposal drafts on the Signing Bridge under that user's identity—it **cannot** read or write SharePoint libraries, send emails, or dispatch envelopes on its own. A human inside SharePoint must review and click **Send for signature**.

### B. Planned Backend Permission (Not Yet Used)

| API & Scope | Type | Why Send & Sign Would Need It | Security Boundary |
|---|---|---|---|
| **Microsoft Graph — `Sites.Selected`** | **Application** *(Backend `esign-worker` only)* | Would let the Signing Bridge write `{OriginalName}_Signed.pdf` back to SharePoint immediately after signing, without waiting for a user to open the dashboard. **Not requested or used by the current release.** | Grants **zero access by default**. A SharePoint Admin must explicitly grant `Write` access per target site/library (`POST /sites/{id}/lists/{id}/permissions`). |

> **Important Note on `Sites.Selected`:** In Microsoft Graph, `Sites.Selected` is an **Application** (app-only) permission assigned to a backend app registration—it is **not** a delegated SPFx browser permission. The SPFx package requests the delegated Graph scopes `User.Read`, `Mail.Send` and `Sites.Read.All`, plus the delegated `esign-api` / `Envelope.ReadWrite` scope for the Signing Bridge.

---

## 3. API Call Costs

**Microsoft 365 / Graph API Call Cost: \$0.00**

1. **Included in Existing M365 Licences:** All endpoints called by the SPFx web part (`SPHttpClient` SharePoint REST calls, `/me/sendMail`, `/me/people`, `Sites.Read.All`, and Graph Office-to-PDF `/content?format=pdf`) are standard Microsoft 365 APIs included at no additional per-call charge.
2. **No Metered Microsoft APIs:** Send & Sign does **not** use Microsoft Graph Data Connect, SharePoint Premium / Syntex pay-as-you-go metered APIs, or Power Automate / Logic Apps per-run connectors.
3. **Lightweight Polling Footprint:** The dashboard performs a quiet background refresh every 30 seconds fetching only the top 100 tracking rows (`?$top=100&$orderby=Id desc`), staying well below Microsoft Graph and SharePoint Online throttling thresholds.

*(Calls from the web part to the Send & Sign Signing Bridge are not Microsoft APIs and carry no Microsoft charge. If you self-host the bridge, e.g. in Azure Australia East, only your own infrastructure costs apply—still \$0 for Microsoft Graph/SharePoint API calls.)*

---

## 4. Security Risks & How Send & Sign Mitigates Them

### Risk 1: The SPFx "Shared Principal" Model
- **The Risk:** In SharePoint Online, all approved SPFx `webApiPermissionRequests` are held by a single tenant-wide Entra service principal (*SharePoint Online Client Extensibility Web Application Principal*). Any other custom SPFx web part installed in the same tenant could theoretically call scopes approved for that principal.
- **How Send & Sign Mitigates It:**
  1. **No Broad Write Scopes in SPFx:** Send & Sign **never** requests `Sites.ReadWrite.All`, `Files.ReadWrite.All`, or `Directory.ReadWrite.All` in SPFx. Its site Graph scope is strictly read-only (`Sites.Read.All`).
  2. **Narrow Bridge Scope:** The only non-Graph scope, `esign-api` / `Envelope.ReadWrite`, is accepted only by the Send & Sign bridge and only for envelopes belonging to the caller's own tenant. Another web part in your tenant that obtained this token could act on your tenant's envelopes as the signed-in user, but could not reach SharePoint or another tenant's data through it.
  3. **Same-Origin SharePoint REST for Tracking & Signed Copies:** Tracking list CRUD, signed-copy uploads and same-site archive uploads use `SPHttpClient` under the signed-in user's native SharePoint session—no extra Graph write permissions are exposed.
  4. **Optional Domain Isolation:** For high-security tenants, `isDomainIsolated: true` can be enabled in `package-solution.json` so the web part runs inside an isolated iframe domain.

### Risk 2: External Clients Accessing SharePoint Data
- **The Risk:** External signatories might try to probe SharePoint URLs or reuse signing links.
- **How Send & Sign Mitigates It:**
  - **Zero SharePoint Tokens in External Browsers:** External clients use a standalone portal (`signing-portal`) that has **zero** Microsoft login and **zero** SharePoint OAuth tokens.
  - **256-Bit Single-Use Tokens + OTP:** Signing links are never stored in readable form—neither in your SharePoint lists (only an envelope ID and a SHA-256 hash are kept) nor on the bridge. Links are redeemed via `POST` into `HttpOnly; Secure; SameSite=Strict` cookies, protected by a 6-digit e-mail OTP (5-attempt lockout → `423 Locked`), and permanently invalidated (`410 Gone`) upon completion, decline, or revocation. A reminder issues a fresh link and the previous one stops working.

### Risk 3: Unauthorized Archiving or Scattered Backups
- **The Risk:** Standard employees creating scattered backups or hiding records from the dashboard.
- **How Send & Sign Mitigates It:**
  - **Administrator-Only Archive Controls:** Archiving (`Archive Completed`, `Move to Archive`, and `View Archive Backups`) is strictly gated to SharePoint Administrators (`isSiteAdmin` / `ManageWeb` / `FullMask`).
  - **Central Source of Truth:** Archives are written as SHA-256 tamper-evident JSON ledgers (`SendAndSign_AuditArchive_YYYY-MM-DD_<hash8>.json`) directly into one Admin-designated central SharePoint folder.

---

## 5. Why This App Cannot Crash SharePoint or Corrupt Your Data

1. **Pure Client-Side Sandbox (Zero Server Code):**
   - Send & Sign is built on **SharePoint Framework (SPFx) `1.24.1`** with **React `18.3.1`** and **TypeScript `5.8`**. It runs entirely inside the user's browser—it cannot crash SharePoint servers, modify farm/tenant settings, or affect other site collections.
2. **Strict Content Security Policy (CSP) Compliance:**
   - All JavaScript and CSS assets are bundled directly inside `spfx-send-and-sign.sppkg` (`includeClientSideAssets: true`). Zero inline scripts, zero `eval()`, and zero external runtime CDN script loading.
3. **Non-Destructive File Handling:**
   - Original source PDFs and Word/Excel/PowerPoint files are **never modified or overwritten** (default mode). Signed outputs are saved alongside the original as `{OriginalName}_Signed.pdf`.
   - Macro-enabled Office files (`.docm`, `.xlsm`, `.pptm`) are explicitly blocked prior to conversion.
4. **Isolated SharePoint Lists & Clean First-Run Setup:**
   - On first launch on a new site (e.g., `/sites/SendAndSign`), the app creates only two isolated generic lists (`SendAndSignTracking` and `SendAndSignSettings`) and a `SendAndSign_Archive` folder in the default Document Library. It never alters existing document libraries, site columns, or workflows.
5. **List View Threshold Protection (5,000-Item Limit):**
   - Because completed/closed records can be archived into a SHA-256 JSON Audit Ledger by an Administrator, the active `SendAndSignTracking` view stays fast and clean even after thousands of contracts.
6. **Zero-Impact Removal:**
   - If you ever decide to disable or uninstall the app from the **SharePoint App Catalog**, the web part stops rendering immediately—while **100% of your signed PDFs, original documents, tracking lists, and audit archive JSON ledgers remain safely in SharePoint**.
