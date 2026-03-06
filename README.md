# URL Quality Engine

Non-content URL quality assessment with AI-powered ad intelligence and live page analysis.

Scores URLs across 7 dimensions without fetching the page, then runs a deeper **page intelligence** phase with live data:

| Phase | Metric | Description |
|---|---|---|
| Instant | 🔒 Protocol Security | HTTPS, www presence |
| Instant | 🌐 Domain Quality | TLD reputation, SLD length, subdomain depth |
| Instant | 🔗 URL Structure | Length, path depth, slug readability |
| Instant | ✨ URL Cleanliness | Param count, tracking params |
| Instant | 📁 Path Quality | Gibberish hashes, numeric segments |
| AI | 📊 Ad Density | Estimated ad saturation (CLEAN → SATURATED) |
| AI | 🎯 Ad Quality | Estimated ad quality (HARMFUL → PREMIUM) |
| Live | 📐 Ad Pixel Coverage | % of viewport pixels occupied by ad slots |
| Live | 📄 ads.txt | Authorised seller file presence + entry count |
| Live | ⚠️ MFA Likelihood | Made-For-Advertising score (UNLIKELY → VERY LIKELY) |

The live page phase runs in parallel: ads.txt is fetched directly, pixel coverage is measured by fetching the page HTML via the Anthropic API.

---

## Quick start

```bash
git clone https://github.com/YOUR_USERNAME/url-quality-engine.git
cd url-quality-engine
npm install
npm run dev          # opens http://localhost:5173
```

The app works without an API key in the claude.ai artifact runtime. For standalone use:

```bash
cp .env.example .env.local
# edit .env.local and set VITE_ANTHROPIC_API_KEY=sk-ant-...
```

> **Note:** Exposing an API key in a client-side app is fine for personal/internal tools. For public deployment, add a thin server-side proxy.

---

## Project structure

```
src/
├── App.jsx                      # Main shell — layout, state, phase orchestration
├── main.jsx                     # React entry point
├── lib/
│   ├── urlAnalysis.js           # ← Edit URL scoring heuristics & weights here
│   ├── aiAnalysis.js            # ← Edit AI signal prompt / model here
│   ├── pageAnalysis.js          # ← Edit pixel analysis, ads.txt, MFA logic here
│   └── scoreHelpers.js          # ← Edit colour thresholds here
└── components/
    ├── Charts.jsx                # CircleGauge, MiniDonut, Bar, DensityBar, QualityBar
    ├── AdIntelPanel.jsx          # AI-powered Ad Density + Ad Quality panel
    └── PageIntelPanel.jsx        # Live: Pixel Coverage + ads.txt + MFA panel
```

### Where to make common changes

| Change | File |
|---|---|
| Tweak URL score weights | `src/lib/urlAnalysis.js` → `WEIGHTS` object |
| Add a new heuristic scorer | `src/lib/urlAnalysis.js` → add function + plug into `runStaticAnalysis` |
| Change AI signal instructions | `src/lib/aiAnalysis.js` → `SYSTEM_PROMPT` |
| Change pixel analysis prompt | `src/lib/pageAnalysis.js` → `PAGE_SYSTEM_PROMPT` |
| Adjust MFA fallback scoring | `src/lib/pageAnalysis.js` → `deriveMFAScore()` |
| Change colour thresholds | `src/lib/scoreHelpers.js` |
| Add a new chart type | `src/components/Charts.jsx` |
| Change example URLs | `src/App.jsx` → `EXAMPLES` array |
| Change viewport size used for pixel calc | `src/lib/pageAnalysis.js` → `VIEWPORT_W / VIEWPORT_H` |

---

## Analysis phases

| Phase | State | What runs |
|---|---|---|
| `static` | Instant | `runStaticAnalysis()` — pure JS, no network |
| `ai` | ~3–5s | `runAIAnalysis()` — Anthropic API, URL-level signals |
| `page` | ~5–15s | `checkAdsTxt()` (direct fetch) + `analyzePageAds()` (API + web search) |
| `done` | — | All phases complete; page analysis may still stream in |

---

## Deploy to GitHub Pages

1. Push this repo to GitHub.
2. Go to **Settings → Pages** → Source: **GitHub Actions**.
3. Push to `main` — `.github/workflows/deploy.yml` builds and deploys automatically.

Live at: `https://YOUR_USERNAME.github.io/url-quality-engine/`

---

## Scripts

```bash
npm run dev       # start dev server with hot-reload
npm run build     # production build → dist/
npm run preview   # preview the production build locally
```
