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

