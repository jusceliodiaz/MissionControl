/* =====================================================================
   Mission Control — radar.js
   Busca DADOS REAIS na internet para o Radar IA:
     · Hacker News (hn.algolia.com — API pública, sem chave)
     · Reddit (JSON público)
     · Remotive + RemoteOK (APIs públicas de vagas remotas)
   Cada fonte falha de forma independente — o radar mostra o que conseguir.
   ===================================================================== */

const RADAR_CATS = {
  mercado:  { label: "Mercado",            color: "amber" },
  negocios: { label: "Negócios & Empreendedorismo", color: "red" },
  vagas:    { label: "Vagas",              color: "green" },
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

// Remotive — vagas remotas (API pública)
async function srcRemotive(search) {
  const u = "https://remotive.com/api/remote-jobs?limit=20&search=" +
            encodeURIComponent(search);
  const data = await jfetch(u);
  return (data.jobs || []).slice(0, 8).map((j) => mkItem({
    title: j.title + " · " + j.company_name,
    url: j.url,
    source: "Remotive",
    cat: "vagas",
    ts: Date.parse(j.publication_date) || Date.now(),
    extra: j.candidate_required_location || "",
  }));
}

// RemoteOK — vagas remotas (API pública)
async function srcRemoteOK(tag) {
  const data = await jfetch("https://remoteok.com/api?tag=" + encodeURIComponent(tag));
  return (Array.isArray(data) ? data : [])
    .filter((j) => j && j.position)
    .slice(0, 6)
    .map((j) => mkItem({
      title: j.position + " · " + (j.company || ""),
      url: j.url || ("https://remoteok.com/remote-jobs/" + j.id),
      source: "RemoteOK",
      cat: "vagas",
      ts: Date.parse(j.date) || Date.now(),
      extra: j.location || "",
    }));
}

/* ------------------- orquestração ------------------- */

async function fetchRadar() {
  const plan = [
    srcHN("AI startup", "mercado", 30),
    srcHN("funding round", "mercado", 30),
    srcReddit("startups", "mercado", 6),

    srcHN("bootstrapped startup", "negocios", 15),
    srcHN("startup Europe visa", "negocios", 5),
    srcReddit("Entrepreneur", "negocios"),
    srcReddit("smallbusiness", "negocios"),

    srcRemotive("unreal engine"),
    srcRemotive("3d artist"),
    srcRemotive("vfx artist"),
    srcRemotive("houdini"),
    srcRemotive("realtime"),
    srcRemotive("ai artist"),
    srcRemoteOK("3d"),
    srcRemoteOK("unreal"),
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
