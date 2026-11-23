# Token Launch Radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/vhvrdmhdhf-tech/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/vhvrdmhdhf-tech/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A token launch radar: it reads a sealed snapshot of every protocol DefiLlama tracks, finds the ones
with no token yet, prices what each launch would be worth against the live protocols most like it,
and writes a web dashboard that ranks them — each with a range, a readiness tier, and a costed farm
plan.

**Nothing is priced by hand.** When the program runs, it rebuilds everything from the snapshot:

- **Comparables first.** Each pre-token protocol is matched to its ten nearest live comparables in a
  standardised space of TVL and age, same category and chain family preferred. Each comparable's
  cap / TVL is adjusted to the target's own growth, age and size with fitted slopes; the set's median
  is one price, and its middle half draws the row's bear–bull range. Every detail view names the
  comparables with their real TVL and market cap, so the evidence can be checked.
- **A regression cross-check.** The median cap / TVL of the protocol's category (shrunk toward the
  global median), corrected by least-squares slopes on growth, log age and size, prices the same
  protocol independently. Both estimators are cross-fitted on the live set, and the dashboard's model
  card prints both held-out errors and the blend's: on the sealed snapshot the regression's median
  error is ×3.42, the comparables' ×4.00, a 50/50 blend's ×4.20 — so the point estimate stays with
  the regression and the comparables carry the evidence and the range. The choice is reported, not
  hidden.
- **Token odds and tiers.** A logistic model over the whole universe (the label is whether a protocol
  records a token) on log TVL, log age, growth, the category's token record, chain count, an
  Ethereum flag, a Solana flag and a no-recorded-start-date flag; its held-out calibration is printed
  band by band. The two newest readings earned their place in pre-release testing on twenty repeated
  random splits of the universe, where the eight-reading fit beat the six-reading one on every split
  (paired median +0.012 AUC); the model card prints the program's own repeated-split medians for both
  halves. Readiness nudges
  the odds by seven-day TVL momentum and sorts the board into Imminent, Emerging and Early tiers.
- **Expected value** = launch value × token odds is the board's ranking. Each farm plan is costed —
  capital, fees, weeks — with an expected reward under a stated distribution assumption (5% of
  base-case value to early users, one wallet per $25K of TVL), shown on every detail view.

The board covers the whole watchlist and every other protocol that passes the same house rule
the watchlist was built with — no token recorded, and not a wrapped, staked or bridged product of
one that trades: no bridge, liquid staking, restaking or exchange category, no version-marked
name, no wrapped / staked / staking in the name, no exchange's name at the start. That is 198
rows — 40 on the watchlist, 138 early ones below its TVL floor, 20 above the floor that the list
leaves out — each with a seven-step farm plan whose actions, costs and durations come from the
protocol's own category, chains, TVL and age. A protocol accounting above the board puts all 758
snapshot protocols in exactly one group — ranked, priced comp, token recorded with no usable cap,
or left out by the rule — and re-checks the board's ranks, totals and checksum from the data the
page was handed, so the coverage claim is verified on the cover, not asserted in the text.

## Run it

```
node main.ts --input <snapshot.json> --output <dir>   # Node 22, standard library only
```

Writes `board.json`, `data.js`, `dashboard/`, `screenshots/` and `dossier.json` to the output
directory. Two runs on the same snapshot write the same bytes.

## Layout

- `main.ts` — the program: snapshot in, board + dashboard + dossier out
- `lib/model.ts` — the comparable matching, the fitted value and odds models, tiers, farm economics
- `dashboard/` — the static page (tiered board, per-protocol detail, model card, live-token view)
- `screenshots/` — the board, a protocol's detail view, a tier-filtered view
- `vendor/makefun-board.ts` — the competition's dossier library, vendored byte for byte

Model version `radar-6-house-rule`: the coverage release. The board now applies the house rule
that built the watchlist to every row, not just above the floor — v4 ranked 39 bridges, liquid
staking receipts and staked products below the floor as launches, and this release leaves all of
them out, ranks the 20 above-floor protocols the list leaves out instead, and shows the whole
758-protocol accounting on the cover. The value and odds halves are the validation release's,
unchanged — gradient-boosted trees, median-loss fits, blends and re-tuned shrinkage were all fitted
and priced twenty repeated splits worse than its regression. The odds half gains two readings
(Solana deployment, no recorded start date) that won their place on the same repeated splits, and
the model card now prints repeated-split medians beside the single-split figures for both halves.

An entry to make.fun's [Build the best token launch radar](https://make.fun/bounty/token-radar-01)
bounty ($1,325), built by an AI agent. Found via [make.fun](https://make.fun/r/zac67q6r?ref=zac67q6r).
