#!/usr/bin/env node
/**
 * Send & Sign — Lightweight Git-Backed CMS Builder (zero dependencies)
 * Reads content/site.json and content/blog/*.md, then:
 *  1. Syncs editable sections (home hero, pricing tiers, unmetered banner, CTA band) across HTML pages.
 *  2. Renders every published content/blog/<slug>.md to blog/<slug>.html with SEO meta + JSON-LD.
 *  3. Rebuilds blog/index.html with cards for all published posts (newest first).
 *  4. Regenerates sitemap.xml with all core pages + blog posts.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const BASE_URL = 'https://sendandsign.online';
const CSS_VER = '20261126g';
const JS_VER = '20261126c';

function esc(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function replaceBlock(html, startMarker, endMarker, inner) {
  const re = new RegExp(`(${startMarker})[\\s\\S]*?(${endMarker})`, 'g');
  // Function replacer: CMS text like "$120" must not be read as a $1/$12 backreference.
  return html.replace(re, (_m, start, end) => `${start}\n${inner}\n  ${end}`);
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1).replace(/\\"/g, '"');
    } else if (val === 'true') {
      val = true;
    } else if (val === 'false') {
      val = false;
    }
    data[m[1]] = val;
  }
  return { data, body: match[2].trim() };
}

function inlineMd(text) {
  let s = esc(text);
  // Images ![alt](url)
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => `<img src="${url}" alt="${alt}" loading="lazy">`);
  // Links [label](url)
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a class="text-link" href="$2">$1</a>');
  // Inline code
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Bold + italic
  s = s.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  // Bold
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Italic
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return s;
}

function renderMarkdown(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }

    // Headings
    const h = line.match(/^(#{2,4})\s+(.+)$/);
    if (h) {
      const level = h[1].length;
      out.push(`    <h${level}>${inlineMd(h[2].trim())}</h${level}>`);
      i++;
      continue;
    }

    // Pipe table
    if (line.trim().startsWith('|') && i + 1 < lines.length && /^\s*\|[\s:-]+\|/.test(lines[i + 1])) {
      const headers = line.trim().slice(1, -1).split('|').map(c => c.trim());
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(lines[i].trim().slice(1, -1).split('|').map(c => c.trim()));
        i++;
      }
      const thead = `<thead><tr>${headers.map(c => `<th>${inlineMd(c)}</th>`).join('')}</tr></thead>`;
      const tbody = `<tbody>\n${rows.map(r => `          <tr>${r.map(c => `<td>${inlineMd(c)}</td>`).join('')}</tr>`).join('\n')}\n        </tbody>`;
      out.push(`    <div class="data-table-wrap">\n      <table class="data-table">\n        ${thead}\n        ${tbody}\n      </table>\n    </div>`);
      continue;
    }

    // Unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(`      <li>${inlineMd(lines[i].replace(/^\s*[-*]\s+/, '').trim())}</li>`);
        i++;
      }
      out.push(`    <ul>\n${items.join('\n')}\n    </ul>`);
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(`      <li>${inlineMd(lines[i].replace(/^\s*\d+\.\s+/, '').trim())}</li>`);
        i++;
      }
      out.push(`    <ol>\n${items.join('\n')}\n    </ol>`);
      continue;
    }

    // Blockquote -> callout
    if (line.trim().startsWith('>')) {
      const q = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        q.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      out.push(`    <div class="callout"><span class="ico" aria-hidden="true">!</span><p>${inlineMd(q.join(' '))}</p></div>`);
      continue;
    }

    // Paragraph
    const para = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{2,4})\s+/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !lines[i].trim().startsWith('|') &&
      !lines[i].trim().startsWith('>')
    ) {
      para.push(lines[i].trim());
      i++;
    }
    out.push(`    <p>${inlineMd(para.join(' '))}</p>`);
  }

  return out.join('\n\n');
}

function formatDateAU(isoDate) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function formatDateShort(isoDate) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function renderUnmeteredSection(u, isBlogArticle = false) {
  const secTag = isBlogArticle
    ? '<section class="unmetered-section" style="margin-top:48px;margin-bottom:0" aria-labelledby="unmetered-title">'
    : '<section class="container unmetered-section" aria-labelledby="unmetered-title">';
  return `  ${secTag}
    <div class="unmetered-band reveal">
      <div>
        <span class="badge-pill badge-on-dark"><span class="dot"></span> ${esc(u.badge)}</span>
        <h2 id="unmetered-title" class="display-md">${esc(u.headline)}</h2>
        <p>${esc(u.body)}</p>
        <p class="unmetered-fine">${esc(u.fine_print)}</p>
      </div>
      <div class="unmetered-stat">
        <div class="unmetered-stat-top">
          <span class="unmetered-infinity" aria-hidden="true">&infin;</span>
          <div class="unmetered-zero">
            <strong>${esc(u.stat_value)}</strong>
            <span>${esc(u.stat_label)}</span>
          </div>
        </div>
        <div class="chip-row">
          <span class="chip chip-ok">Flat org pricing</span>
          <span class="chip chip-ok">No seat fees</span>
          <span class="chip chip-ok">Every tier</span>
        </div>
        <a class="btn btn-primary" href="${esc(u.cta_url)}">${esc(u.cta_label)}</a>
      </div>
    </div>
  </section>`;
}

function renderCtaSection(c, assetPrefix = '') {
  return `  <section class="container" aria-labelledby="cta-title">
    <div class="cta-band reveal">
      <div>
        <h2 id="cta-title" class="display-md">${esc(c.headline)}</h2>
        <p>${esc(c.body)}</p>
        <div class="btn-row">
          <a class="btn btn-primary" href="${esc(c.primary_url)}">${esc(c.primary_label)}</a>
          <a class="btn btn-secondary" href="${esc(c.secondary_url)}">${esc(c.secondary_label)}</a>
        </div>
      </div>
      <img src="${assetPrefix}assets/cta-mascot.svg" alt="" width="380" height="342" loading="lazy">
    </div>
  </section>`;
}

function renderCoverPicture(coverImage, coverAlt) {
  if (!coverImage) return '';
  const relPath = coverImage.replace(/^\//, '');
  const webpRel = relPath.replace(/\.(jpe?g|png)$/i, '.webp');
  const hasWebp = fs.existsSync(path.join(ROOT, webpRel));
  const alt = esc(coverAlt || '');
  const imgTag = `<img src="${esc(coverImage)}" alt="${alt}" fetchpriority="high">`;
  const inner = hasWebp
    ? `<picture>\n          <source type="image/webp" srcset="/${webpRel}">\n          ${imgTag}\n        </picture>`
    : imgTag;
  return `      <figure class="article-hero-media">\n        ${inner}\n      </figure>`;
}

function renderBlogPostPage(post, site) {
  const url = `${BASE_URL}/blog/${post.slug}`;
  const ogImg = post.cover_image ? `${BASE_URL}${post.cover_image}` : `${BASE_URL}/assets/hero/home-1920.jpg`;
  const isoPub = `${post.date}T09:00:00+08:00`;
  const seoTitle = post.seo_title || `${post.title} | Send & Sign`;
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: post.title,
        description: post.description,
        image: ogImg,
        datePublished: isoPub,
        dateModified: isoPub,
        inLanguage: 'en-AU',
        author: { '@type': 'Organization', name: 'Send & Sign', url: `${BASE_URL}/` },
        publisher: {
          '@type': 'Organization',
          name: 'Send & Sign',
          logo: { '@type': 'ImageObject', url: `${BASE_URL}/assets/sendandsign-logo-primary.png` },
        },
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: `${BASE_URL}/blog` },
          { '@type': 'ListItem', position: 3, name: post.title, item: url },
        ],
      },
    ],
  }, null, 2);

  const legalCallout = post.legal_notice
    ? `    <div class="callout" role="note">\n      <span class="ico" aria-hidden="true">!</span>\n      <p>${inlineMd(post.legal_notice)}</p>\n    </div>\n`
    : '';

  return `<!DOCTYPE html>
<html lang="en-AU">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(seoTitle)}</title>
  <meta name="description" content="${esc(post.description)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${esc(url)}">

  <meta property="og:type" content="article">
  <meta property="og:locale" content="en_AU">
  <meta property="og:site_name" content="Send &amp; Sign">
  <meta property="og:title" content="${esc(post.title)}">
  <meta property="og:description" content="${esc(post.description)}">
  <meta property="og:url" content="${esc(url)}">
  <meta property="og:image" content="${esc(ogImg)}">
  <meta property="article:published_time" content="${esc(isoPub)}">
  <meta property="article:modified_time" content="${esc(isoPub)}">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(post.title)}">
  <meta name="twitter:description" content="${esc(post.description)}">
  <meta name="twitter:image" content="${esc(ogImg)}">

  <meta name="theme-color" content="#fffaf0">
  <link rel="icon" href="/assets/favicon-16.png" type="image/png" sizes="16x16">
  <link rel="icon" href="/assets/favicon-32.png" type="image/png" sizes="32x32">
  <link rel="icon" href="/assets/favicon-48.png" type="image/png" sizes="48x48">
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png" sizes="180x180">
  <link rel="manifest" href="/site.webmanifest">
  <link rel="stylesheet" href="/css/styles.css?v=${CSS_VER}">

  <script type="application/ld+json">
${jsonLd}
  </script>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>

<header class="top-nav">
  <div class="container">
    <a class="brand" href="/" aria-label="Send &amp; Sign home">
      <img src="/assets/sendandsign-mark.png" alt="" width="32" height="32">
      Send &amp; Sign
    </a>
    <nav aria-label="Primary">
      <ul class="nav-links">
        <li><a data-page="features" href="/features">Features</a></li>
        <li><a data-page="onthego" href="/onthego">On the go</a></li>
        <li><a data-page="compliance" href="/compliance">Compliance</a></li>
        <li><a data-page="security" href="/security">Security</a></li>
        <li><a data-page="pricing" href="/pricing">Pricing</a></li>
        <li><a data-page="compare" href="/compare">Compare</a></li>
        <li><a data-page="install" href="/pricing#install">Install guide</a></li>
      </ul>
    </nav>
    <div class="nav-cta">
      <a class="btn btn-text" href="/contact?intent=pilot">Start a pilot</a>
      <a class="btn btn-primary" href="/contact">Book a demo</a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="mobile-menu" aria-label="Open menu"><span></span></button>
    </div>
  </div>
  <div class="mobile-menu" id="mobile-menu">
    <ul>
      <li><a href="/">Home</a></li>
      <li><a href="/features">Features</a></li>
      <li><a href="/onthego">On the go</a></li>
      <li><a href="/compliance">Compliance</a></li>
      <li><a href="/security">Security</a></li>
      <li><a href="/pricing">Pricing &amp; deployment</a></li>
      <li><a href="/compare">Compare</a></li>
      <li><a href="/blog">Blog</a></li>
      <li><a href="/contact?intent=pilot">Start a pilot</a></li>
    </ul>
    <a class="btn btn-primary" href="/contact" style="width:100%">Book a demo</a>
  </div>
</header>

<main id="main" class="article-shell">
  <nav class="breadcrumbs" aria-label="Breadcrumb">
    <a href="/">Home</a> <span aria-hidden="true">&rsaquo;</span>
    <a href="/blog">Blog</a> <span aria-hidden="true">&rsaquo;</span>
    <span aria-current="page">${esc(post.title)}</span>
  </nav>

  <article class="article-body">
    <header>
      <p class="eyebrow">${esc(post.category || 'Guide')}</p>
      <h1 class="display-md">${esc(post.title)}</h1>
      <p class="article-meta">
        Published <time datetime="${esc(post.date)}">${esc(formatDateAU(post.date))}</time> &middot; ${esc(post.read_time || '5 min read')} &middot; Send &amp; Sign
      </p>
${renderCoverPicture(post.cover_image, post.cover_alt)}
    </header>

${legalCallout}
${renderMarkdown(post.body)}

    <section class="article-cta" aria-labelledby="cta-heading">
      <h2 id="cta-heading">SharePoint-native e-signatures, built for Australian law</h2>
      <p>Send &amp; Sign lets your team send PDFs and interactive proposals straight from SharePoint or Microsoft Teams. Clients verify with a 6-digit email code (no Microsoft login required), and the signed PDF—complete with its multi-page audit certificate and SHA-256 fingerprints—saves automatically back to the original folder.</p>
      <div class="btn-row mt-lg">
        <a class="btn btn-primary" href="/contact">Book a 20-minute demo</a>
        <a class="btn btn-secondary" href="/compliance-eta">Read our ETA 1999 compliance guide</a>
        <a class="btn btn-text" href="/security">Inspect our security &amp; permissions →</a>
      </div>
    </section>
  </article>

  <!--UNMETERED-START-->
${renderUnmeteredSection(site.unmetered_banner, true)}
  <!--UNMETERED-END-->
</main>

<footer class="footer">
  <div class="container">
    <div class="footer-grid">
      <div>
        <a class="brand" href="/"><img src="/assets/sendandsign-mark.png" alt="" width="32" height="32"> Send &amp; Sign</a>
        <p class="mt-md" style="max-width:320px">SharePoint-native electronic signatures for Australian organisations on Microsoft 365.</p>
        <p class="fine mt-md" style="max-width:340px"><strong>General information only — not legal advice.</strong> Send &amp; Sign supports simple contracts under the <em>Electronic Transactions Act 1999</em> (Cth) s 10. It is not intended for deeds, witnessed instruments, wills or statutory declarations.</p>
      </div>
      <div>
        <h4>Product</h4>
        <ul>
          <li><a href="/features">Features</a></li>
          <li><a href="/features#multi-sign">Multi-signature routing</a></li>
          <li><a href="/onthego">On the go (mobile)</a></li>
          <li><a href="/features#dashboard">Dashboard &amp; audit trail</a></li>
          <li><a href="/compare">Compare alternatives</a></li>
          <li><a href="/pricing#roadmap">Roadmap</a></li>
        </ul>
      </div>
      <div>
        <h4>Trust</h4>
        <ul>
          <li><a href="/compliance">Compliance overview</a></li>
          <li><a href="/compliance-eta">Australian ETA 1999</a></li>
          <li><a href="/compliance-us">US ESIGN &amp; UETA</a></li>
          <li><a href="/security">Security &amp; architecture</a></li>
        </ul>
      </div>
      <div>
        <h4>For IT admins</h4>
        <ul>
          <li><a href="/pricing#install">Install in 5 steps</a></li>
          <li><a href="/security#checklist">IT verification checklist</a></li>
          <li><a href="/pricing#hosting">Hosting options</a></li>
        </ul>
      </div>
      <div>
        <h4>Company</h4>
        <ul>
          <li><a href="/blog">Blog</a></li>
          <li><a href="/contact">Book a demo</a></li>
          <li><a href="/contact?intent=pilot">Start a pilot</a></li>
          <li><a href="/contact">Contact</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-legal">
      <span>© <span id="year">2026</span> Send &amp; Sign. Microsoft 365, SharePoint and Microsoft Entra are trademarks of the Microsoft group of companies.</span>
      <span>Made for Australian teams</span>
    </div>
  </div>
  <img class="footer-mountains" src="/assets/mountains.svg" alt="" width="1440" height="240" loading="lazy">
</footer>

<script src="/js/main.js?v=${JS_VER}" defer></script>
</body>
</html>
`;
}

function renderBlogIndex(posts, site) {
  const cards = posts
    .map(
      (p) => `        <a class="blog-card reveal" href="/blog/${esc(p.slug)}">
          <div class="chip-row">
            <span class="chip">${esc(p.category || 'Guide')}</span>
            <span class="ui-sub" style="align-self:center">${esc(formatDateShort(p.date))} &middot; ${esc(p.read_time || '5 min read')}</span>
          </div>
          <h2 class="title-lg">${esc(p.title)}</h2>
          <p>${esc(p.excerpt || p.description)}</p>
          <span class="arrow-link">Read article</span>
        </a>`
    )
    .join('\n\n');

  return `<!DOCTYPE html>
<html lang="en-AU">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Blog — SharePoint E-Signatures &amp; Australian Compliance | Send &amp; Sign</title>
  <meta name="description" content="Practical guides on SharePoint electronic signatures, the Electronic Transactions Act 1999 (Cth), Microsoft 365 governance, and paperless workflows for Australian teams.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://sendandsign.online/blog">

  <meta property="og:type" content="website">
  <meta property="og:locale" content="en_AU">
  <meta property="og:site_name" content="Send &amp; Sign">
  <meta property="og:title" content="Blog — SharePoint E-Signatures &amp; Australian Compliance | Send &amp; Sign">
  <meta property="og:description" content="Practical guides on SharePoint electronic signatures, the Electronic Transactions Act 1999 (Cth), and Microsoft 365 governance.">
  <meta property="og:url" content="https://sendandsign.online/blog">
  <meta property="og:image" content="https://sendandsign.online/assets/hero/home-1920.jpg">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Blog — Send &amp; Sign">
  <meta name="twitter:description" content="Practical guides on SharePoint e-signatures and Australian compliance for Microsoft 365 teams.">
  <meta name="twitter:image" content="https://sendandsign.online/assets/hero/home-1920.jpg">

  <meta name="theme-color" content="#fffaf0">
  <link rel="icon" href="/assets/favicon-16.png" type="image/png" sizes="16x16">
  <link rel="icon" href="/assets/favicon-32.png" type="image/png" sizes="32x32">
  <link rel="icon" href="/assets/favicon-48.png" type="image/png" sizes="48x48">
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png" sizes="180x180">
  <link rel="manifest" href="/site.webmanifest">
  <link rel="stylesheet" href="/css/styles.css?v=${CSS_VER}">

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "Send & Sign Blog",
    "url": "https://sendandsign.online/blog",
    "inLanguage": "en-AU",
    "description": "Practical guides on SharePoint-native electronic signatures, Australian ETA 1999 compliance, and Microsoft 365 security.",
    "publisher": {
      "@type": "Organization",
      "name": "Send & Sign",
      "url": "https://sendandsign.online/"
    }
  }
  </script>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>

<header class="top-nav">
  <div class="container">
    <a class="brand" href="/" aria-label="Send &amp; Sign home">
      <img src="/assets/sendandsign-mark.png" alt="" width="32" height="32">
      Send &amp; Sign
    </a>
    <nav aria-label="Primary">
      <ul class="nav-links">
        <li><a data-page="features" href="/features">Features</a></li>
        <li><a data-page="onthego" href="/onthego">On the go</a></li>
        <li><a data-page="compliance" href="/compliance">Compliance</a></li>
        <li><a data-page="security" href="/security">Security</a></li>
        <li><a data-page="pricing" href="/pricing">Pricing</a></li>
        <li><a data-page="compare" href="/compare">Compare</a></li>
        <li><a data-page="install" href="/pricing#install">Install guide</a></li>
      </ul>
    </nav>
    <div class="nav-cta">
      <a class="btn btn-text" href="/contact?intent=pilot">Start a pilot</a>
      <a class="btn btn-primary" href="/contact">Book a demo</a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="mobile-menu" aria-label="Open menu"><span></span></button>
    </div>
  </div>
  <div class="mobile-menu" id="mobile-menu">
    <ul>
      <li><a href="/">Home</a></li>
      <li><a href="/features">Features</a></li>
      <li><a href="/onthego">On the go</a></li>
      <li><a href="/compliance">Compliance</a></li>
      <li><a href="/security">Security</a></li>
      <li><a href="/pricing">Pricing &amp; deployment</a></li>
      <li><a href="/compare">Compare</a></li>
      <li><a href="/blog">Blog</a></li>
      <li><a href="/contact?intent=pilot">Start a pilot</a></li>
    </ul>
    <a class="btn btn-primary" href="/contact" style="width:100%">Book a demo</a>
  </div>
</header>

<main id="main">
  <section class="page-hero" style="padding-bottom:32px">
    <div class="container">
      <div class="section-head" style="margin-bottom:0;max-width:780px">
        <p class="eyebrow">Send &amp; Sign Blog</p>
        <h1 class="display-xl">Guides for Australian Microsoft 365 teams.</h1>
        <p class="lead mt-lg">Plain-English breakdowns of Australian electronic-signature law, SharePoint governance, and keeping signed records inside your own tenant.</p>
      </div>
    </div>
  </section>

  <section class="section" style="padding-top:32px" aria-label="Articles">
    <div class="container">
      <div class="grid grid-2">
${cards}

        <a class="blog-card reveal" href="/compare" style="background:var(--surface-soft);border-color:transparent">
          <div class="chip-row">
            <span class="chip">Buyer's Guide</span>
            <span class="ui-sub" style="align-self:center">Updated Nov 2026</span>
          </div>
          <h2 class="title-lg">Compare SharePoint E-Signature Tools in Australia</h2>
          <p>Side-by-side comparison of Send &amp; Sign against Microsoft 365 eSignature, FuseSign, Annature, and DocuSign across permissions, Azure PAYG, Power Automate, and Teams/mobile support.</p>
          <span class="arrow-link">View comparison</span>
        </a>
      </div>
    </div>
  </section>

  <!--UNMETERED-START-->
${renderUnmeteredSection(site.unmetered_banner, false)}
  <!--UNMETERED-END-->

  <!--CTA-START-->
${renderCtaSection(site.cta_band, '/')}
  <!--CTA-END-->
</main>

<footer class="footer">
  <div class="container">
    <div class="footer-grid">
      <div>
        <a class="brand" href="/"><img src="/assets/sendandsign-mark.png" alt="" width="32" height="32"> Send &amp; Sign</a>
        <p class="mt-md" style="max-width:320px">SharePoint-native electronic signatures for Australian organisations on Microsoft 365.</p>
        <p class="fine mt-md" style="max-width:340px"><strong>General information only — not legal advice.</strong> Send &amp; Sign supports simple contracts under the <em>Electronic Transactions Act 1999</em> (Cth) s 10. It is not intended for deeds, witnessed instruments, wills or statutory declarations.</p>
      </div>
      <div>
        <h4>Product</h4>
        <ul>
          <li><a href="/features">Features</a></li>
          <li><a href="/features#multi-sign">Multi-signature routing</a></li>
          <li><a href="/onthego">On the go (mobile)</a></li>
          <li><a href="/features#dashboard">Dashboard &amp; audit trail</a></li>
          <li><a href="/compare">Compare alternatives</a></li>
          <li><a href="/pricing#roadmap">Roadmap</a></li>
        </ul>
      </div>
      <div>
        <h4>Trust</h4>
        <ul>
          <li><a href="/compliance">Compliance overview</a></li>
          <li><a href="/compliance-eta">Australian ETA 1999</a></li>
          <li><a href="/compliance-us">US ESIGN &amp; UETA</a></li>
          <li><a href="/security">Security &amp; architecture</a></li>
        </ul>
      </div>
      <div>
        <h4>For IT admins</h4>
        <ul>
          <li><a href="/pricing#install">Install in 5 steps</a></li>
          <li><a href="/security#checklist">IT verification checklist</a></li>
          <li><a href="/pricing#hosting">Hosting options</a></li>
        </ul>
      </div>
      <div>
        <h4>Company</h4>
        <ul>
          <li><a href="/blog">Blog</a></li>
          <li><a href="/contact">Book a demo</a></li>
          <li><a href="/contact?intent=pilot">Start a pilot</a></li>
          <li><a href="/contact">Contact</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-legal">
      <span>© <span id="year">2026</span> Send &amp; Sign. Microsoft 365, SharePoint and Microsoft Entra are trademarks of the Microsoft group of companies.</span>
      <span>Made for Australian teams</span>
    </div>
  </div>
  <img class="footer-mountains" src="/assets/mountains.svg" alt="" width="1440" height="240" loading="lazy">
</footer>

<script src="/js/main.js?v=${JS_VER}" defer></script>
</body>
</html>
`;
}

function main() {
  const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/site.json'), 'utf8'));

  // 1. Sync Home Hero in index.html
  const indexPath = path.join(ROOT, 'index.html');
  let indexHtml = fs.readFileSync(indexPath, 'utf8');
  const h = site.home_hero;
  const heroInner = `        <span class="badge-pill"><span class="dot"></span> ${esc(h.badge)}</span>
        <h1 class="display-xl">${esc(h.headline)}</h1>
        <p class="lead">${esc(h.lead)}</p>
        <div class="btn-row">
          <a class="btn btn-primary" href="${esc(h.primary_cta_url)}">${esc(h.primary_cta_label)}</a>
          <a class="btn btn-secondary" href="${esc(h.secondary_cta_url)}">${esc(h.secondary_cta_label)}</a>
        </div>`;
  indexHtml = replaceBlock(indexHtml, '<!--CMS:HOME-HERO-START-->', '<!--CMS:HOME-HERO-END-->', heroInner);
  fs.writeFileSync(indexPath, indexHtml, 'utf8');

  // 2. Sync Pricing Tiers in pricing.html
  const pricingPath = path.join(ROOT, 'pricing.html');
  let pricingHtml = fs.readFileSync(pricingPath, 'utf8');
  const pr = site.pricing;
  // The ids (price-tierN / sub-tierN) and .price-cycle span are required by the
  // monthly/annual toggle script in pricing.html — keep them in sync with it.
  const tierBlock = (n, opacity, pClass) =>
    `          <h2 class="title-lg">${esc(pr[`tier${n}_name`])}</h2>\n` +
    `          <div class="price" id="price-tier${n}">${esc(pr[`tier${n}_price`])} <span class="price-cycle" style="font-size:15px;font-weight:500;opacity:${opacity}">${esc(pr[`tier${n}_period`])}</span></div>\n` +
    `          <p${pClass ? ` class="${pClass}"` : ''} id="sub-tier${n}">${esc(pr[`tier${n}_summary`])}</p>`;
  pricingHtml = replaceBlock(pricingHtml, '<!--CMS:TIER1-START-->', '<!--CMS:TIER1-END-->', tierBlock(1, '.75', 'muted'));
  pricingHtml = replaceBlock(pricingHtml, '<!--CMS:TIER2-START-->', '<!--CMS:TIER2-END-->', tierBlock(2, '.75', 'muted'));
  pricingHtml = replaceBlock(pricingHtml, '<!--CMS:TIER3-START-->', '<!--CMS:TIER3-END-->', tierBlock(3, '.8', ''));
  pricingHtml = replaceBlock(pricingHtml, '<!--CMS:CUSTOM-START-->', '<!--CMS:CUSTOM-END-->',
    `          <h2 class="title-lg">${esc(pr.custom_name)}</h2>\n          <div class="price">${esc(pr.custom_price)}</div>\n          <p class="muted">${esc(pr.custom_summary)}</p>`);
  fs.writeFileSync(pricingPath, pricingHtml, 'utf8');

  // 3. Sync shared UNMETERED & CTA bands across all root HTML pages
  const rootHtmlFiles = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));
  for (const file of rootHtmlFiles) {
    const fp = path.join(ROOT, file);
    let html = fs.readFileSync(fp, 'utf8');
    if (html.includes('<!--UNMETERED-START-->')) {
      html = replaceBlock(html, '<!--UNMETERED-START-->', '<!--UNMETERED-END-->', renderUnmeteredSection(site.unmetered_banner, false));
    }
    if (html.includes('<!--CTA-START-->')) {
      html = replaceBlock(html, '<!--CTA-START-->', '<!--CTA-END-->', renderCtaSection(site.cta_band, ''));
    }
    fs.writeFileSync(fp, html, 'utf8');
  }

  // 4. Build blog posts from content/blog/*.md
  const blogContentDir = path.join(ROOT, 'content/blog');
  const blogOutDir = path.join(ROOT, 'blog');
  fs.mkdirSync(blogOutDir, { recursive: true });

  const posts = [];
  if (fs.existsSync(blogContentDir)) {
    for (const file of fs.readdirSync(blogContentDir).filter((f) => f.endsWith('.md'))) {
      const slug = file.replace(/\.md$/, '');
      const { data, body } = parseFrontmatter(fs.readFileSync(path.join(blogContentDir, file), 'utf8'));
      if (data.published === false) continue;
      const post = { slug, ...data, body };
      posts.push(post);
      fs.writeFileSync(path.join(blogOutDir, `${slug}.html`), renderBlogPostPage(post, site), 'utf8');
    }
  }
  posts.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  fs.writeFileSync(path.join(blogOutDir, 'index.html'), renderBlogIndex(posts, site), 'utf8');

  // 5. Regenerate sitemap.xml
  const staticUrls = [
    ['/', '1.0'],
    ['/features', '0.9'],
    ['/pricing', '0.9'],
    ['/compare', '0.8'],
    ['/security', '0.8'],
    ['/compliance', '0.8'],
    ['/compliance-eta', '0.8'],
    ['/compliance-us', '0.7'],
    ['/onthego', '0.7'],
    ['/blog', '0.8'],
    ...posts.map((p) => [`/blog/${p.slug}`, '0.8']),
    ['/contact', '0.7'],
  ];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${staticUrls
    .map(([u, prio]) => `  <url><loc>${BASE_URL}${u}</loc><priority>${prio}</priority></url>`)
    .join('\n')}\n</urlset>\n`;
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap, 'utf8');

  console.log(`CMS build complete: synced ${rootHtmlFiles.length} root pages, built ${posts.length} blog post(s), updated sitemap.xml (${staticUrls.length} URLs).`);
}

main();
