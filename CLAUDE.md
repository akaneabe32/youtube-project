# CLAUDE.md — AI Assistant Guide for YouTube Analytics Project

This file provides essential context for AI assistants working on this codebase. Read it before making any changes.

---

## Project Overview

This is a **YouTube analytics platform** for tracking PRODUCE 101 JAPAN S4 (SHINSEKAI) trainee promotion performance. It is a non-commercial fan project with three main components:

1. **Google Apps Script (GAS)** — Automated daily data collection from YouTube Data API v3
2. **React Dashboard** (`dashboard/`) — Interactive visualization of collected metrics
3. **Chrome Extension** (`chrome-extension/`, `extensions/yt-comment-exporter/`) — Manual comment export tool

The project targets **4 YouTube playlists**:
| Priority | Playlist Name |
|----------|--------------|
| 1 | 推しカメラ｜新世界 (oshiCamera) |
| 2 | Theme Song THE FINAL CLOSE-UP (finalCloseUp) |
| 3 | SHINSEKAI SELFIE CHALLENGE (selfie) |
| 4 | SHINSEKAI 1MIN PR (oneMinPr) |

---

## Repository Structure

```
youtube-project/
├── CLAUDE.md                         # This file
├── README.md                         # Japanese project overview
├── docs/                             # Architecture & spec documentation
│   ├── setup_guide.md                # Step-by-step setup instructions
│   ├── gas_architecture.md           # GAS data pipeline architecture
│   ├── analysis_metrics.md           # 50+ metric definitions
│   └── dashboard_spec_v2.md          # Current dashboard specification (v2.0)
├── gas/                              # Google Apps Script sources
│   ├── Code_collect.gs               # Daily YouTube data collection
│   ├── Code_collect_updated.gs       # Latest version (deploy this one)
│   ├── Code_export.gs                # JSON export for dashboard
│   └── Code_export_updated.gs        # Latest version (deploy this one)
├── dashboard/                        # React/Vite frontend application
│   ├── package.json                  # Dependencies & scripts
│   └── client/
│       ├── index.html
│       ├── public/dashboard_data.json  # Sample/fallback data (394KB)
│       └── src/
│           ├── App.tsx               # Router + providers setup
│           ├── main.tsx              # Entry point
│           ├── const.ts              # App-wide constants & env vars
│           ├── lib/
│           │   ├── types.ts          # TypeScript type definitions
│           │   └── utils.ts          # Shared utilities
│           ├── contexts/
│           │   └── ThemeContext.tsx  # Light/dark theme provider
│           ├── hooks/
│           │   ├── useDashboardData.ts  # Main data fetching & caching
│           │   ├── useComposition.ts
│           │   ├── useExportPng.ts
│           │   ├── useMobile.tsx
│           │   └── usePersistFn.ts
│           ├── pages/
│           │   ├── Home.tsx          # Main 5-section dashboard layout
│           │   └── NotFound.tsx
│           └── components/
│               ├── ui/               # 88 Radix UI wrapper components
│               ├── sections/         # 13 section components (5 active)
│               ├── Sidebar.tsx       # Fixed left navigation
│               ├── DataUpdateModal.tsx
│               ├── ExportableSection.tsx
│               └── ErrorBoundary.tsx
├── chrome-extension/                 # YT Comment Exporter v2.1
│   ├── manifest.json                 # Manifest V3
│   ├── popup.html / popup.js         # Main extension UI (1,066 lines)
│   ├── kuromoji.js                   # Japanese morphological analysis
│   ├── jszip.min.js                  # ZIP creation
│   └── xlsx.full.min.js             # CSV/Excel export
├── extensions/yt-comment-exporter/   # Alternative extension variant
├── sync_to_notion.py                 # Notion API sync script
├── trainee_analyzer.py               # Trainee type classifier
├── data/history/                     # Historical data storage
└── .github/workflows/
    └── notion_sync.yml               # CI: Push to main triggers Notion sync
```

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend Framework | React | 19.2.1 |
| Build Tool | Vite | 7.1.7 |
| Styling | Tailwind CSS | 4.1.14 |
| UI Components | Radix UI | Latest (30+ pkgs) |
| Charts | Recharts | 2.15.2 |
| Forms/Validation | React Hook Form + Zod | 7.64.0 + 4.1.12 |
| Routing | Wouter | 3.3.5 (custom patch) |
| Backend | Express.js | 4.21.2 |
| Language | TypeScript | 5.6.3 |
| Package Manager | pnpm | 10.4.1 |
| Testing | Vitest | 2.1.4 (configured, minimal use) |
| Formatter | Prettier | 3.6.2 |
| GAS Runtime | Google Apps Script | V8 / ES2020+ |
| Japanese NLP | Kuromoji.js | Bundled |
| Python | pandas, requests | For sync scripts |

---

## Development Commands

All commands run from the `dashboard/` directory:

```bash
pnpm dev        # Start dev server (accessible on network via --host)
pnpm build      # Build Vite frontend + Node SSR backend
pnpm start      # Run production server (NODE_ENV=production)
pnpm preview    # Preview production build
pnpm check      # TypeScript type-check (no emit)
pnpm format     # Prettier auto-format all files
```

**No automated tests exist yet.** Vitest is installed but test files have not been written.

---

## Data Flow

```
YouTube Data API v3
       │
       ▼
Code_collect_updated.gs  ─────────────────────────────────► Google Sheets A
  (daily 02:00-03:00 JST)                                   (auto, 13 sheets)
       │
       ▼
Code_export_updated.gs   ──► dashboard_data.json (GAS WebApp endpoint)
  (daily 03:00-04:00 JST)
       │
       ▼
React Dashboard
  ├── fetch from GAS URL (VITE_GAS_URL)
  ├── or load from file upload
  └── cache in localStorage (versioned, with chunk support for 156KB+ limit)

Chrome Extension (manual, weekly)
  ├── fetch YouTube API directly
  ├── kuromoji.js analysis
  └── export ZIP: video_stats_all.csv, ai_analysis_ready_all.csv, etc.
```

---

## Key Conventions

### Naming
- **Playlist identifiers:** camelCase (`oshiCamera`, `finalCloseUp`, `selfie`, `oneMinPr`)
- **Column names:** snake_case (`video_id`, `trainee_name`, `playlist_id`)
- **GAS functions:** camelCase (`collectDailyData`, `buildAndCacheJson`)
- **React components:** PascalCase (`OverviewSection`, `PlaylistSection`)
- **Constants:** UPPER_SNAKE_CASE (`STORAGE_KEY`, `DEFAULT_GAS_URL`)
- **CSS/Tailwind:** Utility-first; avoid custom CSS classes unless necessary

### TypeScript
- Types are centralized in `dashboard/client/src/lib/types.ts`
- Zod schemas used for runtime validation of external JSON data
- Use `pnpm check` before committing frontend changes

### GAS (Google Apps Script)
- Always use the `*_updated.gs` variants — these are the latest deployed versions
- The daily collection uses `PropertiesService` for lock management (2-hour timeout)
- Front-date policy: 02:00-03:00 JST execution records data as "yesterday's" date
- Spreadsheet IDs are hardcoded; do not change them without updating both GAS files

### Design System
- **Color palette (Notion guideline):**
  - Aurora Pink: `#F4A7BB`
  - Crystal Cyan: `#7DD8F0`
  - Lavender Mist: `#B8A8F5`
  - Midnight Navy (bg): `#111B35`
- **Fonts:**
  - Display: Bebas Neue
  - Body: DM Sans
  - Japanese: Noto Sans JP

---

## Dashboard Architecture

### Active Sections (5 in v2.0)
The dashboard is organized into 5 sections rendered by `Home.tsx`:

| Section | Component | Description |
|---------|-----------|-------------|
| Overview | `OverviewSection.tsx` | KPI cards: total videos, views, likes, comments |
| Playlist | `PlaylistSection.tsx` | Cross-playlist comparison charts |
| Ranking | `RankingSection.tsx` | Video ranking tables with filters |
| Trend | `TrendSection.tsx` | Daily trend line charts |
| Engagement | `EngagementSection.tsx` | Views vs. engagement scatter plot |

### Legacy Sections (awaiting comment data)
These components exist but are **not rendered in Home.tsx**:
`SentimentSection`, `LanguageSection`, `TopCommentsSection`, `MeceSection`, `OshiDiagnosisSection`, `DemographicSection`, `SurgeSection`, `TimelineSection`

Do not delete these — they will be re-enabled when comment analysis data is available.

### Data Schema (GAS JSON output)
```typescript
{
  meta: {
    generatedAt: string,      // ISO 8601
    dataRange: { start: string, end: string },
    totalVideos: number,
    totalComments: number,
    totalViews: number,
    totalLikes: number,
  },
  trainees: TraineeData[],           // Video-level metrics
  dailyTrend: DailyTrendEntry[],     // Overall daily snapshots
  playlistSummary: PlaylistSummary[], // Aggregated playlist stats
  playlistDailyTrend: Record<string, DailyTrendEntry[]>  // Per-playlist trends
}
```

**Known v2.0 GAS Bug:** `playlistDailyTrend` may have numeric string keys (`"0"`, `"1"`) instead of playlist IDs. Handle this defensively in frontend code.

### localStorage Caching
- Key: `STORAGE_KEY` (versioned, currently v10)
- Chunks are used for data >156KB (PropertiesService limit workaround)
- Version mismatch triggers a full data refresh

---

## GAS Functions Reference

| Function | File | When to Run |
|----------|------|-------------|
| `setupApiKeyOnce()` | Code_collect_updated.gs | Once during initial setup |
| `backfillPlaylistIds()` | Code_collect_updated.gs | Once for data migration |
| `collectDailyData()` | Code_collect_updated.gs | Trigger: daily 02:00-03:00 JST |
| `buildAndCacheJson()` | Code_export_updated.gs | Trigger: daily 03:00-04:00 JST |
| `forceReleaseLock()` | Code_collect_updated.gs | Emergency unlock only |

---

## Chrome Extension Output Files

When exporting from the Chrome extension, the ZIP contains:

| File | Description |
|------|-------------|
| `video_stats_all.csv` | Basic metrics: views, likes, comments, dates |
| `video_metrics_for_ai.csv` | Derived metrics: participation rate, language rates, etc. |
| `sheet_raw_comments_all.csv` | Raw comments (local only, NOT for Sheets import) |
| `ai_analysis_ready_all.csv` | Pre-processed for AI analysis |
| `per_video/*.csv` | Per-video comment breakdowns (optional) |

Filename sanitization (v2.1): strips forbidden chars from all platforms, zero-width chars, normalizes spaces → underscores, 80-char limit.

---

## Environment Variables

Set in `.env` at `dashboard/` root (never commit this file):

```
VITE_GAS_URL=           # Google Apps Script WebApp URL (doGet endpoint)
VITE_OAUTH_PORTAL_URL=  # OAuth portal URL (if applicable)
VITE_APP_ID=            # App identifier
```

---

## CI/CD

**GitHub Actions** (`.github/workflows/notion_sync.yml`):
- **Trigger:** Push to `main` + daily cron at 00:00 UTC
- **Action:** Runs `sync_to_notion.py` using secrets `NOTION_TOKEN` and `NOTION_PAGE_ID`
- Python 3.11 + pandas + requests

---

## Known Issues & Limitations

1. **GAS `playlistDailyTrend` numeric keys bug** (v2.0): Keys may be `"0"`, `"1"` instead of playlist IDs like `"PLxxx"`. Frontend must handle both.
2. **YouTube API quota**: 10,000 units/day limit. Typical usage is 50–100 units/day, but comment fetching can spike.
3. **PropertiesService 9MB limit**: Large JSON exports use chunked storage as a workaround.
4. **No automated tests**: Vitest is configured but no test files exist. Manual QA is the current practice.
5. **Comment analysis sections disabled**: 8 legacy sections await comment data from the Chrome extension pipeline.
6. **`wouter` custom patch**: `wouter@3.7.1` is applied via pnpm patches — do not upgrade without testing routing.

---

## Important Files to Read Before Modifying

| Task | Files to Read First |
|------|-------------------|
| Changing GAS data collection | `gas/Code_collect_updated.gs`, `docs/gas_architecture.md` |
| Changing dashboard data schema | `dashboard/client/src/lib/types.ts`, `docs/dashboard_spec_v2.md` |
| Adding a new dashboard section | `dashboard/client/src/pages/Home.tsx`, existing section in `components/sections/` |
| Modifying chart visuals | `components/sections/` target file, `lib/utils.ts`, design system colors above |
| Chrome extension changes | `chrome-extension/popup.js`, `chrome-extension/manifest.json` |
| Metric definitions | `docs/analysis_metrics.md` |

---

## Project Context Notes

- This is a **non-commercial fan project** — no personal data is stored, user privacy is a priority
- The UI is primarily in **Japanese** with English variable/function names
- K-POP/J-POP fandom semantics apply: "やばい" (yabai) typically means praise in this context, not criticism
- The project tracks 4 YouTube playlists for 27 trainees in SHINSEKAI group
- Data is for fan analysis purposes — respect YouTube API Terms of Service and quota limits
