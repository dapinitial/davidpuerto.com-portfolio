// davidpuerto.com server — static dist/ + gated case studies + tiny API.
// Auth is a stateless HMAC-signed cookie: no session store, survives
// restarts/deploys, nothing to leak.
import { createHmac, timingSafeEqual } from 'node:crypto';
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
app.set('trust proxy', 1); // App Platform load balancer
app.use(express.json({ limit: '10kb' }));

// Security headers (CSP allows the case studies' CodePen/YouTube/Dropbox embeds)
app.use((req, res, next) => {
  res.set({
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' https://cpwebassets.codepen.io",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self'",
      "frame-src 'self' https://codepen.io https://www.youtube.com https://www.youtube-nocookie.com",
      "img-src 'self' data:",
      "media-src 'self' https://www.dropbox.com https://*.dropboxusercontent.com",
      "connect-src 'self'",
    ].join('; '),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  });
  next();
});

/* ---------- auth gate BEFORE static ---------- */
app.use('/case-studies', (req, res, next) => {
  if (authed(req)) return next();
  res.redirect(`/login/?redirectTo=${encodeURIComponent(`/case-studies${req.url}`)}`);
});

const safeRedirect = (to) =>
  typeof to === 'string' && to.startsWith('/case-studies') ? to : '/case-studies/microsoft/';

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

/* ---------- contact (Nodemailer + Gmail app password) ---------- */
const mailer =
  GMAIL_USER && GMAIL_APP_PASSWORD
    ? nodemailer.createTransport({
        service: 'gmail',
        auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
      })
    : null;

app.post('/api/contact', rateLimit(3, 60 * 60_000), async (req, res) => {
  const { name = '', from = '', message = '', company } = req.body ?? {};
  if (company) return res.json({ success: true }); // honeypot: silently accept bots
  if (!message.trim() || message.length > 5000 || name.length > 200 || from.length > 200) {
    return res.status(400).json({ error: 'Invalid submission' });
  }
  if (!mailer) return res.status(503).json({ error: 'Contact temporarily unavailable' });
  try {
    await mailer.sendMail({
      from: GMAIL_USER,
      to: CONTACT_TO,
      replyTo: from || undefined,
      subject: `[davidpuerto.com] ${name || 'Contact form'}`.slice(0, 120),
      text: `From: ${name} <${from}>\n\n${message}`,
    });
    res.json({ success: true });
  } catch (err) {
    console.error('contact send failed:', err.message);
    res.status(502).json({ error: 'Send failed' });
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

app.use((req, res) => res.status(404).sendFile(path.join(dist, '404.html')));

app.listen(PORT, () => console.log(`davidpuerto.com listening on :${PORT} (${NODE_ENV ?? 'dev'})`));
