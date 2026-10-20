// Admin analytics dashboard — fetch /api/admin/stats, render headline numbers,
// a hand-built SVG timeline, and label+bar lists grouped into tabs. No chart library.
const BAR_COLORS = ['#fb836d', '#edb417', '#ab65c0', '#00a3bb', '#1277e1'];
const LINE_COLOR = '#00a3bb';
const fmt = new Intl.NumberFormat('en-US');

const statusEl = document.querySelector('.dash-status');
const bodyEl = document.querySelector('.dash-body');
const chartEl = document.querySelector('.timeline-chart');
const switcher = document.querySelector('.range-switcher');

/* ---------- timeline: inline SVG area/line chart ---------- */
function chartSVG(timeline) {
  // drawn at the card's real width so the date labels stay readable on a phone
  const W = Math.max(280, Math.round(chartEl.clientWidth || 800));
  const H = W < 560 ? 180 : 240;
  const PAD = { top: 12, right: 12, bottom: 28, left: 12 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const n = timeline.length;
  const max = Math.max(1, ...timeline.map((d) => d.users));

  const x = (i) => PAD.left + (n > 1 ? (i * innerW) / (n - 1) : innerW / 2);
  const y = (v) => PAD.top + innerH - (v / max) * innerH;
  const pts = timeline.map((d, i) => `${x(i).toFixed(1)},${y(d.users).toFixed(1)}`);
  const line = `M${pts.join(' L')}`;
  const baseline = PAD.top + innerH;
  const area = `${line} L${x(n - 1).toFixed(1)},${baseline} L${x(0).toFixed(1)},${baseline} Z`;

  // Day labels on x: first, last, and a few evenly spaced between.
  const labelDate = (iso) => {
    const [, m, day] = iso.split('-');
    return `${Number(m)}/${Number(day)}`;
  };
  const tickCount = Math.min(n, 6);
  const ticks = Array.from({ length: tickCount }, (_, t) => {
    const i = Math.round((t * (n - 1)) / Math.max(1, tickCount - 1));
    const anchor = i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle';
    return `<text x="${x(i).toFixed(1)}" y="${H - 8}" text-anchor="${anchor}">${labelDate(timeline[i].date)}</text>`;
  }).join('');

  return `
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Daily visitors over time">
      <defs>
        <linearGradient id="tl-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${LINE_COLOR}" stop-opacity="0.25" />
          <stop offset="1" stop-color="${LINE_COLOR}" stop-opacity="0" />
        </linearGradient>
      </defs>
      <line x1="${PAD.left}" y1="${baseline}" x2="${W - PAD.right}" y2="${baseline}" class="chart-axis" />
      <path d="${area}" fill="url(#tl-grad)" />
      <path d="${line}" fill="none" stroke="${LINE_COLOR}" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
      ${ticks}
    </svg>`;
}

/* ---------- lists: label + thin bar + value ---------- */
function renderList(name, rows) {
  // a list can appear twice: a top five on Overview, the full list on its tab
  document.querySelectorAll(`.dash-list[data-list="${name}"]`).forEach((section) => {
    const ul = section.querySelector('ul');
    ul.textContent = '';
    const shown = rows.slice(0, Number(section.dataset.limit) || rows.length);
    if (!shown.length) {
      ul.innerHTML = '<li class="row-empty">Nothing yet</li>';
      return;
    }
    const max = Math.max(1, ...shown.map((r) => r.value));
    shown.forEach((row, i) => {
      const li = document.createElement('li');
      const label = document.createElement('span');
      label.className = 'row-label';
      label.textContent = row.label || '(not set)';
      label.title = label.textContent;
      const track = document.createElement('div');
      track.className = 'row-track';
      const bar = document.createElement('div');
      bar.className = 'row-bar';
      bar.style.width = `${((row.value / max) * 100).toFixed(1)}%`;
      bar.style.background = BAR_COLORS[i % BAR_COLORS.length];
      track.append(bar);
      const value = document.createElement('span');
      value.className = 'row-value';
      value.textContent = fmt.format(row.value);
      li.append(label, track, value);
      ul.append(li);
    });
  });
}

/* ---------- hour-of-day strip: 24 thin vertical bars ---------- */
function renderHours(rows) {
  const wrap = document.querySelector('.hour-bars');
  wrap.textContent = '';
  const byHour = new Array(24).fill(0);
  rows.forEach((r) => {
    byHour[Number(r.label)] = r.value;
  });
  const max = Math.max(1, ...byHour);
  const hourLabel = (h) => `${h % 12 || 12}${h < 12 ? 'a' : 'p'}`;
  byHour.forEach((v, h) => {
    const col = document.createElement('div');
    col.className = 'hour-col';
    col.title = `${hourLabel(h)} — ${fmt.format(v)}`;
    const bar = document.createElement('div');
    bar.className = 'hour-bar';
    bar.style.height = `${Math.max(2, (v / max) * 100).toFixed(1)}%`;
    const label = document.createElement('span');
    label.textContent = h % 6 === 0 ? hourLabel(h) : '';
    col.append(bar, label);
    wrap.append(col);
  });
}

// Raw GA values → labels a human wants to read.
const PRETTY = {
  case_study_unlock: 'Case-study unlocks',
  contact_submit: 'Contact messages',
  file_download: 'Resume downloads',
  new: 'New visitors',
  returning: 'Returning visitors',
};
const pretty = (rows) => rows.map((r) => ({ ...r, label: PRETTY[r.label] ?? r.label }));

function render(data) {
  document.querySelector('[data-stat="users"]').textContent = fmt.format(data.totals.users);
  document.querySelector('[data-stat="pageviews"]').textContent = fmt.format(data.totals.pageviews);
  document.querySelector('[data-stat="engagement"]').textContent =
    `${Math.round(data.totals.engagementRate * 100)}%`;
  const secs = Math.round(data.totals.avgSessionDuration);
  document.querySelector('[data-stat="duration"]').textContent =
    `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  chartEl.innerHTML = data.timeline.length
    ? chartSVG(data.timeline)
    : '<p class="chart-empty">No traffic yet.</p>';
  renderHours(data.hours);
  renderList('sources', data.sources);
  renderList('pages', data.pages);
  renderList('countries', data.countries);
  renderList('devices', data.devices);
  renderList('channels', data.channels);
  renderList('referrers', data.referrers.map((r) => ({
    ...r,
    label: r.label.replace(/^https?:\/\//, '').replace(/\/$/, ''),
  })));
  renderList('landings', data.landings);
  renderList('cities', data.cities);
  renderList('browsers', data.browsers);
  renderList('os', data.os);
  renderList('screens', data.screens);
  renderList('visitorTypes', pretty(data.visitorTypes));
  renderList('events', pretty(data.events));
}

/* ---------- live now: realtime widget, polls gently ---------- */
const liveEl = document.querySelector('.live-now');

async function loadRealtime() {
  try {
    const res = await fetch('/api/admin/realtime');
    if (!res.ok) return; // configured/auth problems already surface via stats
    const data = await res.json();
    liveEl.querySelector('[data-live="count"]').textContent = fmt.format(data.activeUsers);
    liveEl.querySelector('[data-live="label"]').textContent =
      data.activeUsers === 1 ? 'person on the site right now' : 'people on the site right now';
    const bits = [];
    if (data.pages[0]) bits.push(`reading “${data.pages[0].label}”`);
    if (data.cities[0]) bits.push(`from ${data.cities[0].label}`);
    liveEl.querySelector('[data-live="detail"]').textContent = bits.length
      ? ` — ${bits.join(', ')}`
      : '';
    liveEl.hidden = false;
    liveEl.classList.toggle('is-quiet', data.activeUsers === 0);
  } catch {
    /* realtime is garnish — never block the dashboard over it */
  }
}

/* ---------- load + range switching ---------- */
let lastData = null;
let resizeTimer;
addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (lastData?.timeline.length) chartEl.innerHTML = chartSVG(lastData.timeline);
  }, 150);
});

async function load(range) {
  statusEl.hidden = false;
  statusEl.textContent = 'crunching…';
  bodyEl.hidden = true;
  try {
    const res = await fetch(`/api/admin/stats?range=${range}`);
    if (res.status === 401) {
      location.assign(`/login/?redirectTo=${encodeURIComponent('/admin/')}`);
      return;
    }
    if (res.status === 503) {
      statusEl.textContent = 'Analytics not configured yet — add the GA env vars.';
      return;
    }
    if (!res.ok) throw new Error(`stats ${res.status}`);
    lastData = await res.json();
    statusEl.hidden = true;
    bodyEl.hidden = false; // visible first, so the chart can measure its card
    render(lastData);
  } catch {
    statusEl.textContent = 'Could not load analytics — try again in a minute.';
  }
}

/* ---------- visits: one story per visit, from the site's own log ---------- */
const visitList = document.querySelector('.visit-list');
const visitCount = document.querySelector('[data-visits="count"]');
const visitFilter = document.querySelector('.visits-filter');
let visitData = null;
const KIND = { real: 'Person', cloud: 'Cloud server', bot: 'Bot', preview: 'Link preview', test: 'Our checks' };
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const when = (iso) => new Date(iso).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Denver' });
const dur = (s) => (s == null ? '' : s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`);
const host = (url) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } };

function renderVisits() {
  if (!visitData) return;
  const all = visitFilter.querySelector('[aria-pressed="true"]').dataset.kind === 'all';
  const shown = all ? visitData : visitData.filter((v) => v.kind === 'real');
  const hidden = visitData.length - shown.length;
  visitCount.textContent = `${shown.length} visit${shown.length === 1 ? '' : 's'}${hidden ? ` · ${hidden} bots, previews and checks folded away` : ''}`;
  visitList.innerHTML = shown.length ? shown.map((v) => `
    <li class="visit kind-${v.kind}">
      <div class="visit-head">
        <time datetime="${v.start}">${when(v.start)}</time>
        <span class="visit-kind">${KIND[v.kind] ?? v.kind}</span>
        ${v.tag ? `<span class="visit-tag">${esc(v.tag)}</span>` : ''}
      </div>
      <p class="visit-who">${esc(v.network ?? 'Unknown network')}${v.country ? ` · ${esc(v.country)}` : ''} · ${esc(v.device)}, ${esc(v.browser)} on ${esc(v.os)}${v.referrer ? ` · from ${esc(host(v.referrer))}` : ''}</p>
      <ol class="visit-steps">${v.steps.map((s) => `
        <li><span class="step-path">${esc(s.path)}</span>${s.seconds != null ? ` <span class="step-time">${dur(s.seconds)}</span>` : ''}${s.did.length ? `<span class="step-did">${s.did.map(esc).join(' · ')}</span>` : ''}</li>`).join('')}
      </ol>
      <p class="visit-read"><span>Read as</span> ${esc(v.readAs)}</p>
      <details class="visit-more"><summary>Details</summary>
        <dl><dt>Address</dt><dd>${esc(v.ip ?? 'forgotten')}</dd><dt>Network no.</dt><dd>${esc(v.asn ?? '')}</dd><dt>Screen</dt><dd>${esc(v.screen ?? '')}</dd><dt>Visit id</dt><dd>${esc(v.session)}</dd></dl>
      </details>
    </li>`).join('') : '<li class="row-empty">No visits in this range yet.</li>';
}

async function loadVisits(range) {
  const days = { 7: 7, 28: 28, 90: 90 }[range] ?? 7;
  visitCount.textContent = 'reading the log…';
  try {
    const res = await fetch(`/api/admin/visits?days=${days}`);
    if (res.status === 503) { visitCount.textContent = 'The visit log is not connected yet: add VISITS_URL and VISITS_KEY.'; visitList.innerHTML = ''; return; }
    if (!res.ok) throw new Error(`visits ${res.status}`);
    visitData = (await res.json()).visits;
    renderVisits();
  } catch {
    visitCount.textContent = 'Could not read the visit log. Try again in a minute.';
  }
}

visitFilter.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-kind]');
  if (!btn) return;
  visitFilter.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
  renderVisits();
});

// a link you send someone, so the log can say which link was opened
document.querySelector('.tag-maker').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.currentTarget);
  const page = String(f.get('path') || '/').startsWith('/') ? f.get('path') : `/${f.get('path')}`;
  const url = `https://davidpuerto.com${page}${page.includes('?') ? '&' : '?'}ref=${encodeURIComponent(f.get('tag'))}`;
  const out = e.currentTarget.querySelector('.tag-out');
  try { await navigator.clipboard.writeText(url); out.textContent = `Copied: ${url}`; } catch { out.textContent = url; }
});

switcher.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-range]');
  if (!btn || btn.getAttribute('aria-pressed') === 'true') return;
  switcher.querySelectorAll('button').forEach((b) => b.removeAttribute('aria-pressed'));
  btn.setAttribute('aria-pressed', 'true');
  load(btn.dataset.range);
  loadVisits(btn.dataset.range);
});

/* ---------- tabs: arrow keys move between them, as a tablist should ---------- */
const tabs = [...document.querySelectorAll('.dash-tabs [role="tab"]')];
function selectTab(tab, focus = false) {
  tabs.forEach((t) => {
    const on = t === tab;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
  });
  if (focus) tab.focus();
  tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  history.replaceState(null, '', `#${tab.id.replace('tab-', '')}`);
}
tabs.forEach((tab, i) => {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', (e) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (step) selectTab(tabs[(i + step + tabs.length) % tabs.length], true);
    if (e.key === 'Home') selectTab(tabs[0], true);
    if (e.key === 'End') selectTab(tabs.at(-1), true);
  });
});
const fromHash = tabs.find((t) => t.id === `tab-${location.hash.slice(1)}`);
if (fromHash) selectTab(fromHash);

load(28);
loadVisits(28);
loadRealtime();
setInterval(loadRealtime, 60_000);
