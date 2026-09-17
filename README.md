# Mjlis-fls — Oil & Gas Incident Learnings WhatsApp Agent

A WhatsApp chat agent that answers questions about oil & gas incidents,
learnings, findings, root causes, trends, and good practice — grounded
only in loaded source material (IOGP library + public regulator/industry
sources), always citing where an answer came from, never inventing
incidents.

A company incident source (PDO LFI alerts) will be connected later, once
access is approved. The system is built from day one so that adding it is
a config change plus one new connector, not a redesign — see
[Adding the company source](#adding-the-company-source-later) below.

## Status

Being built in phases. Current phase: **1 — project skeleton, config, and
the source connector interface.**

| Phase | What | Status |
|---|---|---|
| 1 | Project skeleton, config, source connector interface | ✅ done |
| 2 | IOGP library ingestion | ⏳ next |
| 3 | Storage and search (SQLite + Chroma) | not started |
| 4 | Brain (Anthropic tool use) + terminal chat | not started |
| 5 | First external sources (IOGP alerts, CSB, BSEE, PHMSA) | not started |
| 6 | WhatsApp webhook and allowlist | not started |
| 7 | Remaining external sources | not started |
| 8 | Scheduling, Docker, full README, tests | not started |

## Architecture

```
WhatsApp (Meta Cloud API)
        │
   FastAPI webhook  ──┐
        │              │  allowlist, per-user short history
   Brain (Claude, tool use)
        │
        ├── search_iogp(query, report_number?)      → Chroma "iogp" collection
        ├── search_external(query, source?, ...)     → Chroma "external" collection
        ├── query_database(sql)                      → SQLite (read-only)
        └── search_company(query)  [disabled today]   → Chroma "company" collection
                                                          (reserved for PDO LFI)
        │
   Source connectors (pluggable, see app/connectors/base.py)
        ├── IOGPConnector           (phase 2: ./sources/iogp/*.pdf)
        ├── CSB / BSEE / PHMSA / …  (phase 5+, external regulators & alert sites)
        └── CompanyLfiConnector     (reserved, disabled — phase "later")
```

Every source — IOGP, each external regulator/alert site, and eventually
the company LFI feed — implements the same `SourceConnector` interface
(`app/connectors/base.py`). Storage, the brain's tools, and the WhatsApp
layer only talk to that interface via the registry
(`app/connectors/registry.py`), never to a specific source. This is what
lets a new source be added without touching the brain or WhatsApp code.

## Project layout

```
app/
  config.py            Settings loaded from .env (see .env.example)
  connectors/
    base.py             SourceConnector interface + SourceDocument
    registry.py          All known connectors, sorted by priority
    company.py            Reserved PDO LFI connector (disabled today)
    iogp.py                (phase 2)
    external/               (phase 5+, one module per source)
  storage/              SQLite schema + Chroma vector store (phase 3)
  ingestion/             Chunking + folder watcher (phase 2)
  brain/                 Anthropic tool-use agent + system prompt (phase 4)
  whatsapp/               FastAPI webhook + Cloud API client (phase 6)
  cli/                     Terminal chat + admin re-index script
sources/
  iogp/                  Drop IOGP PDFs here (gitignored; never fetched automatically)
  external/               Cached downloads from external sources (gitignored)
data/                    SQLite DB + Chroma persistence (gitignored, rebuildable)
tests/
```

## Setup

Requires Python 3.11+.

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env    # fill in ANTHROPIC_API_KEY once phase 4 is built
pytest
```

`requirements.txt` grows with each phase — it currently only carries what
phase 1 needs (settings + testing). Storage, embeddings, PDF parsing,
FastAPI, and the Anthropic SDK are added as their phases land.

## Configuration

All configuration lives in `.env` (see `.env.example` for the full list
with comments), loaded via `app/config.py`. Key groups:

- **Anthropic**: API key and model (`claude-sonnet-5`).
- **WhatsApp Cloud API**: access token, phone number ID, verify token, app
  secret, and a comma-separated allowlist of approved numbers. Left blank
  until phase 6.
- **Storage**: SQLite path, Chroma directory, IOGP/external source folders.
- **Embeddings**: local multilingual model, `BAAI/bge-m3` (English + Arabic).
- **Company source**: `COMPANY_SOURCE_ENABLED` (false today) and reserved
  credential placeholders — see below.

## Adding the company source (later)

The PDO LFI alerts source is intentionally not built yet — only reserved
for. Once access is approved:

1. Implement `sync()` in `app/connectors/company.py`
   (`CompanyLfiConnector`), fetching from whatever the approved access
   method turns out to be (API, SFTP drop, email export, etc.) and
   yielding one `SourceDocument` per alert with
   `collection=Collection.COMPANY`.
2. Fill in the `COMPANY_SOURCE_*` variables in `.env`
   (`COMPANY_SOURCE_API_URL` / `COMPANY_SOURCE_API_KEY` or
   `COMPANY_SOURCE_SYNC_DIR`, depending on the access method) and set
   `COMPANY_SOURCE_ENABLED=true`.
3. Nothing else changes. `CompanyLfiConnector` already has the highest
   `priority` of any connector, so once enabled it automatically becomes
   the primary source searched first on every question, the `search_company`
   tool is already wired into the brain (it just stops being a no-op),
   and answers already have a *Company LFI:* section ready to populate.
4. Run the admin re-index script (`app/cli/admin.py`, phase 8) to do the
   first sync.

## Sources

### IOGP library (phase 2)

IOGP PDFs the user is entitled to use go in `./sources/iogp/`. **Never
downloaded automatically** — only ingested from what's placed there by
hand. Report number, title, version/date, section headings, and page
numbers are preserved; outdated editions are flagged; the folder is
watched and re-indexed on add/change/delete.

### External sources (phases 5 & 7)

Public, free, non-paywalled oil & gas safety sources, each its own tagged
connector/collection: IOGP safety alerts, US CSB, BSEE, SafeOCS, PHMSA,
Havtil, NOPSEMA, UK HSE, Canada Energy Regulator, Alberta Energy
Regulator, OSHA, IADC, Step Change in Safety, Energy Safety Canada, IMCA
safety flashes, CCPS Process Safety Beacon, eMARS, ARIA. Each connector
respects robots.txt/terms of use, throttles requests, and is skipped (with
a note here) if automated access isn't permitted.

## Testing

```bash
pytest
```

Phase 1 covers the connector interface and registry. Ingestion, retrieval,
citation formatting, and webhook tests are added as their phases land
(final pass in phase 8).
