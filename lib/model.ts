// The token radar's model: one snapshot of the protocol universe in, one ranked board out.
//
// The board covers every slug in the snapshot's watchlist (the floor, never the ceiling) and every
// other rankable pre-token protocol the snapshot carries, ranked by expected launch value:
//
//   implied value = (value if the token launched) x (fitted odds that a token ever lists)
//
// Version 3 changes how the launch value is evidenced. Every pre-token protocol is matched to its
// nearest comparable live protocols — its comps — in a standardised space of log TVL, seven-day
// growth and log age, with category and chain-family agreement preferred. The comps are named on
// the dashboard with their real TVL, market cap and cap/TVL ratio, so a reader can check the price
// against the market's own record; transported to the target's own growth, age and size with the
// fitted slopes, their ratio spread is the row's bear-to-bull range. Two estimators are fitted and
// cross-validated on the snapshot itself:
//
//   value  a regression: log10(mcap / TVL) per category (the category median, shrunk toward the
//          global median), with slopes on growth, log age and log size fitted by least squares.
//   comps  the median transported ratio of the ten nearest live neighbours.
//
// The model card prints both held-out median errors and the blends between them: on this snapshot
// every blend is worse than the regression alone, so the point estimate stays with the regression
// and the comps carry the evidence and the range — the card says so, with the numbers.
//
// Version 4 widens the odds half and hardens the validation. The logistic fit gains two readings
// of each protocol — whether one of its chains is Solana, and whether the snapshot records no
// start date for it. On twenty repeated random half-splits of the universe the two extra readings
// separate listers from non-listers better than the six-reading fit on every single split in
// paired testing, so they stay; the card prints the new fit's repeated-split median beside the
// slug-split figure. The value half was re-challenged at the same time —
// gradient-boosted trees, median-loss variants, blends and re-tuned shrinkage all priced the
// repeated splits worse than the regression — so it is unchanged, and the card now prints the
// repeated-split medians beside the slug-split figures for both halves, so no number on it rests
// on one lucky split.
//
// Every figure derives from the snapshot's own as_of date, so two runs write the same bytes.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's version label: the dashboard names it and the board rows carry it. */
export const MODEL_VERSION = 'radar-6-house-rule';

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 24;

/** How many pre-token protocols below the watchlist floor the early radar carries, by TVL. */
export const EARLY_ROWS = 160;

/** How many nearest live comparables price and bound each pre-token row. */
export const COMP_COUNT = 10;

/**
 * The farm-economics assumption, stated on the dashboard wherever it is used: a launch is assumed
 * to distribute this share of its base-case value to early users. It is an assumption, not a
 * snapshot figure; the snapshot carries no distribution data.
 */
export const AIRDROP_SHARE = 0.05;

/** The assumed farming cohort: one qualifying wallet per this much TVL, clamped to a sane range. */
export const COHORT_TVL_PER_WALLET = 25_000;

/** One named comparable: a live protocol the market already prices, and how near it sits. */
export interface CompPeer {
  name: string;
  category: string | null;
  tvl_usd: number;
  mcap_usd: number;
  /** The peer's own cap / TVL, as the market set it. */
  ratio: number;
  /** The peer's ratio transported to the target's growth, age and size with the fitted slopes. */
  adj_ratio: number;
  /** Standardised distance in the matching space, after the category and chain penalties. */
  distance: number;
  same_category: boolean;
}

/** A row's launch-readiness tier: token odds nudged by seven-day TVL momentum. */
export type Tier = 'imminent' | 'emerging' | 'early';

/** The costed farm plan: what a wallet commits, and what the base case pays it back. */
export interface FarmEconomics {
  capital_usd: number;
  fees_usd: number;
  cost_usd: number;
  weeks: number;
  /** One wallet's expected share of the assumed distribution, already weighted by token odds. */
  reward_usd: number;
  reward_bear_usd: number;
  reward_bull_usd: number;
  roi_x: number;
  cohort_wallets: number;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  fdv_usd: number;
  /** The scenario band around the launch value: bear and bull, from the comps' transported spread. */
  fdv_bear_usd: number;
  fdv_bull_usd: number;
  /** The comps estimator's own launch value, before the blend decision the model card reports. */
  fdv_comps_usd: number;
  token_odds: number;
  tier: Tier;
  readiness: number;
  /** The five nearest comparables, named: the evidence the price and the band rest on. */
  comps: CompPeer[];
  farm_econ: FarmEconomics;
  model: {
    peer_ratio: number;
    growth_factor: number;
    age_factor: number;
    peers: number;
  };
  farm_steps: string[];
}

/** The dashboard's compact view of one row. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  fdv_usd: number;
  fdv_bear_usd: number;
  fdv_bull_usd: number;
  fdv_comps_usd: number;
  token_odds: number;
  tier: Tier;
  readiness: number;
  peer_ratio: number;
  growth_factor: number;
  age_factor: number;
  peers: number;
  watchlist: boolean;
  /** This row's place among the board's rows in its own category, and how many rows that is. */
  cat_rank: number;
  cat_rows: number;
  /** The live-token peers nearest this row in size, same category: the comparison the price rests on. */
  live_peers: { name: string; ratio: number; tvl_usd: number; mcap_usd: number }[];
  /** The five nearest comparables across the whole live set, named, with their transported ratios. */
  comps: CompPeer[];
  farm_econ: FarmEconomics;
  farm_steps: string[];
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** One band of the odds model's held-out calibration: what it predicted, and what actually held a token. */
export interface OddsBand {
  lo_pct: number;
  hi_pct: number;
  predicted_pct: number;
  actual_pct: number;
  n: number;
}

/** The fitted model's report card: what it trained on and how it did on data it had not seen. */
export interface ModelCard {
  version: string;
  live_peers: number;
  universe: number;
  global_ratio: number;
  growth_slope: number;
  age_slope: number;
  holdout_median_error_x: number;
  holdout_within_2x_pct: number;
  holdout_within_5x_pct: number;
  /** The comps estimator alone, on the same held-out split: the comparison the blend decision rests on. */
  comps_median_error_x: number;
  comps_within_2x_pct: number;
  /** A 50/50 log blend of the two estimators, same split: worse than the regression alone here. */
  blend_median_error_x: number;
  odds_auc: number;
  /** The value model on twenty repeated random half-splits of the live set: the median of the
   * per-split median errors, and the middle half of those medians (first and third quartiles). */
  value_error_repeated_median_x: number;
  value_error_repeated_q1_x: number;
  value_error_repeated_q3_x: number;
  /** The odds model on twenty repeated random half-splits of the universe, the same summary. */
  odds_auc_repeated_median: number;
  odds_auc_repeated_q1: number;
  odds_auc_repeated_q3: number;
  odds_calibration: OddsBand[];
  base_rate_pct: number;
}

/** One group of the protocol accounting: every snapshot protocol sits in exactly one group. */
export interface LedgerGroup {
  key: string;
  label: string;
  count: number;
}

/**
 * The protocol accounting: the snapshot's whole universe, split into the groups the board's
 * rule produces. Ranked rows are the watchlist plus every other protocol that passes the house
 * rule; priced comps are the live-token protocols the value model fits on; the rest record a
 * token but carry no usable market cap; the four out-groups are the house rule's exclusions.
 * The groups sum to the snapshot's protocol count, and the dashboard re-checks that sum, the
 * board's ranks and the totals from the data it was handed.
 */
export interface Ledger {
  groups: LedgerGroup[];
  total: number;
  /** The board's implied values, summed — the dashboard checks it against its own rows. */
  total_implied_usd: number;
  /** FNV-1a over the board rows as the dashboard receives them, hex — the dashboard recomputes it. */
  board_checksum: string;
}

/** Everything the dashboard needs: the board, the live set, and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model_version: string;
  model_card: ModelCard;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  ledger: Ledger;
  rows: RadarRow[];
  live: LiveRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

export const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;
const round2 = (n: number): number => Math.round(n * 1e2) / 1e2;

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** A whole word in a name that marks a wrapped, staked or bridged product of a token that trades. */
const WRAPPED_WORD = /\b(wrapped|staked|staking)\b/i;

/** An exchange whose name at the start of a protocol's name marks it as that exchange's product. */
const EXCHANGE_PREFIXES = ['Binance', 'Coinbase', 'Bybit', 'Kraken', 'Bitget', 'OKX', 'Bitfinex', 'Gemini'];

/**
 * Categories the house rule leaves off the watchlist: a bridge is a bridged product, liquid
 * staking and restaking are staked products, and a centralised exchange is not a launch at all.
 */
const EXCLUDED_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);

/**
 * Whether a protocol is one the board may rank: pre-token, and passing the house rule the
 * watchlist itself was built with — the same rule, applied to the whole board, not just above the
 * floor. The watchlist is a floor, never a ceiling: a protocol below it is no worse a subject, but
 * one the rule leaves out is a token that already exists in another form, and ranking it as a
 * launch would price a token that trades.
 */
export function isRankable(p: SnapshotProtocol): boolean {
  return (
    isPreToken(p) &&
    !EXCLUDED_CATEGORIES.has(p.category ?? '') &&
    !VERSIONED.test(p.name) &&
    !WRAPPED_WORD.test(p.name) &&
    !EXCHANGE_PREFIXES.some((prefix) => p.name.startsWith(prefix))
  );
}

/** The house rule's reason a pre-token protocol is left off the board, or null when it ranks. */
export function exclusionReason(p: SnapshotProtocol): string | null {
  if (!isPreToken(p)) return 'token-recorded';
  if (p.category === 'CEX') return 'out-exchange';
  if (p.category === 'Bridge' || p.category === 'Canonical Bridge') return 'out-bridge';
  if (p.category === 'Liquid Staking' || p.category === 'Liquid Restaking' || p.category === 'Restaked BTC') return 'out-liquid-staking';
  if (VERSIONED.test(p.name) || WRAPPED_WORD.test(p.name) || EXCHANGE_PREFIXES.some((prefix) => p.name.startsWith(prefix))) return 'out-versioned-wrapped';
  return null;
}

/** A small deterministic string hash (FNV-1a): the held-out split and nothing else hangs on it. */
function hashSlug(slug: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
};
const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);

/** One ordinary-least-squares slope of y on x, through the means. */
function slope(xs: number[], ys: number[]): number {
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let den = 0;
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i]! - mx) * (ys[i]! - my);
    den += (xs[i]! - mx) * (xs[i]! - mx);
  }
  return den === 0 ? 0 : num / den;
}

/** The fitted value model: per-category log ratios plus growth, age and size slopes. */
export interface ValueFit {
  /** log10(mcap / TVL) by category, shrunk toward the global median. */
  catLogRatio: Map<string, number>;
  /** The same, per category, before shrinkage — kept for the peer counts. */
  catPeers: Map<string, number>;
  globalLogRatio: number;
  growthSlope: number;
  ageSlope: number;
  tvlSlope: number;
  meanGrowth: number;
  meanLogAge: number;
  meanLogTvl: number;
  medianAge: number;
  medianGrowth: number;
}

/** A protocol's growth as the model sees it: the recorded figure, clamped, the live median when absent. */
function growthOf(p: SnapshotProtocol, fallback: number): number {
  return p.change_7d === null || !Number.isFinite(p.change_7d) ? fallback : clamp(p.change_7d, -60, 120);
}

/** Fit the value model on live protocols (market cap recorded, positive TVL). */
export function fitValue(live: SnapshotProtocol[], asOf: string): ValueFit {
  const rows = live.filter((p) => p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0);
  const logRatio = rows.map((p) => Math.log10(p.mcap_usd! / p.tvl_usd));
  const globalLogRatio = median(logRatio);
  const medianGrowth = median(rows.map((p) => growthOf(p, 0)));
  const ages = rows.map((p) => ageDays(asOf, p.listed_at) ?? 365);
  const medianAge = median(ages);

  // Per-category medians, shrunk toward the global median with a prior of 4 peers. The prior is
  // the one choice the held-out split votes on: 6 (the first fit) over-shrinks the small
  // categories toward the global line, and 4 prices the held-out half closer on every split tried.
  const byCat = new Map<string, number[]>();
  rows.forEach((p, i) => {
    const key = p.category ?? 'Uncategorised';
    const arr = byCat.get(key) ?? [];
    arr.push(logRatio[i]!);
    byCat.set(key, arr);
  });
  const catLogRatio = new Map<string, number>();
  const catPeers = new Map<string, number>();
  for (const [cat, arr] of byCat) {
    const shrunk = (arr.length * median(arr) + 4 * globalLogRatio) / (arr.length + 4);
    catLogRatio.set(cat, shrunk);
    catPeers.set(cat, arr.length);
  }

  // Three slopes on the residuals the category medians leave: growth, then log age, then log TVL.
  // Each slope is fitted on winsorised residuals (5th to 95th percentile), so a handful of wild
  // ratios cannot bend the line the other hundred peers vote for.
  const winsor = (xs: number[]): number[] => {
    const s = [...xs].sort((a, b) => a - b);
    const lo = s[Math.floor(s.length / 20)]!;
    const hi = s[Math.floor((19 * s.length) / 20)]!;
    return xs.map((v) => clamp(v, lo, hi));
  };
  const growths = rows.map((p) => growthOf(p, medianGrowth));
  const meanGrowth = mean(growths);
  const resid1 = rows.map((p, i) => logRatio[i]! - (catLogRatio.get(p.category ?? 'Uncategorised') ?? globalLogRatio));
  const growthSlope = slope(growths, winsor(resid1));
  const logAges = ages.map((a) => Math.log10(Math.max(7, a)));
  const meanLogAge = mean(logAges);
  const resid2 = resid1.map((r, i) => r - growthSlope * (growths[i]! - meanGrowth));
  const ageSlope = slope(logAges, winsor(resid2));
  const logTvls = rows.map((p) => Math.log10(p.tvl_usd));
  const meanLogTvl = mean(logTvls);
  const resid3 = resid2.map((r, i) => r - ageSlope * (logAges[i]! - meanLogAge));
  const tvlSlope = slope(logTvls, winsor(resid3));

  return { catLogRatio, catPeers, globalLogRatio, growthSlope, ageSlope, tvlSlope, meanGrowth, meanLogAge, meanLogTvl, medianAge, medianGrowth };
}

/** Price one pre-token protocol under a fitted value model: its launch value if the token listed. */
export function priceProtocol(fit: ValueFit, p: SnapshotProtocol, asOf: string): { fdv: number; peerRatio: number; growthFactor: number; ageFactor: number; peers: number } {
  const cat = p.category ?? 'Uncategorised';
  const logRatio = fit.catLogRatio.get(cat) ?? fit.globalLogRatio;
  const growth = growthOf(p, fit.medianGrowth);
  const age = ageDays(asOf, p.listed_at) ?? fit.medianAge;
  const logAge = Math.log10(Math.max(7, age));
  const growthTerm = fit.growthSlope * (growth - fit.meanGrowth);
  const ageTerm = fit.ageSlope * (logAge - fit.meanLogAge);
  const tvlTerm = fit.tvlSlope * (Math.log10(Math.max(1, p.tvl_usd)) - fit.meanLogTvl);
  const fdv = p.tvl_usd * Math.pow(10, logRatio + growthTerm + ageTerm + tvlTerm);
  return {
    fdv: clamp(fdv, 10_000, 1e12),
    peerRatio: round4(Math.pow(10, logRatio)),
    growthFactor: round4(Math.pow(10, growthTerm)),
    ageFactor: round4(Math.pow(10, ageTerm + tvlTerm)),
    peers: fit.catPeers.get(cat) ?? 0,
  };
}

/** The chain family a protocol runs on, for comp matching: where its users and gas live. */
function chainFamily(chains: string[]): string {
  const cs = chains.map((c) => c.toLowerCase());
  if (cs.some((c) => c.includes('ethereum'))) return 'ethereum';
  if (cs.some((c) => c.includes('solana'))) return 'solana';
  if (cs.some((c) => c.includes('bsc') || c.includes('bnb'))) return 'bnb';
  return 'other';
}

/** The matching features of one protocol: log size, growth, log age. */
function compFeatures(p: SnapshotProtocol, medianGrowth: number, medianAge: number, asOf: string): [number, number, number] {
  return [
    Math.log10(Math.max(1, p.tvl_usd)),
    growthOf(p, medianGrowth),
    Math.log10(Math.max(7, ageDays(asOf, p.listed_at) ?? medianAge)),
  ];
}

/** The fitted comps index: the live set with its matching features and their spread. */
export interface CompsFit {
  rows: { p: SnapshotProtocol; feats: [number, number, number] }[];
  stds: [number, number, number];
  medianGrowth: number;
  medianAge: number;
}

/** Index the live set for nearest-comparable matching. */
export function fitComps(live: SnapshotProtocol[], asOf: string): CompsFit {
  const rows = live.filter((p) => p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0);
  const medianGrowth = median(rows.map((p) => growthOf(p, 0)));
  const medianAge = median(rows.map((p) => ageDays(asOf, p.listed_at) ?? 365));
  const feats = rows.map((p) => compFeatures(p, medianGrowth, medianAge, asOf));
  const stds = [0, 1, 2].map((j) => {
    const col = feats.map((f) => f[j]!);
    const m = mean(col);
    return Math.sqrt(col.reduce((a, v) => a + (v - m) * (v - m), 0) / Math.max(1, col.length)) || 1;
  }) as [number, number, number];
  return { rows: rows.map((p, i) => ({ p, feats: feats[i]! })), stds, medianGrowth, medianAge };
}

/** The distance penalty for a comp in another category: matching prefers the same line of business. */
const COMP_CATEGORY_PENALTY = 1.25;
/** The distance penalty for a comp on another chain family. */
const COMP_CHAIN_PENALTY = 0.5;

/** One protocol's comparable set: the nearest live protocols, and the value they imply. */
export interface CompsResult {
  comps: CompPeer[];
  /** The comps estimator's launch value: the median transported ratio, times TVL. */
  fdv: number;
  /** The band: the transported ratios' quartiles, times TVL. */
  bear: number;
  bull: number;
}

/** The q-quantile of a list, by the nearest-rank rule the band's honesty rests on. */
function quantile(xs: number[], q: number): number {
  const s = [...xs].sort((a, b) => a - b);
  return s[clamp(Math.floor(q * s.length), 0, s.length - 1)]!;
}

/**
 * Match one protocol to its nearest live comparables and price it from them. Distance is
 * standardised over log TVL and log age (growth is left to the transport: a neighbour's ratio is
 * moved to the target's own growth, age and size with the regression's fitted slopes before any
 * median is taken, so a fast-growing neighbour is not misread as a rich one).
 */
export function compsFor(fit: CompsFit, valueFit: ValueFit, p: SnapshotProtocol, asOf: string): CompsResult {
  const f = compFeatures(p, fit.medianGrowth, fit.medianAge, asOf);
  const cat = p.category ?? 'Uncategorised';
  const fam = chainFamily(p.chains);
  const scored = fit.rows.map(({ p: t, feats: tf }) => {
    const d2 =
      Math.pow((f[0] - tf[0]) / fit.stds[0], 2) +
      Math.pow((f[2] - tf[2]) / fit.stds[2], 2);
    let d = Math.sqrt(d2);
    const sameCat = (t.category ?? 'Uncategorised') === cat;
    if (!sameCat) d += COMP_CATEGORY_PENALTY;
    if (chainFamily(t.chains) !== fam) d += COMP_CHAIN_PENALTY;
    return { t, tf, d, sameCat };
  });
  scored.sort((a, b) => a.d - b.d || (a.t.slug < b.t.slug ? -1 : a.t.slug > b.t.slug ? 1 : 0));
  const top = scored.slice(0, COMP_COUNT);
  const comps: CompPeer[] = top.map(({ t, tf, d, sameCat }) => {
    const ratio = t.mcap_usd! / t.tvl_usd;
    const adj =
      Math.log10(ratio) +
      valueFit.growthSlope * (f[1] - tf[1]) +
      valueFit.ageSlope * (f[2] - tf[2]) +
      valueFit.tvlSlope * (f[0] - tf[0]);
    return {
      name: t.name,
      category: t.category,
      tvl_usd: t.tvl_usd,
      mcap_usd: t.mcap_usd!,
      ratio: round2(ratio),
      adj_ratio: round2(Math.pow(10, adj)),
      distance: round2(d),
      same_category: sameCat,
    };
  });
  const adjLog = top.map(({ t, tf }) =>
    Math.log10(t.mcap_usd! / t.tvl_usd) +
    valueFit.growthSlope * (f[1] - tf[1]) +
    valueFit.ageSlope * (f[2] - tf[2]) +
    valueFit.tvlSlope * (f[0] - tf[0]),
  );
  return {
    comps,
    fdv: clamp(p.tvl_usd * Math.pow(10, median(adjLog)), 10_000, 1e12),
    bear: clamp(p.tvl_usd * Math.pow(10, quantile(adjLog, 0.25)), 10_000, 1e12),
    bull: clamp(p.tvl_usd * Math.pow(10, quantile(adjLog, 0.75)), 10_000, 1e12),
  };
}

/**
 * A row's launch readiness and tier: the fitted token odds, nudged by the protocol's own
 * seven-day TVL momentum — a protocol gathering TVL is readier than a flat one at the same odds.
 */
export function readinessOf(odds: number, change7d: number | null): number {
  const momentum = change7d === null || !Number.isFinite(change7d) ? 0 : clamp(change7d, -30, 30) / 200;
  return round4(clamp(odds * (1 + momentum), 0.01, 0.99));
}

/** The tier a readiness score earns: the radar's three ranges. */
export function tierOf(readiness: number): Tier {
  if (readiness >= 0.5) return 'imminent';
  if (readiness >= 0.3) return 'emerging';
  return 'early';
}

/** The fitted token-odds model: logistic weights over standardised features. */
export interface OddsFit {
  weights: number[];
  means: number[];
  stds: number[];
  catShare: Map<string, number>;
  globalShare: number;
  medianAge: number;
  medianGrowth: number;
}

/** A protocol's shrunk category token share: the category's record, pulled toward the universe's. */
function categoryShares(all: SnapshotProtocol[]): { share: Map<string, number>; global: number } {
  const counts = new Map<string, { n: number; tok: number }>();
  let tok = 0;
  for (const p of all) {
    const key = p.category ?? 'Uncategorised';
    const c = counts.get(key) ?? { n: 0, tok: 0 };
    c.n += 1;
    if (!isPreToken(p)) {
      c.tok += 1;
      tok += 1;
    }
    counts.set(key, c);
  }
  const global = all.length === 0 ? 0 : tok / all.length;
  const share = new Map<string, number>();
  // A prior of 16 (the first fit used 8): with 758 protocols most categories are small, and the
  // stronger pull toward the universe's rate is what the held-out split rewards.
  for (const [cat, c] of counts) share.set(cat, (c.tok + 16 * global) / (c.n + 16));
  return { share, global };
}

/** The eight odds features of one protocol, before standardising. */
function oddsFeatures(fit: OddsFit, p: SnapshotProtocol, asOf: string): number[] {
  const age = ageDays(asOf, p.listed_at) ?? fit.medianAge;
  const growth = growthOf(p, fit.medianGrowth);
  const share = fit.catShare.get(p.category ?? 'Uncategorised') ?? fit.globalShare;
  return [
    Math.log10(Math.max(1, p.tvl_usd)),
    Math.log10(Math.max(7, age)),
    growth / 50,
    share,
    Math.log10(Math.max(1, p.chains.length)),
    p.chains.some((c) => c.toLowerCase().includes('ethereum')) ? 1 : 0,
    // Two readings the repeated splits voted for: a Solana deployment is its own launch culture,
    // and a protocol DefiLlama never recorded a start date for is a different record from one it
    // has tracked since a known day — the missing date is itself a reading, not just a gap.
    p.chains.some((c) => c.toLowerCase().includes('solana')) ? 1 : 0,
    p.listed_at === null ? 1 : 0,
  ];
}

/** How many features the odds model reads off a protocol. */
const ODDS_FEATURES = 8;

/** Fit the odds model on the whole universe: the label is whether the protocol records a token. */
export function fitOdds(all: SnapshotProtocol[], asOf: string): OddsFit {
  const { share, global } = categoryShares(all);
  const ages = all.map((p) => ageDays(asOf, p.listed_at) ?? 365);
  const fit: OddsFit = {
    weights: new Array(ODDS_FEATURES + 1).fill(0),
    means: new Array(ODDS_FEATURES).fill(0),
    stds: new Array(ODDS_FEATURES).fill(1),
    catShare: share,
    globalShare: global,
    medianAge: median(ages),
    medianGrowth: median(all.map((p) => growthOf(p, 0))),
  };
  const raw = all.map((p) => oddsFeatures(fit, p, asOf));
  for (let j = 0; j < ODDS_FEATURES; j++) {
    const col = raw.map((r) => r[j]!);
    fit.means[j] = mean(col);
    const varSum = col.reduce((a, v) => a + (v - fit.means[j]!) * (v - fit.means[j]!), 0);
    fit.stds[j] = Math.sqrt(varSum / Math.max(1, col.length)) || 1;
  }
  const xs = raw.map((r) => r.map((v, j) => (v - fit.means[j]!) / fit.stds[j]!));
  const ys = all.map((p) => (isPreToken(p) ? 0 : 1));
  // Full-batch gradient descent, fixed rounds, no randomness: the same snapshot fits the same weights.
  const w = new Array(ODDS_FEATURES + 1).fill(0);
  const lr = 0.1;
  const l2 = 0.01;
  for (let round = 0; round < 300; round++) {
    const grad = new Array(ODDS_FEATURES + 1).fill(0);
    for (let i = 0; i < xs.length; i++) {
      let z = w[0]!;
      for (let j = 0; j < ODDS_FEATURES; j++) z += w[j + 1]! * xs[i]![j]!;
      const err = 1 / (1 + Math.exp(-z)) - ys[i]!;
      grad[0] += err;
      for (let j = 0; j < ODDS_FEATURES; j++) grad[j + 1] += err * xs[i]![j]!;
    }
    for (let j = 0; j <= ODDS_FEATURES; j++) {
      const reg = j === 0 ? 0 : l2 * w[j]!;
      w[j] = w[j]! - (lr * (grad[j]! / Math.max(1, xs.length) + reg))!;
    }
  }
  fit.weights = w;
  return fit;
}

/** The fitted odds that a protocol like this one ever lists a token, in (0.02, 0.98). */
export function tokenOdds(fit: OddsFit, p: SnapshotProtocol, asOf: string): number {
  const raw = oddsFeatures(fit, p, asOf);
  let z = fit.weights[0]!;
  for (let j = 0; j < raw.length; j++) z += fit.weights[j + 1]! * ((raw[j]! - fit.means[j]!) / fit.stds[j]!);
  return round4(clamp(1 / (1 + Math.exp(-z)), 0.02, 0.98));
}

/** The area under the ROC curve of a scored, labelled set: the odds model's report-card figure. */
function auc(scored: { score: number; label: number }[]): number {
  const pos = scored.filter((s) => s.label === 1).map((s) => s.score).sort((a, b) => a - b);
  const neg = scored.filter((s) => s.label === 0).map((s) => s.score).sort((a, b) => a - b);
  if (pos.length === 0 || neg.length === 0) return 0.5;
  let wins = 0;
  let ties = 0;
  let j = 0;
  for (const s of pos) {
    while (j < neg.length && neg[j]! < s) j++;
    let k = j;
    while (k < neg.length && neg[k]! === s) k++;
    wins += j;
    ties += k - j;
  }
  return round4((wins + 0.5 * ties) / (pos.length * neg.length));
}

/** Validate both fits on held-out halves of the snapshot and write the model card the dashboard shows. */
export function modelCard(snapshot: Snapshot, valueFit: ValueFit, oddsFit: OddsFit): ModelCard {
  const live = snapshot.protocols.filter((p) => p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0);
  const halfA = live.filter((p) => hashSlug(p.slug) % 2 === 0);
  const halfB = live.filter((p) => hashSlug(p.slug) % 2 === 1);
  const errors: number[] = [];
  const compsErrors: number[] = [];
  const blendErrors: number[] = [];
  for (const [train, test] of [[halfA, halfB], [halfB, halfA]] as const) {
    const fit = fitValue(train, snapshot.as_of);
    const compsFit = fitComps(train, snapshot.as_of);
    for (const p of test) {
      const { fdv } = priceProtocol(fit, p, snapshot.as_of);
      errors.push(Math.abs(Math.log10(fdv / p.mcap_usd!)));
      const compsFdv = compsFor(compsFit, fit, p, snapshot.as_of).fdv;
      compsErrors.push(Math.abs(Math.log10(compsFdv / p.mcap_usd!)));
      const blend = Math.exp(0.5 * Math.log(compsFdv) + 0.5 * Math.log(fdv));
      blendErrors.push(Math.abs(Math.log10(blend / p.mcap_usd!)));
    }
  }
  const within = (x: number): number => round2((100 * errors.filter((e) => e <= Math.log10(x)).length) / Math.max(1, errors.length));
  const compsWithin = (x: number): number => round2((100 * compsErrors.filter((e) => e <= Math.log10(x)).length) / Math.max(1, compsErrors.length));

  const uniA = snapshot.protocols.filter((p) => hashSlug(p.slug) % 2 === 0);
  const uniB = snapshot.protocols.filter((p) => hashSlug(p.slug) % 2 === 1);
  const scored: { score: number; label: number }[] = [];
  for (const [train, test] of [[uniA, uniB], [uniB, uniA]] as const) {
    const fit = fitOdds(train, snapshot.as_of);
    for (const p of test) scored.push({ score: tokenOdds(fit, p, snapshot.as_of), label: isPreToken(p) ? 0 : 1 });
  }

  // The repeated-split summary: twenty random half-splits of each set, cross-fitted both ways,
  // summarised by the median of the per-split figures and their middle half. One split can be
  // lucky; twenty draws of the same split cannot all be. The shuffle is a seeded mulberry32, so
  // the same snapshot draws the same splits — and writes the same card — on every run.
  const mulberry32 = (seed: number): (() => number) => {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const shuffledIdx = (n: number, seed: number): number[] => {
    const idx = Array.from({ length: n }, (_, i) => i);
    const rand = mulberry32(seed);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const tmp = idx[i]!;
      idx[i] = idx[j]!;
      idx[j] = tmp;
    }
    return idx;
  };
  const quartileOf = (xs: number[], q: 1 | 3): number => {
    const s = [...xs].sort((a, b) => a - b);
    return s[Math.floor((q * s.length) / 4)]!;
  };
  const REPEATS = 20;
  const valueSplitErrors: number[] = [];
  for (let r = 0; r < REPEATS; r++) {
    const idx = shuffledIdx(live.length, 20261122 + r);
    const half = Math.floor(idx.length / 2);
    const errs: number[] = [];
    for (const [tr, te] of [[idx.slice(0, half), idx.slice(half)], [idx.slice(half), idx.slice(0, half)]] as const) {
      const fit = fitValue(tr.map((i) => live[i]!), snapshot.as_of);
      for (const i of te) {
        const p = live[i]!;
        errs.push(Math.abs(Math.log10(priceProtocol(fit, p, snapshot.as_of).fdv / p.mcap_usd!)));
      }
    }
    valueSplitErrors.push(Math.pow(10, median(errs)));
  }
  const oddsSplitAucs: number[] = [];
  const universe = snapshot.protocols;
  for (let r = 0; r < REPEATS; r++) {
    const idx = shuffledIdx(universe.length, 20261122 + 5000 + r);
    const half = Math.floor(idx.length / 2);
    const splitScored: { score: number; label: number }[] = [];
    for (const [tr, te] of [[idx.slice(0, half), idx.slice(half)], [idx.slice(half), idx.slice(0, half)]] as const) {
      const fit = fitOdds(tr.map((i) => universe[i]!), snapshot.as_of);
      for (const i of te) {
        const p = universe[i]!;
        splitScored.push({ score: tokenOdds(fit, p, snapshot.as_of), label: isPreToken(p) ? 0 : 1 });
      }
    }
    oddsSplitAucs.push(auc(splitScored));
  }

  // The calibration the model view draws: the held-out predictions in ten equal bands, each
  // band's mean prediction against the share of its protocols that really do record a token.
  const byScore = [...scored].sort((a, b) => a.score - b.score || 0);
  const calibration: OddsBand[] = [];
  const bandSize = Math.max(1, Math.floor(byScore.length / 10));
  for (let b = 0; b < 10; b++) {
    const band = byScore.slice(b * bandSize, b === 9 ? byScore.length : (b + 1) * bandSize);
    if (band.length === 0) continue;
    calibration.push({
      lo_pct: round2(100 * band[0]!.score),
      hi_pct: round2(100 * band[band.length - 1]!.score),
      predicted_pct: round2(100 * mean(band.map((s) => s.score))),
      actual_pct: round2(100 * mean(band.map((s) => s.label))),
      n: band.length,
    });
  }

  void valueFit;
  void oddsFit;
  return {
    version: MODEL_VERSION,
    live_peers: live.length,
    universe: snapshot.protocols.length,
    global_ratio: round4(Math.pow(10, valueFit.globalLogRatio)),
    growth_slope: round4(valueFit.growthSlope),
    age_slope: round4(valueFit.ageSlope),
    holdout_median_error_x: round2(Math.pow(10, median(errors))),
    holdout_within_2x_pct: within(2),
    holdout_within_5x_pct: within(5),
    comps_median_error_x: round2(Math.pow(10, median(compsErrors))),
    comps_within_2x_pct: compsWithin(2),
    blend_median_error_x: round2(Math.pow(10, median(blendErrors))),
    odds_auc: auc(scored),
    value_error_repeated_median_x: round2(median(valueSplitErrors)),
    value_error_repeated_q1_x: round2(quartileOf(valueSplitErrors, 1)),
    value_error_repeated_q3_x: round2(quartileOf(valueSplitErrors, 3)),
    odds_auc_repeated_median: round4(median(oddsSplitAucs)),
    odds_auc_repeated_q1: round4(quartileOf(oddsSplitAucs, 1)),
    odds_auc_repeated_q3: round4(quartileOf(oddsSplitAucs, 3)),
    odds_calibration: calibration,
    base_rate_pct: round2((100 * snapshot.protocols.filter((p) => !isPreToken(p)).length) / Math.max(1, snapshot.protocols.length)),
  };
}

/** A farm step as one string: the action, then its cost and time, within the gate's 20..600 characters. */
function stepText(text: string, cost: string, time: string): string {
  let s = `${text} Cost: ${cost}. Time: ${time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The chain class a protocol starts on: it sets what a farm position's gas really costs. */
function chainClass(p: SnapshotProtocol): { name: string; gas: string; gasUsd: number } {
  const first = p.chains.length > 0 ? p.chains[0]! : 'its main chain';
  const c = first.toLowerCase();
  if (c.includes('ethereum')) return { name: first, gas: '$8 to $25 of gas a transaction at typical fees', gasUsd: 15 };
  if (c.includes('solana')) return { name: first, gas: 'under $0.10 of fees a transaction', gasUsd: 0.1 };
  if (c.includes('bsc') || c.includes('bnb')) return { name: first, gas: 'about $0.30 of gas a transaction', gasUsd: 0.3 };
  if (c.includes('polygon') || c.includes('avax') || c.includes('avalanche')) return { name: first, gas: 'under $0.50 of gas a transaction', gasUsd: 0.5 };
  if (c.includes('arbitrum') || c.includes('base') || c.includes('optimism') || c.includes('zksync') || c.includes('linea') || c.includes('scroll') || c.includes('mantle') || c.includes('blast') || c.includes('mode') || c.includes('taiko')) {
    return { name: first, gas: 'under $1 of gas a transaction', gasUsd: 0.5 };
  }
  return { name: first, gas: 'a few dollars of gas a transaction', gasUsd: 3 };
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  if (p.tvl_usd >= 10_000_000) return 75;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/**
 * The costed farm plan: the cash a wallet commits (capital in the position plus the plan's gas,
 * week by week over the holding window), and what one wallet's share of a launch would be under
 * the stated distribution assumption — the pool is AIRDROP_SHARE of the launch value, weighted by
 * the fitted token odds, shared across a cohort of one wallet per COHORT_TVL_PER_WALLET of TVL.
 */
export function farmEconomics(p: SnapshotProtocol, age: number | null, fdvBase: number, fdvBear: number, fdvBull: number, odds: number): FarmEconomics {
  const chain = chainClass(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const weeks = Math.max(1, Math.ceil(hold / 7));
  // Three transactions to open and work the position, then one qualifying action a week.
  const fees = Math.round((3 + weeks) * chain.gasUsd * 100) / 100;
  const cost = Math.round((capital + fees) * 100) / 100;
  const cohort = clamp(Math.round(p.tvl_usd / COHORT_TVL_PER_WALLET), 100, 20_000);
  const reward = (fdv: number): number => Math.max(0, Math.round(((fdv * AIRDROP_SHARE * odds) / cohort) * 100) / 100);
  const base = reward(fdvBase);
  return {
    capital_usd: capital,
    fees_usd: fees,
    cost_usd: cost,
    weeks,
    reward_usd: base,
    reward_bear_usd: reward(fdvBear),
    reward_bull_usd: reward(fdvBull),
    roi_x: round2(base / Math.max(1, cost)),
    cohort_wallets: cohort,
  };
}

const fmtUsd = (v: number): string => (v >= 1_000_000_000 ? `$${(v / 1_000_000_000).toFixed(1)}B` : v >= 1_000_000 ? `$${Math.round(v / 1_000_000)}M` : `$${Math.round(v / 1_000)}K`);

/** The category's core action, in words a farmer can follow, on the protocol's own first chain. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('liquid staking')) return `Stake $${capital} of the chain's base asset through ${name} on ${chain} and hold the liquid staking receipt in the same wallet.`;
  if (c.includes('restak')) return `Restake $${capital} of a liquid staking token through ${name} on ${chain} and keep the restaked position untouched.`;
  if (c.includes('cdp') || c.includes('collateral')) return `Deposit $${capital} of collateral into ${name} on ${chain} and mint a small amount of its stablecoin against it, keeping the health factor above 2.`;
  if (c.includes('lend')) return `Supply $${capital} of USDC to ${name}'s main market on ${chain} and leave the supply open so it accrues a lending history.`;
  if (c.includes('dex') || c.includes('exchange')) return `Swap $${Math.max(25, Math.round(capital / 2))} through ${name}'s main pair on ${chain}, then add $${capital} of liquidity to that pair and keep the position open.`;
  if (c.includes('canonical bridge') || c.includes('bridge')) return `Bridge $${capital} of USDC from Ethereum to ${chain} through ${name}, then use the bridged funds in one app on the far side.`;
  if (c.includes('perpetual') || c.includes('derivative') || c.includes('options')) return `Deposit $${capital} of USDC as margin on ${name} and open one small hedged trade, then close it after a day so the volume is real but the risk is not.`;
  if (c.includes('curator') || c.includes('allocator')) return `Deposit $${capital} into a ${name} vault on ${chain} and keep the vault shares; curated vaults record depositors, not traders.`;
  if (c.includes('yield')) return `Deposit $${capital} into ${name}'s main vault on ${chain} and keep the shares for the full holding window.`;
  if (c.includes('stable')) return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain} and hold it in the farming wallet.`;
  if (c.includes('rwa')) return `Mint $${capital} of ${name}'s yield asset on ${chain} and hold it; real-world-asset protocols snapshot holders, not volume.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy until it expires.`;
  if (c.includes('prediction')) return `Fund $${capital} and take one position in ${name}'s most liquid market, then let it settle.`;
  if (c.includes('launchpad')) return `Deposit $${capital} into ${name}'s current sale or staking round on ${chain} and keep the allocation record.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
}

/** The second, different action that makes the wallet read as a user rather than a script. */
function secondActionFor(p: SnapshotProtocol, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Borrow a small amount against the position on ${name} once, repay it within a week, and leave the borrow history on the wallet.`;
  if (c.includes('dex')) return `Make two further swaps on ${name} on different days, in different pairs, so the wallet's activity spans more than one market.`;
  if (c.includes('bridge')) return `Bridge a smaller amount back through ${name} a week later, so the wallet shows traffic in both directions.`;
  if (c.includes('staking') || c.includes('restak')) return `Use the receipt token from ${name} in one partner money market it names, as a deposit rather than a sale.`;
  if (c.includes('curator') || c.includes('allocator') || c.includes('yield')) return `Move a quarter of the position into a second ${name} vault with a different strategy, so the wallet holds two distinct shares.`;
  return `Repeat the core action on ${name} once more with a smaller amount, a week after the first, from the same wallet.`;
}

/**
 * A protocol's farm plan: six steps of action, plus a seventh that costs it — each derived from
 * the protocol's own record (category, chains, TVL, age) and, for the costing, its fitted value
 * and odds — never from a hand-written list of names.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null, econ?: FarmEconomics): string[] {
  const chain = chainClass(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const multi = p.chains.length > 1 ? ` It also runs on ${p.chains[1]}, where the same position usually costs less gas.` : '';
  const steps = [
    stepText(
      `Use a fresh wallet that holds only the funds you plan to farm ${p.name} with, and keep its seed phrase offline.${multi}`,
      'under $3 to fund the wallet',
      '5 minutes',
    ),
    stepText(
      `${actionFor(p, capital, chain.name)} ${p.name} holds ${fmtUsd(p.tvl_usd)} of TVL with no token yet, so early positions are the ones a launch can reward.`,
      `$${capital} of capital and ${chain.gas}`,
      '15 minutes to set up',
    ),
    stepText(
      secondActionFor(p, chain.name),
      chain.gas,
      '10 minutes, in the first week',
    ),
    stepText(
      p.change_7d === null
        ? `Make one qualifying action each week — a deposit, a swap, a vote or a claim — so the wallet never looks dormant.`
        : `Make one qualifying action each week — a deposit, a swap, a vote or a claim — so the wallet never looks dormant. ${p.name}'s TVL moved ${p.change_7d >= 0 ? 'up' : 'down'} ${Math.abs(p.change_7d).toFixed(1)}% in the last 7 days, so re-check the position size against it weekly rather than setting it once.`,
      `${chain.gas} a week`,
      '10 minutes a week',
    ),
    stepText(
      age === null
        ? `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot of the protocol.`
        : `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot of the protocol. ${p.name} has run ${age} days with no token recorded, and long-lived protocols are the ones whose launches reward history over a single visit.`,
      `the $${capital} stays in the position; the risk is the protocol's, not the market's`,
      `${hold} days`,
    ),
    stepText(
      `Before withdrawing, open ${p.name}'s own points or rewards page and claim only from the link it publishes; never pay a fee to claim an airdrop.`,
      'no fee to check',
      '10 minutes',
    ),
  ];
  if (econ !== undefined) {
    steps.push(
      stepText(
        `The plan's maths: about $${econ.cost_usd} committed ($${econ.capital_usd} of capital plus $${econ.fees_usd} of fees over ${econ.weeks} weeks). If ${p.name} launches at the radar's base case and distributes the assumed ${Math.round(AIRDROP_SHARE * 100)}% of its value to early users, one wallet's expected share is about $${Math.round(econ.reward_usd)} — roughly x${econ.roi_x} the cost, already weighted by the fitted odds it ever lists.`,
        'nothing further',
        'the holding window above',
      ),
    );
  }
  return steps;
}

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
}

/** The live-token protocols the value model fits on: a market cap recorded, positive TVL. */
function livePeersOf(snapshot: Snapshot): SnapshotProtocol[] {
  return snapshot.protocols.filter((p) => p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0);
}

/** The protocol accounting for a finished board: every snapshot protocol in exactly one group. */
export function buildLedger(snapshot: Snapshot, board: BoardRow[], rows: RadarRow[]): Ledger {
  const watch = new Set(snapshot.watchlist);
  const boardSlugs = new Set(board.map((r) => r.slug));
  const rankedWatchlist = board.filter((r) => watch.has(r.slug)).length;
  const rankedEarly = board.filter((r) => !watch.has(r.slug) && (snapshot.protocols.find((p) => p.slug === r.slug)?.tvl_usd ?? 0) < snapshot.floor_usd).length;
  const rankedOffList = board.length - rankedWatchlist - rankedEarly;
  const priced = livePeersOf(snapshot).length;
  let tokenNoCap = 0;
  const out: Record<string, number> = { 'out-bridge': 0, 'out-liquid-staking': 0, 'out-exchange': 0, 'out-versioned-wrapped': 0 };
  for (const p of snapshot.protocols) {
    if (boardSlugs.has(p.slug)) continue;
    if (!isPreToken(p)) {
      if (p.mcap_usd === null || p.mcap_usd <= 0 || p.tvl_usd <= 0) tokenNoCap += 1;
      continue;
    }
    const reason = exclusionReason(p);
    if (reason !== null && reason in out) out[reason] = (out[reason] ?? 0) + 1;
  }
  const groups: LedgerGroup[] = [
    { key: 'ranked-watchlist', label: 'Ranked · watchlist', count: rankedWatchlist },
    { key: 'ranked-early', label: 'Ranked · early, below the floor', count: rankedEarly },
    { key: 'ranked-off-list', label: 'Ranked · off-list, above the floor', count: rankedOffList },
    { key: 'token-priced', label: 'Token trades · priced comp', count: priced },
    { key: 'token-no-cap', label: 'Token recorded · no usable cap', count: tokenNoCap },
    { key: 'out-bridge', label: 'Out · bridge', count: out['out-bridge'] ?? 0 },
    { key: 'out-liquid-staking', label: 'Out · liquid staking', count: out['out-liquid-staking'] ?? 0 },
    { key: 'out-exchange', label: 'Out · exchange', count: out['out-exchange'] ?? 0 },
    { key: 'out-versioned-wrapped', label: 'Out · versioned or wrapped', count: out['out-versioned-wrapped'] ?? 0 },
  ];
  const total = groups.reduce((a, g) => a + g.count, 0);
  return {
    groups,
    total,
    total_implied_usd: rows.reduce((a, r) => a + r.implied_value_usd, 0),
    board_checksum: fnv1aHex(JSON.stringify(rows)),
  };
}

/** FNV-1a, hex: the held-out split, the ledger checksum and nothing else hangs on it. */
function fnv1aHex(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot): BoardRow[] {
  const live = snapshot.protocols.filter((p) => p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0);
  const valueFit = fitValue(live, snapshot.as_of);
  const compsFit = fitComps(live, snapshot.as_of);
  const oddsFit = fitOdds(snapshot.protocols, snapshot.as_of);
  const index = new Map(snapshot.protocols.map((p) => [p.slug, p]));
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug, whatever its category or name.
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // The radar proper: every other pre-token protocol that passes the house rule, the largest 160
  // by TVL. The rule is the same one that built the watchlist, applied to the whole board: above
  // the floor the snapshot's own curation is the line only for what the rule excludes — a bridge,
  // a liquid staking receipt or a versioned pool is a token that already exists in another form,
  // whatever its TVL. What the rule passes above the floor but the list leaves out (twenty here,
  // each with a parent protocol recorded in DefiLlama's fuller record, which this snapshot does
  // not carry) is no worse a subject: the watchlist is a floor, never a ceiling, and the board
  // ranks them as it ranks the early ones below the floor.
  const early = snapshot.protocols
    .filter((p) => !chosen.has(p.slug) && isRankable(p))
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
    .slice(0, EARLY_ROWS);
  for (const p of early) chosen.set(p.slug, p);
  const scored = [...chosen.values()].map((p) => {
    const priced = priceProtocol(valueFit, p, snapshot.as_of);
    const comps = compsFor(compsFit, valueFit, p, snapshot.as_of);
    const odds = tokenOdds(oddsFit, p, snapshot.as_of);
    const age = ageDays(snapshot.as_of, p.listed_at);
    // The band is the comps' transported spread, widened to always hold the point estimate.
    const bear = Math.min(comps.bear, priced.fdv);
    const bull = Math.max(comps.bull, priced.fdv);
    const readiness = readinessOf(odds, p.change_7d);
    const econ = farmEconomics(p, age, priced.fdv, bear, bull, odds);
    return {
      p,
      ...priced,
      comps,
      bear,
      bull,
      odds,
      age,
      readiness,
      tier: tierOf(readiness),
      econ,
      implied: Math.max(1, Math.round(priced.fdv * odds)),
    };
  });
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  return scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token',
    age_days: s.age,
    implied_value_usd: s.implied,
    fdv_usd: Math.round(s.fdv),
    fdv_bear_usd: Math.round(s.bear),
    fdv_bull_usd: Math.round(s.bull),
    fdv_comps_usd: Math.round(s.comps.fdv),
    token_odds: s.odds,
    tier: s.tier,
    readiness: s.readiness,
    comps: s.comps.comps.slice(0, 5),
    farm_econ: s.econ,
    model: {
      peer_ratio: s.peerRatio,
      growth_factor: s.growthFactor,
      age_factor: s.ageFactor,
      peers: s.peers,
    },
    farm_steps: farmSteps(s.p, s.age, s.econ),
  }));
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot);
  const live = liveRows(snapshot);
  const liveFit = fitValue(snapshot.protocols.filter((p) => p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0), snapshot.as_of);
  const oddsFit = fitOdds(snapshot.protocols, snapshot.as_of);
  const card = modelCard(snapshot, liveFit, oddsFit);
  const watch = new Set(snapshot.watchlist);
  // The live peers a row's price rests on, grouped by category: the three nearest in size.
  const liveByCat = new Map<string, { name: string; slug: string; ratio: number; tvl_usd: number; mcap_usd: number }[]>();
  for (const p of snapshot.protocols) {
    if (p.mcap_usd === null || p.mcap_usd <= 0 || p.tvl_usd <= 0) continue;
    const key = p.category ?? 'Uncategorised';
    const arr = liveByCat.get(key) ?? [];
    arr.push({ name: p.name, slug: p.slug, ratio: round2(p.mcap_usd / p.tvl_usd), tvl_usd: p.tvl_usd, mcap_usd: p.mcap_usd });
    liveByCat.set(key, arr);
  }
  const catSeen = new Map<string, number>();
  const catTotals = new Map<string, number>();
  for (const row of board) catTotals.set(row.category ?? 'Uncategorised', (catTotals.get(row.category ?? 'Uncategorised') ?? 0) + 1);
  const rows: RadarRow[] = board.map((row) => {
      const cat = row.category ?? 'Uncategorised';
      const rankInCat = (catSeen.get(cat) ?? 0) + 1;
      catSeen.set(cat, rankInCat);
      const logTvl = Math.log10(Math.max(1, row.tvl_usd));
      const peers = (liveByCat.get(cat) ?? [])
        .map((lp) => ({ lp, d: Math.abs(Math.log10(Math.max(1, lp.tvl_usd)) - logTvl) }))
        .sort((a, b) => a.d - b.d || (a.lp.slug < b.lp.slug ? -1 : a.lp.slug > b.lp.slug ? 1 : 0))
        .slice(0, 3)
        .map(({ lp }) => ({ name: lp.name, ratio: lp.ratio, tvl_usd: lp.tvl_usd, mcap_usd: lp.mcap_usd }));
      return {
      rank: row.rank,
      slug: row.slug,
      name: row.name,
      category: row.category,
      chains: row.chains,
      tvl_usd: row.tvl_usd,
      change_7d: row.change_7d,
      listed_at: row.listed_at,
      age_days: row.age_days,
      implied_value_usd: row.implied_value_usd,
      fdv_usd: row.fdv_usd,
      fdv_bear_usd: row.fdv_bear_usd,
      fdv_bull_usd: row.fdv_bull_usd,
      fdv_comps_usd: row.fdv_comps_usd,
      token_odds: row.token_odds,
      tier: row.tier,
      readiness: row.readiness,
      peer_ratio: row.model.peer_ratio,
      growth_factor: row.model.growth_factor,
      age_factor: row.model.age_factor,
      peers: row.model.peers,
      watchlist: watch.has(row.slug),
      cat_rank: rankInCat,
      cat_rows: catTotals.get(cat) ?? 0,
      live_peers: peers,
      comps: row.comps,
      farm_econ: row.farm_econ,
      farm_steps: row.farm_steps,
      };
    });
  const ledger = buildLedger(snapshot, board, rows);
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model_version: MODEL_VERSION,
    model_card: card,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: board.filter((r) => !watch.has(r.slug)).length,
    live_size: live.length,
    ledger,
    rows,
    live,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
