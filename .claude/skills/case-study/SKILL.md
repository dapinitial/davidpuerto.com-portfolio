---
name: case-study
description: Build a case study on davidpuerto.com, or move an older one onto the deck system the Apple and Microsoft studies use, from the first read to the locked push. Covers the draft David approves first, the markup contract deck.js reads, where a new study is registered, the traps found moving Nordstrom, SonoSite and Facebook in October 2026, the checks, and how to ship without leaking the plaintext. Load before creating, migrating or restructuring any study under site/case-studies/. Use with deck-grooming (slide shape) and voice (words).
---

# Case studies

A study is two things on one page: a deck David clicks through full screen in the room, and a long read for whoever has the password. Both come from the same markup. The system is already built (deck.js, chapter-motion.js, deck.css, case-study.css), so moving a study onto it is mostly writing and markup, not engineering. Keep the study's integrity: every paragraph David wrote survives in the long read, and each study keeps one thing only it has.

Load `voice` before writing any line and `deck-grooming` before shaping any slide. This skill covers the rest.

## The rules that never bend

- **The sources are under NDA.** `site/case-studies/<slug>/` and `site/public/images/case-studies/` are gitignored plaintext. The live site gets ciphertext from `npm run lock`, which reads `CONTENT_KEY` from `.env`. Never commit a source, never read, print or change the key, and keep study text out of tracked files, commit messages and artifacts. This repo is public.
- **Back up first.** Copy the page to `index.before-deck.html` beside it before the first edit. It is gitignored too.
- **David approves the story before it is built.** The writing, the climax and who is named are his call.
- **Every deploy needs his go.** Pushing main deploys the live site. Commit by path, never `git add -A`.
- **No em-dashes in copy.** A colon or a period usually does it.
- **Facts get checked.** Anything from outside the page (a date, a project, a link) is read at the source before it goes on a slide, and a mismatch with David's memory is told to him, not smoothed over.

## 1. Read, then draft

Read the whole study, then write `DECK-DRAFT.md` in its folder (gitignored, never ships). It holds:

- **The story in one sentence,** then the arc as a table: slide number, stage, title with its one coral (accent) italic word, picture, hand-mark phrase.
- **The crux:** which one or two slides are the climax and why. Offer the alternative when there is a close second.
- **The signature moment:** the one thing only this study has (a live control, a graph that draws, a wall of posts). Keep it working in both modes.
- **The chess piece, or why not.** Apple and Microsoft open chapters with a glass chess piece because those stories are strategy. Use one only when the story earns it, and say what the move means. A study about something else gets its own signature instead.
- **The lead,** like Microsoft's: eyebrow (company and years), the matrix (role, timeline, stack, outcome), counters (`data-count`), and the five beats: the occasion, the unthinkable, the technology I had to wield, who moved and the number, what it taught the next person.
- **Each slide:** the short deck text, and starter talking points in David's voice for him to rewrite.
- **Kept, moved and cut,** and **fixed along the way.**
- **Questions,** each fact not on the page marked **[confirm]**. Never invent a title, a year, a team size or a lesson. Answers go back into the draft under a dated heading.

## 2. Two ways to build it

- **Woven in** (Nordstrom, SonoSite): the beats live inside `main`. Each slide is the long read's own section, marked up; the fuller paragraphs stay as `read-only` beside the short `deck-only` ones. Use this when the long read is plain prose.
- **A deck beside the page** (Facebook): the long read stays the original page, edited in place, and the slides are a separate `<div class="deck-only">` after `main`. Use this when the long read has its own bespoke motion (pinned heroes, scrubbed characters, galleries) that would fight deck.js.

## 3. The markup contract

deck.js reads, and its header comment is the authority:

- `data-beat="7"`: becomes a slide; the number is deck order, decimals slot between (`7.5`).
- `data-stage`: `exposition`, `rising`, `climax`, `falling`, `resolution`. The arc map shows climax as "Crux". Always set a climax.
- `data-title`: the label on the arc map. `data-notes`: talking points, N in the deck, shown only on localhost and the talk route. `data-talk`: the slide is on the room's route (`?talk=1`).
- `deck-only` and `read-only` on any element: shown in one mode only.
- `ms-read`: a read slide; deck.js wraps everything but the heading into `.deck-copy`. Exactly two shown paragraphs split into two columns; one over 320 characters becomes `deck-long`.
- `ms-statement` (one sentence, with the letter scramble), `ms-left`, `ms-cols`, `ms-split`: shapes, see `deck-grooming`.
- `ms-media`: a read slide with its figure large beside the copy.
- `figure.ms-art`: the picture moves to a fixed layer behind the slide. `figure.ms-reel` with a `<video>`: plays on its slide, pauses off it. `ms-shot`: a screenshot. `p.ms-links`: buttons to open things.
- `<hand-mark>`: the drawn underline, one per paragraph at most. `svg .ink`: lines that draw when the slide arrives. `[data-count]`: numbers that count up.
- In the long read, `initChapterMotion()` from chapter-motion.js gives counters, beat numerals and the headings coming into focus. A page script steps aside when `html.deck` is set, since deck.js owns the screen.

## 4. Where a study is registered

A new slug goes in every one of these, or something quietly breaks:

- `vite.config.*`: the list of study pages to build.
- `scripts/lock-content.mjs`: `STUDIES`, or it never gets locked.
- `server/index.js`: `STUDY_NAMES` and `GATED_STUDY`, or it is not behind the gate.
- `site/js/case-studies/deck.js`: the `MORPH` regex, or the word morph between slides is off.
- `site/public/boot/arriving.js`: the `deckPage` regex, or the long read flashes before the deck appears.
- `site/css/pages/case-study.css`: the study's `--cs-accent` and `--cs-glow`, keyed on its hero id.
- Its own `site/css/pages/<slug>.css` and `site/js/case-studies/<slug>.js`.

## 5. Traps already found

- **deck.css loads after a page sheet,** so a page rule that ties loses. Add a class: `html.deck .deck-beat .ms-shot.nd-shot img`.
- **CodePen's `/full/` address refuses to be framed.** Use `/embed/<id>?default-tab=result&theme-id=dark`. The CSP allows `frame-src codepen.io`.
- **Never put a live iframe on a slide:** it takes the wheel and the deck stops. Put a link (`ms-links deck-only`) on the slide and the iframe `read-only` in the long read.
- **Headless browsers get 403 from CodePen.** Check embeds in David's Chrome. Do not get around it with a spoofed referer; that is bot-check circumvention. Use the study's own images.
- **A small picture on a big slide** looks lost. Add `ms-media` to the `ms-read` slide: the copy on the left, its figure large on the right, stacked when narrow (deck.css). Nordstrom, Facebook and SonoSite still carry their own earlier versions (`nd-media`, `fb-media`, `ss-media`).
- **A photo behind copy** needs dimming (`filter: brightness(0.4)`) so the text reads.
- **A fixed `min-width` on a wrapper** (Facebook's compare slider had 1600px) makes every smaller screen scroll sideways. Look for it.
- **Two paragraphs on a phone** split into two thin columns and overflow. deck.css stacks them under 700px, and `ms-links` under a two-up spread spans the row.
- **Something that loops** (the Facebook wall): two equal runs stacked, each moved up its own height with a CSS keyframe, `animation-play-state: paused` when the slide is not `.active`, and held still under `html.deck-still` and reduced motion.
- **Duplicate assets:** hash them (`md5 -r`) before showing a set; Facebook's 45 testimonials were 26 distinct posts.
- **Headings:** one h1 (the title, in the long read), then h2 sections, no skipped levels. Restyle with a class rather than choosing a level for its look.
- **Contrast:** greys on dark need 4.5 to 1; accent text on grey often fails. The page title uses the dot: `Nordstrom Case Study · David Puerto`.

## 6. Check it

With `npm run dev` running:

```
node .claude/skills/case-study/check-study.mjs <slug> [http://localhost:5173]
```

It walks every slide at 1454×840, 1280×720 and a tablet, then the long read on a phone, and names any slide that overflows, a page that scrolls sideways, a live iframe on a slide, an em-dash, a wrong h1 count, a skipped heading, a title without the dot, and page errors. Clean means it says `clean`. Then add `--shots <dir>` (a scratch folder, never the repo: the pictures hold study content) and look at every slide that changed; a passing check is not a good-looking slide. A study streaming video never goes network idle, so wait for `load`. A phone gets the long read unless `?deck=1` forces the deck.

To measure how far a study sits from Apple and Microsoft, use the Spacelab Factory:

```
factory reference <portfolio>/dist --ref /case-studies/apple/,/case-studies/microsoft/ --pages /case-studies/<slug>/ --out out/reference
```

At 1280 the references are decks, so only markup and motion compare; 390 compares everything. Some shared markers are features both references happen to have (the glass piece, `data-wf`, `data-gen`), not requirements; David decides which count.

## 7. Ship it, on David's go

1. `npm run lock`: builds and re-encrypts into `content-locked/`.
2. Stage by path: the study's tracked css and js, any shared file you changed (deck.js, arriving.js, case-study.css), and `content-locked`. Check the staged plaintext for study text and names before committing.
3. `npm test`. One test, "locked asset chunks need the cookie", fails on a machine that has the sources, because every chunk is built locally. Prove it is that, not you: commit, `git worktree add --detach <scratch> HEAD`, copy `.env` in, link `node_modules`, `npm run build` and `npm test` there (12 pass), then remove the worktree.
4. Push, then `git status -sb` shows no "ahead".
5. Live in about three minutes: poll a public file you changed (`/boot/arriving.js`), then the study answers 302 to the login, which is right. Only David can see it signed in.
