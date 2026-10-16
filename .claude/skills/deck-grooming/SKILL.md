---
name: deck-grooming
description: How David grooms a deck slide for readability and story, learned rebuilding the Apple deck on Oct 15 2026. Load before chunking, splitting, re-laying-out or rewriting any slide in the case-study decks (?deck=1). Use together with the voice skill.
---

# Deck grooming

David presents by clicking through the site full screen, with no speaker notes. Every slide has to carry its own story and be readable in one glance from across a room. Before grooming, load the `voice` skill; this one covers shape and layout, that one covers words.

## The method, one slide at a time

Show David the slide as it reads now, propose the new shape in a short before/after, apply it on localhost only after he says yes, then fit-check (`scratchpad/fitkey2.cjs <path> <beat> 1454 840` and `1280 720`) and look at the screenshot. Never batch several slides into one unreviewed change.

## Shapes that worked, and when to use them

- **One idea per paragraph.** A paragraph over about 300 characters is almost always two or three ideas. Split at the turn: what was happening, what went wrong, what I did.
- **Problem slide, then solution slide.** When a slide holds both the pitfall and the fix, split it into two slides with their own headings. Apple: "Then the references *changed*." then "So I rebuilt Keynote *in the browser*." then "Getting editable Keynotes *out*".
- **A long story becomes several slides,** each with its own heading: fear, then trust, then the system. Apple: "The Executive Newsletter" then "It would always be *her newsletter*."
- **Two columns (`ms-cols`) for a pair:** before and after, who moved and why, what I did and whose skill it was, the setup and the payoff. Both columns get equal weight and size.
- **Two columns plus a full row (`ms-split`)** when two things compare and a third sentence is the consequence of both. Apple "Filter on anything": Tableau | Project Studio, then the full-width result under a thin rule.
- **Setup paragraphs stack; they are not a pair.** Context then "I joined…" reads as a sequence, so two paragraphs in one column (`ms-left`), not columns. David rejected columns on Microsoft "origin story".
- **One column, left-aligned (`ms-left`)** for three or more short paragraphs. Never put `ms-left` on a slide with a background picture (`ms-art`); it pulls the text away from the heading.
- **A statement slide (`ms-statement`)** when one sentence is the whole point. Cut everything else. Apple: "Colleagues now ship things they could not have shipped before, because someone handed them *a capability instead of a slide deck*."
- **Cut a slide** when the next one says it better with a picture, or when two slides repeat. Prefer adding `read-only` to the beat (it stays in the long read) unless David says remove it entirely.
- **Too much text above a figure:** give the text its own slide before the figure, at body size, rather than shrinking it.

## Sentences

- **Tell it as a story:** who moved first, who followed, why it felt safe, what that unlocked. "Nobody told them to." beats an abstract claim.
- **Name the actor.** Once text moves off the slide that introduced it, "It searched" needs its subject back: "The forensic agent searched".
- **Cut appositive numbers that clutter** ("about twenty in every three hundred") and keep the number in one place, exact ("eighteen slides").
- **Merge duplicate sentences** that say the same act twice ("Then I fixed it everywhere" / "I fixed every finding immediately").
- **Make vague slides concrete** with the slide's own long-read facts, and tie them to David's rules where they fit ("two teams needing it is a pattern").
- **Lead with what happens first:** "Anything awry was quarantined, and the business owner got an email…"
- **Underline the payoff phrase** (`<hand-mark>`), one per paragraph at most, short enough not to wrap badly. Coral italic only in narrative headings. Headings that are sentences end with a period; titles and fragments do not.

## Layout checks after every change

- Nothing overflows at 1454×840 or 1280×720, and the last line clears the key hint.
- The heading, label and body share one left edge or one centered axis; a label must line up with the figure under it.
- Two columns are roughly balanced; if one column is twice the other, rebalance the split point or stack them.
- Deck defaults bite: exactly two paragraphs auto-split into columns, the first paragraph gets bolder, paragraphs over 320 characters become `deck-long`. Override deliberately rather than fighting them one rule at a time.

Related memory: [[deck-mode-case-studies]], [[davids-voice]], [[story-shared-empathy]].
