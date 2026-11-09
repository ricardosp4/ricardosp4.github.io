# [ricardosp4.github.io](https://ricardosp4.github.io/)

A single-screen personal site. A walnut desk in 3D fills the screen. On it lie
two folders ("About me" and "Projects"), a CV sheet and a business card.
Clicking one lifts it and opens its panel; the menu at the top opens the same
panels. The moon/sun button switches between day and night: the sun travels
round and sets, and a desk lamp switches on.

- `index.html` - all content: the introduction and the four panels (about, projects, CV, contact)
- `style.css` - colours (day and night), fonts, the panels
- `site.js` - opening and closing panels, the day/night toggle
- `desk.js` - the desk scene (three.js): objects, labels drawn on canvas, light, layout for wide and tall screens
- `vendor/three.module.min.js` - three.js r170, bundled so the site needs no CDN
- `images/` - the wood texture and the project images

## Previewing changes locally

`desk.js` is a module, which browsers don't load from a double-clicked file.
Serve the folder with `python -m http.server 8000` and open http://localhost:8000.

## Images

- `images/wood.jpg` - the desk surface, a top-down walnut texture
- `images/lightning.jpg`, `network.jpg`, `flood.jpg` - one per project, shown in the Projects panel
- `images/desk.jpg` - the preview image when the link is shared

They are AI-generated (Flux.1 schnell); the project images are credited as such
in the Projects panel.

## Editing content

Text lives in `index.html`, in the four `<dialog class="panel">` blocks.
The printed surfaces on the desk (folder labels, the CV sheet, the card) are
drawn in `desk.js`: `folderSurface`, `cvSurface` and `cardSurface`. If the CV
changes, update both the CV panel and `cvSurface`.

The CV panel's "Download the PDF" button serves `cv.pdf`. To update it, replace
that file. It is public: keep personal ID, phone number and home address out of it.

## Moving things on the desk

Positions are in `LAYOUTS` in `desk.js`: `wide` for landscape screens, `tall`
for phones. Each entry is `[x, z, rotation]`; x runs to the right, z toward the
viewer. The camera frames the two folders, the CV, the card and the lamp on its
own, between the menu and the introduction.

## Publishing changes

```
git add .
git commit -m "Update <whatever you changed>"
git push
```

It goes live within a minute or two.
