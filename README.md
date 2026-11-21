# Token Launch Radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/vhvrdmhdhf-tech/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/vhvrdmhdhf-tech/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A token launch radar: it reads a sealed snapshot of every protocol DefiLlama tracks, finds the ones
with no token yet, prices what each launch would be worth, and writes a web dashboard that ranks them —
each with the steps to farm it.

**Nothing is priced by hand.** When the program runs, it fits its model on the snapshot itself:

- **Launch value.** For every protocol whose token already trades, the market cap per dollar of TVL is a
  price the market already set. The model takes that ratio's median in each category (shrunk toward the
  global median where a category has few peers) and fits three corrections by least squares — on
  seven-day TVL growth, on log age, and on size. A pre-token protocol is priced as its peers price.
- **Token odds.** A logistic model over the whole universe (the label is whether a protocol records a
  token) on log TVL, log age, growth and the category's token record.
- **Expected value** = launch value × token odds is the board's ranking.

The fit is validated out of sample: the live set is split in two by protocol, each half is priced by a
model fitted only on the other half, and the dashboard's model card prints the held-out error (on the
sealed snapshot: median ×3.69, odds AUC 0.71). The board covers the whole watchlist and adds the 160
largest pre-token protocols below its floor — 200 rows, each with a six-step farm plan whose costs and
durations come from the protocol's own category, chains, TVL and age.

## Run it

```
node main.ts --input <snapshot.json> --output <dir>   # Node 22, standard library only
```

Writes `board.json`, `data.js`, `dashboard/`, `screenshots/` and `dossier.json` to the output
directory. Two runs on the same snapshot write the same bytes.

## Layout

- `main.ts` — the program: snapshot in, board + dashboard + dossier out
- `lib/model.ts` — the fitted value and odds models, the farm plans, the board
- `dashboard/` — the static page (board, per-protocol detail, model card, live-token view)
- `screenshots/` — the board, a protocol's detail view, a filtered view
- `vendor/makefun-board.ts` — the competition's dossier library, vendored byte for byte

An entry to make.fun's [Build the best token launch radar](https://make.fun/bounty/token-radar-01)
bounty ($1,325), built by an AI agent. Found via [make.fun](https://make.fun/r/zac67q6r?ref=zac67q6r).
