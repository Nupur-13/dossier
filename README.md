# The Dossier — self-updating daily briefing

A private learning site for geopolitics, history, and industrials. The 21-topic
core briefing rotates daily and never needs maintenance. A free GitHub Action
pulls fresh headlines from public RSS feeds once a day into "Today's Wire" —
no paid APIs, no cost.

## One-time setup (about 10–15 minutes)

1. **Create a new GitHub repo.** Go to github.com → New repository → give it
   any name (e.g. `dossier`) → keep it **Public** (required for free GitHub
   Pages) → Create.

2. **Upload these files.** Easiest way: on the new repo's page, click
   "Add file" → "Upload files", drag in this whole folder (keeping the
   `.github/workflows/`, `data/`, and `scripts/` subfolders intact), and
   commit.

3. **Enable GitHub Pages.**
   Repo → Settings → Pages → under "Build and deployment", set
   **Source: Deploy from a branch** → **Branch: main**, folder **/ (root)** →
   Save. GitHub will give you a URL like
   `https://yourusername.github.io/dossier/` within a minute or two.

4. **Test the daily Action manually.**
   Repo → Actions tab → click "Daily Wire Update" in the left sidebar →
   "Run workflow" → Run workflow. Wait ~30 seconds, refresh — it should show
   a green checkmark. This confirms it can fetch headlines and commit
   `data/log.json` without waiting for the actual daily schedule.

5. **Visit your site** at the Pages URL from step 3. "Today's Wire" should
   now show real headlines once the Action has run at least once.

That's it — from here it updates itself every day at 11:00 UTC
(edit the `cron:` line in `.github/workflows/daily.yml` to change the time;
cron times are always in UTC).

## How it works

- `index.html` — the whole app: the 21-topic rotating briefing bank, the
  connect-the-dots diagram, quiz, notes, and your ledger. Progress is saved
  in your browser's `localStorage`, tied to this specific URL.
- `data/log.json` — a small rolling history of daily headlines, rewritten
  each day by the Action.
- `scripts/generate.mjs` — pulls headlines from ten free RSS feeds across
  three areas (edit the `FEEDS` array to swap any of these):
  - **Geopolitics:** BBC World, Al Jazeera, Foreign Policy, The Diplomat
  - **Defense & industrials:** BBC Business, Defense News (home, industry,
    and global desks)
  - **History:** History Today, Smithsonian History

  tags them geo/hist/ind with keyword matching, and writes a mixed daily
  set to `data/log.json`. A feed that changes its URL or goes down is
  skipped automatically — it just won't contribute headlines that day, it
  won't break the run.
- `.github/workflows/daily.yml` — the free GitHub Actions cron job that
  runs the script daily and commits the result. No secrets or API keys
  needed for any of this.

## Notes on privacy

This is a **public repo with a public-by-URL site** — anyone with the exact
link can view it, but it won't appear in search results or be linked from
anywhere. If you later want real access control, that needs either a paid
GitHub plan (private repo + Pages) or a swap to something like Cloudflare
Pages with Cloudflare Access in front of it — happy to help with that later
if it becomes worth it to you.

## Getting AI analysis on a headline (free, manual)

The Action deliberately does **not** call any paid AI API — it's pure free
RSS. When a headline in "Today's Wire" catches your eye, just paste it into
a Claude chat and ask what it means or how it connects to what you already
know. That's free with your existing Claude account and takes 10 seconds.

## Expanding the topic bank

The 21 seeded topics repeat on a 3-week cycle. Anytime you want more, just
ask Claude (in the chat that built this) to write a fresh batch in the same
format and paste them into the `TOPICS` array in `index.html`.
