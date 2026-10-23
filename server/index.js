// davidpuerto.com server — static dist/ + gated case studies + tiny API.
// Auth is a stateless HMAC-signed cookie: no session store, survives
// restarts/deploys, nothing to leak.
import { createDecipheriv, createHmac, createSign, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import express from 'express';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { contactEmail } from './contact-email.js';
import { beacon, visits, visitsConfigured } from './visits.js';

const {
  PORT = 3000,
  NODE_ENV,
  COOKIE_SECRET,
  PASSWORD_HASH,
  // the admin has its own password: the case-study one is shared with reviewers
  ADMIN_PASSWORD_HASH,
  GMAIL_USER,
  GMAIL_APP_PASSWORD,
  CONTACT_TO = 'me@davidpuerto.com',
} = process.env;

const isProd = NODE_ENV === 'production';
const dist = path.resolve(import.meta.dirname, '../dist');

// Fail fast — a misconfigured gate must never boot half-open.
for (const [key, val] of Object.entries({ COOKIE_SECRET, PASSWORD_HASH })) {
  if (!val) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
}

/* ---------- stateless signed auth cookie ---------- */
const MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days
const sign = (s) => createHmac('sha256', COOKIE_SECRET).update(s).digest('base64url');
const ADMIN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // a week
// kind keeps the two cookies apart: a case-study token never opens the admin
const makeToken = (kind = 'cs', maxAge = MAX_AGE) => {
  const exp = Date.now() + maxAge;
  return `${exp}.${sign(`${kind}.${exp}`)}`;
};
const isValidToken = (token, kind = 'cs') => {
  const [exp, sig] = String(token ?? '').split('.');
  if (!exp || !sig) return false;
  const want = Buffer.from(sign(`${kind}.${exp}`));
  const got = Buffer.from(sig);
  return got.length === want.length && timingSafeEqual(got, want) && Number(exp) > Date.now();
};
const getCookie = (req, name) =>
  req.headers.cookie
    ?.split('; ')
    .find((c) => c.startsWith(`${name}=`))
    ?.slice(name.length + 1);
const adminAuthed = (req) => isValidToken(getCookie(req, 'dp_admin'), 'admin');
// the admin password opens the case studies too
const authed = (req) => adminAuthed(req) || isValidToken(getCookie(req, 'cs_auth'));

/* ---------- tiny in-memory rate limiter ---------- */
const hits = new Map(); // key -> { n, reset }
// The client IP comes from DigitalOcean's edge header, which a visitor can't
// set; X-Forwarded-For's leftmost value is client-controlled and was spoofable.
const clientIp = (req) => req.get('do-connecting-ip') || req.socket.remoteAddress || 'unknown';
// everyone: one shared count for the whole site, for a botnet that rotates addresses
const rateLimit = (bucket, max, windowMs, { everyone = false } = {}) => (req, res, next) => {
  const key = `${bucket}:${everyone ? '*' : clientIp(req)}`;
  const now = Date.now();
  if (hits.size > 10_000) for (const [k, v] of hits) if (now > v.reset) hits.delete(k);
  const rec = hits.get(key);
  if (!rec || now > rec.reset) {
    hits.set(key, { n: 1, reset: now + windowMs });
    return next();
  }
  if (++rec.n > max) return res.status(429).json({ error: 'Too many requests' });
  next();
};

/* ---------- app ---------- */
const app = express();
// App Platform fronts apps with MULTIPLE proxy hops — trusting only one made
// req.ip a rotating edge IP and the rate limiter never accumulated.
app.set('trust proxy', true);
app.disable('x-powered-by'); // no "Express" banner telling scanners which exploits to try
app.use(express.json({ limit: '10kb' }));

// Path guard: no encoded slashes or backslashes, no dot-segments, no NULs,
// and a malformed escape is a 400, not a crash. Closes traversal like
// /assets/..%2Fcase-studies/... and /admin%2Findex.html before any gate or
// static handler sees the request.
app.use((req, res, next) => {
  const raw = req.originalUrl.split('?')[0];
  let decoded;
  try { decoded = decodeURIComponent(raw); } catch { return res.status(400).send('Bad request'); }
  if (/%2f|%5c|%00/i.test(raw) || decoded.includes('\\') || decoded.includes('\0') || decoded.split('/').some((seg) => seg === '..' || seg === '.')) {
    return res.status(400).send('Bad request');
  }
  next();
});

// Security headers (CSP allows the case studies' CodePen/YouTube/Dropbox embeds)
app.use((req, res, next) => {
  // /cursorlab runs on-device MediaPipe (WASM + workers) — needs a scoped relaxation.
  // Everything stays 'self': no CDN, no remote code. Rest of the site keeps the tight policy.
  const isCursorLab = req.path.startsWith('/cursorlab');
  const scriptSrc = isCursorLab
    ? "script-src 'self' 'wasm-unsafe-eval' blob:"
    : "script-src 'self' 'wasm-unsafe-eval' https://cpwebassets.codepen.io https://*.googletagmanager.com"; // wasm: the meshopt decoder behind the case studies' glass model
  const csp = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "frame-src 'self' https://codepen.io https://www.youtube.com https://www.youtube-nocookie.com",
    "img-src 'self' data: https://www.google.com https://*.google-analytics.com https://*.googletagmanager.com",
    "media-src 'self' blob: https://www.dropbox.com https://*.dropboxusercontent.com",
    "connect-src 'self' https://www.google.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ];
  if (isCursorLab) csp.push("worker-src 'self' blob:");
  res.set({
    'Content-Security-Policy': csp.join('; '),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  });
  // HTTPS only once it is served from the real domain (local runs stay on http)
  if (isProd) res.set('Strict-Transport-Security', 'max-age=31536000');
  // Camera is on-device for the a11y cursor; allow it only for this route.
  res.set('Permissions-Policy', isCursorLab ? 'camera=(self), microphone=(self)' : 'camera=(), microphone=(), geolocation=()');
  next();
});

// Cross-site guard, the same one unakin.com runs: a request that changes
// something must come from this site. An Origin naming another host, or a
// browser saying the fetch is cross-site, is refused. Scripts send neither and
// pass to the rate limits; this stops another page driving a visitor's browser.
app.use((req, res, next) => {
  if (/^(GET|HEAD|OPTIONS)$/.test(req.method)) return next();
  const origin = req.get('origin');
  let originHost = null;
  if (origin) { try { originHost = new URL(origin).host; } catch { originHost = '!'; } }
  // behind the proxy the public host may arrive as X-Forwarded-Host; either one is this site
  const ours = [req.get('x-forwarded-host'), req.get('host')].filter(Boolean).map((h) => h.split(',')[0].trim());
  if ((originHost && !ours.includes(originHost)) || req.get('sec-fetch-site') === 'cross-site') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
});

/* ---------- auth gate BEFORE static ---------- */
// the approach merged into About (2026-10-12); the old address forwards
app.get(['/approach', '/approach/'], (req, res) => res.redirect(301, '/about-me/#how-i-work'));

app.use('/case-studies', (req, res, next) => {
  // The rebuild study is public — the "how this site was built" story.
  if (req.path.startsWith('/rebuild')) return next();
  if (authed(req)) return next();
  res.redirect(`/login/?redirectTo=${encodeURIComponent(`/case-studies${req.url}`)}`);
});

// Case-study IMAGES are NDA content too — no cookie, no pixels.
// (403, not a redirect: these are <img> fetches, not navigations.)
app.use('/images/case-studies', (req, res, next) => {
  if (authed(req)) return next();
  res.status(403).json({ error: 'Forbidden' });
});

app.use('/admin', (req, res, next) => {
  if (adminAuthed(req)) return next();
  res.redirect(`/login/?redirectTo=${encodeURIComponent(`/admin${req.url}`)}`);
});

// Where a login lands: only the studies or the admin, a page that exists
// (no bare /case-studies/, no index.html), else the Microsoft study.
const safeRedirect = (to) => {
  if (typeof to !== 'string' || !/^\/(case-studies|admin)(\/|$|\?)/.test(to)) return '/case-studies/microsoft/';
  const tidy = to.replace(/\/index\.html(?=$|[?#])/, '/');
  return /^\/case-studies\/?(\?|$)/.test(tidy) ? '/case-studies/microsoft/' : tidy;
};

// Already signed in? The login page sends you straight on.
app.get(['/login', '/login/'], (req, res, next) => {
  const to = String(req.query.redirectTo ?? '');
  if (!to) return next();
  const ok = to.startsWith('/admin') ? adminAuthed(req) : authed(req);
  if (ok) return res.redirect(safeRedirect(to));
  next();
});

app.post('/api/login', rateLimit('login', 5, 15 * 60_000), async (req, res) => {
  const password = String(req.body?.password ?? '');
  const admin = Boolean(ADMIN_PASSWORD_HASH) && (await bcrypt.compare(password, ADMIN_PASSWORD_HASH));
  const ok = admin || (await bcrypt.compare(password, PASSWORD_HASH));
  if (!ok) return res.status(401).json({ success: false });
  // the shared password never opens the admin, whatever redirectTo asks for
  if (!admin && String(req.body?.redirectTo ?? '').startsWith('/admin')) return res.status(401).json({ success: false });
  if (admin) {
    res.cookie('dp_admin', makeToken('admin', ADMIN_MAX_AGE), {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      maxAge: ADMIN_MAX_AGE,
      path: '/',
    });
  }
  res.cookie('cs_auth', makeToken(), {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: MAX_AGE,
    path: '/',
  });
  res.json({ success: true, redirectTo: safeRedirect(req.body?.redirectTo) });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('cs_auth', { path: '/' });
  res.clearCookie('dp_admin', { path: '/' });
  res.json({ success: true });
});

app.get('/api/check-auth', (req, res) => res.json({ isAuthenticated: authed(req) }));

/* ---------- contact ----------
   Production (App Platform): outbound SMTP is BLOCKED by DO, so Gmail/
   Nodemailer can never connect there — use Resend's HTTPS API instead
   (set RESEND_API_KEY). Local dev: Nodemailer + Gmail app password works.
   Timeouts everywhere — a hung send must 502, never 504. */
const { RESEND_API_KEY, CONTACT_FROM = 'onboarding@resend.dev' } = process.env;

const mailer =
  !RESEND_API_KEY && GMAIL_USER && GMAIL_APP_PASSWORD
    ? nodemailer.createTransport({
        service: 'gmail',
        auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 10000,
      })
    : null;

async function sendContactEmail({ name, from, message, subject: subj }) {
  const { subject, text, html } = contactEmail({ name, from, message, subject: subj });

  if (RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: CONTACT_FROM,
        to: [CONTACT_TO],
        reply_to: from || undefined,
        subject,
        text,
        html,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`resend ${res.status}: ${await res.text()}`);
    return;
  }
  if (mailer) {
    await mailer.sendMail({ from: GMAIL_USER, to: CONTACT_TO, replyTo: from || undefined, subject, text, html });
    return;
  }
  const err = new Error('no email provider configured');
  err.unconfigured = true;
  throw err;
}

app.post('/api/contact', rateLimit('contact', 3, 60 * 60_000), rateLimit('contact', 20, 60 * 60_000, { everyone: true }), async (req, res) => {
  const body = req.body ?? {};
  const str = (v) => (typeof v === 'string' ? v : '');
  const name = str(body.name), from = str(body.from), message = str(body.message), company = body.company;
  if (company) return res.json({ success: true }); // honeypot: silently accept bots
  if (!message.trim() || message.length > 5000 || name.length > 200 || from.length > 200) {
    return res.status(400).json({ error: 'Invalid submission' });
  }
  try {
    await sendContactEmail({ name, from, message });
    res.json({ success: true });
  } catch (err) {
    if (err.unconfigured) {
      return res.status(503).json({ error: 'Contact temporarily unavailable' });
    }
    console.error('contact send failed:', err.message);
    res.status(502).json({ error: 'Send failed' });
  }
});

// Request access: from the login page, when someone wants a study and has no
// password. Same pipeline as the contact form; David replies with it.
const STUDY_NAMES = { microsoft: 'Microsoft · Preview Sites', apple: 'Apple · Project Studio', review: 'The review deck', facebook: 'Facebook', nordstrom: 'Nordstrom', sonosite: 'SonoSite', zillow: 'Zillow' };
app.post('/api/access-request', rateLimit('access', 3, 60 * 60_000), rateLimit('access', 20, 60 * 60_000, { everyone: true }), async (req, res) => {
  const body = req.body ?? {};
  const str = (v) => (typeof v === 'string' ? v.trim() : '');
  const name = str(body.name), from = str(body.from), note = str(body.note), study = str(body.study);
  if (body.company) return res.json({ success: true }); // honeypot
  if (!from.includes('@') || from.length > 200 || name.length > 200 || note.length > 1000) return res.status(400).json({ error: 'Invalid submission' });
  const label = STUDY_NAMES[study] ?? 'a case study';
  const message = `Asking for the password to ${label}.${note ? `\n\n${note}` : ''}\n\nFrom the login page. Reply with the password, or not.`;
  try {
    await sendContactEmail({ name, from, message, subject: `Access request: ${label}${name ? ` · ${name}` : ''}` });
    res.json({ success: true });
  } catch (err) {
    if (err.unconfigured) return res.status(503).json({ error: 'Temporarily unavailable' });
    console.error('access request failed:', err.message);
    res.status(502).json({ error: 'Send failed' });
  }
});

/* ---------- analytics: GA4 Data API proxy for /admin ----------
   ZERO dependencies on purpose: the Google service-account OAuth flow is a
   signed JWT swapped for a bearer token — node:crypto + fetch cover it.
   All three vars optional; without them the endpoint answers 503 and the
   rest of the site doesn't care. */
const { GA_PROPERTY_ID, GA_CLIENT_EMAIL, GA_PRIVATE_KEY } = process.env;
// App Platform env vars store literal \n in PEM keys — normalize.
const gaPrivateKey = GA_PRIVATE_KEY?.replace(/\\n/g, '\n');
const gaConfigured = Boolean(GA_PROPERTY_ID && GA_CLIENT_EMAIL && gaPrivateKey);

const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');

let gaToken = null; // { token, exp } — refreshed ~5 min before expiry
async function getGaToken() {
  if (gaToken && Date.now() < gaToken.exp) return gaToken.token;
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url({ alg: 'RS256', typ: 'JWT' })}.${b64url({
    iss: GA_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })}`;
  const signature = createSign('RSA-SHA256').update(unsigned).sign(gaPrivateKey, 'base64url');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}`,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`google token ${res.status}: ${await res.text()}`);
  const { access_token: token, expires_in: ttl } = await res.json();
  gaToken = { token, exp: Date.now() + (ttl - 300) * 1000 };
  return token;
}

// 10-minute cache per range — a personal dashboard must not burn GA quota.
const statsCache = new Map(); // range -> { data, exp }

// The visit log: beacons in, one story per visit out (server/visits.js).
// a notable visit (an employer's network, a tagged link, the password gate) emails David once per visit
const notify = ({ subject, message }) => sendContactEmail({ name: 'Visit log', from: '', message, subject }).catch((err) => console.error('visit alert failed:', err.message));
app.post('/api/v', rateLimit('visit', 240, 60_000), beacon(clientIp, notify));
app.get('/api/admin/visits', async (req, res) => {
  if (!adminAuthed(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (!visitsConfigured) return res.status(503).json({ error: 'Visit log not configured' });
  const days = ['1', '7', '28', '90'].includes(req.query.days) ? Number(req.query.days) : 7;
  try {
    res.json({ days, visits: await visits(days) });
  } catch (err) {
    console.error('visit log: read failed', err.message);
    res.status(502).json({ error: 'Could not read the visit log' });
  }
});

app.get('/api/admin/stats', async (req, res) => {
  if (!adminAuthed(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (!gaConfigured) return res.status(503).json({ error: 'Analytics not configured' });

  const range = ['7', '28', '90'].includes(req.query.range) ? Number(req.query.range) : 28;
  const cached = statsCache.get(range);
  if (cached && Date.now() < cached.exp) return res.json(cached.data);

  try {
    const token = await getGaToken();
    const dateRanges = [{ startDate: `${range}daysAgo`, endDate: 'today' }];
    const dims = (name) => [{ name }];
    const mets = (...names) => names.map((name) => ({ name }));
    const byMetric = (name) => [{ metric: { metricName: name }, desc: true }];

    // batchRunReports takes 5 reports per call — three calls in parallel
    // cover all 15 panels and still count as one cache fill per 10 minutes.
    const gaBatch = (requests) =>
      fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${GA_PROPERTY_ID}:batchRunReports`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ requests }),
          signal: AbortSignal.timeout(10_000),
        },
      ).then(async (r) => {
        if (!r.ok) throw new Error(`ga ${r.status}: ${await r.text()}`);
        return (await r.json()).reports ?? [];
      });

    const top = (name, metric = 'activeUsers') => ({
      dateRanges,
      dimensions: dims(name),
      metrics: mets(metric),
      orderBys: byMetric(metric),
      limit: '10',
    });

    const [batch1, batch2, batch3] = await Promise.all([
      gaBatch([
        {
          dateRanges,
          dimensions: dims('date'),
          metrics: mets('activeUsers', 'screenPageViews', 'engagementRate', 'averageSessionDuration'),
          orderBys: [{ dimension: { dimensionName: 'date' } }],
          // TOTAL row gives deduplicated users — summing daily activeUsers overcounts.
          metricAggregations: ['TOTAL'],
        },
        top('sessionSource', 'sessions'),
        top('pagePath', 'screenPageViews'),
        top('country'),
        { dateRanges, dimensions: dims('deviceCategory'), metrics: mets('activeUsers'), orderBys: byMetric('activeUsers') },
      ]),
      gaBatch([
        top('city'),
        top('browser'),
        top('operatingSystem'),
        top('sessionDefaultChannelGroup', 'sessions'),
        top('landingPage', 'sessions'),
      ]),
      gaBatch([
        top('pageReferrer'),
        { dateRanges, dimensions: dims('newVsReturning'), metrics: mets('activeUsers') },
        {
          dateRanges,
          dimensions: dims('hour'),
          metrics: mets('activeUsers'),
          orderBys: [{ dimension: { dimensionName: 'hour' } }],
        },
        top('screenResolution'),
        {
          // Only the events worth a panel — page_view/session_start noise stays out.
          dateRanges,
          dimensions: dims('eventName'),
          metrics: mets('eventCount'),
          orderBys: byMetric('eventCount'),
          dimensionFilter: {
            filter: {
              fieldName: 'eventName',
              inListFilter: { values: ['case_study_unlock', 'contact_submit', 'file_download'] },
            },
          },
        },
      ]),
    ]);

    const [daily, sources, pages, countries, devices] = batch1;
    const [cities, browsers, os, channels, landings] = batch2;
    const [referrers, visitorTypes, hours, screens, events] = batch3;
    const num = (v) => Number(v ?? 0);
    const list = (report) =>
      (report?.rows ?? []).map((r) => ({
        label: r.dimensionValues[0].value,
        value: num(r.metricValues[0].value),
      }));
    const totalRow = (i) => num(daily?.totals?.[0]?.metricValues?.[i]?.value);

    const data = {
      range,
      totals: {
        users: totalRow(0),
        pageviews: totalRow(1),
        engagementRate: totalRow(2), // 0..1 — client renders as %
        avgSessionDuration: totalRow(3), // seconds
      },
      timeline: (daily?.rows ?? []).map((r) => ({
        date: r.dimensionValues[0].value.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3'),
        users: num(r.metricValues[0].value),
        views: num(r.metricValues[1].value),
      })),
      sources: list(sources),
      pages: list(pages),
      countries: list(countries),
      devices: list(devices),
      cities: list(cities).filter((r) => r.label !== '(not set)'),
      browsers: list(browsers),
      os: list(os),
      channels: list(channels),
      landings: list(landings),
      // '' is a direct visit — already told by the channels panel.
      referrers: list(referrers).filter((r) => r.label !== ''),
      visitorTypes: list(visitorTypes).filter((r) => r.label !== '(not set)'),
      hours: list(hours),
      screens: list(screens),
      events: list(events),
    };

    statsCache.set(range, { data, exp: Date.now() + 10 * 60_000 });
    res.json(data);
  } catch (err) {
    console.error('analytics fetch failed:', err.message);
    res.status(502).json({ error: 'Analytics fetch failed' });
  }
});

/* ---------- analytics: who's on the site right now ----------
   The Realtime API has its own (generous) quota and ~seconds of latency.
   30s cache: the dashboard can poll without ever bothering Google much. */
let realtimeCache = null; // { data, exp }

app.get('/api/admin/realtime', async (req, res) => {
  if (!adminAuthed(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (!gaConfigured) return res.status(503).json({ error: 'Analytics not configured' });
  if (realtimeCache && Date.now() < realtimeCache.exp) return res.json(realtimeCache.data);

  try {
    const token = await getGaToken();
    const rt = (body) =>
      fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${GA_PROPERTY_ID}:runRealtimeReport`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ metrics: [{ name: 'activeUsers' }], limit: '5', ...body }),
          signal: AbortSignal.timeout(10_000),
        },
      ).then(async (r) => {
        if (!r.ok) throw new Error(`ga realtime ${r.status}: ${await r.text()}`);
        return r.json();
      });

    // Three tiny reports: a true deduplicated total, plus two breakdowns.
    const [total, byPage, byCity] = await Promise.all([
      rt({}),
      rt({ dimensions: [{ name: 'unifiedScreenName' }] }),
      rt({ dimensions: [{ name: 'city' }] }),
    ]);
    const rows = (r) =>
      (r.rows ?? []).map((row) => ({
        label: row.dimensionValues[0].value,
        value: Number(row.metricValues[0].value),
      }));

    const data = {
      activeUsers: Number(total.rows?.[0]?.metricValues?.[0]?.value ?? 0),
      pages: rows(byPage),
      cities: rows(byCity).filter((r) => r.label !== '(not set)'),
    };
    realtimeCache = { data, exp: Date.now() + 30_000 };
    res.json(data);
  } catch (err) {
    console.error('realtime fetch failed:', err.message);
    res.status(502).json({ error: 'Realtime fetch failed' });
  }
});

/* ---------- static: hashed assets immutable, HTML no-cache ----------
   No Last-Modified or ETag: the build stamps every file 1980-01-01, so both
   validators stay the same from one deploy to the next and a browser kept
   being told its old page was current, an old page whose hashed CSS and JS
   were gone, so it rendered unstyled. Pages are small; refetch them. */
app.use(
  express.static(dist, {
    extensions: ['html'],
    lastModified: false,
    etag: false,
    setHeaders(res, file) {
      if (file.includes(`${path.sep}assets${path.sep}`)) {
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (file.includes(`${path.sep}admin${path.sep}`) || (file.includes(`${path.sep}case-studies${path.sep}`) && !file.includes(`${path.sep}rebuild${path.sep}`) && file.endsWith('.html'))) {
        res.set('Cache-Control', 'private, no-store'); // gone from Back after a logout
      } else if (file.endsWith('.html')) {
        res.set('Cache-Control', 'no-cache');
      } else {
        res.set('Cache-Control', 'public, max-age=3600');
      }
    },
  }),
);

/* ---------- locked content: NDA case studies travel as ciphertext --------
   The public repo carries AES-256-GCM blobs (content-locked/, built by
   `npm run lock`); this layer decrypts them at request time for
   authenticated visitors. Runs AFTER static (locked store only serves
   misses) and BEFORE the 404. */
const CONTENT_KEY = process.env.CONTENT_KEY
  ? Buffer.from(process.env.CONTENT_KEY, 'base64')
  : null;
const lockedDir = path.resolve(import.meta.dirname, '../content-locked');
const lockedCache = new Map(); // relPath -> decrypted Buffer

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.mov': 'video/quicktime',
  '.mp4': 'video/mp4',
  '.vtt': 'text/vtt; charset=utf-8',
  '.woff2': 'font/woff2',
};

function serveLocked(relPath, res, cacheControl) {
  // Defense in depth: the resolved file must stay inside its own subfolder
  // of the locked store (assets/, images/case-studies/ or case-studies/).
  const resolved = path.resolve(lockedDir, `${relPath}.enc`);
  const allowed = ['assets', 'images/case-studies', 'case-studies'].some((dir) => resolved.startsWith(path.join(lockedDir, dir) + path.sep));
  if (!allowed) return false;
  if (!CONTENT_KEY) return false;
  let buf = lockedCache.get(relPath);
  if (!buf) {
    let enc;
    try {
      enc = readFileSync(path.join(lockedDir, `${relPath}.enc`));
    } catch {
      return false; // not in the locked store
    }
    const decipher = createDecipheriv('aes-256-gcm', CONTENT_KEY, enc.subarray(0, 12));
    decipher.setAuthTag(enc.subarray(12, 28));
    buf = Buffer.concat([decipher.update(enc.subarray(28)), decipher.final()]);
    lockedCache.set(relPath, buf);
  }
  res
    .type(TYPES[path.extname(relPath).toLowerCase()] ?? 'application/octet-stream')
    .set('Cache-Control', cacheControl)
    .send(buf);
  return true;
}

const GATED_STUDY = /^\/case-studies\/(apple|microsoft|facebook|nordstrom|sonosite|zillow|review)(\/|\/index\.html)?$/;

app.use((req, res, next) => {
  // Gated pages (auth was enforced upstream, but re-check — defense in depth)
  const m = req.path.match(GATED_STUDY);
  if (m && authed(req)) {
    if (!CONTENT_KEY) return res.status(503).send('Content channel not configured');
    // no-store: after a logout, Back must not bring an NDA page out of the browser's memory
    if (serveLocked(`case-studies/${m[1]}/index.html`, res, 'private, no-store')) return;
  }
  // Gated images (the /images/case-studies gate already 403'd unauthed)
  if (req.path.startsWith('/images/case-studies/') && authed(req)) {
    if (serveLocked(decodeURIComponent(req.path.slice(1)), res, 'private, max-age=3600')) return;
  }
  // Page-specific asset chunks absent from this build. Only the gated pages load
  // them, and the public repo lists every one by name, so they need the cookie
  // too. Hashed names never change, so the browser keeps them, privately.
  if (req.path.startsWith('/assets/') && authed(req)) {
    if (serveLocked(decodeURIComponent(req.path.slice(1)), res, 'private, max-age=31536000, immutable'))
      return;
  }
  next();
});

/* ---------- error capture: every path renders something intentional ---- */
// 404 — JSON for API consumers, the branded page for humans
app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  res.status(404).sendFile(path.join(dist, '404.html'));
});

// 4xx/5xx — malformed JSON bodies, unexpected throws, anything else
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.type === 'entity.parse.failed' ? 400 : (err.status ?? 500);
  if (status >= 500) console.error('server error:', err.stack ?? err.message);
  if (req.path.startsWith('/api/')) {
    return res.status(status).json({ error: status >= 500 ? 'Server error' : 'Bad request' });
  }
  res.status(status).sendFile(path.join(dist, '500.html'));
});

app.listen(PORT, () => console.log(`davidpuerto.com listening on :${PORT} (${NODE_ENV ?? 'dev'})`));
