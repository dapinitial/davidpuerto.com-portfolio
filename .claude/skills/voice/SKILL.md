---
name: voice
description: David's voice for every line on davidpuerto.com and in the decks. Load before writing or revising any copy, caption, talking point or prep text. Built from his own rewrites in voice/edits.jsonl.
---

# David's voice

David reads these lines aloud in the room. Copy that is not in his rhythm throws his delivery. He said of the draft decks: "the ideas are good, but it's not in my voice... flat and buzzwordy or gimmicky... not CLEARLY defining and expressing and telling the story." This skill exists so that stops happening.

## Sources, in order of authority

1. `voice/edits.jsonl`: every line David rewrote in place, before and after. Read the newest 40 rows before drafting anything. His "after" is the voice. The digest at the bottom of this file is generated from it (`python3 tools/voice.py`).
2. Talking points he wrote or rewrote himself (`data-notes` he has saved), which are closer to speech than the slide copy.
3. Pages he wrote before the rebuild: approach, resume, contact.
4. How he writes in chat: direct, plain, a little wry, says the thing.

## The through-line, in his words

Said in chat on Oct 13 2026, unedited: "I've been building in Flash and now I UX Engineer prototyping in Preview Sites managing design systems but now building factories that connect all the cloud services so that we have boilerplate in isolation passing component governance and we can leverage to bootstrap new sites and adhere to the design language and skills."

That is the arc and the vocabulary: Flash, UX Engineer, prototyping, Preview Sites, design systems, factories, cloud services, boilerplate in isolation, component governance, leverage, bootstrap, design language, skills. When a slide needs the big picture, it is this sentence, not a coinage.

## What every beat must say, in this order

1. **What was going on.** Anchor it in time and in a room: "In 2020", "Back in the day", "Today". Who was stuck and on what.
2. **What I actually did.** Verbs with named objects. The real names of the things: Playbook, Preview Sites, tokens, routes, tests, ADO stories, the gate, the Companion. Not "a system", not "a practice".
3. **What changed.** A number, or the person who moved, or the wait that went away ("so we don't wait days or weeks for decisions that can be made in near real-time").
4. **What it taught**, only on the beats built for it.

Say the problem before the solution. A slide that is only a mood or only a metaphor is not a beat. The chess pieces stay in the pictures; he does not say them aloud.

## How he writes, from his rewrites

- **Full spoken sentences.** Not fragments. He turned "Left, a preview site built by hand in 2020. Right, the card the factory made from its archive" into "In 2020, Preview Sites were created by hand. Today, a factory generates: an interactive design system, its tokens, and routes from the Playbook."
- **Time anchors open the thought.** "In 2020", "Today", "Back in the day".
- **Name the things.** He added "tokens", "routes", "tests", "knobs to turn", "ADO stories". He does not accept an abstraction where a noun exists.
- **The plain idiom over the clever turn.** "easy half" became "easy part". "rolled forward on their own" became "rolled forward". If a phrase is pleased with itself, cut it.
- **Longer is fine when it carries nouns.** His caption got longer and better. Short is not the goal. Clear is.
- **Warm openers are allowed.** "Back in the day", "often leads the way with the opening".
- **Capitalise the product.** Preview Sites, Playbook, Companion, Spacelab Studio.
- **"We" for the team, "I" for what he did.** Both appear. Do not launder "I" into "we" or "we" into "I".

## Kill list

- Captions that read "Left, ... Right, ...". Write the sentence.
- A paragraph that ends on an aphorism for effect ("Nothing hand-built."). If the point is real, say what it means ("so we don't wait days or weeks").
- Colon-stacked lists in running copy.
- Buzzwords and borrowed grandeur: seamless, empower, enable, ecosystem, at scale, north star, journey, unlock, delight, "judgment held in tests" and similar coinages of mine. If David has not said it, it is suspect. ("Leverage", "bootstrap" and "governance" are his words; they stay.)
- Metaphor said out loud in lines I write. The pawn, the rook, the knight are pictures. David kept one pawn line of his own ("often leads the way with the opening"); his call, not mine to extend.
- A number buried in a clause. Give it its own sentence.
- Em-dashes, always. Apple in past tense. No internal codenames or hostnames.

## Meter

Read it aloud. One slide is twenty to forty seconds spoken. One idea per sentence, with a breath at the full stop. The number gets its own sentence. If a sentence cannot be said in one breath, split it.

## Workflow

1. Read the newest rows of `voice/edits.jsonl`.
2. Draft the beat in the four-part order above, in his sentences.
3. Check the kill list, then read it aloud against the clock.
4. Show David before and after. Do not silently rewrite a line he wrote; his lines are final.
5. After he edits, run `python3 tools/voice.py` so the digest below catches up.

<!-- voice:digest -->
Generated from 3 rewrites. Newest first.

- **/**
  - was: Capability is the easy half. Trust is the product. Fourteen dashboards became one surface, and the charts the C-suite already trusted rolled forward on their own.
  - now: Capability is the easy part. Trust is the product. Fourteen dashboards became one surface, and the charts the C-suite already trusted rolled forward.
- **/case-studies/microsoft/ slide 1.8**
  - was: A PM team deciding on static mocks, and a sprint about to be spent on a guess. The pawn moves one square at a time, and it moves first.
  - now: Back in the day, a PM team deciding on static mocks, and a sprint about to be spent on a guess. The pawn moves one square at a time, and often leads the way with the opening.
- **/case-studies/microsoft/ slide 1.5**
  - was: Left, a preview site built by hand in 2020. Right, the card the factory made from its archive: tokens from the Playbook, seven checks on every build, drift named after every deploy, the story on the board. Nothing hand-built.
  - now: In 2020, Preview Sites were created by hand. Today, a factory generates: an interactive design system, its tokens, and routes from the Playbook. It writes tests and provides knobs to turn and proves its checks on every build. Drift is named, and ADO stories are updated on the board. Nothing is hand-built so we don't wait days or weeks for decisions that can be made in near real-time

**Words he reaches for:** sites (1), created (1), today (1), generates (1), interactive (1), design (1), system (1), routes (1), writes (1), tests (1), provides (1), knobs (1), turn (1), proves (1), ado (1), stories (1), updated (1), don't (1), wait (1), days (1), weeks (1), decisions (1), near (1), real-time (1), back (1), day (1), often (1), leads (1), way (1), opening (1), part (1)

**Words he strikes:** left (1), site (1), built (1), right (1), card (1), archive (1), seven (1), deploy (1), story (1), moves (1), first (1), half (1), own (1)

<!-- /voice:digest -->
