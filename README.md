# [ricardosp4.github.io](https://ricardosp4.github.io/)

A single-page personal site. A desk seen from above fills the screen; a
hardcover book lies on it. Scrolling into the projects section brings the book
to the centre and turns its pages: contents, then one spread per project.

- `index.html` - all content: hero, about, the project catalogue, experience, contact
- `style.css` - colours (light and dark themes), fonts, spacing
- `site.js` - the theme toggle
- `book.js` - the desk and the book (three.js), page textures drawn on canvas
- `vendor/three.module.min.js` - three.js r170, bundled so the site needs no CDN
- `images/` - the renders (see below)

## Previewing changes locally

`book.js` is a module, which browsers don't load from a double-clicked file.
Serve the folder with `python -m http.server 8000` and open http://localhost:8000.

## Images

- `images/desk.jpg` - the desk, top-down, empty in the middle. Until it exists
  the desk is a procedural oak top.
- `images/lightning.jpg`, `network.jpg`, `flood.jpg` - the left-hand page of
  each project. Until they exist the page shows a plain backdrop.

They are AI-generated illustrations (Flux.1 schnell), credited as such in the
footer.

## Editing projects

The book and the HTML catalogue hold the same text. Change both:

- the `PROJECTS` list near the top of `book.js` (what the book prints)
- the `<article class="catalog__item">` blocks in `index.html` (what screen
  readers, phones and browsers without WebGL show)

## Editing style

Colours for both themes are at the top of `style.css`. The light theme is
daylight, the dark theme switches on a desk lamp over the book.

## Publishing changes

```
git add .
git commit -m "Update <whatever you changed>"
git push
```

It goes live within a minute or two.
