/* Token Launch Radar — renders window.RADAR (written by main.ts beside this page). No fetch, no network. */
'use strict';
const R = window.RADAR;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const usd = (v) => (v >= 1e9 ? `$${(v / 1e9).toFixed(2)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `$${(v / 1e3).toFixed(0)}K` : `$${Math.round(v)}`);
const pct = (v, d = 0) => `${(v * 100).toFixed(d)}%`;
const growth = (v) => (v === null || v === undefined ? '—' : `<span class="${v >= 0 ? 'up' : 'down'}">${v >= 0 ? '+' : ''}${v.toFixed(1)}%</span>`);

/* Header + KPI strip */
$('stamp').innerHTML = `Snapshot <strong>${esc(R.as_of)}</strong> ${esc(R.source.split(' ')[0])} data, sealed`;
const totalValue = R.rows.reduce((a, r) => a + r.implied_value_usd, 0);
const mc = R.model_card;
$('kpis').innerHTML = [
  [R.model_card.universe, 'protocols scanned'],
  [`${R.watchlist_size} / ${R.watchlist_size}`, 'watchlist covered'],
  [R.board_size, 'pre-token protocols ranked'],
  [usd(totalValue), 'total expected launch value'],
  [mc.live_peers, 'live peers the model fitted on'],
  [`×${mc.holdout_median_error_x}`, 'held-out pricing error (median)'],
].map(([v, k]) => `<div class="kpi"><div class="v">${v}</div><div class="k">${k}</div></div>`).join('');

/* Board */
const cats = [...new Set(R.rows.map((r) => r.category).filter(Boolean))].sort();
const chains = [...new Set(R.rows.flatMap((r) => r.chains))].sort();
$('f-cat').innerHTML = `<option value="">All categories</option>` + cats.map((c) => `<option>${esc(c)}</option>`).join('');
$('f-chain').innerHTML = `<option value="">All chains</option>` + chains.map((c) => `<option>${esc(c)}</option>`).join('');

const sorters = {
  rank: (a, b) => a.rank - b.rank,
  fdv: (a, b) => b.fdv_usd - a.fdv_usd,
  odds: (a, b) => b.token_odds - a.token_odds,
  tvl: (a, b) => b.tvl_usd - a.tvl_usd,
  growth: (a, b) => (b.change_7d ?? -1e9) - (a.change_7d ?? -1e9),
  age: (a, b) => (b.age_days ?? -1) - (a.age_days ?? -1),
};

function renderBoard() {
  const q = $('q').value.trim().toLowerCase();
  const cat = $('f-cat').value;
  const chain = $('f-chain').value;
  const watchOnly = $('f-watch').checked;
  const rows = R.rows
    .filter((r) => (!q || r.name.toLowerCase().includes(q)) && (!cat || r.category === cat) && (!chain || r.chains.includes(chain)) && (!watchOnly || r.watchlist))
    .sort(sorters[$('f-sort').value]);
  $('count').textContent = `${rows.length} of ${R.board_size} protocols`;
  $('board-body').innerHTML = rows.map((r) => `
    <tr data-slug="${esc(r.slug)}">
      <td class="num">${r.rank}</td>
      <td><span class="name">${esc(r.name)}</span>${r.watchlist ? '<span class="pill">WATCHLIST</span>' : ''}</td>
      <td>${esc(r.category ?? '—')}</td>
      <td class="chains">${esc(r.chains.slice(0, 3).join(', '))}${r.chains.length > 3 ? ` +${r.chains.length - 3}` : ''}</td>
      <td class="num">${usd(r.tvl_usd)}</td>
      <td class="num">${growth(r.change_7d)}</td>
      <td class="num">${usd(r.fdv_usd)}</td>
      <td><span class="odds"><span class="bar"><i style="width:${Math.round(r.token_odds * 100)}%"></i></span><span class="pct">${pct(r.token_odds)}</span></span></td>
      <td class="num val">${usd(r.implied_value_usd)}</td>
    </tr>`).join('');
  for (const tr of $('board-body').querySelectorAll('tr')) {
    tr.addEventListener('click', () => showDetail(tr.dataset.slug));
  }
}
$('board-note').textContent =
  `Expected value = launch value (FDV) × token odds, both fitted on the snapshot's own live-token protocols. ` +
  `Every watchlist protocol is on the board; below the watchlist's TVL floor the radar adds the ${R.early_size} largest pre-token protocols it finds. Click any row for its pricing and farm plan.`;
for (const id of ['q', 'f-cat', 'f-chain', 'f-sort', 'f-watch']) $(id).addEventListener('input', renderBoard);

/* Detail view */
function showDetail(slug) {
  const r = R.rows.find((x) => x.slug === slug);
  if (!r) return;
  const age = r.age_days === null ? 'not recorded' : r.age_days >= 365 ? `${(r.age_days / 365).toFixed(1)} years` : `${r.age_days} days`;
  $('detail').innerHTML = `
    <div class="detail-head">
      <h2>#${r.rank} ${esc(r.name)}</h2>
      ${r.watchlist ? '<span class="pill">WATCHLIST</span>' : '<span class="chains">early radar — below the watchlist floor</span>'}
      <span class="chains">${esc(r.category ?? 'Uncategorised')} · ${esc(r.chains.join(', ') || 'chain not recorded')}</span>
    </div>
    <div class="detail-grid">
      <div class="card">
        <h3>The protocol</h3>
        <div class="fact"><span class="k">TVL</span><span class="v">${usd(r.tvl_usd)}</span></div>
        <div class="fact"><span class="k">TVL change, 7 days</span><span class="v">${r.change_7d === null ? '—' : `${r.change_7d.toFixed(1)}%`}</span></div>
        <div class="fact"><span class="k">Running with no token for</span><span class="v">${age}</span></div>
        <div class="fact"><span class="k">First tracked</span><span class="v">${esc(r.listed_at ?? '—')}</span></div>
        <div class="fact"><span class="k">Token</span><span class="v">none yet</span></div>
      </div>
      <div class="card">
        <h3>How the radar prices it</h3>
        <div class="formula">expected value = launch value × token odds</div>
        <div class="fact"><span class="k">Peer ratio (cap/TVL, ${esc(r.category ?? 'category')}, ${r.peers} live peers)</span><span class="v">×${r.peer_ratio}</span></div>
        <div class="fact"><span class="k">Growth factor (its 7d TVL trend)</span><span class="v">×${r.growth_factor}</span></div>
        <div class="fact"><span class="k">Age &amp; size factor</span><span class="v">×${r.age_factor}</span></div>
        <div class="fact"><span class="k">Launch value if it lists (FDV)</span><span class="v">${usd(r.fdv_usd)}</span></div>
        <div class="fact"><span class="k">Token odds (fitted)</span><span class="v">${pct(r.token_odds)}</span></div>
        <div class="fact"><span class="k">Expected launch value</span><span class="v">${usd(r.implied_value_usd)}</span></div>
      </div>
      <div class="card">
        <h3>Farm plan</h3>
        <ol class="steps">${r.farm_steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
      </div>
    </div>`;
  switchView('detail');
  window.scrollTo(0, 0);
}
$('back').addEventListener('click', () => switchView('board'));

/* Model view */
$('model-body').innerHTML = `
  <p class="lede">No name on this board was priced by hand. When the program runs, it fits two models on the
  snapshot itself, then prices every pre-token protocol with them — so the same program, run on next
  quarter's snapshot, produces next quarter's radar with no edits.</p>
  <div class="detail-grid">
    <div class="card">
      <h3>1 · Launch value: what the market pays peers</h3>
      <p>For each of the ${mc.live_peers} protocols in the snapshot whose token already trades, the market
      cap per dollar of TVL is a price the market has already set. The model takes the median of that ratio
      in each category (shrunk toward the global median of ×${mc.global_ratio} where a category has few
      peers), then fits three corrections by least squares: on seven-day TVL growth (slope ${mc.growth_slope}),
      on log age (${mc.age_slope}), and on size. A pre-token protocol is priced as its category's peers
      price, moved by its own growth, age and size.</p>
    </div>
    <div class="card">
      <h3>2 · Token odds: which protocols ever list</h3>
      <p>A logistic model fitted on all ${mc.universe} protocols — the label is simply whether a protocol
      records a token — over log TVL, log age, growth and its category's token record. Across the whole
      universe ${mc.base_rate_pct}% of protocols have a token; the fit separates the ones that list from
      the ones that do not with a held-out AUC of ${mc.odds_auc}.</p>
    </div>
    <div class="card">
      <h3>3 · Held-out honesty</h3>
      <div class="fact"><span class="k">Median pricing error, protocols the fit never saw</span><span class="v">×${mc.holdout_median_error_x}</span></div>
      <div class="fact"><span class="k">Held-out prices within 2× of the real market cap</span><span class="v">${mc.holdout_within_2x_pct}%</span></div>
      <div class="fact"><span class="k">Held-out prices within 5×</span><span class="v">${mc.holdout_within_5x_pct}%</span></div>
      <div class="fact"><span class="k">Odds AUC, held out</span><span class="v">${mc.odds_auc}</span></div>
      <p>Pricing a token that does not exist is uncertain, and the radar says by how much: the live set is
      split in two by protocol, each half is priced by a model fitted only on the other half, and the
      errors above are what came back. Treat the ranking as a strong ordering, not a quote.</p>
    </div>
  </div>`;

/* Live view */
$('live-body').innerHTML = R.live.map((r) => `
  <tr>
    <td><span class="name">${esc(r.name)}</span></td>
    <td>${esc(r.category ?? '—')}</td>
    <td class="num">${usd(r.tvl_usd)}</td>
    <td class="num">${r.mcap_usd === null ? '—' : usd(r.mcap_usd)}</td>
    <td class="num">${r.mcap_usd === null || !r.tvl_usd ? '—' : `×${(r.mcap_usd / r.tvl_usd).toFixed(2)}`}</td>
    <td class="num">${growth(r.change_7d)}</td>
  </tr>`).join('');

/* View switching */
function switchView(name) {
  for (const v of ['board', 'detail', 'model', 'live']) $('view-' + v).hidden = v !== name;
  for (const b of document.querySelectorAll('.view-btn')) b.classList.toggle('is-on', b.dataset.view === name);
}
for (const b of document.querySelectorAll('.view-btn')) b.addEventListener('click', () => switchView(b.dataset.view));

renderBoard();
