---
name: write-blog-post
description: Turn the user's own draft (a Word, Markdown, text or PDF document in a folder on their PC) into a published, SEO-optimised article on the Send & Sign blog (sendandsign.online/blog). Analyses, fact-checks and corrects outdated information, researches keywords, structures the draft to SEO standard, writes Google Gemini image prompts, then adds the images the user generates, builds and previews the post. Use whenever the user points to a blog draft or folder, wants a blog post or article added or revised, says their images are ready, or asks for blog topic ideas for this site.
---

# Send & Sign blog posts: from your draft to a published post

The user writes the content. Claude's job is to analyse it, structure it for the
web, prepare image prompts, and publish it with this site's build.

How the site works: each post is one Markdown file, `content/blog/<slug>.md`.
`node scripts/build-cms.mjs` turns it into `blog/<slug>.html` and rebuilds
`blog/index.html`, `blog/feed.xml` and `sitemap.xml`. A GitHub Action reruns the
build when `content/**` changes on `main`. Never hand-edit files in `blog/`.

The work happens in two rounds, with the user making images in between:

| Round | Trigger | Claude produces |
| --- | --- | --- |
| 1. Structure | "Here's my draft: <folder>" | Analysis, `content/blog/<slug>.md` (as a draft), `image-prompts.md` in the folder |
| 2. Publish | "Images are in the folder" | Processed images, finished post, local preview |

## The post folder

The user keeps one folder per post anywhere on their PC and gives Claude its path.
If they don't, ask for it; don't search their drive. Expected contents:

```
<post folder>/
  my-draft.docx        ← the user's writing (.docx, .md, .txt or .pdf; any name)
  image-prompts.md     ← Claude writes this in round 1
  cover.png            ← the user adds these in round 2 (any of .png .jpg .jpeg .webp)
  figure-1.png
  figure-2.png
```

Leave videos (.mp4, .mov, etc.) out of the post: the user has decided the blog
doesn't use video. Don't process them or ask about them. Other images the user
drops in before round 1 (infographics, screenshots) are only candidates: use one
only if it passes the image checks in step 8, otherwise say why it's left out.

The folder is usually outside this repository, so the app may ask the user to
approve access the first time. Only read and write inside that folder and this
repository.

## Round 1: analyse and structure the draft

### 1. Read the draft

List the folder, then convert the document to Markdown (from the repo root):

```
python -I .claude/skills/write-blog-post/scripts/read-doc.py "<folder>/<file>"
```

It keeps headings, bold/italic, links, lists and tables. If the .docx contains
images, add `--extract-images "<folder>/from-doc"` and treat them as candidate
figures. For a Google Doc, `.doc` or `.pages`, ask the user to save it as .docx.
If there is more than one document, ask which one is the post.

### 2. Analyse

Work out, and report briefly to the user:

- **Topic and reader**: who it's for (business owner/ops lead, M365 or SharePoint
  IT admin, or legal/compliance) and what they're trying to find out.
- **Keywords and intent** (follow `references/seo.md` §1): one **focus keyword**
  (the phrase readers actually search, 2–5 words), 2–4 secondary keywords, and
  the search intent. Web-search the focus keyword to see what format ranks
  (guide, list, comparison), and check `content/blog/*.md` (`focus_keyword`) and
  the evergreen pages so two pages don't target the same keyword.
- **Length and reading time** (about 230 words a minute).
- **Structure problems**: wall-of-text sections, missing intro or conclusion,
  buried answer, sections in the wrong order, content better shown as a list or table.
- **Facts to check.** Verify every factual claim that could be wrong or out of
  date: product names, features, retirements, licensing, statistics, legal
  points. Use primary sources (Microsoft Learn and the Microsoft 365 roadmap,
  legislation.gov.au, state legislation sites, OAIC, ATO, Fair Work) via web
  search. Send & Sign product claims must match this repository
  (`features.html`, `security.html`, `pricing.html`, `onthego.html`,
  `install.html`, `compliance*.html`, `content/site.json`).
- **Overlap** with existing posts in `content/blog/` or the evergreen pages
  (`/compare`, `/compliance-eta`, `/compliance-us`, `/security`, `/install`):
  link to them rather than repeating them.

### 3. Correct discrepancies (editorial rights)

The user has given Claude editorial rights to fix factual discrepancies without
asking first. When a claim is wrong or out of date, update it with current,
verified information:

- **Renamed or retired products/features**: use the current name and describe
  what it does today (e.g. MyAnalytics → Viva Insights). Remove features that no
  longer exist rather than keep them.
- **Overstated or inaccurate technical claims**: rewrite them to be accurate,
  keeping the user's point where it still holds.
- **Statistics with no source**: replace with a current, sourced figure if one
  exists, or reword so it's honestly presented (e.g. as a commonly cited estimate).
- **Legal points**: correct to the current law and cite the source.
- Keep the user's voice and the section's purpose. Don't use this to change
  opinions, arguments or conclusions that aren't factual errors; those stay the
  user's call.
- Add a primary-source link in the text where a corrected fact benefits from one.

Report every correction afterwards in a short list: what it said, what it says
now, and the source. Only ask first if a fix would remove or reverse a whole
section's argument.

### 4. Structure it (edit, don't rewrite)

It's the user's article. Keep their wording, arguments and examples. Allowed
without asking:

- Add or reword headings (H2 for main sections, H3 for steps or sub-points) so
  each section has a clear, scannable heading, ideally one that contains the
  search phrase a reader would use.
- Make sure the answer to the headline question is in the first two paragraphs.
  The first paragraph is styled as a larger lead.
- Split long paragraphs (aim for 2–4 sentences); turn list-like sentences into
  bullet lists and repeated comparisons into a table.
- Convert to Australian English (organisation, summarise, licence), fix typos
  and grammar, and **bold** the key term in a paragraph.
- Turn asides into callouts: `> [!TIP]`, `> [!WARNING]`, `> text` (note) or
  `> [!QUOTE]` for a strong line worth pulling out.
- Add internal links (3+) where the text already mentions a topic the site
  covers, e.g. `/compliance-eta`, `/security`, `/features#multi-sign`,
  `/pricing`, `/install`, `/blog/<slug>`, with descriptive anchor text.
- **Find internal-link opportunities** (`references/seo.md` §5). Run
  `python -I .claude/skills/write-blog-post/scripts/link-suggest.py content/blog/<slug>.md`.
  It reports, for each site page and other post:
  - `FOUND`: a specific phrase already in the text. Link that sentence, with
    descriptive anchor text (e.g. "our [ETA 1999 compliance guide](/compliance-eta)").
  - `WEAK`: only a generic word matches. Read the sentence and decide; don't link it
    automatically.
  - `NONE`: nothing matches. Write one short sentence (a clause is enough) that
    leads naturally to the page, e.g. "If your signers work from a phone, see how
    [signing on the go](/onthego) works." Place it where the reader would want the
    next step, not in a list of links. Keep the user's argument; this is an
    addition, so report it.
  - `LINKED`: already linked, nothing to do.
  Aim for about 3–6 internal links per post, spread across sections, one link per
  target. Never link a heading, a table cell, or the same target twice.
  Add the target to `TARGETS` in the script when a new site page appears.
- **Apply the on-page SEO standard** (`references/seo.md` §3–§6): focus keyword in
  the first 100 words and in at least one H2 (only where it reads naturally);
  secondary keywords or reader questions as H2s; a 40–60-word direct answer under
  any "what is / is it legal / how do I" heading; lists and tables where they fit;
  1–3 primary-source external links; no keyword stuffing. Small wording changes to
  work a keyword in naturally are fine. Report them.

Ask first before: cutting or adding a paragraph's worth of content, changing a
conclusion, or adding a product pitch. The page already ends with a Send & Sign
call to action, so the body doesn't need one.

Read `references/markdown.md` for the Markdown the renderer supports; anything
else shows as literal text.

### 5. Write the post file as a draft

Create `content/blog/<slug>.md`. Slug = the URL: lowercase, hyphenated, from the
focus keyword, 3–6 words, no stop words or dates. Keep `published: false` until round 2, so
an accidental push can't publish a half-finished post.

```markdown
---
title: "Headline, 50–80 characters"
seo_title: "Keyword-first title under 60 chars | Send & Sign"
description: "Meta description, 140–155 characters, includes the keyword and says what the reader gets."
excerpt: "One or two sentences. Shown on the /blog card and as the article's subtitle."
date: 2026-11-27
focus_keyword: "the phrase readers search for"
category: "Australian Compliance"
tags: "Topic one, Topic two, Topic three"
cover_image: "/assets/blog/<slug>-1920.jpg"
cover_alt: "Written in round 2, once the image exists."
legal_notice: "General information only — not legal advice. ..."
published: false
---
```

Front-matter rules (the parser is deliberately tiny):

- One `key: value` per line; no multi-line values, lists or nesting.
- Quote values containing `:` or `#`; escape inner quotes as `\"`.
- `date` is `YYYY-MM-DD` (today unless the user says otherwise).
- `focus_keyword` is lowercase and isn't shown on the page. The SEO checker uses
  it, and it records the target so later posts don't compete for it.
- `title` (the H1) should contain the focus keyword where the headline allows.
  `seo_title` (what Google shows) **must**: under 60 characters including
  ` | Send & Sign`, keyword near the start, unique. `description` 140–155
  characters, keyword included, says what the reader gets.
- Categories become filter buttons on /blog, so reuse one: `Australian
  Compliance`, `Microsoft 365`, `Product Updates`, `Guides`. New ones only if the
  user agrees.
- `tags`: 3–8 comma-separated topics in one quoted string: the specific
  products, laws or concepts the post covers (e.g. `"Power Automate, SharePoint,
  Microsoft Lists"`). Reuse existing tags (check `content/blog/*.md`) so topics
  group consistently; don't repeat the category. They become `article:tag` meta,
  schema keywords, and clickable chips that search /blog.
- Keep `legal_notice` on anything that touches law. Optional fields: `updated`,
  `author` (default "Send & Sign Team"), `cover_caption`, `read_time` (leave it
  out; it's calculated).

Where a figure should go, put its final image line in the body now, for example
`![Alt text to finalise](/assets/blog/<slug>-figure-1.jpg "Caption")`.

Then run the SEO checker and fix every FAIL before ending round 1 (alt-text and
cover failures are expected until round 2):

```
python -I .claude/skills/write-blog-post/scripts/seo-check.py content/blog/<slug>.md
```

### 6. Write the Gemini image prompts

Write at least two prompts: always **one cover** (16:9) plus **one or more
figures** for the sections that most benefit from a visual (a process, a
before/after, a concept that's hard to picture). Follow
`references/image-prompts.md` for the house style and template.

Save them to `<folder>/image-prompts.md`, and also show them in the reply in
separate code blocks so they're easy to copy. Each prompt says which file name to
save the result as (`cover.png`, `figure-1.png`, ...) and where it goes in the post.

### 7. End round 1

Reply with: the analysis (short) including the focus and secondary keywords,
the factual corrections you made (with sources), what you changed structurally
and for SEO, the checker's remaining warnings, any remaining questions, the prompts, and the next step ("Save the
images into the folder with those names and tell me when they're there").
Don't build or commit yet.

## Round 2: add images and publish

### 8. Process the images

List the folder and match files to the prompts by name. If a name is off or an
image is missing, ask rather than guess. Look at each image (open it with Read)
before using it: check that it matches the prompt, has no garbled text, odd
hands/faces or third-party logos, and say if a visible watermark is in a corner.
If an image has a problem, tell the user and offer a revised prompt.

```
python -I .claude/skills/write-blog-post/scripts/make-cover.py "<folder>/cover.png" <slug>
python -I .claude/skills/write-blog-post/scripts/make-cover.py "<folder>/figure-1.png" <slug> --figure figure-1
```

The cover is centre-cropped to 16:9; figures keep their shape (max 1600px wide).
Both get .jpg and .webp versions in `assets/blog/`. Reference the .jpg; the live
site serves the .webp automatically.

### 9. Finish the post

Write `cover_alt` and each figure's alt text from what the image actually shows
(literal, under ~150 characters; no "image of"). Apply any answers the user gave
to round-1 questions. Set `published: true`.

### 10. Build and preview

```
node scripts/build-cms.mjs
```

Preview with the `site` launch configuration (`.claude/launch.json`, port 5173)
at `http://localhost:5173/blog/<slug>.html` and `/blog/index.html`. The browser may
cache old pages, so add `?v=<n>` to the URL after rebuilding. In-page `/blog/...`
links 404 locally (no clean-URL rewrites); they work live. Check:

- No console errors; "On this page" lists the H2s.
- **SEO checker passes with 0 FAIL**:
  `python -I .claude/skills/write-blog-post/scripts/seo-check.py content/blog/<slug>.md`.
  Then run `link-suggest.py` and confirm the post has 3–6 internal links spread
  across sections (`seo-check.py` FAILs under 3).
  Fix WARNs where it's easy and natural; explain any you leave. The technical SEO
  (canonical, Open Graph/Twitter, `article:*`, BlogPosting + Breadcrumb JSON-LD,
  sitemap `lastmod` + image, RSS, image dimensions) is generated by the build.
  Spot-check that the built page's `<head>` has them, not hand-edit them.
- No stray `*`, `` ` ``, `[` or `|` (Markdown the renderer didn't parse).
- Cover, figures, tables and callouts look right at desktop and mobile widths.
- The /blog card shows the right category, excerpt and cover.

### 11. Link from older posts, then hand over

Add a link to the new post from 1–2 existing related posts, where their text
already discusses the topic (descriptive anchor text, no `updated` change for a
link-only edit). Rebuild.

Summarise: title, live URL (`https://sendandsign.online/blog/<slug>`), word count,
focus keyword, SEO checker result, links added (including from older posts), and
the factual corrections made. Remind the user of the after-publishing steps only
they can do (`references/seo.md` §10): request indexing in Google Search Console,
run the Rich Results Test, share on LinkedIn, review rankings after 4–8 weeks. Commit or push only when the user asks; pushing
to `main` deploys. Commit the Markdown, the `assets/blog/<slug>-*` images and the
regenerated `blog/`, `sitemap.xml` together. Never commit the user's draft folder.

## Other requests

- **Internal links on a published post**: run `link-suggest.py`, add the `FOUND`
  links and any `NONE` sentences the user agrees to, rebuild, then report each
  link added (sentence and target). This is a metadata-and-links change: no
  `updated:` change is needed unless the wording of an argument changed.
- **Revising a published post**: edit `content/blog/<slug>.md`, set `updated:`
  to today, re-run the SEO checker, rebuild, preview.
- **SEO audit of existing posts**: run the checker on every `content/blog/*.md`,
  fix FAILs (metadata and links freely; headline or argument changes only with
  the user's OK), and report. Never change a published slug (it breaks links). To
  retire a post set `published: false`; its page is deleted at the next build.
- **Topic ideas**: propose 5–8, each with keyword, reader and angle, skipping
  what existing posts and evergreen pages already cover.
- **Changing the blog design**: templates are in `scripts/build-cms.mjs`
  (`renderBlogPostPage`, `renderBlogIndex`), styles in `css/blog.css`, behaviour
  in `js/blog.js`. Hostinger caches CSS/JS for 7 days: bump `BLOG_VER` when
  `blog.css`/`blog.js` change, and `CSS_VER`/`JS_VER` plus every root page's `?v=`
  when `styles.css`/`main.js` change.
