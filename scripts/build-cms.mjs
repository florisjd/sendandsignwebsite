#!/usr/bin/env node
/**
 * Send & Sign — Lightweight Git-Backed CMS Builder (zero dependencies)
 * Reads content/site.json and content/blog/*.md, then:
 *  1. Syncs editable sections (home hero, pricing tiers, unmetered banner, CTA band) across HTML pages.
 *  2. Renders every published content/blog/<slug>.md to blog/<slug>.html with SEO meta + JSON-LD.
 *  3. Rebuilds blog/index.html (featured post + filterable grid) and blog/feed.xml (RSS).
 *  4. Regenerates sitemap.xml with all core pages + blog posts.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const BASE_URL = 'https://sendandsign.online';
const CSS_VER = '20261127a';
const JS_VER = '20261126d';
// Bump BLOG_VER whenever css/blog.css or js/blog.js changes (Hostinger caches assets for 7 days).
const BLOG_VER = '20261127e';

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

// ---------------------------------------------------------------------------
// Small helpers for SEO metadata
// ---------------------------------------------------------------------------

/** Reads width/height from a local JPEG, PNG or WebP (site-relative path). */
function imageSize(src) {
  if (!src || /^https?:/i.test(src)) return null;
  const file = path.join(ROOT, src.replace(/^\//, ''));
  if (!fs.existsSync(file)) return null;
  const b = fs.readFileSync(file);
  if (b[0] === 0x89 && b.toString('ascii', 1, 4) === 'PNG') return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const kind = b.toString('ascii', 12, 16);
    if (kind === 'VP8X') return { width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3) };
    if (kind === 'VP8 ') return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
    if (kind === 'VP8L') { const n = b.readUInt32LE(21); return { width: (n & 0x3fff) + 1, height: ((n >> 14) & 0x3fff) + 1 }; }
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { width: b.readUInt16BE(i + 7), height: b.readUInt16BE(i + 5) };
      }
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  return null;
}

/** "Microsoft 365, Power Automate" -> ['Microsoft 365', 'Power Automate'] */
function parseTags(value) {
  if (!value || typeof value !== 'string') return [];
  return [...new Set(value.split(',').map((t) => t.trim()).filter(Boolean))].slice(0, 10);
}

// ---------------------------------------------------------------------------
// Markdown → HTML (small, dependency-free subset tuned for blog posts)
// ---------------------------------------------------------------------------

function slugify(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

function stripMd(text = '') {
  return String(text)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*`]/g, '');
}

function isExternal(url) {
  return /^https?:\/\//i.test(url) && !/^https?:\/\/(www\.)?sendandsign\.online/i.test(url);
}

function inlineMd(text) {
  // Protect inline code from emphasis/link parsing.
  const codes = [];
  let s = String(text).replace(/`([^`]+)`/g, (_, c) => {
    codes.push(c);
    return `\u0000${codes.length - 1}\u0000`;
  });
  s = esc(s);
  // Images ![alt](url)
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g, (_, alt, url) => `<img src="${url}" alt="${alt}" loading="lazy" decoding="async">`);
  // Links [label](url)
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => {
    const ext = isExternal(url) ? ' target="_blank" rel="noopener"' : '';
    return `<a class="text-link" href="${url}"${ext}>${label}</a>`;
  });
  // Bold + italic, bold, italic (non-greedy so *nested* emphasis inside **bold** works)
  s = s.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*\w])\*(?!\s)(.+?)\*(?!\w)/g, '$1<em>$2</em>');
  s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${esc(codes[Number(i)])}</code>`);
  return s;
}

const CALLOUTS = {
  NOTE: { cls: 'note', ico: 'i', label: 'Note' },
  TIP: { cls: 'tip', ico: '✓', label: 'Tip' },
  WARNING: { cls: 'warning', ico: '!', label: 'Warning' },
  IMPORTANT: { cls: 'warning', ico: '!', label: 'Important' },
};

/**
 * Renders the Markdown body. Returns { html, toc, words }.
 * Supported: ## / ### / #### headings (auto ids), paragraphs, lists, pipe tables,
 * > callouts (> [!TIP] / [!WARNING] / [!NOTE] variants, > [!QUOTE] pull quote),
 * standalone images as <figure> (optional "caption" title), ``` code fences, --- rules.
 */
function renderMarkdown(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  const toc = [];
  const usedIds = new Set();
  let i = 0;

  const uniqueId = (text) => {
    const base = slugify(stripMd(text)) || 'section';
    let id = base;
    let n = 2;
    while (usedIds.has(id)) id = `${base}-${n++}`;
    usedIds.add(id);
    return id;
  };

  const isBlockStart = (l) =>
    /^(#{2,4})\s+/.test(l) ||
    /^\s*[-*]\s+/.test(l) ||
    /^\s*\d+\.\s+/.test(l) ||
    l.trim().startsWith('|') ||
    l.trim().startsWith('>') ||
    l.trim().startsWith('```') ||
    /^\s*(-{3,}|\*{3,})\s*$/.test(l) ||
    /^!\[[^\]]*\]\([^)]+\)\s*$/.test(l.trim());

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }

    // Fenced code block
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim();
      const code = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        code.push(lines[i]);
        i++;
      }
      i++;
      out.push(`    <pre class="code-block"${lang ? ` data-lang="${esc(lang)}"` : ''}><code>${esc(code.join('\n'))}</code></pre>`);
      continue;
    }

    // Horizontal rule
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      out.push('    <hr>');
      i++;
      continue;
    }

    // Headings (with anchor ids + TOC entries)
    const h = line.match(/^(#{2,4})\s+(.+)$/);
    if (h) {
      const level = h[1].length;
      const text = h[2].trim();
      const id = uniqueId(text);
      if (level <= 3) toc.push({ level, id, text: stripMd(text) });
      out.push(`    <h${level} id="${id}">${inlineMd(text)}<a class="heading-anchor" href="#${id}" aria-label="Link to this section">#</a></h${level}>`);
      i++;
      continue;
    }

    // Standalone image → figure
    const img = line.trim().match(/^!\[([^\]]*)\]\((\S+?)(?:\s+"([^"]*)")?\)$/);
    if (img) {
      const [, alt, url, caption] = img;
      const dim = imageSize(url);
      const wh = dim ? ` width="${dim.width}" height="${dim.height}"` : '';
      out.push(`    <figure class="post-figure">\n      <img src="${esc(url)}" alt="${esc(alt)}"${wh} loading="lazy" decoding="async">${caption ? `\n      <figcaption>${inlineMd(caption)}</figcaption>` : ''}\n    </figure>`);
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
      const thead = `<thead><tr>${headers.map(c => `<th scope="col">${inlineMd(c)}</th>`).join('')}</tr></thead>`;
      const tbody = `<tbody>\n${rows.map(r => `          <tr>${r.map(c => `<td>${inlineMd(c)}</td>`).join('')}</tr>`).join('\n')}\n        </tbody>`;
      out.push(`    <div class="data-table-wrap" tabindex="0" role="region" aria-label="Table">\n      <table class="data-table">\n        ${thead}\n        ${tbody}\n      </table>\n    </div>`);
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

    // Blockquote → callout (or pull quote)
    if (line.trim().startsWith('>')) {
      const q = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        q.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      let text = q.join(' ').trim();
      const kind = text.match(/^\[!(NOTE|TIP|WARNING|IMPORTANT|QUOTE)\]\s*/i);
      const type = kind ? kind[1].toUpperCase() : 'NOTE';
      if (kind) text = text.slice(kind[0].length);
      if (type === 'QUOTE') {
        out.push(`    <blockquote class="pull-quote"><p>${inlineMd(text)}</p></blockquote>`);
      } else {
        const c = CALLOUTS[type];
        out.push(`    <div class="callout callout-${c.cls}" role="note"><span class="ico" aria-hidden="true">${c.ico}</span><p>${inlineMd(text)}</p></div>`);
      }
      continue;
    }

    // Paragraph
    const para = [];
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) {
      para.push(lines[i].trim());
      i++;
    }
    if (!para.length) {
      // Unrecognised block start (e.g. a lone "|"): emit as text so we never loop forever.
      para.push(lines[i].trim());
      i++;
    }
    out.push(`    <p>${inlineMd(para.join(' '))}</p>`);
  }

  const words = stripMd(md).split(/\s+/).filter(w => /\w/.test(w)).length;
  return { html: out.join('\n\n'), toc, words };
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

// ---------------------------------------------------------------------------
// Blog: shared page chrome
// ---------------------------------------------------------------------------

const AUTHOR_DEFAULT = 'Send & Sign Team';
const BLOG_DESCRIPTION = 'Practical guides for Australian Microsoft 365 teams: SharePoint e-signatures, ETA 1999 compliance, licensing, automation and getting more from Microsoft 365.';
const CATEGORY_TONES = ['terracotta', 'sage', 'ochre', 'teal'];

function categoryTone(category = '') {
  let h = 0;
  for (const ch of String(category)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return CATEGORY_TONES[h % CATEGORY_TONES.length];
}

function readTime(post) {
  if (post.read_time) return post.read_time;
  return `${Math.max(1, Math.round((post.words || 0) / 230))} min read`;
}

/** Finds -960/-1920 size variants and .webp siblings of an image. */
function imageVariants(src) {
  if (!src) return null;
  const rel = src.replace(/^\//, '');
  const exists = (p) => fs.existsSync(path.join(ROOT, p));
  const m = rel.match(/^(.*)-(960|1920)\.(jpe?g|png)$/i);
  const sizes = [];
  if (m) {
    for (const w of [960, 1920]) {
      const p = `${m[1]}-${w}.${m[3]}`;
      if (exists(p)) sizes.push({ w, jpg: `/${p}`, webp: exists(p.replace(/\.(jpe?g|png)$/i, '.webp')) ? `/${p.replace(/\.(jpe?g|png)$/i, '.webp')}` : null });
    }
  }
  if (!sizes.length) {
    const webp = rel.replace(/\.(jpe?g|png)$/i, '.webp');
    sizes.push({ w: null, jpg: src, webp: webp !== rel && exists(webp) ? `/${webp}` : null });
  }
  return sizes;
}

function renderPicture(src, alt, { sizes = '100vw', eager = false, cls = '' } = {}) {
  const v = imageVariants(src);
  if (!v) return '';
  const srcset = (key) => v.filter(x => x[key]).map(x => (x.w ? `${x[key]} ${x.w}w` : x[key])).join(', ');
  const hasW = v.some(x => x.w);
  const fallback = v[v.length - 1].jpg;
  const webpSet = srcset('webp');
  const loading = eager ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"';
  return `<picture>${webpSet ? `<source type="image/webp" srcset="${esc(webpSet)}"${hasW ? ` sizes="${sizes}"` : ''}>` : ''}<img${cls ? ` class="${cls}"` : ''} src="${esc(fallback)}"${hasW ? ` srcset="${esc(srcset('jpg'))}" sizes="${sizes}"` : ''} alt="${esc(alt || '')}" ${loading}></picture>`;
}

function renderCoverMedia(post, opts) {
  if (post.cover_image) return renderPicture(post.cover_image, post.cover_alt, opts);
  // Branded placeholder when a post has no header image.
  return `<div class="cover-fallback tone-${categoryTone(post.category)}" aria-hidden="true"><span>${esc(post.category || 'Guide')}</span></div>`;
}

function renderHead({ title, socialTitle, description, canonical, ogType = 'website', ogImage, ogImageAlt = '', author = '', extraMeta = '', jsonLd }) {
  const social = socialTitle || title;
  const ogDim = imageSize(ogImage.replace(BASE_URL, ''));
  return `<!DOCTYPE html>
<html lang="en-AU">
<head>
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-WEELHQXFCT"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());

    gtag('config', 'G-WEELHQXFCT');
  </script>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">${author ? `\n  <meta name="author" content="${esc(author)}">` : ''}
  <meta name="robots" content="index, follow, max-image-preview:large">
  <link rel="canonical" href="${esc(canonical)}">
  <link rel="alternate" type="application/rss+xml" title="Send &amp; Sign Blog" href="${BASE_URL}/blog/feed.xml">

  <meta property="og:type" content="${ogType}">
  <meta property="og:locale" content="en_AU">
  <meta property="og:site_name" content="Send &amp; Sign">
  <meta property="og:title" content="${esc(social)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${esc(canonical)}">
  <meta property="og:image" content="${esc(ogImage)}">${ogDim ? `\n  <meta property="og:image:width" content="${ogDim.width}">\n  <meta property="og:image:height" content="${ogDim.height}">` : ''}${ogImageAlt ? `\n  <meta property="og:image:alt" content="${esc(ogImageAlt)}">` : ''}
${extraMeta}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(social)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${esc(ogImage)}">${ogImageAlt ? `\n  <meta name="twitter:image:alt" content="${esc(ogImageAlt)}">` : ''}

  <meta name="theme-color" content="#fffaf0">
  <link rel="icon" href="/assets/favicon-16.png" type="image/png" sizes="16x16">
  <link rel="icon" href="/assets/favicon-32.png" type="image/png" sizes="32x32">
  <link rel="icon" href="/assets/favicon-48.png" type="image/png" sizes="48x48">
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png" sizes="180x180">
  <link rel="manifest" href="/site.webmanifest">
  <link rel="stylesheet" href="/css/styles.css?v=${CSS_VER}">
  <link rel="stylesheet" href="/css/blog.css?v=${BLOG_VER}">

  <script type="application/ld+json">
${jsonLd}
  </script>
</head>`;
}

const NAV_HTML = `<a class="skip-link" href="#main">Skip to content</a>

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
        <li><a data-page="install" href="/install">Install guide</a></li>
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
      <li><a href="/install">Install guide</a></li>
      <li><a href="/blog">Blog</a></li>
      <li><a href="/contact?intent=pilot">Start a pilot</a></li>
    </ul>
    <a class="btn btn-primary" href="/contact" style="width:100%">Book a demo</a>
  </div>
</header>`;

const FOOTER_HTML = `<footer class="footer">
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
          <li><a href="/install">Install guide</a></li>
          <li><a href="/security#checklist">IT verification checklist</a></li>
          <li><a href="/pricing#hosting">Hosting options</a></li>
        </ul>
      </div>
      <div>
        <h4>Company</h4>
        <ul>
          <li><a href="/blog">Blog</a></li>
          <li><a href="/blog/feed.xml">RSS feed</a></li>
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
<script src="/js/blog.js?v=${BLOG_VER}" defer></script>
</body>
</html>
`;

// Evergreen pages shown as "resources" alongside posts.
const RESOURCES = [
  { href: '/compare', kicker: "Buyer's guide", title: 'Compare SharePoint e-signature tools in Australia', body: 'Send & Sign vs Microsoft 365 eSignature, FuseSign, Annature and DocuSign across permissions, pricing and mobile.' },
  { href: '/compliance-eta', kicker: 'Compliance', title: 'Electronic Transactions Act 1999 compliance guide', body: 'How each signing step maps to identification, reliability and consent under s 10.' },
  { href: '/install', kicker: 'For IT admins', title: 'Install guide for Microsoft 365', body: 'Step-by-step setup: app registration, permissions and SharePoint deployment.' },
];

function renderResourceCards() {
  return RESOURCES.map((r) => `          <a class="resource-card reveal" href="${r.href}">
            <span class="post-kicker">${esc(r.kicker)}</span>
            <h3>${esc(r.title)}</h3>
            <p>${esc(r.body)}</p>
            <span class="arrow-link">Open guide</span>
          </a>`).join('\n');
}

function renderByline(post, { compact = false } = {}) {
  const author = post.author || AUTHOR_DEFAULT;
  const updated = post.updated && post.updated !== post.date
    ? ` <span class="sep" aria-hidden="true">·</span> <span>Updated <time datetime="${esc(post.updated)}">${esc(formatDateShort(post.updated))}</time></span>`
    : '';
  if (compact) {
    return `<p class="post-card-meta"><time datetime="${esc(post.date)}">${esc(formatDateShort(post.date))}</time> <span class="sep" aria-hidden="true">·</span> ${esc(readTime(post))}</p>`;
  }
  return `<div class="post-byline">
        <img class="post-avatar" src="/assets/sendandsign-mark.png" alt="" width="40" height="40">
        <div>
          <p class="post-author">${esc(author)}</p>
          <p class="post-dates"><time datetime="${esc(post.date)}">${esc(formatDateAU(post.date))}</time> <span class="sep" aria-hidden="true">·</span> ${esc(readTime(post))}${updated}</p>
        </div>
      </div>`;
}

function renderPostCard(p, { headingTag = 'h3' } = {}) {
  return `          <article class="post-card reveal" data-category="${esc(slugify(p.category || 'Guide'))}" data-search="${esc(`${p.title} ${p.excerpt || p.description || ''} ${p.category || ''} ${p.tags.join(' ')}`.toLowerCase())}">
            <a class="post-card-link" href="/blog/${esc(p.slug)}">
              <div class="post-card-media">${renderCoverMedia(p, { sizes: '(max-width: 767px) 100vw, (max-width: 1080px) 50vw, 380px' })}</div>
              <div class="post-card-body">
                <span class="post-kicker tone-${categoryTone(p.category)}">${esc(p.category || 'Guide')}</span>
                <${headingTag} class="post-card-title">${esc(p.title)}</${headingTag}>
                <p class="post-card-excerpt">${esc(p.excerpt || p.description)}</p>
                ${renderByline(p, { compact: true })}
              </div>
            </a>
          </article>`;
}

// ---------------------------------------------------------------------------
// Blog: article page
// ---------------------------------------------------------------------------

function renderBlogPostPage(post, site, allPosts) {
  const url = `${BASE_URL}/blog/${post.slug}`;
  const ogImg = post.cover_image ? `${BASE_URL}${post.cover_image}` : `${BASE_URL}/assets/hero/home-v2-1920.jpg`;
  const isoPub = `${post.date}T09:00:00+08:00`;
  const isoMod = `${post.updated || post.date}T09:00:00+08:00`;
  const seoTitle = post.seo_title || `${post.title} | Send & Sign`;
  const author = post.author || AUTHOR_DEFAULT;
  const ogDim = imageSize(ogImg.replace(BASE_URL, ''));
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.description,
        image: { '@type': 'ImageObject', url: ogImg, ...(ogDim || {}), ...(post.cover_alt ? { caption: post.cover_alt } : {}) },
        thumbnailUrl: post.cover_image ? `${BASE_URL}${post.cover_image.replace(/-1920\./, '-960.')}` : ogImg,
        datePublished: isoPub,
        dateModified: isoMod,
        inLanguage: 'en-AU',
        articleSection: post.category || 'Guide',
        wordCount: post.words,
        ...(post.tags.length ? { keywords: post.tags.join(', ') } : {}),
        author: post.author
          ? { '@type': 'Person', name: author }
          : { '@type': 'Organization', name: 'Send & Sign', url: `${BASE_URL}/` },
        publisher: {
          '@type': 'Organization',
          name: 'Send & Sign',
          url: `${BASE_URL}/`,
          logo: { '@type': 'ImageObject', url: `${BASE_URL}/assets/sendandsign-logo-primary.png` },
        },
        isPartOf: { '@type': 'Blog', '@id': `${BASE_URL}/blog#blog`, name: 'Send & Sign Blog', url: `${BASE_URL}/blog` },
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

  const extraMeta = `  <meta property="article:published_time" content="${esc(isoPub)}">
  <meta property="article:modified_time" content="${esc(isoMod)}">
  <meta property="article:section" content="${esc(post.category || 'Guide')}">
${post.tags.map((t) => `  <meta property="article:tag" content="${esc(t)}">\n`).join('')}`;

  const legalCallout = post.legal_notice
    ? `    <div class="callout callout-legal" role="note">\n      <span class="ico" aria-hidden="true">§</span>\n      <p>${inlineMd(post.legal_notice)}</p>\n    </div>\n`
    : '';

  const tocItems = post.toc
    .map((t) => `            <li class="toc-l${t.level}"><a href="#${t.id}">${esc(t.text)}</a></li>`)
    .join('\n');
  const toc = post.toc.length >= 2
    ? `        <details class="post-toc" open>
          <summary>On this page</summary>
          <ol>
${tocItems}
          </ol>
        </details>`
    : '';

  const shareText = encodeURIComponent(post.title);
  const shareUrl = encodeURIComponent(url);
  const share = `<div class="post-share" aria-label="Share this article">
          <span class="post-share-label">Share</span>
          <a class="share-btn" href="https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}" target="_blank" rel="noopener" aria-label="Share on LinkedIn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4v11H3v-11Zm6.5 0h3.8v1.6h.06c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.77 2.65 4.77 6.1v5.35h-4v-4.74c0-1.13-.02-2.59-1.58-2.59-1.58 0-1.82 1.23-1.82 2.5v4.83h-4v-11Z"/></svg></a>
          <a class="share-btn" href="https://x.com/intent/post?url=${shareUrl}&amp;text=${shareText}" target="_blank" rel="noopener" aria-label="Share on X"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.77L17.75 3Zm-1.08 16.2h1.7L7.4 4.73H5.58L16.67 19.2Z"/></svg></a>
          <a class="share-btn" href="mailto:?subject=${shareText}&amp;body=${shareUrl}" aria-label="Share by email"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm1 2.4V17h16V7.4l-8 5.6-8-5.6ZM5.6 7 12 11.5 18.4 7H5.6Z"/></svg></a>
          <button class="share-btn" type="button" data-copy-link="${esc(url)}" aria-label="Copy link"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.6 13.4a1 1 0 0 1 0-1.4l3-3a1 1 0 1 1 1.4 1.4l-3 3a1 1 0 0 1-1.4 0Zm-2.1 5.3a4 4 0 0 1-2.83-6.83l2.12-2.12a1 1 0 1 1 1.42 1.42l-2.13 2.12a2 2 0 0 0 2.83 2.83l2.12-2.13a1 1 0 0 1 1.42 1.42l-2.12 2.12a4 4 0 0 1-2.83 1.17Zm7.07-6.36a1 1 0 0 1-.7-1.71l2.12-2.12a2 2 0 1 0-2.83-2.83l-2.12 2.13a1 1 0 0 1-1.42-1.42l2.12-2.12a4 4 0 1 1 5.66 5.66l-2.12 2.12a1 1 0 0 1-.71.29Z"/></svg><span class="copy-toast" role="status" aria-live="polite"></span></button>
        </div>`;

  // Related: same category first, then newest; fall back to evergreen resources.
  const others = allPosts.filter((p) => p.slug !== post.slug);
  const related = [
    ...others.filter((p) => p.category === post.category),
    ...others.filter((p) => p.category !== post.category),
  ].slice(0, 3);
  const keepReading = related.length
    ? `        <div class="post-grid">\n${related.map((p) => renderPostCard(p)).join('\n')}\n        </div>`
    : `        <div class="resource-grid">\n${renderResourceCards()}\n        </div>`;

  const cover = post.cover_image
    ? `    <figure class="post-cover">
      ${renderPicture(post.cover_image, post.cover_alt, { sizes: '(max-width: 1100px) 100vw, 1056px', eager: true })}${post.cover_caption ? `\n      <figcaption>${inlineMd(post.cover_caption)}</figcaption>` : ''}
    </figure>`
    : '';

  const tagList = post.tags.length
    ? `<ul class="post-tags" aria-label="Topics">${post.tags.map((t) => `<li><a href="/blog?q=${encodeURIComponent(t.toLowerCase())}">${esc(t)}</a></li>`).join('')}</ul>`
    : '';

  return `${renderHead({ title: seoTitle, socialTitle: post.title, description: post.description, canonical: url, ogType: 'article', ogImage: ogImg, ogImageAlt: post.cover_alt, author, extraMeta, jsonLd })}
<body class="blog-page">
<div class="read-progress" aria-hidden="true"><span></span></div>
${NAV_HTML}

<main id="main">
  <article class="post">
    <header class="post-header">
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <a href="/">Home</a> <span aria-hidden="true">/</span>
        <a href="/blog">Blog</a> <span aria-hidden="true">/</span>
        <a href="/blog?category=${esc(slugify(post.category || 'Guide'))}">${esc(post.category || 'Guide')}</a>
      </nav>
      <h1 class="post-title">${esc(post.title)}</h1>
      <p class="post-dek">${esc(post.excerpt || post.description)}</p>
      ${renderByline(post)}
    </header>

${cover}

    <div class="post-layout">
      <aside class="post-rail post-rail-left">
        ${share}
      </aside>

      <div class="post-content">
${toc}
${legalCallout}
        <div class="prose">
${post.html}
        </div>

        <div class="post-end">
          <div class="post-end-topics">
            <a class="post-kicker tone-${categoryTone(post.category)}" href="/blog?category=${esc(slugify(post.category || 'Guide'))}">${esc(post.category || 'Guide')}</a>
            ${tagList}
          </div>
          ${share.replace('class="post-share"', 'class="post-share post-share-inline"')}
        </div>

        <section class="article-cta" aria-labelledby="cta-heading">
          <p class="eyebrow">Send &amp; Sign</p>
          <h2 id="cta-heading">SharePoint-native e-signatures, built for Australian law</h2>
          <p>Send PDFs and interactive proposals straight from SharePoint or Microsoft Teams. Clients verify with a 6-digit email code (no Microsoft login required), and the signed PDF, with its audit certificate and SHA-256 fingerprints, saves automatically back to the original folder.</p>
          <div class="btn-row">
            <a class="btn btn-primary" href="/contact">Book a 20-minute demo</a>
            <a class="btn btn-secondary" href="/compliance-eta">ETA 1999 compliance guide</a>
          </div>
        </section>
      </div>

      <aside class="post-rail post-rail-right" aria-label="Table of contents">
${toc ? toc.replace('class="post-toc" open', 'class="post-toc post-toc-rail" open') : ''}
      </aside>
    </div>
  </article>

  <section class="keep-reading" aria-labelledby="keep-reading-title">
    <div class="container">
      <div class="keep-reading-head">
        <h2 id="keep-reading-title" class="blog-section-title">${related.length ? 'Keep reading' : 'More guides from Send &amp; Sign'}</h2>
        <a class="arrow-link" href="/blog">All articles</a>
      </div>
${keepReading}
    </div>
  </section>

  <!--UNMETERED-START-->
${renderUnmeteredSection(site.unmetered_banner, false)}
  <!--UNMETERED-END-->
</main>

${FOOTER_HTML}`;
}

// ---------------------------------------------------------------------------
// Blog: index page
// ---------------------------------------------------------------------------

function renderBlogIndex(posts, site) {
  const [featured, ...rest] = posts;
  const categories = [...new Map(posts.map((p) => [slugify(p.category || 'Guide'), p.category || 'Guide'])).entries()];
  const showToolbar = posts.length >= 2;

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Blog',
    '@id': `${BASE_URL}/blog#blog`,
    name: 'Send & Sign Blog',
    url: `${BASE_URL}/blog`,
    inLanguage: 'en-AU',
    description: BLOG_DESCRIPTION,
    publisher: { '@type': 'Organization', name: 'Send & Sign', url: `${BASE_URL}/`, logo: { '@type': 'ImageObject', url: `${BASE_URL}/assets/sendandsign-logo-primary.png` } },
    blogPost: posts.map((p) => ({
      '@type': 'BlogPosting',
      headline: p.title,
      description: p.description,
      url: `${BASE_URL}/blog/${p.slug}`,
      datePublished: p.date,
      dateModified: p.updated || p.date,
      ...(p.tags.length ? { keywords: p.tags.join(', ') } : {}),
      ...(p.cover_image ? { image: `${BASE_URL}${p.cover_image}` } : {}),
    })),
  }, null, 2);

  const featuredHtml = featured
    ? `      <article class="post-featured reveal" data-category="${esc(slugify(featured.category || 'Guide'))}" data-search="${esc(`${featured.title} ${featured.excerpt || featured.description || ''} ${featured.category || ''} ${featured.tags.join(' ')}`.toLowerCase())}">
        <a class="post-featured-link" href="/blog/${esc(featured.slug)}">
          <div class="post-featured-media">${renderCoverMedia(featured, { sizes: '(max-width: 900px) 100vw, 680px', eager: true })}</div>
          <div class="post-featured-body">
            <p class="post-featured-label"><span class="post-kicker tone-${categoryTone(featured.category)}">${esc(featured.category || 'Guide')}</span> <span class="new-pill">Latest</span></p>
            <h2 class="post-featured-title">${esc(featured.title)}</h2>
            <p class="post-card-excerpt">${esc(featured.excerpt || featured.description)}</p>
            ${renderByline(featured, { compact: true })}
            <span class="btn btn-primary post-featured-cta">Read article</span>
          </div>
        </a>
      </article>`
    : `      <p class="lead">New articles are on the way.</p>`;

  const toolbar = showToolbar
    ? `      <div class="blog-toolbar" role="search">
        <div class="filter-chips" role="group" aria-label="Filter by category">
          <button class="filter-chip" type="button" data-filter="all" aria-pressed="true">All</button>
${categories.map(([slug, name]) => `          <button class="filter-chip" type="button" data-filter="${esc(slug)}" aria-pressed="false">${esc(name)}</button>`).join('\n')}
        </div>
        <label class="blog-search">
          <span class="visually-hidden">Search articles</span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.5 3a7.5 7.5 0 0 1 5.96 12.06l4.24 4.24a1 1 0 0 1-1.42 1.42l-4.24-4.24A7.5 7.5 0 1 1 10.5 3Zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Z"/></svg>
          <input type="search" placeholder="Search articles" data-blog-search autocomplete="off">
        </label>
      </div>`
    : '';

  const grid = rest.length
    ? `      <h2 class="blog-section-title" data-latest-title>Latest articles</h2>
      <div class="post-grid" data-post-grid>
${rest.map((p) => renderPostCard(p)).join('\n')}
      </div>`
    : '';

  return `${renderHead({
    title: 'Blog: Microsoft 365 & E-Signature Guides | Send & Sign',
    description: BLOG_DESCRIPTION,
    canonical: `${BASE_URL}/blog`,
    ogImage: featured && featured.cover_image ? `${BASE_URL}${featured.cover_image}` : `${BASE_URL}/assets/hero/home-v2-1920.jpg`,
    ogImageAlt: featured && featured.cover_image ? featured.cover_alt : '',
    jsonLd,
  })}
<body class="blog-page">
${NAV_HTML}

<main id="main">
  <section class="photo-hero panel-edge is-banner blog-banner" style="--focus: 100% center; --focus-mobile: 70% center">
    ${renderPicture('/assets/blog/blog-hero-1920.jpg', 'A smiling clay-animated professional reads a tablet in a sunlit Australian reading nook, with a koala figurine, a bookshelf and floating documents.', { sizes: '100vw', eager: true, cls: 'photo-hero-img' })}
    <div class="container">
      <div class="hero-panel">
        <p class="eyebrow">Send &amp; Sign Blog</p>
        <h1 class="display-xl">Guides for Australian Microsoft&nbsp;365 teams.</h1>
        <p class="lead">Plain-English breakdowns of Australian electronic-signature law, SharePoint governance, and keeping signed records inside your own tenant.</p>
        <p class="blog-hero-meta"><span>${posts.length} article${posts.length === 1 ? '' : 's'}</span> <span class="sep" aria-hidden="true">·</span> <a class="text-link" href="/blog/feed.xml">RSS feed</a></p>
      </div>
    </div>
  </section>

  <section class="blog-listing" aria-label="Articles">
    <div class="container">
${toolbar}
${featuredHtml}
${grid}
      <p class="blog-empty" data-blog-empty hidden>No articles match that search. <button type="button" class="text-link" data-blog-reset>Show all articles</button></p>
    </div>
  </section>

  <section class="blog-resources" aria-labelledby="resources-title">
    <div class="container">
      <h2 id="resources-title" class="blog-section-title">Evergreen guides</h2>
      <div class="resource-grid">
${renderResourceCards()}
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

${FOOTER_HTML}`;
}

function xmlEsc(s = '') {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderFeed(posts) {
  const items = posts.map((p) => `    <item>
      <title>${xmlEsc(p.title)}</title>
      <link>${BASE_URL}/blog/${p.slug}</link>
      <guid isPermaLink="true">${BASE_URL}/blog/${p.slug}</guid>
      <pubDate>${new Date(`${p.date}T09:00:00+08:00`).toUTCString()}</pubDate>
      <category>${xmlEsc(p.category || 'Guide')}</category>
${p.tags.map((t) => `      <category>${xmlEsc(t)}</category>\n`).join('')}
      <description>${xmlEsc(p.excerpt || p.description)}</description>
    </item>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Send &amp; Sign Blog</title>
    <link>${BASE_URL}/blog</link>
    <atom:link href="${BASE_URL}/blog/feed.xml" rel="self" type="application/rss+xml"/>
    <description>Practical guides on SharePoint e-signatures and Australian compliance for Microsoft 365 teams.</description>
    <language>en-au</language>
    <lastBuildDate>${new Date(`${(posts[0] && (posts[0].updated || posts[0].date)) || '2026-01-01'}T09:00:00+08:00`).toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
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
      const { html, toc, words } = renderMarkdown(body);
      posts.push({ slug, ...data, tags: parseTags(data.tags), body, html, toc, words });
    }
  }
  posts.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  // Remove pages for posts that were deleted or unpublished.
  const live = new Set(posts.map((p) => `${p.slug}.html`));
  for (const f of fs.readdirSync(blogOutDir)) {
    if (f.endsWith('.html') && f !== 'index.html' && !live.has(f)) fs.unlinkSync(path.join(blogOutDir, f));
  }
  for (const post of posts) {
    fs.writeFileSync(path.join(blogOutDir, `${post.slug}.html`), renderBlogPostPage(post, site, posts), 'utf8');
  }
  fs.writeFileSync(path.join(blogOutDir, 'index.html'), renderBlogIndex(posts, site), 'utf8');
  fs.writeFileSync(path.join(blogOutDir, 'feed.xml'), renderFeed(posts), 'utf8');

  // 5. Regenerate sitemap.xml
  const staticUrls = [
    ['/', '1.0'],
    ['/features', '0.9'],
    ['/pricing', '0.9'],
    ['/install', '0.8'],
    ['/compare', '0.8'],
    ['/security', '0.8'],
    ['/compliance', '0.8'],
    ['/compliance-eta', '0.8'],
    ['/compliance-us', '0.7'],
    ['/onthego', '0.7'],
    ['/blog', '0.8', posts.length ? String(posts.map((p) => p.updated || p.date).sort().pop()) : null],
    ...posts.map((p) => [`/blog/${p.slug}`, '0.8', String(p.updated || p.date), p.cover_image]),
    ['/contact', '0.7'],
  ];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${staticUrls
    .map(([u, prio, lastmod, image]) => `  <url><loc>${BASE_URL}${u}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}<priority>${prio}</priority>${image ? `<image:image><image:loc>${BASE_URL}${image}</image:loc></image:image>` : ''}</url>`)
    .join('\n')}\n</urlset>\n`;
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap, 'utf8');

  console.log(`CMS build complete: synced ${rootHtmlFiles.length} root pages, built ${posts.length} blog post(s), updated sitemap.xml (${staticUrls.length} URLs).`);
}

main();
