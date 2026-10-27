---
name: portfolio
description: The map of davidpuerto.com for anyone changing it - where each page, element, style and server piece lives, which systems pages share, how a change is checked and shipped, and the traps already found. Load first for any change to the site that is not a case study (menu, contact, legal pages, home, admin, server, the factory demo), and before a case-study change to find your way, then load case-study. Points to the README for setup and to case-study, deck-grooming, voice and motion-performance for their own jobs.
---

# davidpuerto.com

A plain multi-page Vite site with light-DOM web components and one small Express server. The README covers setup, the content lock, deck keys, security and analytics; read it once. This skill is where things are, how a change gets out, and what has bitten before.

## The rules

- **The repo is public; the studies are not.** `site/case-studies/<study>/` (all but `rebuild`) and `site/public/images/case-studies/` are gitignored plaintext under NDA. Never commit them, never print `CONTENT_KEY`, and keep study text out of tracked files, commit messages and artifacts. The live site gets them encrypted through `npm run lock`.
- **A push to `main` deploys the live site.** Every push needs David's go for that piece of work. Commit by path, never `git add -A`.
- **No people's names** in commits, comments or copy: use roles. **No em-dashes** in copy. Titles use the dot: `Contact · David Puerto`.
- **Commit messages** are full sentences saying what changed and why.
- **Check before you say.** Do not tell David a file "may" say something: read it first. A PDF can hide its text from `grep`; read it with PDFKit (`swift`, `PDFDocument(url:).string`).

## Where things are

| You want | It lives in |
| --- | --- |
| A page | `site/<page>/index.html`, listed in `vite.config.js` `input` (a page not listed is never built) |
| Its style and script | `site/css/pages/<page>.css`, `site/js/<page>.js` |
| A shared element | `site/js/elements/<name>.js` + `site/css/elements/<name>.css` (table in the README) |
| The menu | `site/js/elements/site-header.js`: `MAIN_LINKS`, `CASE_STUDIES`; sizes in `site-header.css` (`--nav-item`, `--nav-gap`) |
| The menu's spray paint | `site/js/elements/spray-hover.js`; study links spray in `STUDY_RGB`, which must match each study's `--cs-accent` |
| Study accents | `site/css/pages/case-study.css`, keyed on the hero id |
| Contact readout | `site/contact/index.html` (location, coordinates, Direct line, Elsewhere icons); clock and time zone in `site/js/contact.js` |
| Terms, privacy | `site/terms/`, `site/privacy/`, styled by `legal.css`; each has an "Effective" date to move when it changes |
| Résumé | `site/resume/` links `/images/pdf/resume__davidPuerto.pdf` |
| Pre-paint loader | `site/public/boot/arriving.js` (its `deckPage` list holds deck pages hidden until deck.js lays them out) |
| Server | `server/index.js`: gate, login, contact, headers, locked files; `server/visits.js`: the visit log and alerts; `server/contact-email.js`; `server/blocklist.mjs` |
| Admin | `site/admin/`, `site/js/admin.js` |
| Factory demo | `site/public/factory/`, built files copied in by `npm run publish:portfolio` in the spacelab-factory repo; commit only that folder |
| Dev tools | `tools/edit-in-place.mjs` (Cmd + double-click a line on the dev server to edit its source), `tools/voice.py` and `voice/edits.jsonl` (the voice log) |
| Tests | `tests/server.test.mjs` (`npm test`), `tests/smoke.mjs` |

## Things that must agree

Some facts are written in more than one place. Change one, change all:

- **David's time zone:** the contact clock and its `data-tz` fallback, `site/js/admin.js` and `server/visits.js` all name it (`America/Chicago`, Central, since October 2026).
- **Where David is:** the contact readout, the contact page's meta description, and the map link's query and title.
- **A study's color:** `--cs-accent` in `case-study.css` and `STUDY_RGB` in `spray-hover.js`.
- **The list of studies:** see case-study, "Where a study is registered": seven places, plus the menu.
- **Copyright years** come from `data-year`; do not hand-edit them.

## Making a change

1. Start the dev server: `npm run dev` (:5173). Gated pages serve ungated when the auth server (:3001) is not running, which is fine for looking. A study is `npm run dev` plus case-study.
2. Look at it in a browser at a laptop width and 390 wide. Playwright is available from the spacelab-factory repo's `node_modules`. A page streaming video never goes network idle: wait for `load`. Scratch screenshots go in the session scratchpad and get deleted; pictures of a study hold NDA content.
3. Measure, do not trust a crop: an element screenshot can cut off what the page shows fine. Check `scrollWidth` against `clientWidth` for rows that may overflow, and the page for sideways scroll.
4. Words go through voice. Slides go through deck-grooming. Motion goes through motion-performance.

## Shipping

1. If a study changed: `npm run lock`, and stage `content-locked/` with it.
2. Stage by path. Read the staged diff for study text and names (`git diff --cached`).
3. Commit, then test a clean copy: on a machine with the sources, "locked asset chunks need the cookie" fails because every chunk is built locally. So: `git worktree add --detach <scratch> HEAD`, copy `.env` in, link `node_modules`, `npm run build` and `npm test` there (12 pass), remove the worktree.
4. Push on David's go, then `git status -sb` shows no "ahead".
5. Watch the deploy: `doctl apps list-deployments b0d2f2ad-49e3-4335-9f5f-e032c3f963ed` until the commit is `ACTIVE` (about three minutes). Then fetch a public page you changed to see it live. A gated page answers 302 to the login when signed out, which is right.

## Traps already found

- **Pushing with auto mode on** can be refused as a production deploy. Do not get around it: tell David, who pushes or allows it.
- **Pipes hide failures.** `set -o pipefail` before `npm test | grep` in anything that leads to a push.
- **Backups sit beside a page** as `index.before-deck.html` or `index.full-<date>.html`, gitignored with it. The build reads only the `index.html` files `vite.config.js` lists. edit-in-place falls back to other HTML files when a line is not found once in the page, so it skips any `index.<something>.html`; keep backups named that way.
- **The menu fits six studies.** Six rows of `11svh` plus five gaps is about 81 percent of the screen; a seventh needs the sizes in `site-header.css` looked at.
- **Fixed-width icon rows overflow** a narrow readout column: let them wrap (`flex-wrap`, a row gap).
- **Bots ask for `.php` paths** (`/wp-login.php`, `/hotelrfp/index.php`). The site has no PHP; they get the 404 page. Nothing to fix unless one address floods.
- **iMessage** links use the email (`sms:me@davidpuerto.com`), never a phone number, and are removed on devices that are not Apple.
- **Legal pages name no state.** The terms dropped governing law in October 2026; do not add one back without David.
- **Apple's iMessage logo, and other brands' marks,** are not used as icons; use a plain glyph.
