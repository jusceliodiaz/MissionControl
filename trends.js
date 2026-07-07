/* =====================================================================
   Mission Control — trends.js
   Busca os assuntos mais pesquisados no Google Trends (feed RSS diário,
   público e sem chave) por país: Brasil, Alemanha, Portugal, Espanha
   e Reino Unido.
   ===================================================================== */

const TRENDS_GEOS = [
  { key: "brasil",   geo: "BR" },
  { key: "alemanha", geo: "DE" },
  { key: "portugal", geo: "PT" },
  { key: "espanha",  geo: "ES" },
  { key: "uk",       geo: "GB" },
];

async function fetchTrendsGeo(geo) {
  const u = "https://trends.google.com/trending/rss?geo=" + geo;
  const r = await fetch(u);
  if (!r.ok) throw new Error("trends " + geo + " -> HTTP " + r.status);
  const text = await r.text();
  const doc = new DOMParser().parseFromString(text, "text/xml");
  return [...doc.querySelectorAll("item")].map((it) => ({
    title: it.querySelector("title")?.textContent || "",
    url: it.querySelector("link")?.textContent || "",
    traffic: it.getElementsByTagNameNS("*", "approx_traffic")[0]?.textContent || "",
  }));
}

async function fetchAllTrends() {
  const settled = await Promise.allSettled(TRENDS_GEOS.map((g) => fetchTrendsGeo(g.geo)));
  const errors = settled
    .map((s, i) => (s.status === "rejected" ? TRENDS_GEOS[i].geo + ": " + String(s.reason).slice(0, 60) : null))
    .filter(Boolean);

  const result = { errors, at: Date.now() };
  settled.forEach((s, i) => {
    result[TRENDS_GEOS[i].key] = (s.status === "fulfilled" ? s.value : []).slice(0, 10);
  });
  return result;
}
