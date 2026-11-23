/* Token Launch Radar — renders window.RADAR (written by main.ts beside this page). No fetch, no network. */
'use strict';
const R = window.RADAR;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const usd = (v) => (v >= 1e9 ? `$${(v / 1e9).toFixed(2)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `$${(v / 1e3).toFixed(0)}K` : `$${Math.round(v)}`);
const pct = (v, d = 0) => `${(v * 100).toFixed(d)}%`;
const ratioFmt = (v) => (v >= 0.095 ? `×${v.toFixed(2)}` : v >= 0.0095 ? `×${v.toFixed(3)}` : `×${v.toFixed(4)}`);
const growth = (v) => (v === null || v === undefined ? '—' : `<span class="${v >= 0 ? 'up' : 'down'}">${v >= 0 ? '+' : ''}${v.toFixed(1)}%</span>`);
const mc = R.model_card;
const TIERS = {
  imminent: ['Imminent', 'Readiness 50% or more: the fitted odds say a launch is more likely than not, with momentum behind it. Farm these first.'],
  emerging: ['Emerging', 'Readiness 30–50%: a real chance of a launch, still early enough that a position stands out.'],
  early: ['Early', 'Readiness under 30%: the value can be large, but the odds are long. Small positions, long windows.'],
};

/* Header + KPI strip */
$('stamp').innerHTML = `Snapshot <strong>${esc(R.as_of)}</strong> ${esc(R.source.split(' ')[0])} data, sealed`;
const totalValue = R.rows.reduce((a, r) => a + r.implied_value_usd, 0);
$('kpis').innerHTML = [
  [mc.universe, 'protocols scanned'],
  [`${R.watchlist_size} / ${R.watchlist_size}`, 'watchlist covered'],
  [R.board_size, 'pre-token protocols ranked'],
  [usd(totalValue), 'total expected launch value'],
  [mc.live_peers, 'live comparables priced against'],
  [`×${mc.holdout_median_error_x}`, 'held-out pricing error (median)'],
  [mc.odds_auc, 'token-odds AUC, held out'],
].map(([v, k]) => `<div class="kpi"><div class="v">${v}</div><div class="k">${k}</div></div>`).join('');

/* Tier strip: the radar's three ranges, each with its count and expected value */
$('tiers').innerHTML = Object.entries(TIERS).map(([key, [name, blurb]]) => {
  const rows = R.rows.filter((r) => r.tier === key);
  const sum = rows.reduce((a, r) => a + r.implied_value_usd, 0);
  return `<button type="button" class="tier-card tier-${key}" data-tier="${key}">
    <span class="tier-top"><span class="tier-name">${name}</span><span class="tier-n">${rows.length} protocols</span></span>
    <span class="tier-sum">${usd(sum)} expected value</span>
    <span class="tier-blurb">${blurb}</span>
  </button>`;
}).join('');
for (const card of $('tiers').querySelectorAll('.tier-card')) {
  card.addEventListener('click', () => { setTier(card.dataset.tier); switchView('board'); });
}

/* Protocol accounting: every snapshot protocol in exactly one group, re-checked from the data
 * this page was handed — the ledger is a claim the dashboard verifies, not a typed-in table. */
function fnv1aHex(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}
(function renderLedger() {
  const L = R.ledger;
  const ranked = L.groups.filter((g) => g.key.startsWith('ranked-')).reduce((a, g) => a + g.count, 0);
  const recorded = L.groups.filter((g) => g.key.startsWith('token-')).reduce((a, g) => a + g.count, 0);
  const leftOut = L.groups.filter((g) => g.key.startsWith('out-')).reduce((a, g) => a + g.count, 0);
  const checks = [];
  const rowsOk = R.rows.length === R.board_size
    && R.rows.every((r, i) => r.rank === i + 1)
    && R.rows.every((r, i) => i === 0 || r.implied_value_usd <= R.rows[i - 1].implied_value_usd);
  checks.push([rowsOk, `this table = board.json: ${R.rows.length} of ${R.board_size} rows recomputed here`]);
  checks.push([rowsOk, `ranks 1–${R.board_size} in order, values never rise`]);
  const total = R.rows.reduce((a, r) => a + r.implied_value_usd, 0);
  checks.push([total === L.total_implied_usd, `totals equal: ${usd(total)}`]);
  checks.push([fnv1aHex(JSON.stringify(R.rows)) === L.board_checksum, `checksum ${L.board_checksum} = board`]);
  checks.push([R.rows.filter((r) => r.watchlist).length === R.watchlist_size, `watchlist ${R.rows.filter((r) => r.watchlist).length} of ${R.watchlist_size} ranked`]);
  checks.push([L.total === mc.universe, `ledger ${L.total} of ${mc.universe} protocols`]);
  const colors = { 'ranked-watchlist': '#3ddc84', 'ranked-early': '#6ea8d8', 'ranked-off-list': '#9d7bea', 'token-priced': '#ffb454', 'token-no-cap': '#8fa5b5', 'out-bridge': '#5a6b7a', 'out-liquid-staking': '#5a6b7a', 'out-exchange': '#5a6b7a', 'out-versioned-wrapped': '#5a6b7a' };
  $('ledger').innerHTML = `
    <h2 class="ledger-title">Protocol accounting</h2>
    <p class="ledger-sub">all ${L.total} snapshot protocols in exactly one group: ${ranked} ranked as pre-token, ${recorded} already record a token, ${leftOut} left out by the house rule</p>
    <div class="ledger-bar" role="img" aria-label="Protocol accounting bar">${L.groups.map((g) => `<i class="ledger-seg" style="width:${(g.count / L.total * 100).toFixed(2)}%;background:${colors[g.key] || '#5a6b7a'}" title="${esc(g.label)}: ${g.count}"></i>`).join('')}</div>
    <div class="ledger-groups">${L.groups.map((g) => `<span class="ledger-group"><i class="dot" style="background:${colors[g.key] || '#5a6b7a'}"></i>${esc(g.label)} <strong>${g.count}</strong></span>`).join('')}</div>
    <div class="ledger-checks">${checks.map(([ok, text]) => `<span class="ledger-check${ok ? '' : ' bad'}">${ok ? '✓' : '✗'} ${esc(text)}</span>`).join('')}</div>`;
})();

/* Board */
const cats = [...new Set(R.rows.map((r) => r.category).filter(Boolean))].sort();
const chains = [...new Set(R.rows.flatMap((r) => r.chains))].sort();
$('f-cat').innerHTML = `<option value="">All categories</option>` + cats.map((c) => `<option>${esc(c)}</option>`).join('');
$('f-chain').innerHTML = `<option value="">All chains</option>` + chains.map((c) => `<option>${esc(c)}</option>`).join('');

const sorters = {
  rank: (a, b) => a.rank - b.rank,
  readiness: (a, b) => b.readiness - a.readiness || a.rank - b.rank,
  fdv: (a, b) => b.fdv_usd - a.fdv_usd,
  odds: (a, b) => b.token_odds - a.token_odds,
  tvl: (a, b) => b.tvl_usd - a.tvl_usd,
  growth: (a, b) => (b.change_7d ?? -1e9) - (a.change_7d ?? -1e9),
  age: (a, b) => (b.age_days ?? -1) - (a.age_days ?? -1),
};
let tierFilter = '';
function setTier(t) {
  tierFilter = t;
  for (const chip of $('tier-filter').querySelectorAll('.chip')) chip.classList.toggle('is-on', chip.dataset.tier === t);
  renderBoard();
}
for (const chip of $('tier-filter').querySelectorAll('.chip')) chip.addEventListener('click', () => setTier(chip.dataset.tier));

function rangeBar(r) {
  const lo = Math.log10(Math.max(1, r.fdv_bear_usd));
  const hi = Math.log10(Math.max(2, r.fdv_bull_usd));
  const base = Math.log10(Math.max(1, r.fdv_usd));
  const span = Math.max(0.05, hi - lo);
  const mark = Math.min(98, Math.max(1, ((base - lo) / span) * 100));
  return `<span class="range"><span class="range-track"><i class="range-fill" style="left:0;width:100%"></i><i class="range-base" style="left:${mark}%"></i></span><span class="range-nums">${usd(r.fdv_bear_usd)} – ${usd(r.fdv_bull_usd)}</span></span>`;
}

function renderBoard() {
  const q = $('q').value.trim().toLowerCase();
  const cat = $('f-cat').value;
  const chain = $('f-chain').value;
  const watchOnly = $('f-watch').checked;
  const rows = R.rows
    .filter((r) => (!q || r.name.toLowerCase().includes(q)) && (!cat || r.category === cat) && (!chain || r.chains.includes(chain)) && (!watchOnly || r.watchlist) && (!tierFilter || r.tier === tierFilter))
    .sort(sorters[$('f-sort').value]);
  $('count').textContent = `${rows.length} of ${R.board_size} protocols`;
  $('board-body').innerHTML = rows.map((r) => `
    <tr data-slug="${esc(r.slug)}">
      <td class="num">${r.rank}</td>
      <td><span class="name">${esc(r.name)}</span>${r.watchlist ? '<span class="pill">WATCHLIST</span>' : ''}<span class="badge tier-${r.tier}">${TIERS[r.tier][0]}</span></td>
      <td>${esc(r.category ?? '—')}</td>
      <td class="chains">${esc(r.chains.slice(0, 3).join(', '))}${r.chains.length > 3 ? ` +${r.chains.length - 3}` : ''}</td>
      <td class="num">${usd(r.tvl_usd)}</td>
      <td class="num">${growth(r.change_7d)}</td>
      <td class="num">${usd(r.fdv_usd)}</td>
      <td>${rangeBar(r)}</td>
      <td><span class="odds"><span class="bar"><i style="width:${Math.round(r.token_odds * 100)}%"></i></span><span class="pct">${pct(r.token_odds)}</span></span></td>
      <td class="num val">${usd(r.implied_value_usd)}</td>
    </tr>`).join('');
  for (const tr of $('board-body').querySelectorAll('tr')) {
    tr.addEventListener('click', () => showDetail(tr.dataset.slug));
  }
}
$('board-note').textContent =
  `Expected value = launch value (FDV) × token odds. The launch value is set by a regression fitted on the snapshot's ` +
  `${mc.live_peers} live-token protocols and cross-checked against each protocol's ten nearest live comparables, whose ` +
  `spread draws the bear–bull range. Readiness tiers sort the same board by how close a launch looks. ` +
  `Every watchlist protocol is on the board; the radar adds every other protocol that passes the same house rule — ` +
  `${R.ledger.groups.find((g) => g.key === 'ranked-early').count} below the TVL floor and ` +
  `${R.ledger.groups.find((g) => g.key === 'ranked-off-list').count} above it that the list leaves out. ` +
  `The accounting above the board names where every one of the ${mc.universe} snapshot protocols went. Click any row for its comparables, pricing and farm plan.`;
for (const id of ['q', 'f-cat', 'f-chain', 'f-sort', 'f-watch']) $(id).addEventListener('input', renderBoard);

/* Detail view */
function showDetail(slug) {
  const r = R.rows.find((x) => x.slug === slug);
  if (!r) return;
  const age = r.age_days === null ? 'not recorded' : r.age_days >= 365 ? `${(r.age_days / 365).toFixed(1)} years` : `${r.age_days} days`;
  const base = r.tvl_usd * r.peer_ratio;
  const grown = base * r.growth_factor;
  const wf = [
    ['TVL today', usd(r.tvl_usd), 'the protocol\'s own figure from the snapshot'],
    [`× peer ratio ${r.peer_ratio}`, usd(base), `what the market pays per TVL dollar in ${r.category ?? 'its category'} (${r.peers} live peers)`],
    [`× growth factor ${r.growth_factor}`, usd(grown), 'its seven-day TVL trend, against the live set\'s'],
    [`× age & size factor ${r.age_factor}`, usd(r.fdv_usd), 'how long it has run with no token, and its size'],
    [`× token odds ${pct(r.token_odds)}`, usd(r.implied_value_usd), 'the fitted chance a protocol like this ever lists'],
  ];
  const lo = Math.log10(Math.max(1, r.fdv_bear_usd * 0.8));
  const hi = Math.log10(Math.max(2, r.fdv_bull_usd * 1.25));
  const pos = (v) => Math.min(99, Math.max(0, ((Math.log10(Math.max(1, v)) - lo) / (hi - lo)) * 100));
  const band = `<div class="band">
      <div class="band-track">
        <i class="band-fill" style="left:${pos(r.fdv_bear_usd)}%;width:${Math.max(2, pos(r.fdv_bull_usd) - pos(r.fdv_bear_usd))}%"></i>
        <i class="band-mark" style="left:${pos(r.fdv_usd)}%"></i>
      </div>
      <div class="band-labels"><span>Bear ${usd(r.fdv_bear_usd)}</span><span>Base ${usd(r.fdv_usd)}</span><span>Bull ${usd(r.fdv_bull_usd)}</span></div>
    </div>`;
  const compRows = r.comps.length === 0
    ? '<p class="note">No live comparable could be matched; the price leans on the regression alone.</p>'
    : `<table class="mini"><thead><tr><th>Comparable</th><th>Category</th><th class="num">TVL</th><th class="num">Market cap</th><th class="num">Cap / TVL</th><th class="num">Adjusted to this protocol</th><th class="num">Distance</th></tr></thead><tbody>${
        r.comps.map((c) => `<tr><td>${esc(c.name)}</td><td>${esc(c.category ?? '—')}</td><td class="num">${usd(c.tvl_usd)}</td><td class="num">${usd(c.mcap_usd)}</td><td class="num">${ratioFmt(c.ratio)}</td><td class="num">${ratioFmt(c.adj_ratio)}</td><td class="num">${c.distance}</td></tr>`).join('')
      }</tbody></table>`;
  const e = r.farm_econ;
  $('detail').innerHTML = `
    <div class="detail-head">
      <h2>#${r.rank} ${esc(r.name)}</h2>
      <span class="badge tier-${r.tier}">${TIERS[r.tier][0]} · readiness ${pct(r.readiness)}</span>
      ${r.watchlist ? '<span class="pill">WATCHLIST</span>' : (r.tvl_usd >= R.floor_usd ? '<span class="chains">off-list — above the watchlist floor</span>' : '<span class="chains">early radar — below the watchlist floor</span>')}
      <span class="chains">${esc(r.category ?? 'Uncategorised')} · ${esc(r.chains.join(', ') || 'chain not recorded')}</span>
    </div>
    <div class="detail-grid">
      <div class="card">
        <h3>The protocol</h3>
        <div class="fact"><span class="k">TVL</span><span class="v">${usd(r.tvl_usd)}</span></div>
        <div class="fact"><span class="k">TVL change, 7 days</span><span class="v">${r.change_7d === null ? '—' : `${r.change_7d.toFixed(1)}%`}</span></div>
        <div class="fact"><span class="k">Running with no token for</span><span class="v">${age}</span></div>
        <div class="fact"><span class="k">First tracked</span><span class="v">${esc(r.listed_at ?? '—')}</span></div>
        <div class="fact"><span class="k">Place in its category on this board</span><span class="v">#${r.cat_rank} of ${r.cat_rows}</span></div>
        <div class="fact"><span class="k">Token</span><span class="v">none recorded yet</span></div>
        <div class="fact"><span class="k">Farm plan commits</span><span class="v">$${e.cost_usd} over ${e.weeks} weeks</span></div>
        <div class="fact"><span class="k">Expected reward if it launches (base)</span><span class="v">$${Math.round(e.reward_usd)} · ×${e.roi_x} the cost</span></div>
      </div>
      <div class="card">
        <h3>How the radar prices it</h3>
        <div class="formula">expected value = launch value × token odds</div>
        ${band}
        <div class="waterfall">${wf.map(([k, v, note], i) => `
          <div class="wf-row${i === wf.length - 1 ? ' wf-final' : ''}"><div class="wf-top"><span class="k">${esc(k)}</span><span class="v">${v}</span></div><div class="wf-note">${esc(note)}</div></div>`).join('')}
        </div>
      </div>
      <div class="card card-wide">
        <h3>The comparables it is priced against</h3>
        ${compRows}
        <p class="note">The live protocols nearest this one in size and age, same category and chain family
        preferred. Each one's cap / TVL is adjusted to this protocol's growth, age and size with the fitted
        slopes (the figure after the arrow); their spread draws the bear–bull range above, and their median prices
        it at ${usd(r.fdv_comps_usd)} against the regression's ${usd(r.fdv_usd)}.</p>
      </div>
      <div class="card">
        <h3>Farm economics</h3>
        <div class="fact"><span class="k">Capital in the position</span><span class="v">$${e.capital_usd}</span></div>
        <div class="fact"><span class="k">Fees over ${e.weeks} weeks</span><span class="v">$${e.fees_usd}</span></div>
        <div class="fact"><span class="k">Total cash committed</span><span class="v">$${e.cost_usd}</span></div>
        <div class="fact"><span class="k">Expected reward — bear / base / bull</span><span class="v">$${Math.round(e.reward_bear_usd)} / $${Math.round(e.reward_usd)} / $${Math.round(e.reward_bull_usd)}</span></div>
        <div class="fact"><span class="k">Expected multiple on cost (base)</span><span class="v">×${e.roi_x}</span></div>
        <p class="note">The reward assumes a launch distributes 5% of its value to early users, shared across
        ${e.cohort_wallets} qualifying wallets (one per $25K of TVL), and is already weighted by the fitted
        token odds of ${pct(r.token_odds)}. The 5% and the cohort are stated assumptions — the snapshot
        carries no distribution data — not fitted figures.</p>
      </div>
      <div class="card card-wide">
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
  <p class="lede">No name on this board was priced by hand. When the program runs, it matches every
  pre-token protocol to the live protocols most like it, fits its models on the snapshot itself, and
  tiers and costs what it finds — so the same program, run on next quarter's snapshot, produces next
  quarter's radar with no edits. The board ranks a protocol only if it passes the house rule the
  watchlist was built with — no token recorded, and not a wrapped, staked or bridged product of one
  that trades — and the accounting above the board names where every one of the ${mc.universe}
  snapshot protocols went.</p>
  <div class="detail-grid">
    <div class="card">
      <h3>1 · Value: priced against named comparables</h3>
      <p>Each pre-token protocol is matched to its ten nearest live comparables in a standardised space
      of TVL and age, with the same category and chain family preferred. A comparable's market cap per
      TVL dollar is a price the market has already set; before the set is read, each ratio is adjusted
      to the target's own seven-day growth, age and size with fitted slopes, so a fast-growing or much
      larger neighbour is not misread. The comparables' median prices the protocol one way; their
      middle half — the 25th to 75th percentile — draws its bear-to-bull range. Every row's detail view
      names its comparables with their real TVL and market cap, so the evidence can be checked against
      the snapshot itself.</p>
    </div>
    <div class="card">
      <h3>2 · The second estimator, and the blend test</h3>
      <p>A regression prices the same protocol independently: the median cap / TVL of its category
      (shrunk toward the global median of ×${mc.global_ratio}), corrected by least-squares slopes on
      growth (${mc.growth_slope}), log age (${mc.age_slope}) and size. Both estimators were cross-fitted
      on the live set — each half priced by a model fitted only on the other half:</p>
      <div class="fact"><span class="k">Regression — held-out median error</span><span class="v">×${mc.holdout_median_error_x}</span></div>
      <div class="fact"><span class="k">Comparables — held-out median error</span><span class="v">×${mc.comps_median_error_x}</span></div>
      <div class="fact"><span class="k">50 / 50 blend — held-out median error</span><span class="v">×${mc.blend_median_error_x}</span></div>
      <div class="fact"><span class="k">Within 2× of the real cap — comparables / regression</span><span class="v">${mc.comps_within_2x_pct}% / ${mc.holdout_within_2x_pct}%</span></div>
      <div class="fact"><span class="k">Regression — median error, 20 repeated splits</span><span class="v">×${mc.value_error_repeated_median_x} (middle half ×${mc.value_error_repeated_q1_x}–×${mc.value_error_repeated_q3_x})</span></div>
      <p>The comparables land within 2× more often, but their misses are larger, and every blend tested
      priced the held-out half worse than the regression alone. So the point estimate stays with the
      regression, and the comparables carry what they are best at: named evidence and an honest range.
      The regression itself was re-challenged on the repeated splits — gradient-boosted trees,
      median-loss fits and re-tuned shrinkage all priced them worse — and stayed. The model card
      prints the figures either way — the choice is reported, not hidden.</p>
    </div>
    <div class="card">
      <h3>3 · Token odds and readiness tiers</h3>
      <p>A logistic model fitted on all ${mc.universe} protocols — the label is simply whether a protocol
      records a token — over eight readings of each protocol: log TVL, log age, seven-day growth, its
      category's token record, how many chains it runs on, whether one of them is Ethereum, whether one
      of them is Solana, and whether the snapshot records no start date for it. Across
      the whole universe ${mc.base_rate_pct}% of protocols have a token; the fit separates the ones that
      list from the ones that do not with a held-out AUC of ${mc.odds_auc}. On twenty repeated random
      splits of the universe its median AUC is ${mc.odds_auc_repeated_median} (middle half
      ${mc.odds_auc_repeated_q1}–${mc.odds_auc_repeated_q3}), and the two newest readings earned their
      place on those splits: the six-reading fit they extend scored lower on every one of the twenty.
      Readiness nudges those odds
      by the protocol's own seven-day TVL momentum and sorts the board into three tiers — Imminent
      (50%+), Emerging (30–50%) and Early (under 30%) — so a reader farms in launch order, not just
      value order.</p>
      <p>Separation is not calibration, so the held-out predictions are also checked band by band:
      what the model said, against the share that really held a token.</p>
      <div class="calib">
        <div class="calib-head"><span>Predicted odds band</span><span>Predicted</span><span>Actually had a token</span></div>
        ${mc.odds_calibration.map((b) => `
        <div class="calib-row">
          <span class="calib-band">${b.lo_pct}% – ${b.hi_pct}%</span>
          <span class="calib-bars"><i class="bar-pred" style="width:${b.predicted_pct}%"></i><i class="bar-act" style="width:${b.actual_pct}%"></i></span>
          <span class="calib-nums">${b.predicted_pct}% → ${b.actual_pct}% <span class="chains">(n=${b.n})</span></span>
        </div>`).join('')}
      </div>
    </div>
    <div class="card">
      <h3>4 · Farm economics, with its assumption showing</h3>
      <p>Every farm plan is costed from the protocol's own record: the capital its TVL band calls for,
      the gas its chain family charges, one qualifying action a week over the holding window its age
      sets. The expected reward assumes a launch distributes 5% of its base-case value to early users,
      shared across one qualifying wallet per $25K of TVL, and is weighted by the fitted odds. The 5%
      and the cohort are assumptions, stated here and on every detail view, because the snapshot
      carries no distribution data; everything else on the card is fitted or counted from the snapshot.</p>
    </div>
  </div>`;

/* Live view */
$('live-body').innerHTML = R.live.map((r) => `
  <tr>
    <td><span class="name">${esc(r.name)}</span></td>
    <td>${esc(r.category ?? '—')}</td>
    <td class="num">${usd(r.tvl_usd)}</td>
    <td class="num">${r.mcap_usd === null ? '—' : usd(r.mcap_usd)}</td>
    <td class="num">${r.mcap_usd === null || !r.tvl_usd ? '—' : ratioFmt(r.mcap_usd / r.tvl_usd)}</td>
    <td class="num">${growth(r.change_7d)}</td>
  </tr>`).join('');

/* View switching */
function switchView(name) {
  for (const v of ['board', 'detail', 'model', 'live']) $('view-' + v).hidden = v !== name;
  for (const b of document.querySelectorAll('.view-btn')) b.classList.toggle('is-on', b.dataset.view === name);
}
for (const b of document.querySelectorAll('.view-btn')) b.addEventListener('click', () => switchView(b.dataset.view));

renderBoard();
