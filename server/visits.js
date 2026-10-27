// The visit log: what each visit did, and which network it came from.
//
// The browser sends small beacons to POST /api/v (see site/js/lib/analytics.js).
// Here each one is labeled (real, bot, preview, test, cloud), tied to a session
// that is a one-way hash of address + browser + day, and written to Supabase.
// The network's owner comes from a public IP-to-ASN table held in memory, so
// no visitor's address is ever sent to a lookup service. Supabase clears the
// address itself after 365 days (a pg_cron job); the network's name stays.
//
// Env: VISITS_URL (https://<ref>.supabase.co) and VISITS_KEY (the secret key).
// Without them the beacon is accepted and dropped, and the admin says so.
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { isIP } from 'node:net';

const { VISITS_URL, VISITS_KEY, COOKIE_SECRET = '' } = process.env;
export const visitsConfigured = Boolean(VISITS_URL && VISITS_KEY);

/* ---------- who owns an address: iptoasn.com's public table ---------- */
// Rows are [start, end, asn, country, owner], sorted by start. v4 as numbers,
// v6 as 32-char hex strings, so both search the same way.
let v4 = [];
let v6 = [];
const v4num = (ip) => ip.split('.').reduce((n, o) => n * 256 + Number(o), 0);
const v6hex = (ip) => {
  let [head, tail = ''] = ip.split('::');
  const h = head ? head.split(':') : [];
  const t = tail ? tail.split(':') : [];
  if (!ip.includes('::')) return h.map((x) => x.padStart(4, '0')).join('');
  const fill = Array(8 - h.length - t.length).fill('0');
  return [...h, ...fill, ...t].map((x) => x.padStart(4, '0')).join('');
};
async function loadTable(url, parse) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  const text = gunzipSync(Buffer.from(await res.arrayBuffer())).toString();
  const rows = [];
  for (const line of text.split('\n')) {
    const [a, b, asn, country, owner] = line.split('\t');
    if (!owner || asn === '0') continue;
    rows.push([parse(a), parse(b), Number(asn), country, owner]);
  }
  return rows;
}
async function refreshNetworks() {
  try {
    v4 = await loadTable('https://iptoasn.com/data/ip2asn-v4.tsv.gz', v4num);
    v6 = await loadTable('https://iptoasn.com/data/ip2asn-v6.tsv.gz', v6hex);
    console.log(`visit log: network table loaded (${v4.length} v4, ${v6.length} v6 ranges)`);
  } catch (err) {
    console.error('visit log: network table failed to load', err.message);
  }
}
if (visitsConfigured) {
  refreshNetworks();
  setInterval(refreshNetworks, 24 * 60 * 60 * 1000).unref();
}
function network(ip) {
  const kind = isIP(ip);
  const rows = kind === 4 ? v4 : kind === 6 ? v6 : null;
  if (!rows?.length) return {};
  const key = kind === 4 ? v4num(ip) : v6hex(ip);
  let lo = 0;
  let hi = rows.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (rows[mid][0] > key) hi = mid - 1;
    else if (rows[mid][1] < key) lo = mid + 1;
    else return { asn: rows[mid][2], country: rows[mid][3], network: rows[mid][4] };
  }
  return {};
}

/* ---------- reading the browser string ---------- */
const device = (ua) => (/iPad|Tablet/.test(ua) ? 'tablet' : /Mobi|Android|iPhone/.test(ua) ? 'mobile' : 'desktop');
const browser = (ua) =>
  /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox'
    : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Other';
const os = (ua) =>
  /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'macOS'
    : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : 'Other';

// Link previews, crawlers and scripted browsers, by browser string or network.
const PREVIEW_UA = /facebookexternalhit|Facebot|meta-externalagent|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|TelegramBot|Applebot|SkypeUriPreview|Embedly/i;
const BOT_UA = /bot\b|crawl|spider|slurp|HeadlessChrome|PhantomJS|python|curl|wget|httpclient|Go-http|axios|node-fetch|Lighthouse|scan/i;
const PREVIEW_NET = /^FACEBOOK|^META\b/i;
const CLOUD_NET = /AMAZON|GOOGLE-CLOUD|DIGITALOCEAN|OVH|HETZNER|LINODE|AKAMAI|ORACLE|CHOOPA|VULTR|M247|LEASEWEB|CONTABO|ALIBABA|TENCENT|SCALEWAY|CLOUDFLARE/i;

function label({ ua, net, internal, webdriver, notFound }) {
  if (internal) return 'test';
  if (PREVIEW_UA.test(ua) || PREVIEW_NET.test(net ?? '')) return 'preview';
  if (webdriver || notFound || BOT_UA.test(ua)) return 'bot';
  if (CLOUD_NET.test(net ?? '')) return 'cloud';
  return 'real';
}

const clip = (s, n) => (typeof s === 'string' ? s.slice(0, n) : null);

/* ---------- POST /api/v ---------- */
export function beacon(clientIp, notify) {
  return async (req, res) => {
    res.status(204).end();
    // Do Not Track and Global Privacy Control turn the log off, as the Privacy page says.
    if (!visitsConfigured || req.get('dnt') === '1' || req.get('sec-gpc') === '1') return;
    const b = req.body && typeof req.body === 'object' ? req.body : {};
    const event = clip(b.e, 40);
    if (!event || !/^[a-z0-9_]+$/.test(event)) return;
    const ip = clientIp(req);
    const ua = req.get('user-agent') ?? '';
    const day = new Date().toISOString().slice(0, 10);
    const session = createHash('sha256').update(`${COOKIE_SECRET}|${day}|${ip}|${ua}`).digest('base64url').slice(0, 16);
    const net = network(ip);
    const detail = b.d && typeof b.d === 'object' ? b.d : null;
    const row = {
      session,
      kind: label({ ua, net: net.network, internal: b.i === 1, webdriver: b.w === 1, notFound: b.nf === 1 }),
      event,
      path: clip(b.p, 300),
      detail: detail && JSON.stringify(detail).length < 2000 ? detail : null,
      tag: clip(b.ref, 60),
      referrer: clip(b.r, 300),
      ip: isIP(ip) ? ip : null,
      network: net.network ?? null,
      asn: net.asn ?? null,
      country: net.country ?? null,
      device: device(ua),
      browser: browser(ua),
      os: os(ua),
      ua: clip(ua, 400),
      screen: clip(b.s, 20),
    };
    try {
      const r = await fetch(`${VISITS_URL}/rest/v1/hits`, {
        method: 'POST',
        headers: { ...authHeaders(), 'content-type': 'application/json', prefer: 'return=minimal' },
        body: JSON.stringify(row),
      });
      if (!r.ok) console.error('visit log: insert', r.status, await r.text());
      else if (notify) alertIfNotable(row, notify);
    } catch (err) {
      console.error('visit log: insert failed', err.message);
    }
  };
}

const authHeaders = () => ({
  apikey: VISITS_KEY,
  ...(VISITS_KEY?.startsWith('eyJ') ? { authorization: `Bearer ${VISITS_KEY}` } : {}),
});

/* ---------- notable visits: one email per visit, the moment it earns it ---------- */
const alerted = new Set(); // session ids already emailed today
const alertTimes = []; // when each alert in the last hour went out
let alertedDay = '';
function notableReasons({ kind, network, tag, event, path, detail }) {
  if (kind !== 'real') return [];
  const out = [];
  const employer = EMPLOYERS.find(([re]) => re.test(network ?? ''));
  if (employer) out.push(`on ${employer[1]}'s network`);
  if (tag) out.push(`opened the link tagged "${tag}"`);
  if (event === 'view' && path?.startsWith('/login')) {
    const want = detail?.to?.match(/^\/case-studies\/([a-z]+)/)?.[1];
    out.push(want ? `reached the password gate for the ${want[0].toUpperCase()}${want.slice(1)} study` : 'reached the password gate');
  }
  if (event === 'access_request') out.push('asked for the password');
  if (event === 'contact_submit') out.push('sent the contact form');
  return out;
}
function alertIfNotable(row, notify) {
  const day = new Date().toISOString().slice(0, 10);
  if (day !== alertedDay) { alerted.clear(); alertedDay = day; }
  const reasons = notableReasons(row);
  if (!reasons.length || alerted.has(row.session)) return;
  // Anyone can send a beacon with a tag, and a new browser string is a new
  // session, so a script could mail David once per beacon. Ten an hour at most;
  // the visits are all still in the log.
  const now = Date.now();
  while (alertTimes.length && now - alertTimes[0] > 3_600_000) alertTimes.shift();
  if (alertTimes.length >= 10) return;
  alertTimes.push(now);
  alerted.add(row.session);
  const when = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date());
  const who = `${row.network ?? 'unknown network'}${row.country ? `, ${row.country}` : ''} · ${row.device}, ${row.browser} on ${row.os}`;
  notify({
    subject: `Visit: ${reasons[0]}`,
    message: `${when} Mountain. Someone ${reasons.join(', and ')}.\n\n${who}\nPage: ${row.path ?? ''}${row.referrer ? `\nFrom: ${row.referrer}` : ''}\n\nThe whole visit: https://davidpuerto.com/admin/#visits`,
  });
}

/* ---------- GET /api/admin/visits: one story per visit ---------- */
export async function visits(days) {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const cols = 'at,session,kind,event,path,detail,tag,referrer,ip,network,asn,country,device,browser,os,screen';
  const r = await fetch(`${VISITS_URL}/rest/v1/hits?select=${cols}&at=gte.${since}&order=at.asc&limit=10000`, { headers: authHeaders() });
  if (!r.ok) throw new Error(`visits ${r.status}: ${await r.text()}`);
  const rows = await r.json();
  const bySession = new Map();
  for (const h of rows) {
    if (!bySession.has(h.session)) bySession.set(h.session, []);
    bySession.get(h.session).push(h);
  }
  const out = [];
  for (const [session, hs] of bySession) out.push(story(session, hs));
  out.sort((a, b) => (a.start < b.start ? 1 : -1));
  return out;
}

// Turn a session's hits into steps (one per page) and a plain guess at intent.
function story(session, hs) {
  const first = hs[0];
  // the strongest label wins: one bot signal makes the whole visit a bot.
  // Except a 404: a session is one address and one browser string, so the browser
  // and network signals are the same on every hit, and a 404 is the only bot signal
  // that can differ page to page. Bot hits beside human ones are a mistyped or
  // mangled link, so they don't turn the visit into a bot. Only the view beacon
  // carries the 404 flag, so human hits on the 404 page itself don't count.
  const rank = ['test', 'preview', 'bot', 'cloud', 'real'];
  const missed = new Set(hs.filter((h) => h.kind === 'bot').map((h) => h.path));
  const human = hs.some((h) => (h.kind === 'real' || h.kind === 'cloud') && !missed.has(h.path));
  const kind = hs.map((h) => h.kind).filter((k) => !(human && k === 'bot')).sort((a, b) => rank.indexOf(a) - rank.indexOf(b))[0];
  const steps = [];
  for (const h of hs) {
    if (h.event === 'view' || !steps.length) steps.push({ path: h.path, at: h.at, seconds: null, did: [] });
    const step = steps.at(-1);
    if (h.event === 'leave') step.seconds = h.detail?.s ?? null;
    else if (h.event !== 'view') step.did.push(describe(h));
  }
  for (const s of steps) s.did = [...new Set(s.did.filter(Boolean))];
  const tag = hs.find((h) => h.tag)?.tag ?? null;
  const referrer = hs.find((h) => h.referrer)?.referrer ?? null;
  const seconds = steps.reduce((n, s) => n + (s.seconds ?? 0), 0);
  return {
    session,
    start: first.at,
    end: hs.at(-1).at,
    kind,
    tag,
    referrer,
    ip: first.ip,
    network: first.network,
    asn: first.asn,
    country: first.country,
    device: first.device,
    browser: first.browser,
    os: first.os,
    screen: first.screen,
    seconds,
    steps,
    notable: [...new Set(hs.flatMap((h) => notableReasons({ ...h, kind })))],
    readAs: readAs({ kind, tag, referrer, steps, hs, seconds, network: first.network }),
  };
}

function describe(h) {
  const d = h.detail ?? {};
  switch (h.event) {
    case 'scroll': return `scrolled ${d.pct}%`;
    case 'slide': return `reached slide ${d.n} of ${d.of}`;
    case 'video': return `${d.state === 'ended' ? 'finished' : 'played'} a video${d.pct ? ` (${d.pct}%)` : ''}`;
    case 'outbound': return `left for ${d.host}`;
    case 'pdf': return `opened ${d.file}`;
    case 'contact_submit': return 'sent the contact form';
    case 'access_request': return `asked for the password${d.study ? ` to ${d.study}` : ''}`;
    case 'contact_start': return 'started the contact form';
    case 'case_study_unlock': return 'unlocked the case studies';
    case 'lock_try': return `tried ${d.combo}`;
    case 'lock_clamp': return `pressed the ${d.ring} clamp`;
    case 'lock_open': return 'picked the lock';
    case 'lock_timeout': return 'ran out of time on the lock';
    default: return h.event.replace(/_/g, ' ');
  }
}

// Networks that name an employer. The owner strings come from the public ASN table.
const EMPLOYERS = [
  [/MICROSOFT/i, 'Microsoft'], [/APPLE/i, 'Apple'], [/^GOOGLE(?!-CLOUD)/i, 'Google'], [/FACEBOOK|^META\b/i, 'Meta'],
  [/AMAZON-(?!02|AES)/i, 'Amazon'], [/NETFLIX/i, 'Netflix'], [/ADOBE/i, 'Adobe'], [/SALESFORCE/i, 'Salesforce'],
  [/NVIDIA/i, 'Nvidia'], [/ORACLE-CORP/i, 'Oracle'], [/LINKEDIN/i, 'LinkedIn'], [/ATLASSIAN/i, 'Atlassian'],
];

// A guess, always shown as one. Plain rules, in order of how much they say.
function readAs({ kind, tag, referrer, steps, hs, seconds, network }) {
  if (kind === 'test') return 'Our own checks.';
  if (kind === 'preview') return 'A link preview being built, after someone shared the link.';
  if (kind === 'bot') return 'A bot or scanner, not a person.';
  if (kind === 'cloud') return 'From a cloud server: most likely automated, possibly someone on a VPN.';
  const paths = steps.map((s) => s.path ?? '');
  const slides = hs.filter((h) => h.event === 'slide');
  const deepest = slides.reduce((m, h) => (h.detail?.n > (m?.detail?.n ?? 0) ? h : m), null);
  const parts = [];
  if (tag) parts.push(`Opened the link you tagged "${tag}".`);
  const employer = EMPLOYERS.find(([re]) => re.test(network ?? ''));
  if (employer) parts.push(`On ${employer[1]}'s network.`);
  // the password gate: they wanted a study and didn't have the password
  const gate = hs.find((h) => h.event === 'view' && h.path?.startsWith('/login'));
  if (gate && !hs.some((h) => h.event === 'case_study_unlock')) {
    const want = gate.detail?.to?.match(/^\/case-studies\/([a-z]+)/)?.[1];
    parts.push(want ? `Reached the password gate for the ${want[0].toUpperCase()}${want.slice(1)} study and didn't go in.` : "Reached the password gate and didn't go in.");
  }
  if (deepest) parts.push(`Went through a deck to slide ${deepest.detail.n} of ${deepest.detail.of}${deepest.detail.n >= deepest.detail.of ? ', the whole thing' : ''}.`);
  if (paths.some((p) => p.startsWith('/resume')) || hs.some((h) => h.event === 'pdf')) parts.push('Checked the résumé, the way a recruiter skims.');
  if (hs.some((h) => h.event === 'contact_submit')) parts.push('Wrote to you.');
  if (paths.every((p) => p.startsWith('/lock')) && /facebook/i.test(referrer ?? '')) parts.push('Came from the Facebook share to play with the lock.');
  if (!parts.length) {
    if (steps.length === 1 && seconds < 10) parts.push('Looked and left.');
    else parts.push(`Browsed ${steps.length} page${steps.length === 1 ? '' : 's'} for ${Math.max(1, Math.round(seconds / 60))} min.`);
  }
  return parts.join(' ');
}
