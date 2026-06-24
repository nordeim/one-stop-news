# README.md
```md
# OneStopNews

**Everything important, sorted by topic.**

Live site: https://onestopnews.onrender.com/

OneStopNews is a topic-first news aggregator that helps readers scan major stories quickly. Instead of organizing articles by publisher, it groups them by what they are about: local news, tech, global news, finance, politics, gossip, and top stories.

The goal is simple: make the news easier to browse when important stories are spread across many different sources.

---

## What OneStopNews Does

OneStopNews collects public news article information, sorts articles into clear categories, and presents them in a clean reading interface.

For each article, readers can see:

- the article title
- the source
- the category and subcategory
- the published time
- a short summary when requested
- a link to the original article

OneStopNews is designed for quick scanning first. Readers can browse by topic, search across stories, open subcategories, and jump to the original publisher when they want the full article.

---

## Main Categories

| Category | Includes |
|---|---|
| **Top Stories** | Major headlines and widely relevant stories |
| **Local News** | Singapore headlines, transport, housing, and local business |
| **Tech News** | Apple news, AI, startups, cybersecurity, and other tech |
| **Global News** | China news, US news, Asia-Pacific, Europe, and other world news |
| **Finance News** | Markets, earnings, personal finance, crypto, and commodities |
| **Politics News** | Singapore politics, US politics, China politics, and geopolitics |
| **Gossip News** | Singapore gossip, Korea gossip, global gossip, and internet culture |

---

## Key Features

| Feature | Description |
|---|---|
| **Topic-first browsing** | Articles are grouped by category instead of publisher. |
| **Dropdown subcategories** | Larger topics can be narrowed down into more specific news areas. |
| **Search and sorting** | Readers can find stories by keyword and sort the feed. |
| **Original source links** | Every article links back to the publisher. |
| **On-demand summaries** | Summaries are generated only when a reader asks for them. |
| **Mobile-friendly design** | The interface is built to work comfortably on phones and desktops. |
| **Source visibility** | Readers can still see where each story came from. |

---

## Content Approach

OneStopNews does **not** copy and republish full articles.

The app is built around article discovery, categorization, and summarization. The full article remains with the original publisher.

Each story includes a direct link to the original source so readers can continue to the publisher's website for the full article.

---

## Why It Exists

News is often organized around publishers, but readers usually think in topics.

OneStopNews is built around questions like:

- What are the biggest stories right now?
- What is happening in Singapore?
- What is happening in Apple and tech?
- What is moving markets?
- What political stories are developing?
- What gossip or internet stories are trending?

The product is meant to reduce tab-hopping and make daily news scanning feel calmer, faster, and easier to follow.

---

## Product Principles

- Organize news by topic, not by source.
- Keep the interface clean and readable.
- Always show where an article came from.
- Never hide the original publisher link.
- Do not republish full copyrighted articles.
- Summarize only selected articles.
- Treat gossip and discussion-based content carefully.
- Label summaries clearly.
- Make mobile browsing feel first-class.

---

## Status

OneStopNews is currently an MVP.

The live version already supports topic browsing, subcategories, live article listings, source links, search, sorting, and on-demand summaries.

Future improvements may include broader source coverage, stronger deduplication, better personalization, and higher-quality AI summaries.

---

## License

Private - all rights reserved.

```

# app.js
```js
const state = {
  categories: [],
  articles: [],
  counts: {},
  indexed: 0,
  summarized: 0,
  selectedCategory: "top",
  selectedSubcategory: "All top stories",
  selectedArticleId: null,
  selectedMode: "summary",
  openMenuId: "",
  q: "",
  sort: "latest",
  loading: false,
};

const els = {
  topicNav: document.querySelector("#topicNav"),
  subcategorySelect: document.querySelector("#subcategorySelect"),
  sortSelect: document.querySelector("#sortSelect"),
  searchInput: document.querySelector("#searchInput"),
  activeCategory: document.querySelector("#activeCategory"),
  resultCount: document.querySelector("#resultCount"),
  leadCard: document.querySelector("#leadCard"),
  articleGrid: document.querySelector("#articleGrid"),
  detailPanel: document.querySelector("#detailPanel"),
  refreshButton: document.querySelector("#refreshButton"),
  statusPills: document.querySelector("#statusPills"),
};

const visualByCategory = {
  local: ["#405247", "#b86f52"],
  tech: ["#243b55", "#64786a"],
  global: ["#334155", "#486b8f"],
  finance: ["#2f3a2f", "#c6a15b"],
  politics: ["#3f3446", "#8d5a4a"],
  gossip: ["#6d637e", "#b86f52"],
  top: ["#151719", "#64786a"],
};

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function currentCategory() {
  return state.categories.find((category) => category.id === state.selectedCategory) || state.categories[0];
}

function currentArticle() {
  return state.articles.find((article) => article.id === state.selectedArticleId) || state.articles[0];
}

function visualMarkup(article) {
  const colors = visualByCategory[article?.category] || visualByCategory.top;
  const label = article ? `${article.categoryLabel} / ${article.subcategory}` : "OneStopNews";
  return `<div class="news-art" style="--art-a: ${colors[0]}; --art-b: ${colors[1]}"><span>${escapeHtml(label)}</span></div>`;
}

function articleMeta(article) {
  return `
    <div class="meta-row">
      <span class="source-chip">${escapeHtml(article.source)}</span>
      <span class="category-tag">${escapeHtml(article.categoryLabel)} / ${escapeHtml(article.subcategory)}</span>
      <span>${timeAgo(article.publishedAt || article.fetchedAt)}</span>
      ${article.summary ? `<span class="summary-ready">Summary ready</span>` : ""}
    </div>
  `;
}

function timeAgo(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recent";
  const minutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} day ago`;
}

function articleCount(categoryId, subcategory = "") {
  const categoryCounts = state.counts[categoryId];
  if (!categoryCounts) return 0;
  if (subcategory) return categoryCounts.subcategories?.[subcategory] ?? 0;
  return categoryCounts.total ?? 0;
}

function renderTopicNav() {
  els.topicNav.innerHTML = state.categories
    .map((category) => {
      const subcategories = category.subcategories.filter((subcategory) => !subcategory.startsWith("All "));
      return `
        <div class="topic-item ${state.openMenuId === category.id ? "open" : ""}">
          <button class="topic-button" type="button" data-menu="${category.id}" aria-expanded="${state.openMenuId === category.id}">
            ${escapeHtml(category.label)}
          </button>
          <div class="topic-menu" role="menu">
            <div class="topic-menu-header">
              <div>
                <strong>${escapeHtml(category.label)}</strong>
                <span>Browse live coverage grouped by topic, not publisher.</span>
              </div>
              <div class="topic-count">${articleCount(category.id)} stories</div>
            </div>
            <div class="topic-subgrid">
              ${subcategories
                .map(
                  (subcategory) => `
                    <button class="topic-subitem" type="button" data-nav-category="${category.id}" data-nav-subcategory="${escapeHtml(subcategory)}">
                      ${escapeHtml(subcategory)}
                      <span>${articleCount(category.id, subcategory)}</span>
                    </button>
                  `,
                )
                .join("")}
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderSubcategories() {
  const category = currentCategory();
  state.selectedSubcategory = category.subcategories.includes(state.selectedSubcategory) ? state.selectedSubcategory : category.subcategories[0];
  els.activeCategory.textContent = category.label;
  els.subcategorySelect.innerHTML = category.subcategories
    .map((subcategory) => `<option value="${escapeHtml(subcategory)}" ${subcategory === state.selectedSubcategory ? "selected" : ""}>${escapeHtml(subcategory)}</option>`)
    .join("");
}

function renderFeed() {
  const [lead, ...rest] = state.articles;
  els.resultCount.textContent = `${state.articles.length} article${state.articles.length === 1 ? "" : "s"} shown from ${state.indexed} indexed`;

  if (!lead) {
    els.leadCard.innerHTML = `<div class="empty">No live articles loaded yet. Try refreshing feeds. Some sources may block RSS requests locally.</div>`;
    els.articleGrid.innerHTML = "";
    els.detailPanel.innerHTML = `<div class="empty">Select an article after the feed loads.</div>`;
    return;
  }

  if (!state.selectedArticleId || !state.articles.some((article) => article.id === state.selectedArticleId)) {
    state.selectedArticleId = lead.id;
  }

  els.leadCard.innerHTML = `
    <div class="lead-image">${visualMarkup(lead)}</div>
    <div class="lead-content">
      ${articleMeta(lead)}
      <h2>${escapeHtml(lead.title)}</h2>
      <p>${escapeHtml(lead.excerpt || "No excerpt available. Open the source for the full publisher article.")}</p>
      <div class="lead-actions">
        <button class="primary-button" type="button" data-open="${lead.id}">Read brief</button>
        <button class="secondary-button" type="button" data-source="${escapeHtml(lead.canonicalUrl)}">Open source</button>
      </div>
    </div>
  `;

  els.articleGrid.innerHTML = rest
    .map(
      (article) => `
        <button class="article-card ${article.id === state.selectedArticleId ? "selected" : ""}" type="button" data-open="${article.id}">
          <div class="article-thumb">${visualMarkup(article)}</div>
          <div class="article-body">
            ${articleMeta(article)}
            <h3>${escapeHtml(article.title)}</h3>
            <p>${escapeHtml(article.excerpt || "Open source for details.")}</p>
          </div>
        </button>
      `,
    )
    .join("");

  renderDetail();
}

function renderDetail() {
  const article = currentArticle();
  if (!article) return;

  const summaryBody = article.summary
    ? `
      <div class="summary-box">
        <p>${escapeHtml(article.summary.summary)}</p>
        <ul>${article.summary.keyPoints.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul>
        <div class="disclosure">AI-assisted summary. Based on ${escapeHtml(article.summary.basedOn)}. Verify sensitive details with the original source.</div>
      </div>
    `
    : `
      <div class="summary-box">
        <p>No summary has been generated yet.</p>
        <p>To keep costs low, OneStopNews summarizes only when you ask for it, then caches the result.</p>
        <button class="primary-button" type="button" data-summarize="${article.id}">Summarize this article</button>
      </div>
    `;

  const originalBody = `
    <div class="summary-box">
      <p><strong>Original article:</strong> OneStopNews does not copy the full publisher article.</p>
      <p>Use the source button below to read the article on ${escapeHtml(article.source)}.</p>
      <div class="disclosure">Stored content availability: ${escapeHtml(article.contentAvailability)}.</div>
    </div>
  `;

  els.detailPanel.innerHTML = `
    <article class="detail-card">
      <div class="detail-hero">${visualMarkup(article)}</div>
      <div class="detail-inner">
        ${articleMeta(article)}
        <h2>${escapeHtml(article.title)}</h2>
        <div class="toggle" role="group" aria-label="Article view mode">
          <button class="${state.selectedMode === "original" ? "active" : ""}" type="button" data-mode="original">Original Source</button>
          <button class="${state.selectedMode === "summary" ? "active" : ""}" type="button" data-mode="summary">AI Summary</button>
        </div>
        ${state.selectedMode === "summary" ? summaryBody : originalBody}
        <a class="source-link" href="${escapeHtml(article.canonicalUrl)}" target="_blank" rel="noreferrer">Open original source</a>
      </div>
    </article>
  `;
}

function renderStatus(payload) {
  const online = Object.values(payload.sources || {}).filter((source) => source.state === "online").length;
  const total = Object.values(payload.sources || {}).length;
  els.statusPills.innerHTML = `
    <span>${online}/${total || "?"} feeds online</span>
    <span>${payload.lastIngestedAt ? `Updated ${timeAgo(payload.lastIngestedAt)}` : "Not ingested yet"}</span>
    <span>${state.summarized} summarized</span>
  `;
}

async function loadCategories() {
  const response = await fetch("/api/categories");
  const payload = await response.json();
  state.categories = payload.categories;
}

async function loadArticles() {
  const params = new URLSearchParams({
    category: state.selectedCategory,
    subcategory: state.selectedSubcategory,
    sort: state.sort,
    q: state.q,
  });
  const response = await fetch(`/api/articles?${params}`);
  const payload = await response.json();
  state.articles = payload.articles || [];
  state.counts = payload.counts || {};
  state.indexed = payload.indexed || 0;
  state.summarized = payload.summarized || 0;
  renderStatus({ sources: Object.fromEntries((await fetch("/api/source-health").then((res) => res.json())).sources.map((source) => [source.id, source.status])), lastIngestedAt: payload.lastIngestedAt });
  renderTopicNav();
  renderSubcategories();
  renderFeed();
}

async function refreshFeeds() {
  els.refreshButton.disabled = true;
  els.refreshButton.textContent = "Refreshing...";
  try {
    const response = await fetch("/api/ingest", { method: "POST" });
    const payload = await response.json();
    renderStatus({ sources: payload.sources, lastIngestedAt: payload.lastIngestedAt });
    await loadArticles();
  } finally {
    els.refreshButton.disabled = false;
    els.refreshButton.textContent = "Refresh live feeds";
  }
}

async function summarize(articleId) {
  const button = document.querySelector(`[data-summarize="${articleId}"]`);
  if (button) {
    button.disabled = true;
    button.textContent = "Summarizing...";
  }

  const response = await fetch(`/api/summarize/${articleId}`, { method: "POST" });
  const payload = await response.json();
  const article = state.articles.find((item) => item.id === articleId);
  if (article && payload.summary) article.summary = payload.summary;
  renderFeed();
}

document.addEventListener("click", async (event) => {
  const menuButton = event.target.closest("[data-menu]");
  const navButton = event.target.closest("[data-nav-category]");
  const openButton = event.target.closest("[data-open]");
  const sourceButton = event.target.closest("[data-source]");
  const modeButton = event.target.closest("[data-mode]");
  const summarizeButton = event.target.closest("[data-summarize]");

  if (!event.target.closest(".topic-item")) {
    state.openMenuId = "";
    renderTopicNav();
  }

  if (menuButton) {
    state.openMenuId = state.openMenuId === menuButton.dataset.menu ? "" : menuButton.dataset.menu;
    renderTopicNav();
  }

  if (navButton) {
    state.selectedCategory = navButton.dataset.navCategory;
    state.selectedSubcategory = navButton.dataset.navSubcategory;
    state.openMenuId = "";
    await loadArticles();
  }

  if (openButton) {
    state.selectedArticleId = openButton.dataset.open;
    state.selectedMode = "summary";
    renderFeed();
    document.querySelector("#detailPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (sourceButton) {
    window.open(sourceButton.dataset.source, "_blank", "noreferrer");
  }

  if (modeButton) {
    state.selectedMode = modeButton.dataset.mode;
    renderDetail();
  }

  if (summarizeButton) {
    await summarize(summarizeButton.dataset.summarize);
  }
});

els.subcategorySelect.addEventListener("change", async () => {
  state.selectedSubcategory = els.subcategorySelect.value;
  await loadArticles();
});

els.sortSelect.addEventListener("change", async () => {
  state.sort = els.sortSelect.value;
  await loadArticles();
});

els.searchInput.addEventListener("input", async () => {
  state.q = els.searchInput.value;
  await loadArticles();
});

els.refreshButton.addEventListener("click", refreshFeeds);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.openMenuId) {
    state.openMenuId = "";
    renderTopicNav();
  }
});

await loadCategories();
await loadArticles();

```

# index.html
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>OneStopNews — Live AI News Aggregator</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Newsreader:opsz,wght@6..72,550;6..72,700&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <div class="app-shell">
      <main class="workspace">
        <header class="site-header">
          <div class="brand">
            <div class="brand-mark">OSN</div>
            <div>
              <strong>OneStopNews</strong>
              <span>Everything important, sorted by topic</span>
            </div>
          </div>
          <div class="status-pills" id="statusPills">
            <span>Loading sources...</span>
          </div>
        </header>

        <section class="hero">
          <div>
            <p class="eyebrow">Live Brief</p>
            <h1>Major stories, grouped by what they are about.</h1>
          </div>
          <div class="hero-actions">
            <label class="search">
              <span>Search</span>
              <input id="searchInput" type="search" placeholder="Apple, Singapore, China, markets..." />
            </label>
            <button class="refresh-button" id="refreshButton" type="button">Refresh live feeds</button>
          </div>
        </section>

        <nav class="topic-nav" id="topicNav" aria-label="Topic navigation"></nav>

        <section class="controls-panel">
          <div>
            <div class="section-label">Current view</div>
            <div class="active-category" id="activeCategory">Top Stories</div>
            <div class="result-count" id="resultCount">Loading articles...</div>
          </div>
          <div class="field">
            <label for="subcategorySelect">Subcategory</label>
            <select id="subcategorySelect"></select>
          </div>
          <div class="field">
            <label for="sortSelect">Sort</label>
            <select id="sortSelect">
              <option value="latest">Latest</option>
              <option value="impact">Highest impact</option>
              <option value="summary">Summary ready</option>
            </select>
          </div>
        </section>

        <section class="feed-layout">
          <div class="lead-card" id="leadCard"></div>
          <div class="article-grid" id="articleGrid"></div>
        </section>
      </main>

      <aside class="detail-panel" id="detailPanel" aria-label="Selected article"></aside>
    </div>

    <script src="/app.js" type="module"></script>
  </body>
</html>

```

# styles.css
```css
:root {
  --ink-950: #151719;
  --ink-800: #262b31;
  --ink-600: #56616f;
  --ink-400: #8994a3;
  --paper: #f7f5ef;
  --surface: #fffdf8;
  --line: #ddd8cc;
  --soft-line: #ece7db;
  --sage: #64786a;
  --sage-dark: #405247;
  --clay: #b86f52;
  --blue: #486b8f;
  --violet: #6d637e;
  --shadow: 0 24px 70px rgba(28, 31, 35, 0.12);
  --radius: 8px;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  color: var(--ink-950);
  background:
    linear-gradient(140deg, rgba(100, 120, 106, 0.09), transparent 30%),
    linear-gradient(20deg, rgba(184, 111, 82, 0.09), transparent 36%),
    var(--paper);
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

button,
input,
select {
  font: inherit;
}

button {
  cursor: pointer;
}

.app-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 410px;
  min-height: 100vh;
}

.workspace {
  min-width: 0;
  padding: 24px 28px 32px;
}

.site-header,
.hero,
.controls-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.site-header {
  padding-bottom: 18px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 24px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-mark {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: var(--radius);
  color: #fff;
  background: var(--ink-950);
  font-weight: 850;
  letter-spacing: 0.03em;
}

.brand strong,
.brand span {
  display: block;
}

.brand span {
  margin-top: 2px;
  color: var(--ink-600);
  font-size: 12px;
}

.status-pills {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.status-pills span {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  border: 1px solid var(--soft-line);
  border-radius: 999px;
  color: var(--ink-600);
  background: rgba(255, 253, 248, 0.78);
  padding: 0 10px;
  font-size: 12px;
  font-weight: 750;
}

.hero {
  align-items: flex-start;
  margin-bottom: 18px;
}

.eyebrow,
.section-label {
  margin: 0 0 8px;
  color: var(--sage-dark);
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

h1 {
  max-width: 790px;
  margin: 0;
  font-family: Newsreader, Georgia, serif;
  font-size: clamp(36px, 5vw, 68px);
  font-weight: 700;
  line-height: 0.95;
  letter-spacing: 0;
}

.hero-actions {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  min-width: 420px;
}

.search,
.field {
  display: grid;
  gap: 6px;
  color: var(--ink-600);
  font-size: 12px;
  font-weight: 750;
}

.search {
  flex: 1;
}

.search input,
select {
  width: 100%;
  height: 42px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  color: var(--ink-950);
  background: rgba(255, 253, 248, 0.94);
  padding: 0 12px;
  outline: none;
}

.search input:focus,
select:focus,
button:focus-visible {
  border-color: var(--sage);
  box-shadow: 0 0 0 3px rgba(100, 120, 106, 0.18);
  outline: none;
}

.refresh-button,
.primary-button,
.source-link {
  min-height: 42px;
  border: 0;
  border-radius: var(--radius);
  color: #fff;
  background: var(--ink-950);
  padding: 0 16px;
  font-weight: 850;
  text-decoration: none;
}

.refresh-button[disabled] {
  cursor: wait;
  opacity: 0.68;
}

.topic-nav {
  position: sticky;
  z-index: 8;
  top: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 18px;
  padding: 8px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: rgba(255, 253, 248, 0.94);
  backdrop-filter: blur(18px);
  box-shadow: 0 14px 40px rgba(28, 31, 35, 0.08);
}

.topic-item {
  position: relative;
}

.topic-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  border: 0;
  border-radius: 7px;
  color: var(--ink-600);
  background: transparent;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 850;
}

.topic-button::after {
  content: "";
  width: 7px;
  height: 7px;
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: translateY(-2px) rotate(45deg);
}

.topic-item.open .topic-button,
.topic-button:hover {
  color: var(--ink-950);
  background: #eef1ea;
}

.topic-menu {
  position: absolute;
  top: calc(100% + 9px);
  left: 0;
  display: none;
  width: min(560px, calc(100vw - 470px));
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow);
}

.topic-item.open .topic-menu {
  display: grid;
  gap: 14px;
}

.topic-menu-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.topic-menu-header strong {
  display: block;
  font-family: Newsreader, Georgia, serif;
  font-size: 25px;
  line-height: 1;
}

.topic-menu-header span {
  display: block;
  margin-top: 4px;
  color: var(--ink-600);
  font-size: 13px;
  line-height: 1.4;
}

.topic-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 74px;
  min-height: 30px;
  border-radius: 999px;
  color: var(--sage-dark);
  background: #eef1ea;
  font-size: 12px;
  font-weight: 850;
}

.topic-subgrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.topic-subitem {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 42px;
  border: 1px solid var(--soft-line);
  border-radius: var(--radius);
  color: var(--ink-800);
  background: #fbf9f2;
  padding: 0 11px;
  text-align: left;
  font-size: 13px;
  font-weight: 800;
}

.topic-subitem:hover {
  border-color: rgba(64, 82, 71, 0.3);
  background: #f1f3ec;
}

.controls-panel {
  margin-bottom: 16px;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: rgba(255, 253, 248, 0.82);
}

.active-category {
  font-size: 22px;
  font-weight: 850;
}

.result-count {
  margin-top: 4px;
  color: var(--ink-600);
  font-size: 13px;
  font-weight: 650;
}

.field {
  min-width: 190px;
}

.feed-layout {
  display: grid;
  grid-template-columns: minmax(310px, 0.92fr) minmax(380px, 1.08fr);
  gap: 16px;
}

.lead-card,
.article-card,
.detail-card,
.empty {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: 0 12px 30px rgba(28, 31, 35, 0.06);
}

.lead-card {
  overflow: hidden;
}

.news-art {
  width: 100%;
  height: 100%;
  min-height: 150px;
  display: grid;
  place-items: end start;
  padding: 18px;
  color: rgba(255, 255, 255, 0.88);
  background:
    linear-gradient(135deg, var(--art-a), var(--art-b)),
    var(--ink-800);
}

.news-art span {
  max-width: 82%;
  font-size: 12px;
  font-weight: 850;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.lead-image {
  height: 300px;
}

.lead-content,
.article-body,
.detail-inner {
  padding: 18px;
}

.meta-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
  color: var(--ink-400);
  font-size: 12px;
}

.source-chip,
.summary-ready {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 0.04em;
}

.source-chip {
  color: var(--ink-950);
  background: #ede6d5;
}

.summary-ready {
  color: #fff;
  background: var(--blue);
}

.category-tag {
  color: var(--sage-dark);
  font-weight: 800;
}

.lead-card h2,
.article-card h3,
.detail-card h2 {
  margin: 0;
  font-family: Newsreader, Georgia, serif;
  letter-spacing: 0;
}

.lead-card h2 {
  font-size: 32px;
  line-height: 1.02;
}

.detail-card h2 {
  margin: 12px 0 8px;
  font-size: 30px;
  line-height: 1.06;
}

.lead-card p,
.article-card p,
.detail-card p,
.empty {
  color: var(--ink-600);
  line-height: 1.55;
}

.lead-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.secondary-button {
  min-height: 42px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  color: var(--ink-950);
  background: transparent;
  padding: 0 14px;
  font-weight: 850;
}

.article-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.article-card {
  display: grid;
  grid-template-rows: 150px auto;
  min-height: 338px;
  overflow: hidden;
  text-align: left;
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
}

.article-card:hover,
.article-card.selected {
  transform: translateY(-2px);
  border-color: rgba(64, 82, 71, 0.34);
  box-shadow: var(--shadow);
}

.article-card h3 {
  font-size: 21px;
  line-height: 1.1;
}

.article-card p {
  margin-bottom: 0;
  font-size: 14px;
}

.detail-panel {
  position: sticky;
  top: 0;
  height: 100vh;
  padding: 22px 18px;
  border-left: 1px solid var(--line);
  background: rgba(255, 253, 248, 0.86);
  backdrop-filter: blur(18px);
  overflow: auto;
}

.detail-card {
  overflow: hidden;
}

.detail-hero {
  height: 180px;
}

.toggle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  margin: 18px 0;
  padding: 4px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: #f1ece1;
}

.toggle button {
  min-height: 38px;
  border: 0;
  border-radius: 6px;
  color: var(--ink-600);
  background: transparent;
  font-weight: 850;
}

.toggle button.active {
  color: var(--ink-950);
  background: var(--surface);
  box-shadow: 0 8px 18px rgba(28, 31, 35, 0.08);
}

.summary-box {
  padding: 14px;
  border: 1px solid var(--soft-line);
  border-radius: var(--radius);
  background: #faf8f1;
}

.summary-box ul {
  margin: 12px 0 0;
  padding-left: 18px;
  color: var(--ink-600);
  line-height: 1.5;
}

.disclosure {
  margin-top: 12px;
  color: var(--ink-400);
  font-size: 12px;
  line-height: 1.45;
}

.source-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin-top: 14px;
}

.empty {
  padding: 22px;
}

@media (max-width: 1220px) {
  .app-shell {
    display: block;
  }

  .detail-panel {
    position: static;
    height: auto;
    border-left: 0;
    border-top: 1px solid var(--line);
  }

  .feed-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 860px) {
  .workspace {
    padding: 18px;
  }

  .site-header,
  .hero,
  .hero-actions,
  .controls-panel {
    display: grid;
    min-width: 0;
  }

  .status-pills {
    justify-content: flex-start;
  }

  h1 {
    font-size: clamp(40px, 12vw, 58px);
  }

  .topic-nav {
    position: relative;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: stretch;
    gap: 8px;
    overflow: visible;
    padding: 10px;
  }

  .topic-item {
    position: static;
  }

  .topic-button {
    justify-content: space-between;
    width: 100%;
    min-height: 50px;
    padding: 0 14px;
    font-size: 14px;
    text-align: left;
  }

  .topic-menu {
    position: static;
    grid-column: 1 / -1;
    width: 100%;
    margin-top: 2px;
    padding: 14px;
    box-shadow: 0 14px 34px rgba(28, 31, 35, 0.12);
  }

  .topic-menu-header {
    display: grid;
    gap: 10px;
  }

  .topic-count {
    justify-self: start;
  }

  .topic-subgrid,
  .article-grid {
    grid-template-columns: 1fr;
  }

  .topic-subitem {
    min-height: 48px;
    font-size: 14px;
  }
}

@media (min-width: 640px) and (max-width: 860px) {
  .topic-nav {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .topic-subgrid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

```

