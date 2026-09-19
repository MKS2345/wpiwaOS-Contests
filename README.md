# wpiwaOS-Contests

A public library of portable amateur-radio contest **templates** (rules/scoring) and **events**
(a specific year's dated occurrence of a template). Built for [wpiwaOS](https://github.com/MKS2345/wpiwaOS),
but the format has no wpiwaOS-specific dependency — any club logbook can consume it.

## Why two kinds of file

- **`templates/`** — the *ruleset*: what the exchange looks like, how points and multipliers are
  scored, which map to draw. Timeless — a template doesn't know what year it is.
- **`events/<year>/`** — the *calendar fact*: "New Hampshire QSO Party runs Sept 19–20, 2026,"
  pointing at a `templateId`. Deliberately thin — no club-specific config (which optional fields
  are shown, region weights, home location) lives here, since that's local to whoever imports it.

An app importing an event pre-fills a new contest's name/dates/template; the admin still sets
their own config same as creating a contest by hand.

## Layout

```
templates/<id>.json       one ContestTemplate per file
templates/index.json      generated — {id, name, short, description, file}[]
events/<year>/<id>.json   one ContestEvent per file, e.g. events/2026/nhqp-2026.json
events/index.json         generated — flat list across all years, sorted by start_at
schema/*.json             JSON Schema for both file kinds
scripts/validate.mjs      checks every file against its schema (npm run validate)
scripts/build-index.mjs   regenerates the two index.json files (npm run build-index)
```

CI (`.github/workflows/validate.yml`) runs both on every push/PR and fails if `index.json` is
stale, so it's always safe to fetch and always matches what's actually in the repo.

## Consuming this repo

Fetch the index files, then the specific template/event a user picks — two cheap requests to
browse, one more to import. Recommended: pull through jsdelivr's GitHub CDN rather than
`raw.githubusercontent.com` (cached, no rate limits):

```
https://cdn.jsdelivr.net/gh/MKS2345/wpiwaOS-Contests@main/templates/index.json
https://cdn.jsdelivr.net/gh/MKS2345/wpiwaOS-Contests@main/templates/nhqp.json
https://cdn.jsdelivr.net/gh/MKS2345/wpiwaOS-Contests@main/events/index.json
https://cdn.jsdelivr.net/gh/MKS2345/wpiwaOS-Contests@main/events/2026/nhqp-2026.json
```

Pin to a tag instead of `@main` if you want updates to be deliberate rather than automatic.

## Template shape

See `schema/template.schema.json` for the full, enforced shape — this is a summary.

- `exchange`: fields shown on the contact form. A `kind: 'region'` field carries its own `regions`
  list (code/name/optional parent) — this is what makes a template self-contained; nothing is
  looked up from a separate constants file.
- `multiplier`: how a QSO counts toward the multiplier total. Most contests fit one of the
  existing kinds — in particular, **`region_list`** (exact match against a named exchange field's
  own `regions`) covers any closed-list multiplier — state/county QSO parties, sections, etc. —
  with **no app code changes required** to add a new one. `location` adds a county→state rollup
  and an optional DX/DXCC fallback on top of the same idea (NEQP/NAQP-style). The rest
  (`dxcc`, `wae`, `zone_dxcc`, `itu`, `prefix`, `grid`, `section`) are built-in/algorithmic scoring
  a receiving app is expected to already implement.
- `regionSet`: which map the dashboard draws. Use `'custom'` for anything that isn't one of the
  receiving app's built-in geographic maps (`arrl_sections`/`us_ca`/`world`) — that renders as a
  worked/needed chip grid instead of a geographic choropleth, so contributing a template never
  requires also hand-producing map geometry.
- `points`/`dupe`/`defaultFields`: scoring and form config, already plain data.

## Event shape

See `schema/event.schema.json`. Contests with a mid-event gap (many QSO parties run two sessions
with a break) are represented as a single `start_at`/`end_at` spanning the full published window,
matching the same simplification most receiving apps already make rather than modeling sessions.

`source_url` is required — a wrong date is only useful if it's easy to double-check and fix.

## Contributing

1. **New template**: add `templates/<id>.json` matching `schema/template.schema.json`.
2. **New event / date update**: add or edit `events/<year>/<id>.json` matching
   `schema/event.schema.json`, with a `source_url`.
3. Run `npm install && npm run check` locally (rebuilds the index files, then validates
   everything) before opening a PR — CI runs the same check and will fail the build otherwise.

Events go stale every year by design — if you notice one is wrong or missing for the current
year, a PR with just the corrected dates is very welcome.
