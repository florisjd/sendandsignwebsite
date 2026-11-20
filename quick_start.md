# SharePoint Administrator Quick-Start Guide — Installing Send & Sign (v1)

> **Audience:** SharePoint Administrators & Microsoft 365 IT Teams  
> **Estimated Time:** 5–10 minutes (Zero PowerShell required)  
> **Related Security Docs:**
> - [sppkg-package-safety-guide.md](sppkg-package-safety-guide.md) — Exact contents of `spfx-send-and-sign.sppkg` & security guarantees
> - [admin-api-security-guide.md](admin-api-security-guide.md) — Delegated Graph & Bridge API permission details
> - [signing-bridge-security-architecture.md](signing-bridge-security-architecture.md) — How external signing works without exposing SharePoint

---

## What Is Send & Sign?

**Send & Sign** is a SharePoint-native electronic signature application built on Microsoft SharePoint Framework (SPFx). It lets your team send agreements directly from your existing SharePoint document libraries for external electronic signature—without forcing clients to create Microsoft 365 guest accounts and without moving your documents into a third-party cloud repository.

### How It Works at a Glance
- **Inside SharePoint (Your Team):** Staff pick any PDF or Microsoft Office file (`.docx`, `.xlsx`, `.pptx`, `.rtf`, `.odt` — automatically converted to PDF) from a SharePoint library they already have access to, add up to 20 recipients (`Parallel` or `Sequential`), optionally click to place signature boxes, and dispatch invitations from their own Microsoft 365 mailbox.
- **Outside SharePoint (Your Clients):** External signers receive a single-use cryptographic link, verify their identity with a **6-digit Email OTP**, review the document, draw/type/upload their signature, and complete signing in seconds—with **zero Microsoft login** and **zero SharePoint access**.
- **Back in SharePoint (Automatic Return & Audit Trail):** Once signed, Send & Sign stamps the signature(s), appends an **A4 Certificate of Electronic Signature & Audit Trail**, verifies the SHA-256 hash, and saves `{OriginalName}_Signed.pdf` back into the **exact same SharePoint folder** as the original file (leaving the original untouched). All workflow tracking, SHA-256 hashes, and tamper-evident audit logs live natively inside your SharePoint tenant.

---

## Prerequisites

> **Before You Start — Send Us Your Microsoft 365 Tenant ID:**
> To protect your organisation, the Send & Sign Signing Bridge only accepts requests from onboarded Microsoft 365 tenants. Before testing, please email us your **Microsoft 365 Directory (Tenant) ID** (a GUID found in **Microsoft Entra admin center → Overview → Tenant ID**).
> - You do **not** need to register any Entra app or create user accounts—once your Tenant ID is onboarded and you approve `esign-api` in Step 2, every licensed user in your tenant works automatically.

- **Permissions:** **SharePoint Administrator** role (plus **Global Administrator** or **Cloud Application Administrator** if approving Microsoft Entra API permissions for the first time).
- **Package File:** `spfx-send-and-sign.sppkg` (provided in your release bundle).
- **No Azure App Registration or PowerShell Scripts Needed on SharePoint:** Tracking lists and the default archive folder are provisioned automatically on first launch.

---

## Step 1: Upload & Deploy the App Package to SharePoint

1. Sign in to the **SharePoint Admin Center**:
   `https://<your-tenant>-admin.sharepoint.com`
2. In the left navigation menu, go to **More features** → under **Apps**, click **Open** → **Manage apps**.
3. Click **Upload** (or drag and drop `spfx-send-and-sign.sppkg` directly onto the page).
4. In the **Enable app** panel that appears:
   - Select **Enable this app and add it to all sites** *(recommended — makes the web part immediately available to add on any SharePoint site without per-site app installation)*.
   - *(Optional Pilot Mode)* If you want to test on a single site first, select **Only enable this app**, then manually add the app from **Site Contents → + New → App** on your pilot site.
5. Click **Enable app**.

---

## Step 2: Provision `esign-api` (One-Click Consent) & Approve API Access

Because `esign-api` is a multi-tenant Microsoft Entra ID application hosted by Send & Sign, your tenant must first consent to it once so SharePoint recognises `esign-api` in your directory:

### 2A — One-Click Microsoft Entra Admin Consent (30 Seconds)
1. Have a **Microsoft 365 Global Administrator** open this one-click consent link:
   ```text
   https://login.microsoftonline.com/organizations/adminconsent?client_id=af706f1c-ddc1-4997-86b4-f4974b3872f1
   ```
2. Sign in with your Global Administrator account and click **Accept**.
3. Microsoft will provision the `esign-api` Enterprise Application in your tenant and redirect your browser to `https://sign.sendandsign.online` (which will display *"Missing signing token"* — this is completely normal and confirms consent succeeded). You can simply close that tab.

### 2B — Approve the 4 Delegated Permissions in SharePoint Admin Center
1. Open **SharePoint Admin Center → Advanced → API access** (press **`F5`** to refresh if the page was already open).
2. Under **Pending requests**, select and click **Approve** for each of the following 4 delegated permissions:

| Resource | Permission Scope | Purpose |
|---|---|---|
| **Microsoft Graph** | `User.Read` | Reads the signed-in sender's display name, job title, and email for native email signatures. |
| **Microsoft Graph** | `Mail.Send` | Dispatches signing invitations and reminder emails directly from the sender's Microsoft 365 mailbox. |
| **Microsoft Graph** | `Sites.Read.All` | Read-only discovery of sites/libraries the signed-in user can already access, plus Office-to-PDF conversion. |
| **esign-api** | `Envelope.ReadWrite` | Registers encrypted envelopes and syncs signed documents with the Send & Sign Signing Bridge. |

> **Note on Permissions:** All 4 permissions are **delegated (user-context only)**—Send & Sign can never access SharePoint sites or mailboxes that the signed-in user does not already have permission to view.
>
> **Troubleshooting `"The requested permission isn't valid"`:** If SharePoint shows *"The requested permission isn't valid"* when approving `esign-api`, complete **Step 2A** above first, refresh **API access** (`F5`), and click **Approve** again—no need to reject or re-upload the `.sppkg`.

---

## Step 3: Add the Send & Sign Web Part to a SharePoint Page

1. Open the SharePoint site where your team will manage agreements (for example, an existing hub site or a dedicated site such as `https://<your-tenant>.sharepoint.com/sites/SendAndSign`).
2. Either create a new modern page (**+ New → Page → Blank**) or click **Edit** on an existing page.
3. Click the **`+`** icon to add a web part to a full-width or single-column section.
4. Search for **`SendAndSign`** (located under **Advanced**) and click to add it to the page.
5. *(Optional)* Click the **Edit web part** (pencil) icon on the left toolbar of the web part to confirm the default endpoints:
   - **Signing Portal Base URL:** `https://sign.sendandsign.online` *(default)*
   - **Signing Bridge API URL:** `https://bridge.sendandsign.online` *(default)*
6. Click **Publish** (or **Republish**) at the top right of the page.

---

## Step 4: Automatic First-Launch Provisioning

The first time a **Site Administrator / Site Owner** opens the published page, Send & Sign automatically creates three SharePoint-native assets inside that site:

1. **`SendAndSignTracking` (SharePoint List):** Tracks envelope statuses, recipients, SHA-256 document hashes, origin folder pointers, and RFC 8785 hash-chained audit logs. *(Raw signing tokens are never stored in SharePoint.)*
2. **`SendAndSignSettings` (SharePoint List):** Stores optional company branding (logo URL, primary hex brand colour, and custom email signature text).
3. **`SendAndSign_Archive` (Document Library Folder):** Default folder for Administrator tamper-evident JSON audit archive ledgers.

A green confirmation banner will appear once first-time setup completes.

---

## Step 5: 2-Minute Smoke Test

Confirm everything is working end-to-end before inviting your team:

1. Click **`+ New envelope`** on the Send & Sign dashboard.
2. Select a test `.pdf` or `.docx` file from any SharePoint document library.
3. Click **Next**, enter a personal external email address as the recipient, and click **Send for signature**.
4. Open the invitation email, click the signing link, complete the **6-digit Email OTP** verification, draw/type a signature, and click **Sign and Complete Document**.
5. Return to the SharePoint page and wait up to 30 seconds (or click the **↻ Refresh** icon):
   - The status will update to **Signed**.
   - `{OriginalName}_Signed.pdf` will be written back into the **exact same SharePoint folder** as the original file (leaving the original untouched).

---

## Upgrading or Removing the App

- **Upgrading to a Newer Version:** Upload the new `spfx-send-and-sign.sppkg` to **Manage apps** and choose **Replace / Overwrite**. Because all solution and web part GUIDs are preserved, existing pages, `SendAndSignTracking` history, and signed files remain completely intact.
- **Disabling / Uninstalling:** Select `spfx-send-and-sign` in **Manage apps** and click **Disable** or **Delete**. The web part stops running immediately across all sites, while 100% of your original documents, signed copies, tracking lists, and audit archive ledgers stay safely inside your SharePoint tenant.
