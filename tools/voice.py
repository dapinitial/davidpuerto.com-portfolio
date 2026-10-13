#!/usr/bin/env python3
"""Refresh the digest in .claude/skills/voice/SKILL.md from voice/edits.jsonl.

Every in-place save appends a row {t, page, beat, kind, before, after}. This
prints the newest rewrites as before/after pairs and the words David reaches
for versus the words he strikes, and writes them between the digest markers.
"""
import json, re, collections, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
LOG = ROOT / 'voice' / 'edits.jsonl'
SKILL = ROOT / '.claude' / 'skills' / 'voice' / 'SKILL.md'
STOP = set('a an the and or but so of to in on at for from by with as is are was were be been it its this that these those i we you he she they them our my your his her their not no if then than there here into over up out about after before when while which who what how why do does did done have has had can could would should will just also very more most much many some any all each every one two'.split())

rows = [json.loads(l) for l in LOG.read_text().splitlines() if l.strip()] if LOG.exists() else []
words = lambda s: re.findall(r"[a-z][a-z'\-]+", s.lower())
added, struck = collections.Counter(), collections.Counter()
for r in rows:
    b, a = collections.Counter(words(r['before'])), collections.Counter(words(r['after']))
    for w, n in (a - b).items():
        if w not in STOP: added[w] += n
    for w, n in (b - a).items():
        if w not in STOP: struck[w] += n

out = [f'Generated from {len(rows)} rewrite{"s" if len(rows) != 1 else ""}. Newest first.', '']
for r in reversed(rows[-40:]):
    where = r['page'] + (f' slide {r["beat"]}' if r.get('beat') else '') + (' (talking points)' if r.get('kind') == 'notes' else '')
    out += [f'- **{where}**', f'  - was: {r["before"]}', f'  - now: {r["after"]}']
out += ['', '**Words he reaches for:** ' + (', '.join(f'{w} ({n})' for w, n in added.most_common(40)) or 'none yet'),
        '', '**Words he strikes:** ' + (', '.join(f'{w} ({n})' for w, n in struck.most_common(40)) or 'none yet'), '']
digest = '\n'.join(out)

s = SKILL.read_text()
s = re.sub(r'<!-- voice:digest -->.*<!-- /voice:digest -->', '<!-- voice:digest -->\n' + digest + '\n<!-- /voice:digest -->', s, flags=re.S)
SKILL.write_text(s)
print(digest if '-q' not in sys.argv else f'{len(rows)} rows')
