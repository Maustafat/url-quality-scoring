# ─── URL Quality Engine — Environment Variables ───────────────────────────────
#
# Copy this file to .env.local for local development:
#   cp .env.example .env.local
#
# When running on claude.ai (artifact mode) the API key is injected automatically
# and this file is NOT needed.
#
# For standalone deployment (e.g. GitHub Pages + a backend proxy), set:

# Your Anthropic API key — required for standalone deployment only
VITE_ANTHROPIC_API_KEY=sk-ant-...

# Your GitHub repo name — used to set the correct base path for GitHub Pages
# e.g. for github.com/you/url-quality-engine set this to: url-quality-engine
GITHUB_REPO_NAME=url-quality-engine
