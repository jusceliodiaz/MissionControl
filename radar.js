/* =====================================================================
   Mission Control — radar.js
   Busca DADOS REAIS na internet para o Radar IA:
     · Hacker News (hn.algolia.com — API pública, sem chave)
     · Reddit (JSON público)
   Cada fonte falha de forma independente — o radar mostra o que conseguir.
   ===================================================================== */

const RADAR_CATS = {
  modelos:       { label: "Modelos & IA",       color: "cyan" },
  ferramentas:   { label: "Ferramentas & 3D",   color: "violet" },
  mercado:       { label: "Mercado",            color: "amber" },
  homeassistant: { label: "Home Assistant",     color: "green" },
  negocios:      { label: "Negócios & Empreendedorismo", color: "red" },
};

/* ------------------- helpers ------------------- */
const hoursAgo = (ts) => {
  const h = Math.max(0, (Date.now() - ts) / 3.6e6);
  if (h < 1)  return "há " + Math.round(h * 60) + "min";
  if (h < 48) return "há " + Math.round(h) + "h";
  return "há " + Math.round(h / 24) + "d";
};

const mkItem = (o) => ({
  id: "r_" + btoa(unescape(encodeURIComponent(o.url || o.title))).slice(0, 24),
  title: (o.title || "").trim(),
  url: o.url || "",
  source: o.source,
  cat: o.cat,
  ts: o.ts || Date.now(),
  extra: o.extra || "",
});

async function jfetch(url) {
  const r = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!r.ok) throw new Error(url + " -> HTTP " + r.status);
  return r.json();
}

/* ------------------- fontes ------------------- */

// Hacker News via Algolia (histórias recentes com pontuação mínima)
async function srcHN(query, cat, minPoints = 30) {
  const u = "https://hn.algolia.com/api/v1/search_by_date?tags=story" +
            "&hitsPerPage=12&numericFilters=points>" + minPoints +
            "&query=" + encodeURIComponent(query);
  const data = await jfetch(u);
  return (data.hits || []).map((h) => mkItem({
    title: h.title,
    url: h.url || ("https://news.ycombinator.com/item?id=" + h.objectID),
    source: "Hacker News",
    cat,
    ts: (h.created_at_i || 0) * 1000,
    extra: "▲ " + (h.points || 0),
  }));
}

// Reddit JSON público (top do dia)
async function srcReddit(sub, cat, limit = 8) {
  const u = `https://www.reddit.com/r/${sub}/top.json?t=day&limit=${limit}&raw_json=1`;
  const data = await jfetch(u);
  return (data?.data?.children || [])
    .filter((c) => c?.data && !c.data.stickied)
    .map((c) => mkItem({
      title: c.data.title,
      url: "https://www.reddit.com" + c.data.permalink,
      source: "r/" + sub,
      cat,
      ts: (c.data.created_utc || 0) * 1000,
      extra: "▲ " + (c.data.ups || 0),
    }));
}

/* ------------------- orquestração ------------------- */

async function fetchRadar() {
  const plan = [
    srcHN("AI model", "modelos", 40),
    srcHN("LLM", "modelos", 40),
    srcReddit("artificial", "modelos"),
    srcReddit("LocalLLaMA", "modelos"),

    srcHN("Unreal Engine", "ferramentas", 10),
    srcHN("3D rendering", "ferramentas", 10),
    srcReddit("unrealengine", "ferramentas"),
    srcReddit("vfx", "ferramentas"),

    srcHN("AI startup", "mercado", 30),
    srcHN("funding round", "mercado", 30),
    srcReddit("startups", "mercado", 6),

    srcHN("Home Assistant", "homeassistant", 10),
    srcReddit("homeassistant", "homeassistant"),

    srcHN("bootstrapped startup", "negocios", 15),
    srcHN("startup Europe visa", "negocios", 5),
    srcReddit("Entrepreneur", "negocios"),
    srcReddit("smallbusiness", "negocios"),
  ];

  const settled = await Promise.allSettled(plan);
  const items = [];
  const errors = [];
  for (const s of settled) {
    if (s.status === "fulfilled") items.push(...s.value);
    else errors.push(String(s.reason).slice(0, 90));
  }

  // dedupe por id/título
  const seen = new Set();
  const out = [];
  for (const it of items.sort((a, b) => b.ts - a.ts)) {
    const key = it.title.toLowerCase().slice(0, 60);
    if (seen.has(it.id) || seen.has(key)) continue;
    seen.add(it.id); seen.add(key);
    out.push(it);
  }

  // limita por categoria pra manter o feed digerível
  const capped = [];
  const counts = {};
  for (const it of out) {
    counts[it.cat] = (counts[it.cat] || 0) + 1;
    if (counts[it.cat] <= 14) capped.push(it);
  }

  return { items: capped, errors, at: Date.now() };
}
