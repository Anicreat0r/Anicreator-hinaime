async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Request failed: " + res.status);
  const body = await res.json();
  if (body && body.ok === false) throw new Error(body.error || "Not found");
  return body;
}

export function recentPage(page, perPage = 50) {
  return getJSON(`/api/recent?page=${page}&per_page=${perPage}`);
}

function withTimeout(promise, ms, tag) {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve({ timedout: true }), ms);
    promise.then(v => { clearTimeout(t); resolve({ timedout: false, value: v }); })
      .catch(() => { clearTimeout(t); resolve({ timedout: true }); });
  });
}

export function getSeries(id) {
  return getJSON(`/api/series/${id}`);
}

// Client-side search: scan catalog pages with bounded concurrency, filtering titles.
export async function searchAnime(q, maxPages = 14, cap = 36) {
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const out = [];
  const seen = new Set();
  let nextPage = 1;
  const CONCURRENT = 4;
  const workers = Array.from({ length: CONCURRENT }, async () => {
    while (nextPage <= maxPages) {
      const p = nextPage++;
      const r = await withTimeout(recentPage(p), 7000);
      if (r.timedout || !r.value) continue;
      for (const it of (r.value.data || [])) {
        const hay = (it.title + " " + (it.alternative || "") + " " + (it.titles || "")).toLowerCase();
        if (words.every(w => hay.includes(w)) && !seen.has(it.id)) {
          seen.add(it.id);
          out.push(it);
          if (out.length >= cap) return;
        }
      }
    }
  });
  await Promise.all(workers);
  return out;
}