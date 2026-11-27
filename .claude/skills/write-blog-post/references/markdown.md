# Markdown supported by scripts/build-cms.mjs

The renderer is a small custom parser, not CommonMark. Stick to this list.

## Blocks

| Write | Renders as |
| --- | --- |
| Blank-line-separated lines | Paragraph (consecutive lines join into one) |
| `## Heading` | H2 with an anchor id, listed in "On this page" |
| `### Heading` | H3, listed (indented) in "On this page" |
| `#### Heading` | H4, not in the table of contents |
| `- item` or `* item` | Bulleted list (terracotta markers) |
| `1. item` | Numbered list |
| `> text` | Note callout (ochre "i" badge) |
| `> [!TIP] text` | Tip callout (sage tick) |
| `> [!WARNING] text` / `> [!IMPORTANT] text` | Warning callout (terracotta "!") |
| `> [!QUOTE] text` | Large pull quote with a terracotta rule |
| `\| a \| b \|` + `\| --- \| --- \|` + rows | Bordered table; first column bold; scrolls on mobile |
| `![alt](/assets/blog/x.jpg "Caption")` on its own line | Figure with optional caption |
| ```` ```lang ```` … ```` ``` ```` | Dark code block |
| `---` on its own line | Horizontal rule |

## Inline

`**bold**`, `*italic*`, `***bold italic***`, `` `code` ``, `[label](/path)`,
`![alt](url)`. Emphasis may nest, e.g. `**section 10 of the *ETA* (Cth)**`.
Links to other sites open in a new tab automatically.

## Not supported (it will show as literal text or break the layout)

- `# H1` in the body (the title is already the H1)
- Nested lists, task lists, definition lists, footnotes
- Raw HTML (it is escaped and shown as text)
- `_underscore_` emphasis; use `*asterisks*`
- Multi-paragraph callouts (each `>` block becomes one paragraph)
- A `|` inside a table cell
- Reference-style links `[label][1]`

## Images inside the body

Put images in `assets/blog/` (or `assets/uploads/` when added through the CMS),
reference them with an absolute path starting `/assets/`, keep them under ~250 KB,
and always write meaningful alt text. Product screenshots already in
`assets/screens/` can be reused (for example `/assets/screens/hub-desktop.png`).
