// Analytics health: did Google Analytics record any real visits lately?
// The smoke test proves Google accepts a hit; this proves data is landing in
// the property the admin reads. Our own checks are labeled internal and
// dropped by GA's Internal Traffic filter, so whatever counts here is real.
//
//   node --env-file=.env tests/ga-health.mjs        (needs GA_PROPERTY_ID,
//   GA_CLIENT_EMAIL, GA_PRIVATE_KEY: the same read-only service account)
import { createSign } from 'node:crypto';

const DAYS = Number(process.env.GA_HEALTH_DAYS || 7);
const { GA_PROPERTY_ID, GA_CLIENT_EMAIL } = process.env;
const key = process.env.GA_PRIVATE_KEY?.replace(/\\n/g, '\n');
if (!GA_PROPERTY_ID || !GA_CLIENT_EMAIL || !key) {
  console.log('✖ GA credentials missing');
  process.exit(1);
}

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
  iss: GA_CLIENT_EMAIL,
  scope: 'https://www.googleapis.com/auth/analytics.readonly',
  aud: 'https://oauth2.googleapis.com/token',
  exp: now + 3600,
  iat: now,
})}`;
const token = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  body: new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: `${unsigned}.${createSign('RSA-SHA256').update(unsigned).sign(key, 'base64url')}`,
  }),
}).then((r) => r.json());
if (!token.access_token) {
  console.log('✖ Google refused the service account:', token.error_description || token.error);
  process.exit(1);
}

const report = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${GA_PROPERTY_ID}:runReport`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token.access_token}` },
  body: JSON.stringify({
    dateRanges: [{ startDate: `${DAYS}daysAgo`, endDate: 'today' }],
    metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
  }),
}).then((r) => r.json());
if (report.error) {
  console.log('✖ GA report failed:', report.error.message);
  process.exit(1);
}

const [users = 0, views = 0] = report.rows?.[0]?.metricValues.map((v) => Number(v.value)) ?? [];
// standard reports trail by a day or two; the last 30 minutes count too
const live = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${GA_PROPERTY_ID}:runRealtimeReport`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token.access_token}` },
  body: JSON.stringify({ metrics: [{ name: 'screenPageViews' }] }),
}).then((r) => r.json());
const liveViews = Number(live.rows?.[0]?.metricValues[0].value ?? 0);
console.log(`GA, last ${DAYS} days: ${users} visitors, ${views} pageviews; last 30 minutes: ${liveViews} pageviews`);
if (!views && !liveViews) {
  console.log(`✖ no pageviews recorded in ${DAYS} days: collection may be broken`);
  process.exit(1);
}
console.log('  ✔ analytics is collecting');
