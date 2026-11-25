---
title: "Electronic Signatures in Australia: What the Electronic Transactions Act 1999 Actually Requires"
seo_title: "Electronic Signatures in Australia: ETA 1999 Guide | Send & Sign"
description: "Plain-English guide to the Electronic Transactions Act 1999 (Cth) s 10 for Australian businesses: identification, reliability, consent, deeds, and audit trails."
excerpt: "A practical breakdown of section 10 of the Electronic Transactions Act 1999 (Cth): identification, reliability, consent, simple contracts vs. excluded deeds, and why audit trails matter."
date: 2026-11-24
category: "Australian Compliance"
read_time: "6 min read"
cover_image: "/assets/blog/eta-1999-1920.jpg"
cover_alt: "A clay-animated Australian user reviews an electronically signed document on a tablet in front of a laptop running Send & Sign in SharePoint, beside a clay koala figurine."
legal_notice: "General information only — not legal advice. This article summarises how Australian electronic signature laws apply to everyday business agreements. Always consult a qualified Australian lawyer for deeds, high-value transactions, or industry-specific requirements."
published: true
---

If your team sends quotes, service agreements, NDAs, or employment contracts from Microsoft 365, you have probably been asked by a client—or your own legal counsel—whether an electronic signature actually holds up in Australia.

The short answer is **yes**. Australia's legal framework is deliberately technology-neutral. You do not need a specific brand of e-signature software, and you do not need wet ink for everyday commercial contracts. What matters is whether your signing process satisfies the legal test in **section 10 of the *Electronic Transactions Act 1999* (Cth)** (ETA) and its mirror Acts in every Australian state and territory.

## The Three Limbs of Section 10

Where an Australian law requires a document to be signed, section 10 of the ETA says an electronic signature satisfies that requirement when three conditions are met together:

### 1. Identification and Intention

The method must **identify the person** signing and **indicate their intention** in respect of the information in the document.

In practice, this means you need a clear link between the signer and the act of signing—not just an unverified image pasted onto a PDF. A single-use signing link sent to a known email address, combined with a 6-digit email verification code (OTP) and an explicit action to place a signature and submit, directly demonstrates both who signed and that they meant to be bound.

### 2. Reliability

The method must be **as reliable as appropriate for the purpose** for which the information was communicated, considering all the circumstances (or be proven in fact to have identified the person and shown their intention).

Reliability is proportional to risk. A typed name at the bottom of an email might be enough for a $500 quote, but if a $50,000 service agreement is ever disputed, a court will look at the evidence behind the signature:

- Can you prove the document was not altered after it was signed?
- Do you have a timestamped record of when it was sent, opened, verified, and completed?
- Can you match the signed file back to the exact original version?

Cryptographic **SHA-256 fingerprints** for both the original and signed PDFs, paired with an audit certificate, turn reliability from an argument into verifiable proof.

### 3. Consent

The person receiving the signature must **consent** to the electronic method being used.

Under the ETA, consent can be express or reasonably inferred from conduct—for example, when both parties routinely transact by email. Even so, best practice is to capture **explicit electronic-signature consent** inside the signing flow itself, and give the signer an easy way to decline or request a paper copy before signing.

## Simple Contracts vs. Excluded Documents

Everyday business contracts in Australia rarely require wet ink. Most commercial agreements do not even have a strict statutory signature requirement—they are governed by ordinary contract law, where an electronic signature serves as strong evidence of agreement.

However, certain formal instruments carry stricter rules that vary by state and territory:

| Document Category | Typical Examples | Electronic Signing Position in Australia |
| --- | --- | --- |
| Everyday commercial agreements | Quotes, interactive proposals, NDAs, service agreements, statements of work, supplier terms | **Widely accepted** under the ETA 1999 (Cth) and state equivalents when identification, reliability, and consent are captured. |
| HR & employment documents | Employment contracts, offer letters, workplace policy acknowledgements | **Widely accepted.** Fair Work imposes no wet-ink requirement; keep the signed copy and audit trail on the employee file. |
| Company execution | Agreements and deeds signed by an Australian company | **Permitted** under sections 110A and 127 of the *Corporations Act 2001* (Cth), provided the signing method meets the identification and reliability tests. |
| Individual deeds & witnessed instruments | Deeds signed by individuals, wills, powers of attorney, statutory declarations | **State-specific rules apply.** Wet-ink signing or prescribed remote witnessing is often required (for example, individual deeds in WA, SA, TAS, NT, and ACT). Seek legal advice before e-signing. |

## Why "Pasting a Signature Image" Fails the Real-World Test

Technically, pasting a JPEG of a handwritten signature into a Word document or PDF can still be legally valid if you can prove who pasted it and that they intended to sign. The problem is not legal validity—it is **evidence**.

If a client later claims they never saw the final page, or disputes which version of the pricing schedule they approved, a pasted image leaves you digging through email threads. A purpose-built signing flow solves this automatically by recording:

- **Recipient-tethered verification:** A single-use link and 6-digit email OTP confirming access to the signer's inbox.
- **Explicit consent log:** Confirmation that the signer agreed to transact electronically before signing.
- **Tamper-evident hashing:** Original and signed SHA-256 hashes proving neither the contract nor the signature page was modified.
- **Complete activity timeline:** Timestamps from dispatch to view, verification, and completion, attached as a Certificate of Electronic Signature & Audit Trail.

## Keeping Signed Records Inside Your Own SharePoint Tenant

Compliance does not end when the client clicks *Sign*. Under Australian business record-keeping obligations, you also need to retain the signed document and its audit evidence in a reliable, accessible form.

With third-party e-signature SaaS platforms, signed contracts sit in an external vendor's cloud until someone remembers to download and re-file them. Keeping your signing workflow inside Microsoft 365—where the signed PDF and its audit certificate land automatically back in the original SharePoint folder next to the untouched original—eliminates manual filing gaps and keeps your client records inside your own Microsoft 365 SharePoint tenant.
