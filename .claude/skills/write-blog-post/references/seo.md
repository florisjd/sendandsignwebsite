# SEO standard for Send & Sign blog posts

The build (`scripts/build-cms.mjs`) already writes the technical SEO for every
post: the `<title>` tag, meta description, canonical URL, Open Graph and Twitter
tags (with image size and alt), `article:*` meta, BlogPosting and BreadcrumbList
JSON-LD, sitemap `lastmod` and image entries, RSS, and image dimensions. Don't
hand-edit any of that. This guide covers what the build can't do: the
**content and inputs**. Run `scripts/seo-check.py` to check most of it.

## 1. Keyword and search intent (round 1, before structuring)

- **One focus keyword** per post: the phrase a real reader would type, usually
  2–5 words (e.g. `electronic signatures australia`, `microsoft 365 features`).
  Record it in front matter as `focus_keyword` (not shown on the page).
- **2–4 secondary keywords**: close variants and sub-questions (e.g. `business
  basic vs standard`, `power automate email to sharepoint list`). These become
  H2s and tags.
- **Match the intent.** Search the focus keyword (web search) and look at what
  ranks: guides, lists, comparisons, definitions. Shape the post to match the
  format, then beat it with Australian specifics and first-hand detail.
- **No cannibalisation.** Check `content/blog/*.md` (`focus_keyword`, titles) and
  the evergreen pages. Two pages chasing the same keyword compete with each
  other. Pick a different angle or link to the existing page instead.
- Prefer Australian phrasing where people search that way ("organisation",
  "e-signature Australia", "ABN", "Fair Work").

## 2. Titles, slug and description

| Field | Standard |
| --- | --- |
| `title` (the H1) | Contains the focus keyword, ideally in the first half. Reads naturally; up to ~80 characters is fine because it isn't truncated on the page. |
| `seo_title` (the `<title>` tag, shown in Google) | **Under 60 characters** including ` \| Send & Sign`. Focus keyword first or near the start. Unique across the site. |
| slug | 3–6 words from the focus keyword, lowercase, hyphenated, no stop words or dates. Never change it once published. |
| `description` | **140–155 characters**. Includes the focus keyword and says what the reader gets (a benefit or answer), not a teaser. Unique. |
| `excerpt` | 1–2 sentences, can be longer. Shown on cards and as the subtitle, and used when the post is shared. |

## 3. Opening and structure

- Put the **focus keyword in the first 100 words** and **answer the headline
  question in the first two paragraphs**. Search engines and AI answer engines
  quote the opening.
- For "what is / how does / is it legal" topics, add a **40–60-word direct
  answer** right under the relevant H2. This is the featured-snippet shape.
- **H2s** carry the secondary keywords or the questions people ask ("Is an
  electronic signature legal in Australia?"). Use H3 only under an H2. Never skip
  levels, and never use H1 in the body.
- Use **numbered lists** for steps, **bullets** for sets, and a **table** for
  comparisons. These are the formats Google lifts into snippets.
- Long posts (1,200+ words) get at least 4 H2s so the table of contents and
  jump links are useful.
- Keep keyword use natural: the focus keyword once in the opening, in 1–2 H2s
  where it fits, and in the conclusion. Never stuff it into alt text, tags or
  every heading.

## 4. Trust signals (E-E-A-T)

Google rewards pages that show experience, expertise, authority and trust.

- **Cite primary sources** for facts, laws and statistics: legislation.gov.au,
  Microsoft Learn and Support, OAIC, ATO, Fair Work. Aim for 1–3 external links,
  where they help the reader.
- Prefer **first-hand detail**: real steps, screenshots from
  `assets/screens/`, concrete Australian examples. Avoid generic filler.
- Keep facts current (the skill's editorial-rights rule). When a published post
  is revised, set `updated:` so `dateModified` and the sitemap tell search engines.
- Keep `legal_notice` on legal topics.

## 5. Links

- **Internal: at least 3** links to relevant site pages or posts, with
  descriptive anchor text ("our ETA 1999 compliance guide", not "click here" or
  a bare URL). Spread them through the body, not all in one paragraph.
- **Link back from older posts.** When a new post is published, add a link to it
  from 1–2 existing related posts where the text already discusses the topic.
  Leave their `updated` date alone for a link-only change, and report the links added.
- **External: 1–3** authoritative sources. The renderer opens them in a new tab.
  Never link to competitors' product pages except on `/compare`.

## 6. Images

- File names are generated as `<slug>-*.jpg`, which is keyword-relevant
  already. Don't use names like `image1.png`.
- **Alt text on every image**: a literal description of what's shown, under
  ~150 characters. Mention the topic only if it's genuinely visible. Never a
  keyword list.
- Cover is 16:9 at 1920px; `make-cover.py` handles size and WebP. Keep figures
  under ~250 KB.

## 7. Tags and category

- One category (filter button). 3–8 `tags` naming the specific products, laws or
  concepts covered. Reuse existing tags so topics group together. Tags feed
  `article:tag`, schema `keywords` and the on-page topic chips.

## 8. Length and readability

- Most posts: **900–1,800 words**. Long enough to fully answer the intent;
  padding hurts.
- Short paragraphs (2–4 sentences), plain English, Australian spelling, bold
  key terms. Readers scan; so do answer engines.

## 9. Don'ts

- No keyword stuffing, hidden text, doorway pages, or near-duplicate posts.
- No FAQ schema for rich results: Google limits FAQ rich results to government
  and health sites. A short FAQ section in the body is still fine for readers.
- No bought links or link exchanges.
- Don't publish AI-padded text with no original value. The user's draft and
  first-hand detail are what make a post rank.

## 10. After publishing (tell the user; Claude can't do these)

- Request indexing of the new URL in **Google Search Console** (URL inspection),
  and check the sitemap is accepted.
- Run the live URL through the **Rich Results Test**
  (search.google.com/test/rich-results) to confirm the BlogPosting markup.
- Share the post on LinkedIn; the Open Graph tags give it the right preview.
- Review traffic for the focus keyword after 4–8 weeks in Search Console, and
  refresh posts that slip (new facts, better headings, set `updated`).
