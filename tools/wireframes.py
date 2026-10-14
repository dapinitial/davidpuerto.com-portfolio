#!/usr/bin/env python3
"""Hand-authored screen wireframes for the decks. Generates the SVGs, inserts
each as an .ms-figure-beat after an anchor beat (idempotent via data-wf)."""
import re, sys, html

ROOT = __import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)), '..', 'site') + '/'

class W:
    def __init__(self, w=1100, h=520, label=''):
        self.w, self.h, self.label = w, h, label
        self.p = []; self.i = 0
    def st(self, i): self.i = i; return self
    def _s(self): return f' style="--i:{self.i}"'
    def box(self, x, y, w, h, cls='', r=10):
        self.p.append(f'<rect class="wf-box wf-d {cls}" x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" pathLength="1"{self._s()}/>')
    def chip(self, x, y, w, txt, cls='', tcls=''):
        self.p.append(f'<rect class="wf-chip wf-d {cls}" x="{x}" y="{y}" width="{w}" height="24" rx="12" pathLength="1"{self._s()}/>')
        self.t(x + w/2, y + 16, txt, 's ' + tcls, anchor='middle')
    def line(self, x1, y1, x2, y2, cls=''):
        self.p.append(f'<line class="wf-ln wf-d {cls}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" pathLength="1"{self._s()}/>')
    def path(self, d, cls=''):
        self.p.append(f'<path class="wf-ln wf-d {cls}" d="{d}" pathLength="1"{self._s()}/>')
    def ph(self, x, y, w, cls=''):
        self.p.append(f'<line class="wf-ph wf-d {cls}" x1="{x}" y1="{y}" x2="{x+w}" y2="{y}" pathLength="1"{self._s()}/>')
    def phs(self, x, y, widths, gap=18, cls=''):
        for k, w in enumerate(widths): self.ph(x, y + k*gap, w, cls)
    def t(self, x, y, txt, cls='', anchor='start', size=None):
        sz = f' font-size="{size}"' if size else ''
        self.p.append(f'<text class="{cls}" x="{x}" y="{y}" text-anchor="{anchor}"{sz}{self._s()}>{html.escape(txt)}</text>')
    def bars(self, x, y, w, h, vals, cls='', lit=()):
        n = len(vals); bw = w / n * 0.62; step = w / n
        for k, v in enumerate(vals):
            bh = h * v; c = 'wf-bar wf-f ' + (cls if k in lit else '')
            self.p.append(f'<rect class="{c}" x="{x + k*step + (step-bw)/2:.1f}" y="{y + h - bh:.1f}" width="{bw:.1f}" height="{bh:.1f}" rx="2"{self._s()}/>')
        self.line(x, y + h + 0.5, x + w, y + h + 0.5, 'thin')
    def plot(self, x, y, w, h, vals, cls='plot'):
        n = len(vals); pts = ' '.join(f'{x + k*w/(n-1):.1f},{y + h - h*v:.1f}' for k, v in enumerate(vals))
        self.p.append(f'<polyline class="wf-ln wf-d {cls}" points="{pts}" pathLength="1"{self._s()}/>')
    def dot(self, x, y, r=4, cls=''):
        self.p.append(f'<circle class="wf-dot wf-f {cls}" cx="{x}" cy="{y}" r="{r}"{self._s()}/>')
    def screen(self, x, y, w, h, title='', cls=''):
        self.box(x, y, w, h, cls, r=12)
        self.line(x, y + 34, x + w, y + 34, 'thin')
        for k in range(3): self.dot(x + 16 + k*14, y + 17, 4, 'grey')
        if title: self.t(x + 66, y + 22, title, 's')
    def svg(self):
        return (f'<svg viewBox="0 0 {self.w} {self.h}" role="img" aria-label="{html.escape(self.label)}" xmlns="http://www.w3.org/2000/svg">\n'
                + '\n'.join(self.p) + '\n</svg>')


# ---------- 0. Apple, before and after: fourteen dashboards and slide stacks, then one surface and the numbers
def apple_before_after():
    w = W(1100, 520, 'Before: fourteen dashboard windows and stacks of hand-tuned slides. After: one reconciled surface and three outcome numbers')
    w.st(0).t(0, 18, 'Before', 'cap'); w.t(600, 18, 'After', 'cap')
    # before: fourteen little windows, scattered
    pos = [(0,40),(150,40),(300,40),(0,150),(150,150),(300,150),(0,260),(150,260),(300,260),(0,370),(150,370),(300,370),(450,40),(450,150)]
    for k, (x, y) in enumerate(pos):
        w.st(1 + k//4)
        w.box(x, y, 136, 96, 'dim', r=6); w.line(x, y + 20, x + 136, y + 20, 'thin')
        w.ph(x + 12, y + 40, 60); 
        if k % 2 == 0: w.bars(x + 12, y + 52, 112, 34, [.3,.6,.4,.8,.5], '', ())
        else: w.plot(x + 12, y + 52, 112, 34, [.3,.6,.4,.8,.5])
    w.st(5).box(450, 262, 136, 110, 'dim', r=4); w.box(458, 254, 136, 110, 'dim', r=4); w.box(466, 246, 136, 110, '', r=4)
    w.ph(482, 280, 60, 'light'); w.bars(482, 292, 104, 48, [.5,.3,.7,.6,.8], '', ())
    w.t(534, 392, 'thousands of slides', 's', anchor='middle'); w.t(534, 410, 'a week, by hand', 's', anchor='middle')
    w.st(6).t(0, 496, 'Fourteen log-ins. Twelve hours a week of slide assembly. Numbers nobody could check.', '')
    # arrow
    w.st(7).path('M 596 236 C 620 236, 628 236, 652 236', 'lit')
    # after: one surface
    w.st(8).screen(664, 40, 436, 340, 'One surface')
    w.line(760, 74, 760, 380, 'thin')
    w.box(672, 86, 80, 24, 'lit', r=6); w.ph(680, 128, 56); w.ph(680, 148, 56); w.ph(680, 168, 56); w.ph(680, 188, 56); w.t(680, 220, '… 14', 's')
    w.chip(772, 84, 96, 'Executive', 'lit', 'a'); w.chip(876, 84, 70, 'Owner'); w.chip(954, 84, 134, 'Reconciled 14/14')
    w.st(9)
    for k in range(4):
        x = 772 + (k % 2) * 160; y = 122 + (k // 2) * 124
        w.box(x, y, 150, 112, 'lit' if k == 3 else '', r=6); w.ph(x + 12, y + 20, 56)
        if k % 2 == 0: w.bars(x + 12, y + 34, 126, 64, [.4,.55,.5,.7,.65,.9], 'lit', lit=(5,))
        else: w.plot(x + 12, y + 34, 126, 64, [.4,.5,.45,.7,.65,.9]); w.line(x + 12, y + 98.5, x + 138, y + 98.5, 'thin')
    # the numbers
    w.st(10).t(664, 428, '12 h → 20 min', 't', size=26); w.t(664, 450, 'the weekly executive report', 's')
    w.st(11).t(884, 428, '100%', 't', size=26); w.t(884, 450, 'of the errors caught before render', 's')
    w.st(12).t(664, 496, '40+ teams', 't', size=26); w.t(800, 496, 'compose from it now, without me', 's')
    return w.svg()

# ---------- 1. One Surface: fourteen dashboards as one screen, the role switch
def one_surface():
    w = W(1100, 520, 'One screen: a rail of fourteen lines of business on the left, a role switch at the top, reconciled chart tiles in the middle')
    w.st(0).screen(0, 0, 1100, 520, 'Project Studio')
    # rail
    w.st(1).line(220, 34, 220, 520, 'thin')
    w.t(20, 62, 'Lines of business', 'cap')
    names = ['Activations', 'Line of business', 'Line of business', 'Line of business', 'Line of business', 'Line of business', 'Line of business']
    for k, n in enumerate(names):
        w.st(2 + k//3)
        y = 92 + k*30
        if k == 0:
            w.box(12, y - 18, 196, 28, 'lit', r=8); w.t(24, y + 1, n, 'a')
        else:
            w.ph(24, y - 4, 120, 'light')
    w.st(5).t(24, 318, '… fourteen, one surface', 's')
    # role switch
    w.st(6).t(250, 62, 'Viewing as', 'cap')
    w.chip(352, 46, 92, 'Executive', 'lit', 'a')
    w.chip(452, 46, 72, 'Owner')
    w.chip(532, 46, 78, 'Analyst')
    w.t(632, 62, 'what you see decided by who you are', 's')
    w.chip(930, 46, 150, 'Reconciled · 14 / 14', '', '')
    w.dot(942, 58, 4, '')
    # tiles
    tiles = [(250, 90), (540, 90), (830, 90), (250, 300), (540, 300)]
    series = [[.3,.5,.45,.7,.6,.85,.8], [.6,.55,.7,.65,.8,.75,.9], [.2,.35,.3,.5,.55,.5,.7], [.5,.4,.6,.7,.65,.9,.85], [.4,.6,.5,.8,.7,.9,.95]]
    for k, (x, y) in enumerate(tiles):
        w.st(7 + k)
        w.box(x, y, 250, 190, '', r=10)
        w.ph(x + 16, y + 26, 110, 'light'); w.ph(x + 16, y + 46, 70)
        if k % 2 == 0: w.bars(x + 16, y + 70, 218, 96, series[k], 'lit', lit=(6,))
        else: w.plot(x + 16, y + 70, 218, 96, series[k]); w.line(x + 16, y + 166.5, x + 234, y + 166.5, 'thin')
    w.st(12).box(830, 300, 250, 190, 'lit', r=10)
    w.t(846, 330, 'Every chart, one to one', 't')
    w.t(846, 356, 'rebuilt from the slide they trusted,', 's')
    w.t(846, 374, 'numbers checked at the source', 's')
    w.t(846, 410, 'Fourteen log-ins became one.', 'a')
    w.t(846, 432, 'Nothing was added;', 's'); w.t(846, 450, 'the seams were removed.', 's')
    return w.svg()

# ---------- 2. The ingestion review: source beside rebuilt, parity and reconciliation
def ingest_review():
    w = W(1100, 520, 'The ingestion review: the source slide on the left, the rebuilt chart on the right, the parity score and the recomputed values beneath, the state machine along the bottom')
    w.st(0).screen(0, 0, 1100, 520, 'Batch ingestion · review')
    w.t(900, 22, 'slide 212 of 1,840 · this run', 's', anchor='end')
    # source pane
    w.st(1).box(24, 56, 500, 300, '', r=10)
    w.t(40, 84, 'Source', 'cap'); w.t(100, 84, 'PDF, Keynote, image', 's')
    w.ph(40, 108, 180, 'light'); w.ph(40, 128, 120)
    w.st(2).bars(40, 150, 468, 170, [.35,.5,.42,.66,.58,.8,.74,.9], '', ())
    w.t(40, 346, 'hand-tuned in Tableau, years ago', 's')
    # rebuilt pane
    w.st(3).box(576, 56, 500, 300, 'lit', r=10)
    w.t(592, 84, 'Rebuilt', 'cap'); w.t(656, 84, 'from the component library', 's')
    w.ph(592, 108, 180, 'light'); w.ph(592, 128, 120)
    w.st(4).bars(592, 150, 468, 170, [.35,.5,.42,.66,.58,.8,.74,.9], 'lit', lit=(7,))
    w.t(592, 346, 'rolls forward on its own', 'a')
    # link between
    w.st(5).path('M 524 206 L 576 206', 'lit')
    w.t(550, 196, '1 : 1', 's', anchor='middle')
    # parity strip
    w.st(6).box(24, 376, 1052, 60, '', r=10)
    w.t(40, 404, 'Visual parity', 'cap'); w.t(170, 404, 'SSIM', 'm'); w.t(212, 404, 'pass', 'm a')
    w.t(300, 404, 'Values read', 'cap'); w.t(404, 404, '14', 'm')
    w.t(470, 404, 'Recomputed at source', 'cap'); w.t(652, 404, '14', 'm')
    w.t(720, 404, 'Diff', 'cap'); w.t(762, 404, '≤ 1 pt on every value', 'm a')
    w.t(40, 426, 'Vision reads every value; the source is queried through MCP; the values are recomputed and diffed. Semantic, not visual.', 's')
    # state machine
    steps = ['Read', 'Reassemble', 'Validate', 'Render']
    for k, sname in enumerate(steps):
        w.st(7 + k)
        x = 24 + k*272
        w.box(x, 456, 236, 44, 'lit' if k == 2 else '', r=22)
        w.t(x + 118, 483, sname, 'a' if k == 2 else 't', anchor='middle')
        if k < 3: w.line(x + 236, 478, x + 272, 478, 'lit' if k == 2 else '')
    w.st(11).t(1076, 514, 'a state machine, every step recorded', 's', anchor='end')
    return w.svg()

# ---------- 3. The quarantine email
def quarantine_email():
    w = W(1100, 520, 'The quarantine email: from the forensic agent to the product owner, the cause, the SQL, and two buttons, accept and reject')
    w.st(0).screen(0, 0, 1100, 520, 'Mail')
    # header
    w.st(1).t(40, 66, 'From', 'cap'); w.t(120, 66, 'Forensic agent', '')
    w.t(40, 90, 'To', 'cap'); w.t(120, 90, 'Product owner, Activations', '')
    w.t(40, 114, 'Subject', 'cap'); w.t(120, 114, 'Quarantined before render: 14 values on one slide, wrong baseline', 't')
    w.st(2).line(24, 132, 1076, 132, 'thin')
    # body
    w.st(3).t(40, 164, 'This slide did not reconcile with its source, so it did not render.', '')
    w.t(40, 186, 'All fourteen values were computed against the wrong baseline. Nothing exotic: a column name drifted over the years.', '')
    w.st(4).t(40, 222, 'Cause', 'cap')
    w.box(40, 232, 500, 44, 'warn', r=8)
    w.t(56, 259, 'column renamed, formula still points at the old one', 'w')
    w.t(560, 222, 'What to run', 'cap')
    w.st(5).box(560, 232, 516, 150, '', r=8)
    w.t(576, 258, 'SELECT week, SUM(activations)', 'm')
    w.t(576, 278, 'FROM   activations_by_region', 'm')
    w.t(576, 298, 'WHERE  baseline_id = ', 'm'); w.t(735, 298, "'fy_current'", 'm a')
    w.t(576, 318, 'GROUP  BY week;', 'm')
    w.t(576, 350, '-- expected: the fourteen values on the slide, to the point', 'm')
    w.t(576, 370, '-- the diff and the old column are attached', 'm')
    w.st(6).t(40, 304, 'Clues for remediation', 'cap')
    w.phs(40, 324, [460, 420, 380], cls='light')
    # buttons
    w.st(7).box(40, 410, 230, 48, 'lit', r=24); w.t(155, 440, 'Accept the fix → renders', 'a', anchor='middle')
    w.box(290, 410, 200, 48, 'warn', r=24); w.t(390, 440, 'Reject → stays out', 'w', anchor='middle')
    w.st(8).t(40, 496, 'Nothing renders on an agent’s say-so. A person decides, and the decision is recorded with the slide.', 's')
    w.t(1076, 496, 'every error in the set traced to drift or human error', 's', anchor='end')
    return w.svg()

# ---------- 4. The composer room
def composer_room():
    w = W(1100, 520, 'The composer room: the team on the left, the email on the canvas, data and review on the right')
    w.st(0).screen(0, 0, 1100, 520, 'SuperComposer · a team room')
    # left rail
    w.st(1).line(230, 34, 230, 520, 'thin')
    w.t(20, 62, 'This room', 'cap')
    w.t(20, 88, 'Owner', 't'); w.ph(80, 84, 110, 'light')
    w.t(20, 114, 'Members', 't'); w.ph(96, 110, 60, 'light'); w.ph(162, 110, 50, 'light')
    w.st(2).t(20, 150, 'Cadence', 'cap'); w.t(20, 174, 'Every other Monday, 7:00', '')
    w.t(20, 196, 'numbers already reconciled', 's')
    w.st(3).t(20, 232, 'Other rooms', 'cap')
    for k in range(5): w.ph(20, 254 + k*22, 90 + (k*37) % 80, '')
    w.t(20, 388, '40+ teams, each its own room', 'a')
    w.t(20, 410, 'the gate is a role in the product,', 's'); w.t(20, 428, 'not a person in a meeting', 's')
    # canvas: the email
    w.st(4).box(256, 56, 520, 440, '', r=10)
    w.t(272, 84, 'Weekly executive report', 'cap')
    w.box(272, 96, 488, 54, 'lit', r=6); w.ph(288, 123, 220, 'light')
    w.st(5)
    for k in range(3):
        x = 272 + k*166
        w.box(x, 166, 156, 86, '', r=6); w.ph(x + 14, 190, 60); w.t(x + 14, 234, ['42', '6.8 d', '61%'][k], 't', size=22)
    w.st(6).box(272, 268, 488, 110, '', r=6)
    w.ph(288, 290, 120, 'light')
    for k in range(3):
        y = 316 + k*22
        w.ph(288, y, 90); w.line(400, y, 400 + [250, 180, 300][k], y, 'lit' if k == 0 else '')
        w.dot(400 + [250, 180, 300][k], y, 4, '' if k != 1 else 'warn')
    w.st(7).box(272, 394, 488, 86, '', r=6)
    w.phs(288, 420, [420, 380, 300], cls='')
    # right rail
    w.st(8).t(802, 62, 'Pull any data', 'cap')
    w.chip(802, 74, 70, 'Druid'); w.chip(880, 74, 90, 'Postgres'); w.chip(978, 74, 100, 'the surface')
    w.t(802, 124, 'through the same MCP servers', 's')
    w.st(9).t(802, 160, 'Compose', 'cap')
    w.t(802, 184, 'on-brand email or poll,', ''); w.t(802, 204, 'by committee, in the kit', '')
    w.st(10).t(802, 240, 'Review', 'cap')
    w.box(802, 252, 276, 60, 'lit', r=8); w.t(818, 276, '1 pending', 'a'); w.t(818, 298, "reviewed before it ships", 's')
    w.box(802, 326, 130, 40, 'lit', r=20); w.t(867, 351, 'Approve', 'a', anchor='middle')
    w.box(946, 326, 132, 40, 'warn', r=20); w.t(1012, 351, 'Send back', 'w', anchor='middle')
    w.st(11).t(802, 400, 'Schedule and send', 'cap')
    w.t(802, 424, 'automated, on the team’s cadence', '')
    w.t(802, 460, 'Twelve hours a week became', 's'); w.t(802, 480, 'under twenty minutes.', 'a')
    return w.svg()

# ---------- 5. The 2020 preview beside the 2026 card
def preview_to_card():
    w = W(1100, 520, 'Left: the 2020 preview site, hand-built. Right: the 2026 card the factory made of it, with its tokens, its gate and its story on the board')
    # left screen
    w.st(0).screen(0, 40, 500, 440, '2020 · a preview site')
    w.st(1).box(16, 92, 468, 110, '', r=8); w.ph(32, 130, 200, 'light'); w.ph(32, 152, 140); w.ph(32, 174, 100)
    w.st(2)
    for k in range(3):
        x = 16 + k*158
        w.box(x, 218, 152, 150, '', r=8); w.ph(x + 14, 246, 60, 'light'); w.phs(x + 14, 270, [110, 100, 80])
    w.st(3).t(16, 404, 'Built by a person, one at a time.', 't')
    w.t(16, 428, 'The wish Damini and Katie made: someday, anyone.', 's')
    w.t(16, 450, 'Generation one, by hand.', 's')
    # arrow
    w.st(4).path('M 512 260 C 540 260, 548 260, 576 260', 'lit')
    w.t(544, 246, 'an archive in', 's', anchor='middle')
    w.t(544, 282, 'the factory', 'a', anchor='middle')
    # right screen
    w.st(5).screen(588, 0, 512, 520, '2026 · the card, pre-prod')
    w.st(6).box(604, 52, 480, 110, 'lit', r=8); w.ph(620, 90, 200, 'light'); w.ph(620, 112, 140); w.ph(620, 134, 100)
    w.st(7)
    for k in range(3):
        x = 604 + k*162
        w.box(x, 178, 156, 120, '', r=8); w.ph(x + 14, 206, 60, 'light'); w.phs(x + 14, 230, [110, 100, 80])
    # tokens strip
    w.st(8).t(604, 330, 'Tokens', 'cap')
    for k, c in enumerate(['lit', 'lit', '', '', '']):
        w.p.append(f'<rect class="wf-bar wf-f {c}" x="{670 + k*30}" y="316" width="22" height="18" rx="4" style="--i:8"/>')
    w.t(830, 330, 'type · colour · spacing · motion, from the Playbook', 's')
    # gate
    w.st(9).t(604, 364, 'Gate', 'cap')
    w.box(672, 346, 412, 30, 'lit', r=15)
    w.t(688, 366, 'seven checks on every build', 'a'); w.t(1068, 366, 'all pass', 'a', anchor='end')
    w.st(10).t(604, 404, 'Drift', 'cap'); w.t(672, 404, 'named after every deploy · 0 today', '')
    w.t(604, 430, 'Deploy', 'cap'); w.t(672, 430, 'a federated identity, no secret to leak', '')
    w.st(11).t(604, 456, 'Board', 'cap'); w.t(672, 456, 'the story filed after a person read it', '')
    w.st(12).t(604, 496, 'Nothing hand-built. The gate stands between it and production.', 't')
    return w.svg()

# ---------- 6. The Companion mid-refusal
def companion_refusal():
    w = W(1100, 520, 'A preview page on the left with a button selected; the Companion panel on the right refusing a 38 pixel button and accepting a column, then Decide')
    # page
    w.st(0).screen(0, 0, 660, 520, 'a preview site · pre-prod')
    w.st(1).box(16, 50, 628, 90, '', r=8); w.ph(32, 84, 220, 'light'); w.ph(32, 108, 160)
    w.st(2).box(16, 156, 628, 230, '', r=8)
    w.ph(32, 186, 120, 'light')
    for k in range(5):
        y = 214 + k*32
        w.ph(32, y, 90); w.ph(160, y, 140); w.ph(340, y, 100); w.ph(480, y, 80, 'light' if k == 0 else '')
    w.t(482, 190, 'Customer', 'a'); w.line(470, 170, 470, 376, 'lit thin')
    w.st(3).box(16, 402, 150, 44, 'lit', r=22); w.t(91, 429, 'Primary', 'a', anchor='middle')
    w.box(182, 402, 150, 44, '', r=22); w.t(257, 429, 'Secondary', '', anchor='middle')
    w.path('M 16 402 L 166 402 L 166 446 L 16 446 Z', 'lit')
    w.t(16, 476, '44 px', 'm a'); w.t(66, 476, 'the touch floor, measured on every build', 's')
    # companion panel
    w.st(4).screen(684, 0, 416, 520, 'Companion')
    tabs = ['Look', 'Change', 'Decide', 'Bring in', 'Carry']
    for k, tname in enumerate(tabs):
        w.st(5)
        x = 696 + k*80
        w.t(x + 2, 62, tname, 'a' if k == 1 else 's')
        if k == 1: w.line(x, 70, x + 56, 70, 'lit')
    w.st(6).box(700, 88, 384, 48, '', r=8); w.t(716, 118, 'Add the customer to every row', '')
    w.box(700, 144, 384, 40, 'lit', r=8); w.t(716, 169, 'Done.', 'a'); w.t(770, 169, 'the column, on every row of the table', 's')
    w.st(7).box(700, 200, 384, 48, '', r=8); w.t(716, 230, 'Make the buttons 38 pixels tall', '')
    w.st(8).box(700, 256, 384, 110, 'warn', r=8)
    w.t(716, 284, 'Refused.', 'w')
    w.t(716, 306, 'A skin may carry the language.', ''); w.t(716, 326, 'It may not lower an accessibility rule.', '')
    w.t(716, 352, 'touch floor 44 px · a rule with a check', 'm')
    w.st(9).t(700, 398, 'Decide', 'cap')
    w.box(700, 410, 384, 48, 'lit', r=24); w.t(892, 440, 'Decide → version saved', 'a', anchor='middle')
    w.st(10).t(700, 488, 'In the admin list a minute later; the story on the board.', 's')
    w.t(700, 506, 'Anyone can change it. The gate stands between them and production.', 's')
    return w.svg()



# ---------- About: the through-line as a timeline
def through_line():
    w = W(1100, 270, 'A timeline from Flash to the factory: five stations, each carrying more of the decision')
    xs = [60, 290, 520, 750, 980]
    labels = [('Flash', '2007', 'designers should code'), ('Preview Sites', '2020', 'a prototype as the first draft'),
              ('Design systems', '2021', 'one language, cleared once'), ('Trust', '2025', 'nothing renders unreconciled'),
              ('Factories', '2026', 'governance held in tests')]
    w.st(0).line(60, 150, 980, 150)
    for k, (x, (name, yr, line)) in enumerate(zip(xs, labels)):
        w.st(1 + k)
        w.dot(x, 150, 7, 'lit' if k == 4 else '')
        w.box(x - 95, 60, 190, 62, 'lit' if k == 4 else '', r=10)
        w.t(x, 86, name, 't', anchor='middle'); w.t(x, 108, yr, 's', anchor='middle')
        w.t(x, 190, line, 's', anchor='middle')
    w.st(6).t(60, 250, 'each one carried more of the decision', 'cap')
    w.t(980, 250, 'the person decides; the tool holds the standard', 'cap', anchor='end')
    return w.svg()


# ---------- About: what a late decision costs
def decision_cost():
    w = W(1100, 360, 'The cost of changing a decision rises with time; a prototype in code moves the decision to the cheap end')
    w.st(0).line(80, 300, 1040, 300); w.line(80, 300, 80, 40)
    w.t(80, 330, 'idea', 's'); w.t(360, 330, 'mock', 's', anchor='middle'); w.t(640, 330, 'sprint', 's', anchor='middle'); w.t(1000, 330, 'production', 's', anchor='end')
    w.t(60, 40, 'cost to change', 's', anchor='end', size=12)
    w.st(1).plot(80, 60, 960, 240, [0.02, 0.03, 0.05, 0.08, 0.12, 0.18, 0.27, 0.4, 0.58, 0.8, 1.0], 'plot')
    w.st(2).dot(272, 300 - 240 * 0.05, 7, 'lit'); w.t(272, 260, 'decide here', 't', anchor='middle'); w.t(272, 280, 'a signed-in preview, real data shapes', 's', anchor='middle')
    w.st(3).dot(848, 300 - 240 * 0.58, 7, 'warn'); w.t(848, 110, 'the same decision, re-made later', 'w', anchor='middle'); w.t(848, 130, 'by whoever is next', 's', anchor='middle')
    w.st(4).path('M 300 200 C 420 200, 700 200, 836 166', 'thin'); w.t(560, 190, 'the argument is had once, against the artifact', 's', anchor='middle')
    return w.svg()


# ---------- About: the method as a loop
def method_loop():
    w = W(1100, 420, 'The method as a loop: who decides, ask, prototype, argue, write it down, hand off, mark the route')
    steps = ['Start with the people who have to decide', 'Ask the questions', 'Prototype in the medium it will ship in', 'Let the room argue with the thing',
             'Write the judgment down', 'Hand off a thing, not a recommendation', 'Leave the route marked']
    top = [(20, 60), (290, 60), (560, 60), (830, 60)]; bot = [(830, 260), (560, 260), (290, 260)]
    pos = top + bot
    for k, ((x, y), label) in enumerate(zip(pos, steps)):
        w.st(k); w.box(x, y, 250, 90, 'lit' if k in (2, 4) else '', r=12)
        words = label.split(' '); mid = len(words) // 2 + (1 if len(words) > 5 else 0)
        w.t(x + 125, y + 40, ' '.join(words[:mid]), 't', anchor='middle', size=15); w.t(x + 125, y + 62, ' '.join(words[mid:]), 't', anchor='middle', size=15)
        w.t(x + 14, y + 20, f'0{k+1}', 'm', size=11)
    w.st(7)
    for (x, y) in top[:-1]: w.line(x + 250, y + 45, x + 270, y + 45)
    w.line(955, 150, 955, 260)
    for (x, y) in bot[:-1]: w.line(x, y + 45, x - 20, y + 45)
    w.path('M 290 305 H 145 V 150', 'thin')
    w.t(145, 180, 'the next decision', 's', anchor='middle', size=12)
    w.t(20, 400, 'The same loop at Microsoft and at Apple; the tools changed, the order did not.', 'cap')
    return w.svg()


FIGS = {
 'through-line': dict(fn=through_line, eyebrow='The through-line', title='The through-line, drawn',
   cap='Five stations, one idea. Each tool carried more of the decision than the last; the person still decides, and the tool holds the standard.',
   notes='The sentence as a picture. Flash, designers should code. 2020, the Preview Sites, a prototype as the first draft. 2021, the design system, one language cleared once. 2025, trust: nothing renders unreconciled. 2026, the factory, governance held in tests. The bars underneath are how much of the decision the tool carried. The last one is the job.'),
 'decision-cost': dict(fn=decision_cost, eyebrow='Design is a decision about someone else\'s time', title='What a late decision costs',
   cap='The cost of changing a decision climbs toward production. A signed-in preview on real data shapes moves the decision to the cheap end, and the argument is had once, against the artifact.',
   notes='The curve every studio knows and few draw. Cost to change rises toward production. A mock sits early but decides little. A signed-in preview on real data shapes lets the room decide at the cheap end, once. The amber dot is the same decision re-made later by whoever is next, which is the Microsoft 2026 problem in one picture.'),
 'method-loop': dict(fn=method_loop, eyebrow='How I work', title='The method, as a loop',
   cap='Seven steps, in order, and back to the start for the next decision. The two lit boxes are where the work actually happens: the prototype, and writing the judgment down.',
   notes='How I work, in one picture, so the next seven slides can go fast or be skipped. Who decides. Ask the questions. Prototype in the medium it will ship in. Let the room argue with the thing. Write the judgment down. Hand off a thing, not a recommendation. Leave the route marked. Then the next decision. The two lit steps are where the time goes.'),
 'apple-before-after': dict(fn=apple_before_after, eyebrow='Before and after', title='Before and after: fourteen dashboards, one surface',
   cap='Before: fourteen dashboards, each its own log-in, fed by thousands of hand-tuned slides a week. After: one surface every chart rebuilt into, reconciled at the source, that forty-plus teams compose from. Drawn from memory.',
   notes='Before and after, before any backstory. Left: fourteen dashboards, fourteen log-ins, thousands of slides a week assembled by hand, numbers nobody could check. Right: one surface, every chart rebuilt one to one and reconciled at the source. Twelve hours became twenty minutes, every error was caught before it rendered, forty-plus teams run it without me. The rest of the deck is how.'),
 'one-surface': dict(fn=one_surface, eyebrow='One Surface', title='One Surface: the screen',
   cap='Drawn from memory: fourteen dashboards as one surface, and what you see decided by who you are. Every chart rebuilt one to one from the slide they already trusted.',
   notes='The screen, drawn from memory: the rail of fourteen lines of business, the role switch, the tiles. Point at the role switch: what you see decided by who you are. Then the badge: reconciled. Fourteen log-ins became one.'),
 'ingest-review': dict(fn=ingest_review, eyebrow='Batch ingestion', title='Batch ingestion: the review',
   cap='Drawn from memory: the source slide beside the rebuilt chart, parity by SSIM, every value read, recomputed at the source through MCP and diffed to a point. The state machine recorded every step.',
   notes='The review screen, drawn from memory. Left, the slide someone tuned by hand years ago. Right, the chart rebuilt from the component library. Below, the two checks: visual parity by SSIM, then semantic: every value read by vision, recomputed at the source through MCP, diffed to one point. The strip at the bottom is the state machine.'),
 'quarantine': dict(fn=quarantine_email, eyebrow='Validation &amp; Containment', title='Quarantine: the email',
   cap='Drawn from memory: what the forensic agent sent the owner. The cause, the SQL to run, the clues, and two buttons. Nothing renders on an agent’s say-so; a person decides, and the decision is recorded.',
   notes='The quarantine email, drawn from memory. From the forensic agent to the product owner: the cause in one line, the SQL to run, clues for remediation, two buttons. This is the security posture in one screen: an agent may find and explain; only a person may admit a number to the surface.'),
 'composer-room': dict(fn=composer_room, eyebrow='A skill, then an application', title='SuperComposer: the room',
   cap='Drawn from memory: every team its own room. Owner and members set once, any data through the same MCP servers, composed on brand, reviewed before it ships, sent on the team’s cadence with the numbers already reconciled.',
   notes='The room, drawn from memory. Left, the team and its cadence. Middle, the email on the canvas: the KPI grid, the timeline. Right, data through the same MCP servers, and the review gate: approve or send back. The gate is a role in the product, not a person in a meeting. Forty-plus rooms run this without me.'),
 'preview-card': dict(fn=preview_to_card, eyebrow='In one minute, for anyone', title='The 2020 preview beside the 2026 card',
   cap='Left, a preview site built by hand in 2020. Right, the card the factory made from its archive: tokens from the Playbook, seven checks on every build, drift named after every deploy, the story on the board. Nothing hand-built.',
   notes='The before and after on one screen. Left, 2020: a person built it, one at a time. Right, 2026: the archive went in, the factory made the card, the gate ran its seven checks, the deploy used a federated identity with no secret, and drift was named afterward. This is the one we build live in a minute.'),
 'companion': dict(fn=companion_refusal, eyebrow='The standard, measured', title='The Companion, mid-refusal',
   cap='A sentence changes a screen; a second is refused. The customer column goes on every row. The 38-pixel button is refused because the touch floor is a rule with a check. Decide saves the version, and the story lands on the board.',
   notes='The Companion panel beside the page it is changing. First sentence: add the customer to every row. Done. Second: make the buttons 38 pixels tall. Refused, because the touch floor is a rule with a check, not a taste. Then Decide: the version is saved, the story is on the board. Consistency across teams without me in the room.'),
}

def block(key, beat, over=None):
    f = dict(FIGS[key]); f.update(over or {})
    talk = ' data-talk' if f.get('talk') else ''
    return (f'\n        <div class="ms-figure-beat" data-beat="{beat}"{talk} data-wf="{key}" data-stage="rising" data-title="{f["title"]}" data-notes="{html.escape(f["notes"], quote=True)}">\n'
            f'          <p class="ms-eyebrow">{f["eyebrow"]}</p>\n'
            f'          <figure class="ms-figure wf" aria-label="{html.escape(f["title"])}">\n'
            + f['fn']() + '\n'
            f'          <figcaption>{f["cap"]}</figcaption>\n'
            f'          </figure>\n        </div>\n')

def block_end(s, start):
    """index just past the closing tag of the element whose '<' is at start"""
    m = re.match(r'<([a-zA-Z0-9-]+)', s[start:]); tag = m.group(1)
    depth = 0; i = start
    pat = re.compile(r'<(/?)' + re.escape(tag) + r'(?=[\s>/])[^>]*>')
    for mm in pat.finditer(s, start):
        if mm.group(0).endswith('/>'): continue
        depth += -1 if mm.group(1) else 1
        if depth == 0: return mm.end()
    raise RuntimeError('unbalanced ' + tag)

def insert(path, placements):
    s = open(path).read()
    s = re.sub(r'\n\s*<div class="ms-figure-beat" data-beat="[0-9.]+" data-wf="[^"]+".*?</figure>\s*</div>\n', '\n', s, flags=re.S)
    for key, anchor, beat, *rest in placements:
        m = re.search(r'<[a-zA-Z0-9-]+[^>]*\sdata-beat="%s"' % re.escape(anchor), s)
        if not m: raise SystemExit(f'{path}: anchor {anchor} not found')
        end = block_end(s, m.start())
        s = s[:end] + block(key, beat, rest[0] if rest else None) + s[end:]
    if 'wire-frame.css' not in s:
        s = s.replace('<link rel="stylesheet" href="/css/elements/hand-mark.css">',
                      '<link rel="stylesheet" href="/css/elements/hand-mark.css">\n  <link rel="stylesheet" href="/css/elements/wire-frame.css">', 1)
    open(path, 'w').write(s)
    print(path, 'ok', [p[2] for p in placements])

if __name__ == '__main__':
    page = sys.argv[1] if len(sys.argv) > 1 else ''
    if page == 'about':
        insert(ROOT + 'about-me/index.html', [
            ('through-line', '3.5', '3.6', dict(talk=True)), ('decision-cost', '6', '6.02'), ('method-loop', '6.05', '6.08', dict(talk=True))])
    else:
        print('usage: wireframes.py about   (the case-study placements were hand-tuned after generation; re-running them would undo David\'s captions and moved beats)')
