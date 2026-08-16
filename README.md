# PyPI Download Stats Tracker — Trend by Package

Get download counts for one or more PyPI (Python) packages over a
chosen period, plus percent change versus the immediately prior period
of the same length.

Built for tracking Python package adoption trends — is a library
gaining or losing ground — the Python-ecosystem counterpart to [NPM
Download Stats Tracker](https://github.com/timmKal01/npm-download-stats-tracker).

## Input

```json
{
  "packages": ["requests", "numpy", "fastapi"],
  "daysBack": 7
}
```

| Field | Type | Description |
|---|---|---|
| `packages` | array of strings | PyPI package names to check, e.g. `"requests"`, `"numpy"`. At least one required. |
| `daysBack` | number | Length of the period to measure, and also the length of the prior period it's compared against. Default `7`, max `90`. |

## Output

One record per package:

```json
{
  "package": "requests",
  "currentPeriodDownloads": 428786906,
  "currentPeriodStart": "2026-08-09",
  "currentPeriodEnd": "2026-08-16",
  "previousPeriodDownloads": 402118554,
  "previousPeriodStart": "2026-08-01",
  "previousPeriodEnd": "2026-08-08",
  "percentChange": 6.63
}
```

`currentPeriodDownloads` is `null` for a package name PyPI doesn't
recognize (typo or unpublished). PyPI's public stats retain roughly the
last 180 days of history — a `daysBack` value near the max (90) plus its
comparison period may run past the edge of available data for very old
or very low-traffic packages.

A request is billed once regardless of how many packages are checked.

## How it works

Direct calls to the official [PyPI Stats API](https://pypistats.org/api/)
(`pypistats.org`), operated by the Python Software Foundation on top of
PyPI's public download-log data — no proxy, no key, no scraping.

## Pricing note

Billed per **request**, not per package returned — one charge whether
you check 1 package or several.

## Related products

- [NPM Download Stats Tracker](https://github.com/timmKal01/npm-download-stats-tracker) — the same trend tracking for npm/JavaScript packages
