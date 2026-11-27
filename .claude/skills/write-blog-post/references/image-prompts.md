# Writing Google Gemini image prompts for the blog

The user pastes these into Google Gemini, saves the results into the post folder
and tells Claude. Write prompts that work on the first try and match the site.

## House style (put this in every prompt)

Look at `assets/blog/eta-1999-960.jpg` and `assets/hero/compliance-v2-960.jpg`
for reference. The style is:

- Soft **clay / plasticine 3D illustration**, slightly rounded, matte, hand-made
  feel. Friendly, not cartoonish. Stylised people with clay skin texture.
- **Warm natural daylight** from a window, soft shadows, shallow depth of field.
- Calm, modern Australian office or home office: **cream walls, light timber,
  terracotta pots, green plants**; Australian details when natural (Australian
  power points, eucalyptus outside the window, a small clay koala figurine).
- Palette: cream `#fffaf0`, deep teal `#1a3a3a`, terracotta `#d9774b`, sage
  `#5e8c6a`, ochre `#e8b94a`. Avoid saturated blues/purples and neon.
- Uncluttered, with one clear focal point.

## Rules

- **State the aspect ratio in words**: "16:9 landscape" for covers; "16:9
  landscape" or "4:3 landscape" for figures. Gemini follows the prompt text; there
  may be no separate size setting.
- **No readable text.** Gemini garbles words (the current cover shows "Signatu").
  Say: "no text, letters, numbers, logos or watermarks; screens and documents show
  only abstract grey lines and simple shapes".
- **No real brands or people**: no Microsoft, SharePoint or Teams logos, no
  recognisable public figures. Generic "a document-library app with a blue header"
  is fine.
- Covers: keep the **main subject in the centre 60%** with calm space around it.
  The cover is centre-cropped to 16:9 and shown at many sizes, and cards crop it.
- Figures: one idea per image (a step, a comparison, a concept). If a diagram with
  labels is really needed, tell the user it's better built in the page (a table
  or list) than generated.
- Vary people across posts (age, gender, ethnicity) in a natural way.
- Ask for high resolution ("high resolution, at least 1920 pixels wide").

## Template

```
Create a soft clay (plasticine) 3D illustration, 16:9 landscape, high resolution (at least 1920 pixels wide).

Scene: <one or two sentences: who, doing what, where, and the one object that tells the story of this post>.

Style: warm, friendly, hand-made clay look with matte textures and slightly rounded shapes; warm natural window light with soft shadows and shallow depth of field; a calm modern Australian office with cream walls, light timber, terracotta pots and green plants<, optional Australian detail>.
Colour palette: cream, deep teal, terracotta, sage green and ochre; no saturated blues, purples or neon.
Composition: <main subject centred / focal point>, uncluttered, with space around the subject.

Do not include any text, letters, numbers, logos, brand marks or watermarks. Any screens or documents show only abstract grey lines and simple shapes.
```

## What to give the user for each prompt

```
### cover.png: cover image (16:9)
Where it goes: top of the article and the /blog card.
<the prompt in a code block>
```

Then the same for `figure-1.png`, `figure-2.png`, ... with the section heading it
illustrates. End with: "If a result has garbled text, extra fingers or a logo,
regenerate it or ask me for a revised prompt."

## Example (for the ETA 1999 article)

```
Create a soft clay (plasticine) 3D illustration, 16:9 landscape, high resolution (at least 1920 pixels wide).

Scene: an Australian small-business owner at a timber desk signs a contract on a tablet with a stylus, while a laptop beside them shows a simple document-library screen; a small green tick badge floats above the tablet to show the signature is verified.

Style: warm, friendly, hand-made clay look with matte textures and slightly rounded shapes; warm natural window light with soft shadows and shallow depth of field; a calm modern Australian office with cream walls, light timber, terracotta pots and green plants, Australian power points on the wall and a small clay koala figurine on the desk.
Colour palette: cream, deep teal, terracotta, sage green and ochre; no saturated blues, purples or neon.
Composition: the person and tablet centred, uncluttered, with space around the subject.

Do not include any text, letters, numbers, logos, brand marks or watermarks. Any screens or documents show only abstract grey lines and simple shapes.
```
