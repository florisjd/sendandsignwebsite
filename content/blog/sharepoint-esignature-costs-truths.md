---
title: "5 Counter-Intuitive Truths About eSignatures, Hidden Software Costs, and SharePoint Workflows"
seo_title: "SharePoint eSignature: 5 Truths on Cost | Send & Sign"
description: "What SharePoint eSignature costs, where per-seat plans cap you, where signed contracts are stored and what Australian law expects. Five practical truths."
excerpt: "You may already own an eSignature tool. Five truths about SharePoint eSignature pricing, per-seat envelope caps, data residency and legal validity."
date: 2026-11-27
focus_keyword: "sharepoint esignature"
category: "Microsoft 365"
tags: "Electronic signatures, SharePoint, eSignature pricing, Data residency, ETA 1999, Power Automate"
cover_image: "/assets/blog/sharepoint-esignature-costs-truths-1920.jpg"
cover_alt: "A pleasantly surprised clay-animated man lifts a glowing gold pen from his desk drawer, beside a laptop and a contract with a red seal."
legal_notice: "General information only — not legal advice. Prices and product details were checked in November 2026 and can change; confirm them with each provider before you buy."
published: true
---

Getting contracts, lease agreements or vendor forms signed should be one of the simplest operational tasks in a modern organisation. Yet for many businesses it remains a persistent bottleneck. Critical PDFs sit unsigned in inboxes for days, while teams default to printing, signing, scanning and emailing documents by hand. If your team runs on Microsoft 365, **SharePoint eSignature** may already solve part of that problem.

To resolve the friction, companies often rush into brand-name monthly subscriptions on the assumption that digital signatures need expensive standalone tools. They can miss per-seat pricing traps, exchange-rate costs and data residency questions, while ignoring eSignature capabilities in the technology they already pay for.

Here is an audit of eSignature realities, hidden vendor costs and smarter workflow strategies.

## 1. You might already own a SharePoint eSignature tool

Microsoft 365 includes a built-in [eSignature service in SharePoint](https://learn.microsoft.com/en-us/microsoft-365/documentprocessing/esignature-overview). It is **pay-as-you-go at US$2 per signature request**, with up to 10 recipients per request, billed through an Azure subscription rather than a monthly seat fee.

Once an administrator links Azure billing and turns the service on in the **Microsoft 365 admin centre**, users with edit and sharing permissions can send a PDF stored in SharePoint for signature straight from the library. Word documents can be sent from Word for desktop, where they are converted to PDF for signing.

- Signers can type their signature, and a [drawn signature option](https://techcommunity.microsoft.com/blog/microsoft_365blog/sign-with-a-personal-touch-with-esignature-for-microsoft-365/4500960) was added in 2026.
- Signing activity is logged in the **Microsoft Purview** audit log.
- Signers outside your organisation are handled through **Microsoft Entra B2B** guest access, so check your sharing and conditional access policies first.
- It provides **simple electronic signatures**, not higher-assurance signature types.

> [!QUOTE] A business sending a handful of contracts a month is likely to find Microsoft's pay-per-transaction pricing cheaper than a flat per-seat plan.

![On the left, coin jars sit before empty chairs beside one unsent envelope; on the right, a woman drops one coin in a slot and an envelope flies off.](/assets/blog/sharepoint-esignature-costs-truths-figure-1.jpg "Paying per request and paying per seat suit very different sending volumes.")

## 2. The per-seat pricing trap and exchange-rate costs

With dedicated eSignature platforms, the advertised per-seat rate rarely tells the whole story. Many plans also limit how much each user can send in a year.

Before you sign up or renew, check:

- **Sending allowance:** how many envelopes or transactions each user gets, and whether unused ones carry over or can be shared.
- **Overage:** what happens, and what it costs, when someone reaches the limit.
- **Commitment:** whether the listed rate requires annual billing.
- **Tax:** whether GST or other tax is added on top.

A team with seasonal contract spikes can reach an annual allowance early and face extra charges or an unplanned upgrade.

Currency adds another layer. When a vendor bills in US dollars, including Microsoft's US$2 request price as listed, your Australian dollar cost **moves with the exchange rate** and your bank may add a foreign transaction fee. Work out your true cost from your actual annual sending volume and billing currency, not the headline seat price. For comparison, our own [pricing is a flat rate per organisation](/pricing) in place of per-seat licences.

## 3. Data residency: where are your signed contracts stored?

Data residency is one of the most frequently overlooked questions in document management. The answer can depend on the vendor, the plan you buy and how your account was set up.

Ask each vendor in writing:

- Where are agreements and signed copies stored, and is Australian hosting included in your plan?
- Where are signer details and audit data stored and processed?
- Can the storage region be changed after the account is created?

For organisations covered by the **Australian Privacy Principles**, sending personal information overseas brings obligations. [APP 8](https://www.oaic.gov.au/privacy/australian-privacy-principles/read-the-australian-privacy-principles) generally requires reasonable steps to make sure an overseas recipient handles it properly. Local storage can make this simpler, but it doesn't remove your privacy obligations.

Our [security overview](/security) shows how we answer these questions for our own service.

## 4. Are free and "simple" eSignatures legally binding in Australia?

Often, yes. Under the [*Electronic Transactions Act 1999* (Cth)](/compliance-eta), and the US ESIGN Act for American contracts, **the price of the tool doesn't decide validity**. A signature from a free tier can be valid if the method identifies the signer, shows their intention, is reliable enough for the purpose and the other party consents.

It is still vital to distinguish drawing on a PDF from using an eSignature platform. A pasted drawing carries no verification data. Dedicated platforms add features such as recipient tracking, reminders, tamper evidence and time-stamped audit logs that help you prove who signed what. Some also offer witness signing or AI field detection. Our guide to [electronic signature law in Australia](/blog/electronic-signature-laws-australia) walks through each requirement.

Everyday service agreements, non-disclosure agreements and employment contracts can usually be signed electronically without premium validation tiers.

> [!WARNING] Wills, powers of attorney, some property transactions and certain deeds have stricter signing and witnessing rules that differ between states and territories. Some jurisdictions allow electronic execution for particular documents, and others still require wet ink. Get legal advice before e-signing them.

## 5. Stop treating SharePoint and eSignature platforms as enemies

Organisations often see their document repository and their eSignature platform as separate silos. In practice, many eSignature tools connect to SharePoint.

![Documents travel a loop from a teal filing cabinet to a woman signing on a tablet, then return to the cabinet with a green tick badge.](/assets/blog/sharepoint-esignature-costs-truths-figure-2.jpg "A connected workflow sends from the library and files the signed copy back.")

Depending on the product and how it is set up, an integration can let users:

- start signature requests from a SharePoint document library
- route files with **Power Automate** (formerly Microsoft Flow)
- sign in through **Microsoft Entra ID** single sign-on
- save completed files back to SharePoint automatically

These differ widely in setup effort and the permissions they ask for, so [compare how each tool works with SharePoint](/compare) before you commit. Microsoft's SharePoint eSignature can also act as a front door: for PDFs, it can send requests through supported third-party providers and save a copy of the fully signed document in SharePoint. You need your own licence with that provider.

The real return from digital signatures comes from **connected workflow automation**, where signed files flow into your CRM, ERP and document repositories, rather than from capturing an ink stroke on a screen. See the [features that keep signing inside SharePoint](/features).

## Conclusion: audit your real signing needs

Getting your signing process right means looking beyond brand recognition. Audit your actual annual sending volume, confirm where your signed document data lives, and check the tools already available in your Microsoft 365 environment. That way you can cut unnecessary subscription spend while strengthening your legal position.

**Before renewing your next high-cost contract, ask yourself: is your business paying for per-seat licences it doesn't need, when a pay-per-use model or an integrated SharePoint workflow is right under your nose?**
