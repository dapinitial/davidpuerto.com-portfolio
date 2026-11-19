# davidpuerto.com: admin, CMS and security

A factual brief for the case study "Portals, admin and security, across every domain."
Everything here is what the code and config in this repo do today, checked against the source
on 2026-11-19. Anything planned is marked PLANNED. A figure that isn't in the repo is marked
"not measured".

**Status of the admin's second step:** the passkey, authenticator and recovery codes described
below are built and tested on the `admin-second-factor` branch. They go live when that branch is
merged and the one-time setup is done. Until then, the live admin is password only.

## 1. What it is

davidpuerto.com is my portfolio. It has password-gated case studies, a private `/admin` that
shows who visited and what they read, and an in-browser copy editor that only runs on my
machine.

- **The public** read the home page, About, résumé, contact and the public "rebuild" study.
- **Reviewers and recruiters** get a shared password to the gated case studies.
- **Only I** can open `/admin`, with a separate password and a second step (a passkey, or an authenticator or recovery code).
- **Only I** can use the copy editor, and only on localhost.

There are no crew, client or tester accounts.

## 2. Stack, and why

| Piece | Choice | Why |
|---|---|---|
| Front end | Plain HTML, CSS and JS built by Vite; GSAP and three.js for motion | No framework runtime, so pages stay small and fast. Vite gives hashed assets and a dev server I can extend with plugins (the editor, the dev auth gate). |
| Server | Express 4 on Node 22 (`server/index.js`, about 700 lines) | One small process does the gate, the API, the security headers and static files. No framework magic to audit. |
| Host | DigitalOcean App Platform, one always-on instance, built from a layered Dockerfile | Push to `main` deploys (`deploy_on_push`). Layers mean a deploy re-sends only what changed. Runs as the unprivileged `node` user. |
| Visit log | Supabase Postgres, one `hits` table | A real database for my own first-party log, read through PostgREST with a server-only key. |
| Page analytics | Google Analytics 4, read back through the GA4 Data API | Read in the admin with a signed service-account JWT using only `node:crypto` and `fetch`, so there's no Google SDK dependency. |
| Email | Resend's HTTPS API in production, Gmail through Nodemailer locally | DigitalOcean blocks outbound SMTP, so production has to send over HTTPS. |
| Auth | Two bcrypt password hashes, plus stateless HMAC-signed cookies | Nothing to store server-side: a cookie is `expiry.signature`, checked with `timingSafeEqual`. |
| Admin second step | A passkey (WebAuthn, through `@simplewebauthn/server`), with an authenticator code (TOTP, written with `node:crypto`) and ten recovery codes as the fallbacks | A stolen admin password alone opens nothing. A passkey can't be phished, because it's bound to the domain. The authenticator works from any device. The recovery codes cover losing both. |
| NDA content | AES-256-GCM ciphertext in the public repo, decrypted at request time | The repo is public, but the gated studies travel only as ciphertext. The key lives only in the host's secrets. |

The case studies stay one shared password: they're for reviewers, not accounts. Spacelab Lock
appears as a playful puzzle on the 401, 403, 404 and 500 pages. It is not part of auth.

## 3. Admin: each screen

**Signing in.**

- **The login card:** After the admin password, the same card turns into "One more step". It
  has a **Use passkey** button (Touch ID or Face ID) and a code field that takes either the
  authenticator's six digits or a recovery code. After a recovery code it says how many are
  left.
- **One-time setup (`/login/setup/`):** Reached only from the admin password, and only while
  nothing is enrolled. It has three steps:
  1. Make a passkey.
  2. Scan a QR code (or type the setup key), then type the first code to prove the
     authenticator works.
  3. See the ten recovery codes, shown this once, with a copy button.

  Nothing is saved until the last step passes. After that the page says it's closed. This page
  loads no analytics.

**The dashboard.** The admin is `/admin`. It has a date-range switcher (7, 28 or 90 days)
and six tabs:

- **Overview:** Users, page views, engagement rate and average session length, all from GA4.
  Also a daily chart, the top pages and the top sources. A live "on the site right now" count by
  page and city comes from the GA4 Realtime API, cached for 30 seconds.
- **Visits:** My own visit log, told as one story per visit.
  - **Filters:** Notable, People or Everything.
  - **Day headings:** Visits are grouped by day in Central time (Today, Yesterday, then the
    date). Each heading shows how many visits and how many people.
  - **Each visit card** shows the time, the network and country, and the device and browser.
    It also has a plain-English "read as" line. For example: "saw 12 of 39 slides", "tried a
    wrong password", "left for linkedin.com", or where the reader stayed longest.
  - **Tagged links:** A **Make a tagged link** form builds a `?ref=` link for one person, so a
    visit can be tied to the person I sent it to.
- **Audience:** Countries, cities, new vs. returning visitors, and devices.
- **Acquisition:** Channels, all sources, referrers and landing pages.
- **Content:** All pages, plus three events: case-study unlocks, contact sends and file
  downloads.
- **Tech:** Browsers, operating systems and screen sizes.

The admin only reads. It can't change content, users or settings.

## 4. Analytics

There are two records, and the Privacy page describes both.

**GA4 (Google).**

- **Records:** Pages, sources, channels, referrers, landing pages, countries, cities, devices,
  browsers, OS, screen sizes, hour of day, new vs. returning, and the three events above.
- **Storage and retention:** Stored at Google. How long Google keeps it is set in the GA
  property, not in this repo: not measured here.
- **Opt-out:** The script never loads when the browser sends Do Not Track or Global Privacy
  Control.

**The visit log (mine, `server/visits.js`).**

- **How it records:** Small beacons go to `POST /api/v`. Each row has:
  - the time, the event and the path
  - a small detail object (scroll depth, slide number and heading, video progress, outbound
    host)
  - a `?ref=` tag
  - the referrer
  - the IP, network owner, ASN and country
  - device, browser, OS and screen size
- **Network lookup:** The network's owner comes from a public IP-to-ASN table held in memory.
  So no visitor's address is ever sent to a lookup service.
- **Sessions:** A session is a one-way hash of a server secret, the day, the IP and the
  browser string. Nothing is stored in the visitor's browser.
- **Bots vs. people:** Each visit is labeled `real`, `cloud`, `bot`, `preview` or `test`.
  - `bot`: the browser string, a webdriver flag or a 404.
  - `preview`: a link unfurler.
  - `cloud`: a hosting network.
  - The strongest label wins for the whole visit. One stray 404 from a real reader doesn't
    turn them into a bot.
- **Funnel:** Landing page → password gate → unlock (or wrong tries) → slides seen → contact.
  The visit story shows each step. There's no click-through or sell-through math; nothing is
  sold.
- **Storage and retention:** Stored in Supabase. The Privacy page and the code comment both say
  a scheduled database job clears the IP after 365 days and keeps the network's name. That job
  lives in the database, not in this repo.
- **Admin sign-in:** Every pass and failure of the admin's second step, each lockout and the
  one-time setup are written by the server itself. These lines ignore Do Not Track, because
  they are the security record of someone holding the admin password, and the Privacy page
  says so. They record the method (passkey, code or recovery) and the reason it failed, never
  what was typed.
- **Never recorded:**
  - what anyone types in the password box or the code field (a wrong try writes only that it
    failed)
  - form contents (the contact message is emailed, not stored)
  - anything from a browser sending Do Not Track or GPC (the client skips it and the server
    drops it)
  - my own `/admin` page views
- **Read limit:** The admin reads up to 20,000 rows per range, newest first.

## 5. Failure watching

What's in this repo:

- **CI on every push and PR** (`.github/workflows/ci.yml`):
  - builds the site
  - runs `npm test`: 29 tests. That's the server contract tests, plus the admin's second step
    end to end against a software passkey: wrong code, replayed code, expired challenge,
    lockout, recovery codes, and cookies only after both factors.
  - runs a Playwright smoke test against a local production server. It fails on console
    errors, CSP violations, broken images or scripts, or a GA4 hit Google rejects.
- **Nightly live check** (`nightly.yml`, 13:00 UTC):
  - runs the same smoke test against the live site
  - checks that GA4 is still recording visits
  - a failure shows up as a failed GitHub Actions run
- **Health check:** DigitalOcean polls `/api/check-auth`.
- **Fail-fast boot:** The server exits at boot if `COOKIE_SECRET` or `PASSWORD_HASH` is missing,
  so a misconfigured gate never boots half-open.
- **Email failures:** Every outbound call has a timeout, so a hung email send returns 502, not
  a gateway timeout. Failed sends and failed log inserts are written to the app's console log.
- **Notable-visit emails:** I get an email the moment a visit earns one. Reasons include:
  - a visit from a listed employer's network
  - a failed admin second step, a lockout, or the setup being done (from any network, bots
    included, since it means someone has the admin password)
  - a tagged link opened
  - someone reaching the password gate (and which study they wanted)
  - an access request or a contact send

  It's one email per visit, at most ten an hour. An alert only goes out after the row is
  saved, so a steady flow of alerts also shows the log is working.

Outside this repo: deploy status and rollback go through Shipmate (CLAUDE.md: "roll back
davidpuerto.com-portfolio, confirm"). Shipmate's sentinel and the 7:30 briefing live in the
shipmate repo; how they cover this site isn't defined here. Slow-page alerting: not measured,
and none exists here.

## 6. Security

**Who can reach the admin.**

- **Separate passwords:** The admin has its own bcrypt hash (`ADMIN_PASSWORD_HASH`). The shared
  case-study password can never open it: a login with the shared password and an `/admin`
  redirect gets a 401.
- **Two factors:** The admin password is only the first factor. It gets a `dp_second` cookie
  and nothing else: no admin cookie, not even the case studies.
  - **The cookie:** Signed, httpOnly, SameSite=Strict, ten minutes.
  - **The second step:** A passkey, with user verification required, or an authenticator code,
    or a recovery code. Only then are the two cookies below issued, unchanged from before.
- **Sign-in in progress:**
  - **Single use:** It lives in server memory and ends when the second step passes, after five
    failures (a lockout: start again with the password), or after ten minutes.
  - **Challenges:** Each passkey challenge is single use and expires after two minutes.
- **Replays refused:**
  - **Authenticator codes:** A code works once. The last time step used is stored, and the
    claim is a conditional database update, so two requests with the same code can't both win.
  - **Passkeys:** A passkey answer whose signature counter goes backward is refused, the way a
    cloned key would be.
- **No fallback to one factor:** Without the factor key or the factor table, the admin password
  answers 503.
- **Setup:** The setup opens only while nothing is enrolled. Starting it over means deleting the
  rows in Supabase by hand.
- **Admin cookie:** `dp_admin` is httpOnly, Secure in production, SameSite=Strict and lasts 7
  days.
- **Case-study cookie:** `cs_auth` is SameSite=Lax and lasts 30 days. Each cookie is signed with
  its kind, so a case-study token can't pass as an admin one.
- **Admin data routes:** Every `/api/admin/*` route checks the admin cookie itself and returns
  401 without it.
- **Admin pages:** Served `private, no-store`, so Back after a logout shows nothing.
- **Redirects:** After login, a redirect may only go to `/case-studies/…` or `/admin`.

**Headers (every response).**

- **CSP:** `default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`,
  `frame-ancestors 'self'`. Scripts load only from self, CodePen's assets and Google Tag
  Manager; frames only from CodePen and YouTube.
- **The rest:** `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`,
  `Referrer-Policy: strict-origin-when-cross-origin`, and HSTS in production. Camera,
  microphone and geolocation are off everywhere except the on-device cursor lab. The
  `X-Powered-By` header is removed.

**Request guards.**

- **Path guard:** Returns 400 for encoded slashes or backslashes, doubled slashes, dot
  segments, NULs and malformed escapes. This runs before any gate.
- **Cross-site guard:** Refuses any POST whose Origin names another host or that the browser
  marks cross-site.
- **Real client address:** Taken from DigitalOcean's edge header, which a visitor can't set,
  never from the spoofable `X-Forwarded-For`.
- **Body limit:** JSON bodies are capped at 10 KB.

**Rate limits (in memory, per address, plus a site-wide cap for botnets that rotate
addresses).**

| Route | Limit |
|---|---|
| Login | 5 per 15 minutes per address; 100 per 15 minutes site-wide (bcrypt is the costliest thing the server does) |
| Contact | 3 an hour per address; 20 an hour site-wide |
| Access request | 3 an hour per address; 20 an hour site-wide |
| Admin second step (code, passkey, setup) | 5 per 15 minutes per address; 100 per 15 minutes site-wide, the same as the password |
| Asking for a passkey challenge or the setup | 20 per 15 minutes per address, counted apart so it can't spend the tries |
| Visit beacon | 240 a minute per address |

**Bot gates on forms.** A honeypot field on contact and access request: a bot that fills it
gets a success reply, and nothing is sent. Lengths are checked on every field.

**The blocklist.** A fleet-wide list of known-bad ranges, built in and re-read hourly from the
shared site-hardening repo. A POST from a blocked range gets the success shape and nothing
happens, so the bot learns nothing. Pages still render for a real reader behind a rented proxy.

**Forensic log.** The visit log doubles as the forensic record: network, ASN, country, browser
string and every step. That includes wrong password tries and every pass, failure and lockout of
the admin's second step, never what was typed.

**Secrets.**

- All secrets are encrypted DigitalOcean app secrets, scoped to runtime: the cookie secret, both
  password hashes, the content key, the factor key, the Resend, Supabase and GA keys.
- **The admin's factors** live in an `admin_factors` table in the visit log's Supabase project:
  - Row level security is on with no policies, so only the server's secret key reaches it.
  - **Passkeys:** only the public key, credential id and counter. The private key never leaves
    the device.
  - **Authenticator secret:** AES-256-GCM ciphertext under `ADMIN_FACTOR_KEY`.
  - **Recovery codes:** HMAC-SHA256 hashes under the same key.
  - **Key changes:** `npm run admin:factor-key` sets the key without printing it and refuses
    to replace one that's already set.
  - **In the repo:** only the schema (`server/sql/admin_factors.sql`).
- None are in the repo. Passwords are stored only as bcrypt hashes, set with
  `npm run admin:password` and `npm run cs:password`.
- The NDA case studies, their images and their page-only scripts are AES-256-GCM ciphertext.
  They're decrypted only for a signed-in request, and only from inside the locked folder.
- CI checks out the repo without the locked images.

**From the shared site-hardening kit:** the blocklist and its shared JSON, the cross-site guard
(the same one unakin.com runs), the real-client-address rule, the per-address plus site-wide
rate-limit pattern, and the honeypot form gate. This site predates `shield.mjs`, so the same
rules are written inline in `server/index.js` rather than imported.

PLANNED: switching the CSP to enforce new rules from a report, and two-factor sign-in on the
accounts around the site (GitHub, DigitalOcean, Supabase, Google). The admin's own second step
is built (see the status note at the top).

## 7. Editing

**The in-browser CMS (`tools/edit-in-place.mjs`).**

- **How:** Cmd + double-click any line of text on any page in the dev server, edit it where it
  sits, and use the format bar on a selection. **Save** writes the change straight into the
  source HTML, gated decks and speaker notes included. **Publish** runs the content lock,
  commits and pushes to `main`, which deploys.
- **Localhost only, and why:**
  - The Vite plugin is `apply: 'serve'`, so it never exists in a build.
  - No built page references its client script.
  - The gated studies sit unencrypted only on my machine, so writing to them has to happen
    there.
  - Production has no write path at all: there's no CMS login on the live site to attack.
- **Voice log:** Every saved edit is also appended to `voice/edits.jsonl`. My own rewrites train
  the voice skill the agents use for new copy.

**Shipmate by voice:** Shipmate deploys, reports status and rolls back. CLAUDE.md names the
app and the rollback phrase.

**Commits:** Straight to `main` is the convention here: one commit per piece of work, staged by
path, with a full-sentence message that says what changed and why. There are no people's names
or internal codenames in commits or tracked text, since the repo is public. PRs run CI, but day
to day they aren't used.

## 8. Release pipeline

There's no app store side. The web pipeline:

1. **Edit:** with the in-place editor, or in code.
2. **Lock:** `npm run lock` builds the site and re-encrypts the gated studies into
   `content-locked/`.
3. **Test locally:** `npm test` (the server contract tests and the second-step tests) and
   `npm run test:smoke`.
4. **Push:** to `main`. GitHub CI runs the build, the contract tests and the smoke test.
5. **Deploy:** DigitalOcean builds the Dockerfile and deploys on the same push.
6. **Check:** the nightly live check re-tests the real site every day.
7. **Rollback:** through Shipmate, or by redeploying the previous deployment in DigitalOcean.

Deploy time: not measured in this repo.

## 9. Data for decisions

- **Outreach:**
  - The Visits tab and the notable-visit emails tell me which companies' networks are reading,
    which study they wanted and how far they got.
  - Tagged links tie a visit to the person I sent it to.
  - That decides who I follow up with and when.
  - There's no CRM integration in this repo; the follow-up is by hand.
- **Design changes:**
  - Slide counts and "stayed longest on" show where readers stop in a deck, and that drives
    which slides get groomed.
  - Wrong-try counts show whether the gate is confusing.
  - Scroll depth and outbound links show what the home page sends people to.
- **Spending:** Not driven by these numbers. The host is one small instance, and no cost
  figures live in this repo.

## 10. Three screens worth filming

1. **Visits tab, a single visit story.**
   - What to show: the day heading, a card that reads "on a company's network → reached the
     password gate → unlocked → saw 24 of 39 slides, stayed longest on slide 9 → sent the
     contact form", then the tagged-link maker copying a `?ref=` link.
   - Seed: a fake Supabase project or a stubbed `/api/admin/visits` (the local Playwright stub
     pattern already used for testing). Give it made-up networks (Example Corp, a residential
     ISP), made-up tags and documentation IPs (203.0.113.x).
   - Blur: never film real rows. Real networks, IPs and tags are visitors' data.
2. **Edit in place.**
   - What to show: Cmd + double-click a headline on the home page in the dev server, retype it,
     and Save, with the file changing in the editor beside it.
   - Seed: use a public page only. Don't open a gated study on camera, because its plaintext is
     NDA.
   - Blur: the terminal and git log if they show anything beyond the one edit. Don't press
     Publish on camera.
3. **The admin's two steps.**
   - What to show: the admin password turns the card into "One more step", and Touch ID on
     **Use passkey** lands on the admin. Then a wrong code, the same code twice ("already
     used"), and the visit log's line for each. The shared password with `/admin` is refused,
     and DevTools shows no admin cookie until the second step passes.
   - Seed: a local production run with `ADMIN_FACTOR_STORE=memory`, a throwaway
     `ADMIN_PASSWORD_HASH` and `ADMIN_FACTOR_KEY` made for the shoot. Enrol a passkey made for
     the shoot, and delete it from the device afterwards.
   - Blur: never film the real setup page. Its QR code, setup key and recovery codes are the
     factors themselves. Also blur cookie values in DevTools.

## 11. One thing that went wrong

Visit-alert emails kept arriving, but the admin didn't show the visits they pointed to.

Supabase's API answers at most 1,000 rows a request, whatever the `limit` asks for. The admin
read oldest first, so once the 28-day range passed 1,000 rows, the newest visits quietly fell
off the end. The fix (commit 545f41d) reads newest first, a page at a time, up to 20,000 rows.
Now a busy range drops its oldest visits, never today's.

What it taught: a cap you didn't set still applies. When two views of the same data disagree
(the email vs. the dashboard), trust the one closer to the write and go find the limit.
