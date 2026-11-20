# Send & Sign — Signing Bridge Security & Data-Protection Architecture

> **Audience:** Customers, IT Security Officers, Legal/Compliance Teams, and Prospective Buyers asking *"Why does data touch an external Signing Bridge if Send & Sign is SharePoint-native, and how is it protected from compromise or data theft?"*  
> **Related Guides:** [admin-api-security-guide.md](file:///c:/Antigravity/sendandsign/docs/admin-api-security-guide.md) | [sppkg-package-safety-guide.md](file:///c:/Antigravity/sendandsign/docs/sppkg-package-safety-guide.md)

---

## 1. Why Does the Signing Bridge Exist Outside SharePoint?

Microsoft SharePoint Online **does not allow anonymous external users** to open a SharePoint web part, view a contract, and write a signed PDF back into a private library without either:
1. Forcing your client to create a **Microsoft Entra B2B Guest Account**, accept an invitation, and sign into Microsoft 365 (which causes high drop-off and support tickets), **or**
2. Exposing an anonymous SharePoint sharing link with write permissions (which is a major security risk).

**The Signing Bridge solves this cleanly:**
- **Inside your company:** Staff never leave SharePoint. Everything is initiated and tracked inside the **Send & Sign** web part.
- **Outside your company:** Your client clicks a single-use cryptographic link (`https://sign.sendandsign.online`), verifies with a 6-digit OTP, and signs in seconds—with **no Microsoft login** and **zero SharePoint access**.

The Signing Bridge is **not a document repository or cloud storage service**. It is a **short-lived, encrypted cryptographic courier** that exists solely to verify the external signer, stamp the PDF + A4 Audit Certificate, and hand the sealed PDF back to your SharePoint site. It keeps each document only for the signing window plus a fixed retention period, encrypted at rest.

---

## 2. What Happens on the Signing Bridge (Step-by-Step)

```text
[SharePoint Web Part] ──(1) PDF + 256-bit Token (Entra-authenticated)──▶ [Signing Bridge (encrypted store)]
                                                                     │
[External Signer]     ◀──(2) View PDF + 6-Digit OTP + Sign──────────┘
                                                                     │
[SharePoint Web Part] ◀──(3) Verify SHA-256 & Save _Signed.pdf───────┘
```

1. **Dispatch (Authenticated Registration):**
   - When you click **Send for signature**, the web part computes `OriginalSha256`, generates a 256-bit random token per recipient, and registers the envelope with the Signing Bridge (`POST /api/tokens/register`) using the sender's **Microsoft Entra access token**. The bridge verifies that token (signature, audience, issuer, tenant, scope) and only accepts onboarded tenants; each envelope is bound to the sender's tenant.
   - Only the **SHA-256 hash** of each token is stored—never the plaintext token. Your SharePoint tracking list likewise keeps only the bridge envelope ID and the token hash.
2. **External Redemption & Session Isolation:**
   - When the client opens `https://sign.sendandsign.online/?token=...`, the portal immediately redeems the token via `POST /api/envelope/redeem`, strips `?token=` from the browser address bar, and sets an `HttpOnly; Secure; SameSite=Strict` session cookie (`esign_session`).
3. **6-Digit OTP Verification:**
   - The bridge generates a 6-digit CSPRNG OTP, emails it to the recipient's verified address, enforces a **30-second resend cooldown (`429`)**, and locks the session after **5 failed attempts (`423 Locked`)**.
   - **Nothing is shown before verification:** the document and the evidence pack are only released once the OTP has been verified, so a forwarded or intercepted link on its own reveals neither the contract nor the other parties.
4. **PDF Stamping / Interactive HTML Sealing & Audit Certificate:**
   - **PDFs:** Using `@libpdf/core`, the bridge embeds the signer's visual signature onto the PDF at the exact normalized coordinates, appends the **A4 Certificate of Electronic Signature & Audit Trail**, computes `SignedSha256`, and records `tokenUsedAt` so the link can **never be replayed (`HTTP 410 Gone`)**.
   - **Interactive HTML Proposals (`v2.0`):** Every HTML proposal (from SharePoint, pasted HTML, or a Claude MCP draft) is strictly sanitized by `htmlSanitizer.ts` (stripping all `<script>`, `on*` event handlers, `javascript:` URLs, `<iframe>`, `<object>`, `<embed>`, and external CSS `@import`/`url()`), rendered in the portal inside `<iframe sandbox="">`, and deterministically priced server-side from its `HtmlFieldsManifest`. On signing, `htmlSealer.ts` locks all selected checkboxes/radios/text inputs, injects the visual signature card(s), wraps the sealed body in `#sendandsign-sealed-body` markers, appends a printable **Certificate of Electronic Signature & Audit Trail** plus a `<script type="application/json" id="sendandsign-evidence-pack">` RFC 8785 Evidence Pack, and computes `SignedSha256`.
   - **Who signed** is always the recipient the link was issued to, with the e-mail address verified by OTP. A different name typed in the portal is shown only as the "adopted" signature name, next to the recipient's recorded name.
   - **Fail closed:** if stamping or sealing fails, nothing is signed or consumed, the failure is recorded in the audit trail, and the signer can retry.
   - *Current limitation:* PDFs are not yet digitally signed with a PAdES / HSM signature; integrity evidence is the `OriginalSha256` / `SignedSha256` hashes, the certificate page, and the hash-chained audit trail (for HTML proposals, verifiable on demand in SharePoint via **Verify HTML Integrity**). HSM-backed PAdES sealing is on the roadmap.
5. **Same-Folder SharePoint Return & Integrity Check:**
   - When someone with access opens the Send & Sign dashboard, it syncs with the bridge (authenticated), validates the file format (`%PDF-` or sealed HTML markers) and whole-file `SignedSha256` hash, uploads `{OriginalName}_Signed.pdf` or `{OriginalName}_Signed.html` into the original SharePoint folder using that user's own permissions, and updates `SendAndSignTracking` to `Signed`. If the file fails the hash check, the target is outside the original site, or the upload is refused, the record is marked *Save Failed* (never `Signed`) and retried.
6. **Reminders:**
   - A reminder asks the bridge to issue a **fresh link** to each recipient whose turn it is; the previous link stops working immediately and any open session on it ends.

---

## 3. How We Protect the Server & Prevent Data Theft

### 1. Encrypted, Time-Limited Storage (Nothing Stored in Plaintext)
- While an envelope is open (or a Claude MCP proposal draft is staged in `html_drafts`), the bridge keeps the document and state in a local SQLite database **encrypted with AES-256-GCM** (each record bound to its envelope/draft ID as AAD, so records cannot be swapped or altered without detection). Pending envelopes and drafts therefore survive restarts and redeploys.
- Signing links, download links and session IDs are stored **only as SHA-256 hashes**; names, e-mail addresses and documents exist only inside the encrypted records.
- Finished envelopes (signed, declined, revoked or expired) are **automatically purged** after a fixed retention period (default 90 days), with secure deletion. Your permanent system of record is **always your own SharePoint Online tenant**.
- Without the separately held encryption key the database is unreadable, and the bridge refuses to start rather than run unencrypted.

### 2. Authenticated, Tenant-Isolated Bridge API & Claude MCP (`/mcp`)
- Every call from the web part—and every remote **Claude MCP Connector** call to `POST /mcp`—carries the signed-in user's **Microsoft Entra access token** for Send & Sign's own API (`esign-api` / `Envelope.ReadWrite`). The bridge checks the token's cryptographic signature against Microsoft's published keys, its audience, issuer, tenant and scope, and accepts only onboarded tenants. There are no shared API keys.
- To support multi-user sign-in from Claude.ai, the bridge publishes **RFC 9728 OAuth 2.0 Protected Resource Metadata** (`/.well-known/oauth-protected-resource` and `/.well-known/oauth-protected-resource/mcp`), returns a `WWW-Authenticate: Bearer resource_metadata="..."` challenge on unauthenticated `/mcp` requests, and allows CORS from `https://claude.ai`.
- Envelopes and Claude drafts are bound to the sender's tenant (and drafts are tagged with `createdByEmail` for `My Drafts` filtering): another tenant cannot see, remind, revoke, or list them, even with a valid token of its own. Claude can only stage encrypted drafts—it cannot dispatch envelopes or access SharePoint directly.

### 3. Zero SharePoint Access From External Browsers
- External signers **never** receive SharePoint OAuth tokens, Microsoft cookies, or SharePoint site URLs with write access.
- Even if an attacker inspected the external signer's browser completely, they could **never** browse your SharePoint tenant, see other folders, or access any other customer's documents.

### 4. Strict Transport, Header & Origin Hardening
- **TLS 1.3 + HSTS:** Served behind Caddy with automatic Let's Encrypt TLS (`Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`).
- **Token Leakage Prevention:** `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, and `X-Frame-Options: DENY` (prevents clickjacking/iframe embedding).
- **Strict CORS Allowlist:** Only `sign.sendandsign.online` and authorized SharePoint origins are permitted on credentialed endpoints.

### 5. Cryptographic & Brute-Force Guardrails
- **256-Bit Single-Use Tokens:** Impossible to guess (`2^256` keyspace), stored only as SHA-256 hashes, time-limited, revocable by the sender at any time, replaced on reminder, and permanently invalidated (`410 Gone`) after signing or declining.
- **OTP Brute-Force Lockout:** 5 wrong guesses permanently lock the OTP challenge (`423 Locked`), plus a 30-second resend cooldown (`429`).
- **Payload Validation:** Rejects non-PDF uploads (`%PDF-` magic-byte check) and caps PDF payloads at `25 MB`.
- **Fail-Closed Concurrency Locks:** Every change to an envelope runs under a per-envelope lock, so concurrent signers, declines and reminders are applied one at a time and a failed request leaves no partial changes.

### 6. Non-PII Logging
- The bridge never logs plaintext signing tokens, 6-digit OTP codes, or document contents.

---

## 4. Need 100% Private Infrastructure? (Dedicated / Self-Hosted Option)

For regulated enterprises, law firms, or government departments with strict internal-only hosting policies:
- **Zero Lock-In:** The entire Signing Bridge and Portal (`signing-bridge` + `signing-portal`) are packaged as standard Docker containers and Azure Bicep IaC ([deploy/bicep/main.bicep](file:///c:/Antigravity/sendandsign/deploy/bicep/main.bicep)).
- You can deploy your own private Signing Bridge inside **your own Azure Australia East (Sydney) subscription** or **your own private VPC** in under 15 minutes and point the SPFx web part PropertyPane URLs to your private endpoint—so **zero bytes ever leave your own cloud boundary**.
