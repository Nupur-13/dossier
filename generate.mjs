// Daily "Wire" generator — 100% free, no paid API calls.
// Pulls headlines from a few free, no-key-required public RSS feeds,
// tags them geo/hist/ind with simple keyword matching, and appends
// them to data/log.json, which index.html displays.
//
// No API keys, no secrets, no cost. Runs entirely on GitHub Actions' free tier.

import { readFile, writeFile } from 'node:fs/promises';

const FEEDS = [
  // Geopolitics
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', defaultCategory: 'geo' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', defaultCategory: 'geo' },
  { url: 'https://foreignpolicy.com/feed/', defaultCategory: 'geo' },
  { url: 'https://thediplomat.com/feed/', defaultCategory: 'geo' },

  // Defense & industrials
  { url: 'https://feeds.bbci.co.uk/news/business/rss.xml', defaultCategory: 'ind' },
  { url: 'https://www.defensenews.com/arc/outboundfeeds/rss/?outputType=xml', defaultCategory: 'ind' },
  { url: 'https://www.defensenews.com/arc/outboundfeeds/rss/category/industry/?outputType=xml', defaultCategory: 'ind' },
  { url: 'https://www.defensenews.com/arc/outboundfeeds/rss/category/global/?outputType=xml', defaultCategory: 'ind' },

  // History
  { url: 'https://www.historytoday.com/feed/blog.xml', defaultCategory: 'hist' },
  { url: 'https://www.smithsonianmag.com/rss/history/', defaultCategory: 'hist' },
];
// Swap or add feeds any time — any standard RSS 2.0 feed works.
// A feed that 404s or times out is skipped automatically (see fetchHeadlines
// below) — it won't break the run, it'll just contribute zero headlines
// that day. Worth spot-checking new feed URLs by pasting them into a
// browser first, since sites sometimes change their RSS paths.

const LOG_PATH = new URL('../data/log.json', import.meta.url);
const MAX_HISTORY_DAYS = 60;
const ITEMS_PER_DAY = 8;

// Very simple keyword-based tagging so headlines land in a sensible bucket.
const KEYWORDS = {
  ind: ['chip', 'semiconductor', 'factory', 'manufactur', 'shipping', 'port ',
        'supply chain', 'steel', 'mining', 'battery', 'lithium', 'rare earth',
        'defense industry', 'defence industry', 'shipyard', 'tariff', 'export control',
        'oil', 'energy', 'opec', 'trade deal', 'automaker', 'industrial',
        'missile', 'navy', 'fighter jet', 'submarine', 'arms deal', 'weapons',
        'military spending', 'defense budget', 'nato spending', 'drone', 'warship'],
  hist: ['anniversary', 'historic', 'decades', 'century', 'archive', 'legacy',
         'commemorat', 'history', 'historian', 'excavat', 'artifact', 'ancient',
         'declassified', 'unearth'],
};

function categorize(headline, defaultCategory) {
  const lower = headline.toLowerCase();
  for (const kw of KEYWORDS.ind) if (lower.includes(kw)) return 'ind';
  for (const kw of KEYWORDS.hist) if (lower.includes(kw)) return 'hist';
  return defaultCategory;
}

function stripCdata(s) {
  return s.replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').trim();
}

function parseRss(xml, defaultCategory) {
  const items = [];
  const itemBlocks = xml.split(/<item[\s>]/i).slice(1);
  for (const block of itemBlocks.slice(0, 10)) {
    const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/i);
    const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/i);
    if (titleMatch) {
      const headline = stripCdata(titleMatch[1]);
      items.push({
        headline,
        url: linkMatch ? stripCdata(linkMatch[1]) : '',
        category: categorize(headline, defaultCategory),
      });
    }
  }
  return items;
}

async function fetchHeadlines() {
  const all = [];
  for (const feed of FEEDS) {
    try {
      const res = await fetch(feed.url, { headers: { 'User-Agent': 'dossier-daily-briefing/1.0' } });
      if (!res.ok) { console.warn(`Feed failed (${res.status}): ${feed.url}`); continue; }
      const xml = await res.text();
      all.push(...parseRss(xml, feed.defaultCategory));
    } catch (e) {
      console.warn(`Feed error for ${feed.url}:`, e.message);
    }
  }
  return all;
}

function pickSpread(headlines, count) {
  // Try to get a mix of categories rather than whatever feed loaded first.
  const buckets = { geo: [], hist: [], ind: [] };
  headlines.forEach(h => buckets[h.category]?.push(h));
  const picked = [];
  let i = 0;
  while (picked.length < count && i < 10) {
    for (const cat of ['geo', 'ind', 'hist']) {
      if (buckets[cat][i]) picked.push(buckets[cat][i]);
      if (picked.length >= count) break;
    }
    i++;
  }
  return picked;
}

async function loadLog() {
  try {
    const raw = await readFile(LOG_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveLog(log) {
  await writeFile(LOG_PATH, JSON.stringify(log, null, 2));
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  console.log(`Generating wire for ${today}...`);

  const headlines = await fetchHeadlines();
  if (headlines.length === 0) {
    console.warn('No headlines fetched from any feed — skipping today.');
    return;
  }
  console.log(`Fetched ${headlines.length} candidate headlines.`);

  const items = pickSpread(headlines, ITEMS_PER_DAY);

  const log = await loadLog();
  const filtered = log.filter(entry => entry.date !== today); // avoid dupes if re-run same day
  filtered.unshift({ date: today, items });
  const trimmed = filtered.slice(0, MAX_HISTORY_DAYS);

  await saveLog(trimmed);
  console.log(`Wrote ${items.length} items for ${today}. Log now has ${trimmed.length} days.`);
}

main().catch(e => {
  console.error('Generation failed:', e);
  process.exit(1);
});
