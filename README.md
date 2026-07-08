# [ricardosp4.github.io](https://ricardosp4.github.io/)

A single-page personal site: hero, about, research/experience, projects, skills, contact.

Three files, no build step, no dependencies:
- `index.html` - all content and structure
- `style.css` - all colors, fonts, spacing
- `script.js` - the hero background animation only

## Previewing changes locally

Open `index.html` directly in a browser (double-click it, or drag it into
a browser window). No server or install needed. Refresh after any edit.

## Editing content

Everything visible on the page lives in `index.html`, split into sections
you can find by searching for these ids:

| Section | Find it by | What it holds |
|---|---|---|
| Hero | `id="top"` | Headline, subheadline, the two buttons |
| About | `id="about"` | The two paragraphs about you |
| Research & Experience | `id="work"` | One `<article class="entry">` per job/degree |
| Projects | `id="projects"` | The `stevents` card - copy this block to add another project |
| Skills | `id="skills"` | Grouped tag lists |
| Contact | `id="contact"` | Status line + the email/LinkedIn/GitHub log |

**To add a new job or project entry**: copy an existing `<article class="entry">…</article>`
(for experience) or the whole `.project-card` block (for projects), paste it
where you want it, and edit the text inside. The styling follows
automatically, you don't need to touch the CSS.

**To change a link**: find the `href="..."` for that item and swap the URL.

## Editing style (colors, fonts, spacing)

All colors and fonts are defined once at the top of `style.css`, under `:root`:

```css
--ink: #12181B;         /* page background */
--paper: #EDE7D9;       /* main text color */
--moss: #6B7D5F;        /* secondary accent (status dot, labels) */
--ember: #C1592A;       /* primary accent (buttons, highlights) */
--ash: #8B9089;         /* muted/secondary text */

--font-display: 'Fraunces', serif;        /* headings */
--font-body: 'IBM Plex Sans', sans-serif; /* body text */
--font-mono: 'IBM Plex Mono', monospace;  /* labels, dates, nav */
```

Change a value here and it updates everywhere that variable is used on
the page, you don't need to hunt through the rest of the file. If you
swap a font, also update the `<link href="https://fonts.googleapis.com/...">`
line near the top of `index.html` to load the new one from Google Fonts.

## The hero animation

`script.js` draws the point animation behind the hero headline. You don't
need to touch it to edit content, it's self-contained. If you ever want
it removed entirely, delete the `<canvas id="field">` line in `index.html`
and the `<script src="script.js">` line at the bottom.

## Publishing changes

Once you're happy with an edit, push it to GitHub and it goes live
automatically within a minute or two:

```
git add .
git commit -m "Update <whatever you changed>"
git push
```

## Still to add

- CV PDF download link (drop a `cv.pdf` in this folder and link to it)
- Career video, once ready, natural fit in the About section
- A headshot, if you want one, currently the design relies on type + the
  animation instead of a photo
