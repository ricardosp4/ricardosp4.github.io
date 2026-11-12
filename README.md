# [ricardosp4.github.io](https://ricardosp4.github.io/)

A single-screen personal site. A walnut desk in 3D fills the screen. On it lie
two folders ("About me" and "Projects"), a CV sheet and a business card.
Clicking one opens it (a folder's cover swings open, the sheet and the card
rise toward you) and then its panel; the menu at the top opens the same
panels. The moon/sun button, or a click on the desk lamp, switches between day
and night: the sun travels round and sets, and the lamp switches on.

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
- `images/desk.jpg` - the preview image when the link is shared: a capture of
  the site itself at 1200 by 630, by day, without the menu. If the desk or the
  introduction changes much, take it again.

The wood and the project images are AI-generated (Flux.1 schnell); the project
images are credited as such in the Projects panel.

## Editing content

Text lives in `index.html`, in the four `<dialog class="panel">` blocks.
The printed surfaces on the desk (folder labels, the CV sheet, the card) are
drawn in `desk.js`: `folderSurface`, `cvSurface` and `cardSurface`. If the CV
changes, update both the CV panel and `cvSurface`. The sheet you see inside an
open folder takes its lines from the `page` entries in `buildPrinted`; if the
About lead or the project titles change, update them there too.

## How things move

Each object has two springs in `desk.js`, `hover` and `open`, and `applyItem`
turns them into a pose for that kind of object (cover angle, corner curl, card
tilt). To change how far or how fast something moves, edit `applyItem` and the
stiffness numbers in `moveItems`. The panels' own open and close transition is
in `style.css` under "Panels". Visitors who ask their system for reduced
motion get every change at once, with no movement.

The CV panel's "Download the PDF" button serves `cv.pdf`. To update it, replace
that file. It is public: keep personal ID, phone number and home address out of it.

## Moving things on the desk

Positions are in `LAYOUTS` in `desk.js`: `wide` for landscape screens, `tall`
for phones. Each entry is `[x, z, rotation]`; x runs to the right, z toward the
viewer. A fourth number is a height: on wide screens the CV has one because it
leans on a corner of the Projects folder (it slides off when that folder opens).

On wide screens the introduction stands on the left at mid height and the
things on the desk gather to its right, starting where its text ends. On
phones it lies along the bottom and they stay above it. Either way the camera
comes as close as it can while keeping the objects in view, so spreading things
out moves it back: keep the layout compact.

## Day and night

The change is driven by one number, the sun's height. `STOPS` in `desk.js`
lists the light at each height (night, blue hour, horizon, golden, day), and
the durations are in the `themechange` handler (about 4 seconds each way).

## Publishing changes

```
git add .
git commit -m "Update <whatever you changed>"
git push
```

It goes live within a minute or two.
