# Personal site

A single-page portfolio site: hero, about, research/experience, projects, skills, contact.

## Deploying to GitHub Pages

1. Create a new repository on GitHub named exactly `ricardosp4.github.io`
   (this is what makes it deploy automatically to `https://ricardosp4.github.io`).
2. Push these three files (`index.html`, `style.css`, `script.js`) to the
   root of that repository:
   ```
   git init
   git add index.html style.css script.js README.md
   git commit -m "Initial site"
   git branch -M main
   git remote add origin https://github.com/ricardosp4/ricardosp4.github.io.git
   git push -u origin main
   ```
3. In the repo settings → Pages, confirm the source is set to the `main`
   branch, root folder. (For a repo named `<username>.github.io` this is
   usually automatic.)
4. Give it a minute or two — the site will be live at
   `https://ricardosp4.github.io`.

## Notes / things to customize later

- **Contact section** intentionally omits your phone number, home address,
  and date of birth — those are fine on a Europass CV sent directly to an
  employer, but not something to publish on a public page. Only email,
  LinkedIn, and GitHub are shown.
- **CV download**: there's no PDF download link yet. If you want one, drop
  your CV PDF into this folder (e.g. `cv.pdf`) and add a link in the hero
  or footer, e.g. `<a href="cv.pdf" class="btn btn--ghost">Download CV</a>`.
- **Video**: once your career video is ready, it's a natural fit either
  embedded in the About section or linked from the footer.
- **Photo**: there's currently no headshot on the page — the design leans
  on typography and the point-process animation instead. Easy to add a
  photo to the hero or about section if you'd like one.
- The hero canvas animation respects `prefers-reduced-motion` and falls
  back to a static scatter for users with that setting enabled.
