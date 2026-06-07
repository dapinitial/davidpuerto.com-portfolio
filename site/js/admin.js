// Admin analytics dashboard — fetch /api/admin/stats, render headline numbers,
// a hand-built SVG timeline, and four label+bar lists. No chart library.
const BAR_COLORS = ['#fb836d', '#edb417', '#ab65c0', '#00a3bb', '#1277e1'];
const LINE_COLOR = '#00a3bb';
const fmt = new Intl.NumberFormat('en-US');

const statusEl = document.querySelector('.dash-status');
const bodyEl = document.querySelector('.dash-body');
const chartEl = document.querySelector('.timeline-chart');
const switcher = document.querySelector('.range-switcher');

/* ---------- timeline: inline SVG area/line chart ---------- */
function chartSVG(timeline) {
  const W = 800;
  const H = 260;
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
  const ul = document.querySelector(`.dash-list[data-list="${name}"] ul`);
  ul.textContent = '';
  const max = Math.max(1, ...rows.map((r) => r.value));
  rows.forEach((row, i) => {
    const li = document.createElement('li');
    const label = document.createElement('span');
    label.className = 'row-label';
    label.textContent = row.label || '(not set)';
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
}

function render(data) {
  document.querySelector('[data-stat="users"]').textContent = fmt.format(data.totals.users);
  document.querySelector('[data-stat="pageviews"]').textContent = fmt.format(data.totals.pageviews);
  chartEl.innerHTML = data.timeline.length
    ? chartSVG(data.timeline)
    : '<p class="chart-empty">No traffic yet.</p>';
  renderList('sources', data.sources);
  renderList('pages', data.pages);
  renderList('countries', data.countries);
  renderList('devices', data.devices);
}

/* ---------- load + range switching ---------- */
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
    render(await res.json());
    statusEl.hidden = true;
    bodyEl.hidden = false;
  } catch {
    statusEl.textContent = 'Could not load analytics — try again in a minute.';
  }
}

switcher.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-range]');
  if (!btn || btn.getAttribute('aria-pressed') === 'true') return;
  switcher.querySelectorAll('button').forEach((b) => b.removeAttribute('aria-pressed'));
  btn.setAttribute('aria-pressed', 'true');
  load(btn.dataset.range);
});

load(28);
