import { recentPage, getSeries, searchAnime } from "./api.js";

const app = document.getElementById("app");
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const mobileSearch = document.getElementById("mobile_search");
const mobileMenu = document.getElementById("mobile_menu");
const sidebar = document.getElementById("sidebar_menu");
const sidebarBg = document.getElementById("sidebar_menu_bg");

const htmlDec = s => {
  const t = document.createElement("textarea");
  t.innerHTML = String(s ?? "");
  return t.value;
};
const esc = s => htmlDec(s).replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));
const truncate = (s, n) => s && s.length > n ? s.slice(0, n).trimEnd() + "…" : s;

/* ---------- Sidebar / header wiring ---------- */
function openMenu(open) {
  sidebar.classList.toggle("active", open);
  sidebarBg.classList.toggle("active", open);
  mobileMenu.classList.toggle("active", open);
}
mobileMenu.onclick = () => openMenu(!sidebar.classList.contains("active"));
document.querySelectorAll(".toggle-sidebar").forEach(b => b.onclick = () => openMenu(false));
sidebarBg.onclick = () => openMenu(false);
mobileSearch.onclick = () => { searchInput.focus(); };

/* ---------- Catalog state ---------- */
const state = { all: [], upcoming: [], completed: [], top: [], sort: "updated", built: false };
let cur = "home", curEps = [], curEpIndex = 0, curLang = "sub", curA = null;

const byScore = list => list.slice().sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
const sortList = (list, sort) => (sort === "popular" || sort === "top") ? byScore(list) : list;

/* ---------- Film cards (flw-item) ---------- */
function typeOf(it) {
  const t = (it.terms_by_type && it.terms_by_type.type);
  return Array.isArray(t) && t[0] ? t[0] : "TV";
}

function flwItem(it) {
  const tag = it.is_dub && it.is_sub
    ? `<span class="tick-item-sub tick-eps amp-algn">SUB</span>`
    : (it.is_dub ? `<span class="tick-item-dub tick-eps amp-algn">DUB</span>` : `<span class="tick-item-sub tick-eps amp-algn">SUB</span>`);
  return `
  <div class="flw-item">
    <div class="film-poster">
      <div class="tick ltr"><div class="${it.is_dub && it.is_sub ? "tick-item-sub" : it.is_dub ? "tick-item-dub" : "tick-item-sub"} tick-eps amp-algn">${it.is_dub && it.is_sub ? "SUB" : it.is_dub ? "DUB" : "SUB"}</div></div>
      <div class="tick rtl">${it.is_sub || it.is_dub ? `<div class="tick-item tick-eps amp-algn">${it.is_sub || it.is_dub} EP</div>` : ""}</div>
      ${it.poster ? `<img class="film-poster-img" src="${esc(it.poster)}" alt="${esc(it.title)}" loading="lazy" />` : ""}
      <a class="film-poster-ahref" href="#/anime/${it.id}" title="${esc(it.title)}"><i class="fas fa-play"></i></a>
    </div>
    <div class="film-detail">
      <h3 class="film-name"><a href="#/anime/${it.id}" title="${esc(it.title)}">${esc(it.title)}</a></h3>
      <div class="fd-infor">
        <span class="fdi-item">${esc(it.is_dub ? "Dub" : "Sub")}</span>
        <span class="dot"></span>
        <span class="fdi-item">${esc(typeOf(it))}</span>
      </div>
    </div>
    <div class="clearfix"></div>
  </div>`;
}

/* ---------- Hero slider ---------- */
let heroIdx = 0, heroTimer;

function heroItem(it, i) {
  return `
  <div class="deslide-item" data-id="${it.id}">
    <div class="deslide-cover"><div class="deslide-cover-img"><img src="${esc(it.background_image || it.poster || "")}" alt="${esc(it.title)}" /></div></div>
    <div class="container" style="position:relative;height:100%">
      <div class="deslide-item-content">
        <div class="desi-sub-text">#${i + 1} Spotlight</div>
        <div class="desi-head-title">${esc(it.title)}</div>
        <div class="sc-detail">
          <div class="scd-item scd-rating">${esc(it.rating || "HD")}</div>
          <div class="scd-item"><span class="quality">HD</span></div>
          <div class="scd-item"><span class="quality ${it.is_dub && !it.is_sub ? "bg-white" : ""}">${it.is_dub && !it.is_sub ? "DUB" : "SUB"}</span></div>
          ${it.year ? `<div class="scd-item m-hide"><i class="far fa-calendar-alt"></i>${esc(it.year)}</div>` : ""}
        </div>
        <div class="desi-description">${esc(truncate(it.description, 250))}</div>
        <div class="desi-buttons">
          <a href="#/anime/${it.id}" class="btn btn-primary btn-radius mr-2"><i class="fas fa-play-circle mr-2"></i>Watch Now</a>
          <a href="#/anime/${it.id}" class="btn btn-secondary btn-radius"><i class="fas fa-info-circle mr-2"></i> Detail<i class="fas fa-angle-right ml-2"></i></a>
        </div>
      </div>
    </div>
  </div>`;
}

function renderHero(items) {
  const slides = items.slice(0, 8);
  app.innerHTML = `
  <div class="deslide-wrap">
    <div class="container" style="max-width:100%!important;width:100%!important;padding:0">
      <div class="deslide" id="hero-slider">
        ${slides.map(heroItem).join("")}
      </div>
      <button class="hero-nav prev" id="hero-prev"><i class="fas fa-angle-left"></i></button>
      <button class="hero-nav next" id="hero-next"><i class="fas fa-angle-right"></i></button>
      <div class="hero-dots" id="hero-dots">${slides.map((_, i) => `<button data-i="${i}"></button>`).join("")}</div>
    </div>
  </div>`;
  heroIdx = 0;
  syncHero();
  document.getElementById("hero-prev").onclick = () => stepHero(-1);
  document.getElementById("hero-next").onclick = () => stepHero(1);
  document.querySelectorAll("#hero-dots button").forEach(b => b.onclick = () => { heroIdx = Number(b.dataset.i); syncHero(); restartHero(); });
  startHero();
}

function stepHero(d) {
  heroIdx = (heroIdx + d + 8) % 8;
  syncHero();
  restartHero();
}
function syncHero() {
  document.querySelectorAll("#hero-slider .deslide-item").forEach((s, i) => s.classList.toggle("active", i === heroIdx));
  document.querySelectorAll("#hero-dots button").forEach((b, i) => b.classList.toggle("active", i === heroIdx));
}
function startHero() { heroTimer = setInterval(() => { heroIdx = (heroIdx + 1) % 8; syncHero(); }, 6500); }
function restartHero() { clearInterval(heroTimer); startHero(); }

function gridSection(title, items, more) {
  return `
  <section class="block_area block_area_home">
    <div class="block_area-header">
      <div class="float-left bah-heading mr-4"><h2 class="cat-heading">${esc(title)}</h2></div>
      <div class="float-right viewmore">${more || ""}</div>
      <div class="clearfix"></div>
    </div>
    <div class="block_area-content block_area-list film_list film_list-grid">
      ${filmGrid(items)}
    </div>
  </section>`;
}

/* ---------- Home content ---------- */
function filmGrid(items) {
  return items.length
    ? `<div class="film_list-wrap">${items.map(flwItem).join("")}</div>`
    : `<span class="section-empty">Nothing here right now.</span>`;
}

const byAdded = list => list.slice().sort((a, b) => (b.id || 0) - (a.id || 0));
const shuffle = list => list.slice().sort(() => Math.random() - 0.5);

/* ---- News/Added/Completed list row ---- */
function newsListItem(it) {
  const eps = it.is_sub || it.is_dub || "";
  return `
  <a class="news-row" href="#/anime/${it.id}">
    <div class="news-title">${esc(it.title)}</div>
    <span class="news-eps">${eps}</span>
    <span class="news-type">${esc(typeOf(it))}</span>
    <span class="news-date">${esc(it.year || "")}</span>
  </a>`;
}
function newsList(items) {
  return items.length
    ? `<div class="news-list"><div class="news-list-head"><span>Name</span><span>EP</span><span>Type</span><span>Date</span></div>${items.map(newsListItem).join("")}</div>`
    : `<span class="section-empty">Nothing here right now.</span>`;
}

function azBlock() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(l => `<a href="#/az/${l}">${l}</a>`).join("");
  return `
  <section class="block_area">
    <div class="block_area-header"><div class="bah-heading"><h2 class="cat-heading">A-Z List</h2></div><div class="clearfix"></div></div>
    <div class="az-list">
      <div class="az-sub">Searching anime order by alphabet name A to Z.</div>
      <div class="az-letters"><a href="#/az/%23">#</a><a href="#/az/ALL">All</a><a href="#/az/A">A</a></div>
      <div class="az-letters">${letters}</div>
    </div>
  </section>`;
}

async function discussionBlock() {
  let html = `<section class="block_area"><div class="block_area-header"><div class="bah-heading"><h2 class="cat-heading">Discussion</h2></div><div class="clearfix"></div></div>`;
  try {
    if (!window.websim || typeof window.websim.getComments !== "function") {
      throw new Error("websim unavailable");
    }
    const pg = await window.websim.getComments({ first: 5 });
    const cs = (pg && pg.comments) || [];
    if (!cs.length) html += `<span class="section-empty">No comments yet — be the first.</span>`;
    else html += cs.map(c => `<div class="disc-row"><div class="disc-name">@${esc(c.user && c.user.username)}</div><div class="disc-body">${esc(c.content || "")}</div></div>`).join("");
  } catch (e) {
    html += `<span class="section-empty">Comments unavailable.</span>`;
  }
  html += `</section>`;
  return html;
}

function timedFetch(p, ms = 7000) {
  return new Promise(res => {
    const t = setTimeout(() => res(null), ms);
    recentPage(p).then(v => { clearTimeout(t); res(v); }).catch(() => { clearTimeout(t); res(null); });
  });
}

async function buildHomeData() {
  const CONC = 4, N = 12;
  const byPage = {};
  let next = 1;
  const workers = Array.from({ length: CONC }, async () => {
    while (next <= N) {
      const p = next++;
      const b = await timedFetch(p);
      if (!b || !b.data || !b.data.length) continue;
      byPage[p] = b.data;
    }
  });
  await Promise.all(workers);
  const seen = new Set();
  const items = [];
  for (let p = 1; p <= N; p++) {
    const data = byPage[p];
    if (!data) continue;
    for (const it of data) { if (!seen.has(it.id)) { seen.add(it.id); items.push(it); } }
  }
  state.all = items;
  state.upcoming = items.filter(it => /not yet|upcoming/i.test(String(it.status || "")));
  state.completed = items.filter(it => /finish|completed/i.test(String(it.status || "")));
  state.top = byScore(items).slice(0, 10);
  state.built = true;
}

function latestBlock() {
  return `
  <section class="block_area block_area_home">
    <div class="block_area-header">
      <div class="float-left bah-heading mr-4"><h2 class="cat-heading">Latest Episode</h2></div>
      <div class="float-right"><div class="sec-tabs" data-group="latest">
        <button data-v="all" class="active">All</button><button data-v="sub">Sub</button><button data-v="dub">Dub</button>
        <button data-v="trend">Trending</button><button data-v="random">Random</button>
      </div><span class="viewmore-inline"><a class="btn" href="#/?view=latest">View more<i class="fas fa-angle-right ml-2"></i></a></span></div><div class="clearfix"></div>
    </div>
    <div class="block_area-content film_list film_list-grid"><div id="latest-list"></div></div>
  </section>`;
}

function upcomingBlock() {
  return `
  <section class="block_area block_area_home">
    <div class="block_area-header">
      <div class="float-left bah-heading mr-4"><h2 class="cat-heading">Upcoming Anime</h2></div>
      <div class="float-right viewmore"><a class="btn" href="#/?filter=status:upcoming">View more<i class="fas fa-angle-right ml-2"></i></a></div>
      <div class="clearfix"></div>
    </div>
    <div class="block_area-content film_list film_list-grid"><div id="upcoming-list"></div></div>
  </section>`;
}

function newsBlock() {
  return `
  <section class="block_area block_area_home">
    <div class="block_area-header">
      <div class="float-left bah-heading mr-4"><h2 class="cat-heading" id="news-title">New Release</h2></div>
      <div class="float-right"><div class="sec-tabs" data-group="news">
        <button data-v="release" class="active">New Release</button>
        <button data-v="added">Newly Added</button>
        <button data-v="completed">Just Completed</button>
      </div><span class="viewmore-inline"><a class="btn" id="news-viewmore" href="#/?view=news&tab=release">View more<i class="fas fa-angle-right ml-2"></i></a></span></div><div class="clearfix"></div>
    </div>
    <div class="block_area-content"><div id="news-list"></div></div>
  </section>`;
}

const CW_KEY = "anikatsu:continue";
function saveProgress(time, duration) {
  if (!curA || !curEps.length) return;
  const ep = curEps[curEpIndex];
  const list = JSON.parse(localStorage.getItem(CW_KEY) || "{}");
  list[curA.id] = {
    id: curA.id, title: curA.title, poster: curA.poster,
    ep: curEpIndex, epNum: ep.number, epTitle: ep.title,
    time: Math.floor(time || 0), duration: Math.floor(duration || 0),
    lang: curLang, ts: Date.now()
  };
  try { localStorage.setItem(CW_KEY, JSON.stringify(list)); } catch (e) {}
}

function allContinueItems() {
  const list = JSON.parse(localStorage.getItem(CW_KEY) || "{}");
  return Object.values(list).sort((a, b) => (b.ts || 0) - (a.ts || 0));
}

function cwCards(items) {
  return items.map(it => {
    const pct = it.duration ? Math.min(100, Math.round((it.time / it.duration) * 100)) : 0;
    return `
    <a class="cw-item" href="#/anime/${it.id}">
      <div class="cw-poster">
        <img src="${esc(it.poster || "")}" alt="" loading="lazy" />
        <div class="cw-play"><i class="fas fa-play"></i></div>
        <span class="cw-ep">EP ${esc(it.epNum)}</span>
      </div>
      <div class="cw-body">
        <div class="cw-name">${esc(it.title)}</div>
        <div class="cw-subs">${esc(it.epTitle || "")}</div>
        <div class="cw-bar"><div class="cw-fill" style="width:${pct}%"></div></div>
        <div class="cw-time">${Math.floor(it.time / 60)}:${String(it.time % 60).padStart(2, "0")} / ${Math.floor(it.duration / 60)}:${String(it.duration % 60).padStart(2, "0")}</div>
      </div>
    </a>`;
  }).join("");
}

function continueBlock() {
  const cards = cwCards(allContinueItems().slice(0, 6));
  if (!cards) return "";
  return `
  <section class="block_area block_area_home">
    <div class="block_area-header"><div class="float-left bah-heading mr-4"><h2 class="cat-heading">Continue Watching</h2></div><div class="float-right viewmore"><a class="btn" href="#/?view=continue">View more<i class="fas fa-angle-right ml-2"></i></a></div><div class="clearfix"></div></div>
    <div class="continue-row">${cards}</div>
  </section>`;
}

function topAnime(items) {
  return items.map((it, i) => `
    <a class="top-item" href="#/anime/${it.id}">
      <span class="top-rank">${i + 1}</span>
      <div class="top-info">
        <div class="top-name">${esc(it.title)}</div>
        <div class="top-sub">${(it.is_sub || 0)}${it.is_dub ? " " + (it.is_dub || 0) : ""} · ${esc(typeOf(it))}</div>
      </div>
    </a>`).join("");
}

function renderHomeContent() {
  const dom = document.createElement("div");
  dom.className = "container";
  dom.innerHTML = `
  <div id="main-wrapper"><div class="container">
    <div id="main-content">
      ${continueBlock()}
      ${latestBlock()}
      ${upcomingBlock()}
      ${newsBlock()}
      ${azBlock()}
      <div id="discussion-target"></div>
      <div class="clearfix"></div>
    </div>
    <div id="main-sidebar">
      <div class="cbox cbox-genres" style="padding:15px">
        <h3 class="cat-heading" style="color:#ef547a;font-size:16px;margin-bottom:10px">Top Anime</h3>
        <div class="top-tabs" data-group="top">
          <button data-v="day" class="active">Day</button><button data-v="week">Week</button><button data-v="month">Month</button>
        </div>
        <div id="top-list">${topAnime(state.top)}</div>
      </div>
    </div>
    <div class="clearfix"></div>
  </div></div>`;
  app.appendChild(dom);

  // Latest Episode tabs
  const latestEl = document.getElementById("latest-list");
  const showLatest = v => {
    const map = {
      all: state.all,
      sub: state.all.filter(x => x.is_sub > 0),
      dub: state.all.filter(x => x.is_dub > 0),
      trend: byScore(state.all),
      random: shuffle(state.all)
    };
    if (latestEl) latestEl.innerHTML = filmGrid((map[v] || state.all).slice(0, 12));
    document.querySelectorAll('[data-group="latest"] button').forEach(b => b.classList.toggle("active", b.dataset.v === v));
  };
  document.querySelectorAll('[data-group="latest"] button').forEach(b => b.onclick = () => showLatest(b.dataset.v));
  showLatest("all");

  // Upcoming
  const upEl = document.getElementById("upcoming-list");
  if (upEl) upEl.innerHTML = filmGrid(state.upcoming.slice(0, 12));

  // New / Added / Completed tabs
  const newsEl = document.getElementById("news-list");
  const newsMap = { release: state.all, added: byAdded(state.all), completed: state.completed };
  const newsTitle = document.getElementById("news-title");
  const showNews = v => {
    const vm = document.getElementById("news-viewmore");
    if (vm) vm.setAttribute("href", `#/?view=news&tab=${v}`);
    if (newsEl) newsEl.innerHTML = newsList((newsMap[v] || state.all).slice(0, 4));
    if (newsTitle) newsTitle.textContent = { release: "New Release", added: "Newly Added", completed: "Just Completed" }[v] || "New Release";
    document.querySelectorAll('[data-group="news"] button').forEach(b => b.classList.toggle("active", b.dataset.v === v));
  };
  document.querySelectorAll('[data-group="news"] button').forEach(b => b.onclick = () => showNews(b.dataset.v));
  showNews("release");

  // Top Anime tabs (same ranked list; no per-period data available)
  document.querySelectorAll('[data-group="top"] button').forEach(b => b.onclick = () => {
    document.querySelectorAll('[data-group="top"] button').forEach(x => x.classList.toggle("active", x === b));
  });

  // Discussion
  const disc = document.getElementById("discussion-target");
  discussionBlock().then(html => { if (disc) disc.innerHTML = html; });
}

async function renderHome(sort) {
  state.sort = sort || state.sort;
  cur = "home";
  app.innerHTML = `<span class="status-note">Loading…</span>`;
  if (!state.built) {
    try { await buildHomeData(); } catch (e) { app.innerHTML = `<span class="status-note">Failed to load.</span>`; return; }
  }
  app.innerHTML = "";
  renderHero(state.all);
  renderHomeContent();
}

async function ensureData() {
  if (state.built) return;
  app.innerHTML = `<span class="status-note">Loading…</span>`;
  await buildHomeData();
}

async function renderAZ(letter) {
  cur = "filter";
  openMenu(false);
  app.innerHTML = `<span class="status-note">Loading…</span>`;
  try { await ensureData(); } catch (e) { app.innerHTML = `<span class="status-note">Could not load.</span>`; return; }
  const items = state.all.filter(it => {
    const t = (it.title || "").trim();
    if (letter === "#") return !/^[a-z0-9]/i.test(t);
    if (letter === "0-9") return /^[0-9]/.test(t);
    if (letter === "ALL") return true;
    return t.toUpperCase().startsWith(letter);
  });
  const label = { "ALL": "All Anime", "#": "A-Z — #", "0-9": "A-Z — 0-9" }[letter] || `A-Z — ${letter}`;
  app.innerHTML = `
  <div class="container search-block">
    <div id="main-wrapper"><div class="container"><div id="main-content">
      ${gridSection(label, items)}
      ${items.length ? "" : `<span class="status-note">Nothing here right now.</span>`}
    </div></div></div>
  </div>`;
}

async function playRandom() {
  try { await ensureData(); } catch (e) { return; }
  const pick = shuffle(state.all.filter(x => x.is_sub > 0 || x.is_dub > 0))[0];
  if (pick) location.hash = "#/anime/" + pick.id;
}

/* ---------- Search ---------- */
async function renderSearch(term) {
  cur = "search";
  app.innerHTML = `<span class="status-note">Searching “${esc(term)}”…</span>`;
  let items = [];
  try { items = await searchAnime(term); } catch (e) { app.innerHTML = `<span class="status-note">Search failed. Try again.</span>`; return; }
  app.innerHTML = `
  <div class="container search-block">
    <div id="main-wrapper"><div class="container"><div id="main-content">
      ${gridSection(`Search: “${esc(term)}”`, items)}
      ${items.length ? "" : `<span class="status-note">No results. Try a different title.</span>`}
    </div></div></div>
  </div>`;
}

/* ---------- Detail / player ---------- */
function embedFor(ep) {
  if (ep.embed_url && ep.embed_url[curLang]) return ep.embed_url[curLang];
  return `https://megaplay.buzz/stream/s-2/${ep.episode_embed_id}/${curLang}`;
}

let epGroup = 0;
const EP_CHUNK = 100;

function renderEpList() {
  const groupEl = document.getElementById("ep-group");
  const epsEl = document.getElementById("eps");
  if (!epsEl) return;
  const total = curEps.length;
  const groupStart = i => i * EP_CHUNK;
  const groupEnd = i => Math.min((i + 1) * EP_CHUNK, total) - 1;
  const ngroups = Math.max(1, Math.ceil(total / EP_CHUNK));
  if (epGroup < 0 || epGroup > ngroups - 1) epGroup = 0;
  if (groupEl) {
    groupEl.innerHTML = total > EP_CHUNK
      ? `<div class="ep-groups">${Array.from({ length: ngroups }, (_, i) =>
          `<button class="ep-group${i === epGroup ? " active" : ""}" data-g="${i}">${groupStart(i) + 1}-${groupEnd(i) + 1}</button>`).join("")}</div>`
      : "";
    groupEl.querySelectorAll(".ep-group").forEach(b => b.onclick = () => { epGroup = Number(b.dataset.g); renderEpList(); });
  }
  const gs = groupStart(epGroup), ge = groupEnd(epGroup);
  epsEl.innerHTML = Array.from({ length: ge - gs + 1 }, (_, k) => {
    const i = gs + k, ep = curEps[i];
    return `
    <div class="ep-tile${i === curEpIndex ? " active" : ""}" data-i="${i}" title="${esc(ep.title || "")}">
      <span class="ep-num">EP ${esc(ep.number)}</span>
      <span class="ep-title">${esc(truncate(ep.title || `Episode ${ep.number}`, 90))}</span>
    </div>`;
  }).join("");
  epsEl.querySelectorAll(".ep-tile").forEach(el => el.onclick = () => selectEpisode(Number(el.dataset.i)));
}

function selectEpisode(index) {
  if (!curEps.length) return;
  curEpIndex = Math.max(0, Math.min(index, curEps.length - 1));
  epGroup = Math.floor(curEpIndex / EP_CHUNK);
  renderEpList();
  const ep = curEps[curEpIndex];
  const player = document.getElementById("player");
  if (!player) return;

  player.innerHTML = `
    <div class="section-player">
      <div class="player-frame"><iframe src="${esc(embedFor(ep))}" allowfullscreen scrolling="no" frameborder="0" allow="autoplay; fullscreen; encrypted-media"></iframe></div>
      <div class="pb-meta">
        <span class="pb-title">${esc(ep.title)}</span>
        <div class="pb-actions">
          <button class="pb-action" id="prev-ep" ${curEpIndex === 0 ? "disabled" : ""}>‹ Prev</button>
          <button class="pb-action" id="next-ep" ${curEpIndex >= curEps.length - 1 ? "disabled" : ""}>Next ›</button>
        </div>
        <span class="pb-lang">${curLang}</span>
      </div>
      <div class="pb-note" id="player-note"></div>
    </div>`;
  const p = document.getElementById("prev-ep"); if (p) p.onclick = () => selectEpisode(curEpIndex - 1);
  const n = document.getElementById("next-ep"); if (n) n.onclick = () => selectEpisode(curEpIndex + 1);
}

// Only show episodes that have actually been released.
function releasedEpisodes(eps, anime) {
  const airing = anime.status === "Currently Airing";
  const nextAir = Number(anime.next_air_ep);
  return eps.filter(e => {
    const eu = e.embed_url || {};
    const hasEmbed = !!(eu.sub || eu.dub || String(e.episode_embed_id || "").trim());
    if (!hasEmbed) return false;
    if (airing && Number.isFinite(nextAir) && Number(e.number) >= nextAir) return false;
    return true;
  }).slice().sort((x, y) => x.number - y.number);
}

async function renderDetail(id) {
  cur = "detail";
  app.innerHTML = `<span class="status-note">Loading…</span>`;
  let data;
  try { data = await getSeries(id); } catch (e) { app.innerHTML = `<span class="status-note">Could not load this anime.</span>`; return; }
  const inner = (data && data.data) || data;
  if (!inner || !inner.anime) { app.innerHTML = `<span class="status-note">Could not load this anime.</span>`; return; }
  const a = inner.anime;
  curA = a;
  curEps = releasedEpisodes(inner.episodes || [], a);
  if (!curLang) curLang = a.is_sub && a.is_sub > 0 ? "sub" : "dub";
  curEpIndex = 0;

  const genres = ((a.terms_by_type && a.terms_by_type.genre) || []).slice(0, 12)
    .map(g => `<a href="#/">${esc(g)}</a>`).join("");
  const total = (a.episodes && String(a.episodes) !== "") ? a.episodes : curEps.length;

  app.innerHTML = `
  <div id="main-wrapper">
    <div class="container watch-container">
      <div id="main-content">
        <section class="block_area">
          <div class="block_area-header block_area-header-tabs">
            <div class="float-left bah-heading mr-4"><h2 class="cat-heading">Watch</h2></div>
            <div class="float-right">
              <div class="lang-toggle">
                ${a.is_dub ? `<button class="langbtn ${curLang === "dub" ? "active" : ""}" data-lang="dub">Dub</button>` : ""}
                ${a.is_sub ? `<button class="langbtn ${curLang === "sub" ? "active" : ""}" data-lang="sub">Sub</button>` : ""}
              </div>
            </div>
            <div class="clearfix"></div>
          </div>
          <div class="tab-content">
            <div class="watch-wrap">
              <div class="watch-main"><div id="player"></div></div>
              ${curEps.length ? `<aside class="watch-side">
                <h3 class="cat-heading">Episodes</h3>
                <div id="ep-group"></div>
                <div class="episodes ep-playlist" id="eps"></div>
              </aside>`
                : ``}
            </div>
            ${curEps.length ? "" : `<span class="status-note">No episodes available yet.</span>`}
          </div>
        </section>
        <div class="clearfix"></div>
      </div>
    </div>

    <div id="ani_detail">
      <div class="ani_detail-stage">
        <div class="container">
          <div class="anis-cover-wrap">
            ${a.background_image ? `<div class="anis-cover" style="background-image:url('${esc(a.background_image)}')"></div>` : ""}
          </div>
          <div class="anis-content">
            <div class="anisc-poster">
              <div class="film-poster">${a.poster ? `<img class="film-poster-img" src="${esc(a.poster)}" alt="${esc(a.title)}" />` : ""}</div>
            </div>
            <div class="anisc-detail">
              <div class="prebreadcrumb">
                <nav aria-label="breadcrumb"><ol class="breadcrumb">
                  <li class="breadcrumb-item"><a href="#/">Home</a></li>
                  <li class="breadcrumb-item active" aria-current="page">${esc(a.title)}</li>
                </ol></nav>
              </div>
              <h2 class="film-name dynamic-name" data-jname="${esc(a.title)}">${esc(a.title)}</h2>
              <div class="film-stats">
                <div class="tac tick-item tick-quality">HD</div>
                <div class="tac tick-item ${a.is_dub ? "tick-dub" : "tick-sub"}">${a.is_dub ? "Dubbed" : "Subbed"}</div>
                <span class="dot"></span><span class="item">${esc((a.terms_by_type && a.terms_by_type.type[0]) || "TV")}</span>
                <div class="clearfix"></div>
              </div>
              <div class="film-buttons">
                <a href="#/anime/${id}" class="btn btn-radius btn-primary btn-play"><i class="fas fa-play mr-2"></i>Watch now</a>
              </div>
              <div class="film-description m-hide"><div class="text">${a.description ? esc(a.description) : ""}</div></div>
            </div>
            <div class="anisc-info-wrap">
              <div class="anisc-info">
                ${a.alternative && a.alternative !== a.title ? `<div class="item item-title"><span class="item-head">Other names:</span> <span class="name">${esc(a.alternative)}</span></div>` : ""}
                <div class="item item-title"><span class="item-head">Episodes:</span> <span class="name">${esc(total)}</span></div>
                ${a.year ? `<div class="item item-title"><span class="item-head">Release Year:</span> <span class="name">${esc(a.year)}</span></div>` : ""}
                <div class="item item-title"><span class="item-head">Type:</span> <span class="name">${esc((a.terms_by_type && a.terms_by_type.type[0]) || "TV")}</span></div>
                ${a.status ? `<div class="item item-title"><span class="item-head">Status:</span> <span class="name">${esc(a.status)}</span></div>` : ""}
                ${a.score && Number(a.score) > 0 ? `<div class="item item-title"><span class="item-head">Rating:</span> <span class="name">★ ${esc(Number(a.score).toFixed(1))}</span></div>` : ""}
                ${genres ? `<div class="item item-list"><span class="item-head">Genres:</span> ${genres}</div>` : ""}
              </div>
              <div class="clearfix"></div>
            </div>
            <div class="clearfix"></div>
          </div>
        </div>
      </div>
    </div>
  </div>`;

  document.querySelectorAll(".lang-toggle .langbtn").forEach(b => {
    b.onclick = () => {
      curLang = b.dataset.lang;
      document.querySelectorAll(".lang-toggle .langbtn").forEach(x => x.classList.toggle("active", x === b));
      selectEpisode(curEpIndex);
    };
  });
  if (curEps.length) selectEpisode(0);
}

/* ---------- Player events ---------- */
window.addEventListener("message", event => {
  let data = event.data;
  if (typeof data === "string") { try { data = JSON.parse(data); } catch (e) { return; } }
  if (!data || (data.channel !== "megacloud" && data.type !== "watching-log")) return;
  const note = document.getElementById("player-note");
  if (!note) return;
  const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  if (data.event === "time") {
    note.textContent = `Watching — ${fmt(data.time)} / ${fmt(data.duration)} (${data.percent}%)`;
    saveProgress(Number(data.time), Number(data.duration));
  } else if (data.type === "watching-log") {
    note.textContent = `Watching — ${fmt(data.currentTime)} / ${fmt(data.duration)}`;
    saveProgress(Number(data.currentTime), Number(data.duration));
  } else if (data.event === "complete") {
    note.textContent = "Episode complete — loading next…";
    if (curEps.length && curEpIndex < curEps.length - 1) setTimeout(() => selectEpisode(curEpIndex + 1), 1500);
  } else if (data.event === "error") note.textContent = "Playback error.";
});

/* ---------- Popunder (player page) ---------- */
let lastPopunderTime = 0;
const popunderCooldown = 60000;

function openPopunder() {
  const videoWrapper = document.getElementById("player");
  if (videoWrapper && videoWrapper.offsetParent !== null) {
    const currentTime = Date.now();
    if (currentTime - lastPopunderTime >= popunderCooldown) {
      const popunder = window.open("https://omg10.com/4/9277687", "_blank");
      if (popunder) {
        popunder.blur();
        window.focus();
        try { popunder.moveTo(9999, 9999); } catch (e) {}
      }
      lastPopunderTime = currentTime;
    }
  }
}
document.body.addEventListener("click", openPopunder);

/* ---------- Routing ---------- */
function route() {
  const hash = location.hash || "#/";
  searchInput.value = "";
  if (hash.startsWith("#/anime/")) {
    renderDetail(hash.split("/")[2]);
  } else if (hash.startsWith("#/az/")) {
    renderAZ(hash.split("/")[2]);
  } else {
    const query = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
    const params = new URLSearchParams(query);
    const q = params.get("q");
    const sort = params.get("sort");
    const filter = params.get("filter");
    const view = params.get("view");
    if (q) renderSearch(q);
    else if (view) renderViewMore(view, params.get("tab") || "release");
    else if (filter) renderFilter(parseFilter(filter));
    else renderHome(sort);
  }
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", route);

searchForm.addEventListener("submit", e => {
  e.preventDefault();
  const q = searchInput.value.trim();
  if (q) location.hash = "#/?q=" + encodeURIComponent(q);
});

/* ---------- Sidebar filters ---------- */
function parseFilter(str) {
  const [, k, v] = String(str || "").match(/^(\w+):(.+)$/) || [];
  return { key: k || "genre", value: v || str };
}

function buildPredicate({ key, value }) {
  const v = String(value || "").toLowerCase();
  return it => {
    const tbt = it.terms_by_type || {};
    if (key === "type") return (tbt.type || []).some(x => String(x).toLowerCase() === v);
    if (key === "genre") return (tbt.genre || []).some(x => String(x).toLowerCase() === v);
    if (key === "status") {
      const s = String(it.status || "").toLowerCase();
      if (v === "airing") return s.includes("airing");
      if (v === "finished") return s.includes("finish");
      if (v === "upcoming") return s.includes("not yet") || s.includes("upcoming");
      return s.includes(v);
    }
    if (key === "lang") return v === "dub" ? it.is_dub > 0 : it.is_sub > 0;
    return false;
  };
}

async function scanCatalog(pred, maxPages = 25, cap = 36) {
  const out = [];
  const seen = new Set();
  const tfetch = (p, ms) => new Promise(res => {
    const timer = setTimeout(() => res(null), ms);
    recentPage(p).then(v => { clearTimeout(timer); res(v); }).catch(() => { clearTimeout(timer); res(null); });
  });
  for (let p = 1; p <= maxPages; p++) {
    const body = await tfetch(p, 7000);
    if (!body) continue;
    const items = body.data || [];
    if (!items.length) break;
    for (const it of items) {
      if (pred(it) && !seen.has(it.id)) { seen.add(it.id); out.push(it); if (out.length >= cap) break; }
    }
    if (out.length >= cap) break;
    if (body.pagination && p >= Number(body.pagination.total_pages)) break;
  }
  return out;
}

async function renderViewMore(view, tab) {
  cur = "filter";
  openMenu(false);
  app.innerHTML = `<span class="status-note">Loading…</span>`;

  if (view === "continue") {
    const items = allContinueItems();
    const cards = cwCards(items);
    app.innerHTML = `
    <div class="container search-block">
      <div id="main-wrapper"><div class="container"><div id="main-content">
        <section class="block_area block_area_home">
          <div class="block_area-header"><div class="bah-heading"><h2 class="cat-heading">Continue Watching</h2></div><div class="clearfix"></div></div>
          <div class="continue-row">${cards || `<span class="section-empty">Nothing here right now.</span>`}</div>
        </section>
      </div></div></div>
    </div>`;
    return;
  }

  try { await ensureData(); } catch (e) { app.innerHTML = `<span class="status-note">Could not load.</span>`; return; }

  if (view === "latest") {
    app.innerHTML = `
    <div class="container search-block">
      <div id="main-wrapper"><div class="container"><div id="main-content">
        ${gridSection("Latest Episode", state.all)}
      </div></div></div>
    </div>`;
    return;
  }

  if (view === "news") {
    const title = { release: "New Release", added: "Newly Added", completed: "Just Completed" }[tab] || "New Release";
    const map = { release: state.all, added: byAdded(state.all), completed: state.completed };
    const rows = newsList(map[tab] || state.all);
    app.innerHTML = `
    <div class="container search-block">
      <div id="main-wrapper"><div class="container"><div id="main-content">
        <section class="block_area block_area_home">
          <div class="block_area-header"><div class="bah-heading"><h2 class="cat-heading">${esc(title)}</h2></div><div class="clearfix"></div></div>
          <div class="block_area-content">${rows}</div>
        </section>
      </div></div></div>
    </div>`;
  }
}

async function renderFilter(filter) {
  cur = "filter";
  openMenu(false);
  const label = filter.value;
  app.innerHTML = `<span class="status-note">Filtering “${esc(label)}”…</span>`;
  let items = [];
  try { items = await scanCatalog(buildPredicate(filter)); }
  catch (e) { app.innerHTML = `<span class="status-note">Could not load. Try again.</span>`; return; }
  const capNote = items.length >= 36 ? " showing first 36" : "";
  app.innerHTML = `
  <div class="container search-block">
    <div id="main-wrapper"><div class="container"><div id="main-content">
      ${gridSection(`${label}${capNote}`, items)}
      ${items.length ? "" : `<span class="status-note">Nothing in this category right now.</span>`}
    </div></div></div>
  </div>`;
}

// Close the sidebar when a menu link navigates.
document.querySelectorAll("#sidebar_menu a").forEach(a => a.addEventListener("click", () => openMenu(false)));

route();

const randomBtn = document.getElementById("random-anime");
if (randomBtn) randomBtn.addEventListener("click", e => { e.preventDefault(); playRandom(); });

const pickRandom = document.getElementById("pick-random");
if (pickRandom) pickRandom.addEventListener("click", e => { e.preventDefault(); playRandom(); });