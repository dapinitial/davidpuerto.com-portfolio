// davidpuerto.com server — static dist/ + gated case studies + tiny API.
// Auth is a stateless HMAC-signed cookie: no session store, survives
// restarts/deploys, nothing to leak.
import { createDecipheriv, createHmac, createSign, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import express from 'express';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';

const {
  PORT = 3000,
  NODE_ENV,
  COOKIE_SECRET,
  PASSWORD_HASH,
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
const makeToken = () => {
  const exp = Date.now() + MAX_AGE;
  return `${exp}.${sign(`cs.${exp}`)}`;
};
const isValidToken = (token) => {
  const [exp, sig] = String(token ?? '').split('.');
  if (!exp || !sig) return false;
  const want = Buffer.from(sign(`cs.${exp}`));
  const got = Buffer.from(sig);
  return got.length === want.length && timingSafeEqual(got, want) && Number(exp) > Date.now();
};
const getCookie = (req, name) =>
  req.headers.cookie
    ?.split('; ')
    .find((c) => c.startsWith(`${name}=`))
    ?.slice(name.length + 1);
const authed = (req) => isValidToken(getCookie(req, 'cs_auth'));

/* ---------- tiny in-memory rate limiter ---------- */
const hits = new Map(); // key -> { n, reset }
const rateLimit = (max, windowMs) => (req, res, next) => {
  const key = `${req.path}:${req.ip}`;
  const now = Date.now();
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
app.use(express.json({ limit: '10kb' }));

// Security headers (CSP allows the case studies' CodePen/YouTube/Dropbox embeds)
app.use((req, res, next) => {
  res.set({
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' https://cpwebassets.codepen.io https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self'",
      "frame-src 'self' https://codepen.io https://www.youtube.com https://www.youtube-nocookie.com",
      "img-src 'self' data: https://www.google-analytics.com",
      "media-src 'self' https://www.dropbox.com https://*.dropboxusercontent.com",
      "connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://www.googletagmanager.com",
    ].join('; '),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  });
  next();
});

/* ---------- auth gate BEFORE static ---------- */
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
  if (authed(req)) return next();
  res.redirect(`/login/?redirectTo=${encodeURIComponent(`/admin${req.url}`)}`);
});

const safeRedirect = (to) =>
  typeof to === 'string' && (to.startsWith('/case-studies') || to.startsWith('/admin'))
    ? to
    : '/case-studies/microsoft/';

app.post('/api/login', rateLimit(5, 15 * 60_000), async (req, res) => {
  const ok = await bcrypt.compare(String(req.body?.password ?? ''), PASSWORD_HASH);
  if (!ok) return res.status(401).json({ success: false });
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

async function sendContactEmail({ name, from, message }) {
  const subject = `[davidpuerto.com] ${name || 'Contact form'}`.slice(0, 120);
  const text = `From: ${name} <${from}>\n\n${message}`;

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
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`resend ${res.status}: ${await res.text()}`);
    return;
  }
  if (mailer) {
    await mailer.sendMail({ from: GMAIL_USER, to: CONTACT_TO, replyTo: from || undefined, subject, text });
    return;
  }
  const err = new Error('no email provider configured');
  err.unconfigured = true;
  throw err;
}

app.post('/api/contact', rateLimit(3, 60 * 60_000), async (req, res) => {
  const { name = '', from = '', message = '', company } = req.body ?? {};
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

app.get('/api/admin/stats', async (req, res) => {
  if (!authed(req)) return res.status(401).json({ error: 'Unauthorized' });
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

    // One HTTP call: batchRunReports takes up to 5 reports — exactly what we need.
    const gaRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${GA_PROPERTY_ID}:batchRunReports`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [
            {
              dateRanges,
              dimensions: dims('date'),
              metrics: mets('activeUsers', 'screenPageViews'),
              orderBys: [{ dimension: { dimensionName: 'date' } }],
              // TOTAL row gives deduplicated users — summing daily activeUsers overcounts.
              metricAggregations: ['TOTAL'],
            },
            { dateRanges, dimensions: dims('sessionSource'), metrics: mets('sessions'), orderBys: byMetric('sessions'), limit: '10' },
            { dateRanges, dimensions: dims('pagePath'), metrics: mets('screenPageViews'), orderBys: byMetric('screenPageViews'), limit: '10' },
            { dateRanges, dimensions: dims('country'), metrics: mets('activeUsers'), orderBys: byMetric('activeUsers'), limit: '10' },
            { dateRanges, dimensions: dims('deviceCategory'), metrics: mets('activeUsers'), orderBys: byMetric('activeUsers') },
          ],
        }),
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!gaRes.ok) throw new Error(`ga ${gaRes.status}: ${await gaRes.text()}`);

    const { reports = [] } = await gaRes.json();
    const [daily, sources, pages, countries, devices] = reports;
    const num = (v) => Number(v ?? 0);
    const list = (report) =>
      (report?.rows ?? []).map((r) => ({
        label: r.dimensionValues[0].value,
        value: num(r.metricValues[0].value),
      }));

    const data = {
      range,
      totals: {
        users: num(daily?.totals?.[0]?.metricValues?.[0]?.value),
        pageviews: num(daily?.totals?.[0]?.metricValues?.[1]?.value),
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
    };

    statsCache.set(range, { data, exp: Date.now() + 10 * 60_000 });
    res.json(data);
  } catch (err) {
    console.error('analytics fetch failed:', err.message);
    res.status(502).json({ error: 'Analytics fetch failed' });
  }
});

/* ---------- static: hashed assets immutable, HTML no-cache ---------- */
app.use(
  express.static(dist, {
    extensions: ['html'],
    setHeaders(res, file) {
      if (file.includes(`${path.sep}assets${path.sep}`)) {
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
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
  '.woff2': 'font/woff2',
};

function serveLocked(relPath, res, cacheControl) {
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

const GATED_STUDY = /^\/case-studies\/(microsoft|facebook|nordstrom|sonosite|zillow)\/?$/;

app.use((req, res, next) => {
  // Gated pages (auth was enforced upstream, but re-check — defense in depth)
  const m = req.path.match(GATED_STUDY);
  if (m && authed(req)) {
    if (!CONTENT_KEY) return res.status(503).send('Content channel not configured');
    if (serveLocked(`case-studies/${m[1]}/index.html`, res, 'no-cache')) return;
  }
  // Gated images (the /images/case-studies gate already 403'd unauthed)
  if (req.path.startsWith('/images/case-studies/') && authed(req)) {
    if (serveLocked(decodeURIComponent(req.path.slice(1)), res, 'private, max-age=3600')) return;
  }
  // Page-specific asset chunks absent from this build (hashed: safe to cache)
  if (req.path.startsWith('/assets/')) {
    if (serveLocked(decodeURIComponent(req.path.slice(1)), res, 'public, max-age=31536000, immutable'))
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
