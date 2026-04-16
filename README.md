# Ash Production Dashboard

A production tracking CRM built for Ashraf Abusamak. Replaces the 2026 Production Sheet (Excel) with a fast, browser-based tool for managing deals, realtors, expenses, underwriters, goals, and predictions.

## Features

- **Deals** — track every transaction with inline client selection, sortable columns, CSV import/export, and duplicate detection
- **Realtor Database** — auto-derived from deal activity, with revenue / ROI / deal-count metrics
- **Client Expenses** — log and categorize relationship investments
- **Underwriters** — rollup of title insurance partners with policy volume totals
- **Monthly Production** — historical charts and per-month breakdowns
- **Goals & Predictions** — yearly targets with pace tracking + 1M / 6M / 1Y / 5Y forecast models
- **Data & Backup** — JSON export/import, duplicate resolution, file-fee settings

## Stack

Pure vanilla JS (no build step). Single-page app with hash-based routing and `localStorage` persistence.

| Library | Use |
|---|---|
| [Chart.js](https://www.chartjs.org/) | Revenue / monthly charts |
| [SheetJS (xlsx)](https://sheetjs.com/) | CSV / XLSX import |
| [GSAP](https://greensock.com/gsap/) | Entry animations |

## Running locally

Any static file server works:

```bash
# From the project root:
python3 -m http.server 4321
# or
npx serve .
```

Then open `http://localhost:4321`.

## Deploying

Configured for [Netlify](https://netlify.com) — see `netlify.toml`. Push to `main` → auto-deploys.

## Brand

Real Achiever · by Brand Bonjour — Forest green + rich gold · Cormorant Garamond (serif) + Montserrat (sans)
