/* =====================================================================
   Mission Control v2 — dashboard.js
   Views: Overview / Board / Radar IA (dados reais via radar.js)
   ===================================================================== */

const $ = (id) => document.getElementById(id);

/* ---------------- storage ---------------- */
const store = {
  async get(defs) {
    if (typeof chrome !== "undefined" && chrome.storage?.local)
      return chrome.storage.local.get(defs);
    const out = {};
    for (const [k, v] of Object.entries(defs)) {
      const raw = localStorage.getItem("mc_" + k);
      out[k] = raw ? JSON.parse(raw) : v;
    }
    return out;
  },
  async set(obj) {
    if (typeof chrome !== "undefined" && chrome.storage?.local)
      return chrome.storage.local.set(obj);
    for (const [k, v] of Object.entries(obj))
      localStorage.setItem("mc_" + k, JSON.stringify(v));
  },
};

const DEFAULTS = {
  tasks: [],
  diaryNotes: {},
  customReport: null,
  customReportDate: null,
  radarItems: [],
  radarAt: null,
  radarIgnored: [],
  radarUsed: [],       // {title, action, date, url}
  radarSeen: [],
  calendars: [],       // {id, label, ics, color}
  agendaEvents: [],
  agendaAt: null,
  agendaWinStart: null,
  agendaWinEnd: null,
  trends: { brasil: [], alemanha: [], portugal: [], espanha: [], uk: [], at: null },
};

let state = null;
let radarFilter = "all";
let moneyGeo = "brasil"; // país selecionado na view Mercados
let monthCursor = new Date(); monthCursor.setDate(1); monthCursor.setHours(0, 0, 0, 0);

/* ---------------- datas ---------------- */
const todayISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const fmtBR = (iso) => { const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; };

/* ---------------- colunas / sugestões ---------------- */
const COLS = [
  { id: "backlog", title: "Backlog", hint: "ideias e pendências" },
  { id: "today",   title: "A fazer", hint: "o plano do dia" },
  { id: "doing",   title: "Fazendo", hint: "em andamento" },
  { id: "done",    title: "Feito",   hint: "missão cumprida" },
];

/* regras de sugestão de cards por tipo de projeto (casamento por palavra-chave, sem IA externa) */
const PROJECT_RULES = [
  { rx: /unreal|ue4|ue5|\bue\b|cinematic|cutscene/i, tag: "trabalho", tasks: [
    "Criar/ajustar materiais", "Criar texturas", "Otimizar assets (LODs/Nanite)",
    "Configurar iluminação (Lumen/Lightmass)", "Configurar colisões",
    "Configurar pós-processamento", "Renderizar sequência (Movie Render Queue)",
    "Revisar performance (profiling)",
  ] },
  { rx: /houdini|procedural|vex/i, tag: "trabalho", tasks: [
    "Criar rede procedural (VEX/wrangle)", "Configurar simulação/cache",
    "Exportar para Unreal/Maya", "Otimizar tempo de cook",
  ] },
  { rx: /archviz|arquitetura|visualiza[cç][aã]o|datasmith|corona|3ds ?max/i, tag: "trabalho", tasks: [
    "Importar modelo (Datasmith)", "Configurar materiais PBR",
    "Setup de iluminação HDRI", "Criar câmeras/percurso",
    "Renderizar imagens finais", "Revisar escala e proporções",
  ] },
  { rx: /v[ií]deo|edi[cç][aã]o|motion|corte/i, tag: "conteudo", tasks: [
    "Criar roteiro/storyboard", "Editar corte bruto", "Corrigir cor",
    "Adicionar trilha sonora", "Exportar em múltiplos formatos",
  ] },
  { rx: /site|landing|web ?app|next\.?js|react/i, tag: "empresa", tasks: [
    "Definir wireframe", "Criar identidade visual", "Implementar responsivo",
    "Testar em múltiplos dispositivos", "Configurar deploy",
  ] },
  { rx: /curso|aula|treinamento|conte[uú]do educ/i, tag: "conteudo", tasks: [
    "Criar roteiro da aula", "Gravar tela/câmera", "Editar vídeo",
    "Criar material de apoio", "Publicar e divulgar",
  ] },
  { rx: /home ?assistant|automa[cç][aã]o resid|smart ?home/i, tag: "pessoal", tasks: [
    "Mapear dispositivos", "Criar automação (trigger/ação)",
    "Configurar dashboard", "Testar cenários de falha",
  ] },
  { rx: /empresa|startup|neg[oó]cio|empreend/i, tag: "empresa", tasks: [
    "Validar proposta de valor", "Mapear concorrentes", "Definir MVP",
    "Buscar clientes-piloto", "Registrar empresa/jurídico",
  ] },
];

const PROJECT_GENERIC_TASKS = [
  "Definir escopo e prazo", "Levantar referências", "Criar rascunho/protótipo",
  "Revisar com stakeholder", "Entregar versão final",
];

function matchProjectTasks(text) {
  const matched = PROJECT_RULES.filter((r) => r.rx.test(text));
  if (matched.length === 0) return PROJECT_GENERIC_TASKS.map((t) => ({ t, tag: "trabalho" }));
  const seen = new Set();
  const out = [];
  for (const r of matched) for (const t of r.tasks) {
    if (seen.has(t)) continue;
    seen.add(t);
    out.push({ t, tag: r.tag });
  }
  return out;
}

function renderProjectSuggestions(items) {
  const wrap = $("projectSuggestions");
  wrap.innerHTML = "";
  for (const { t, tag } of items) {
    const b = document.createElement("button");
    b.className = "chip";
    b.textContent = t;
    b.addEventListener("click", async () => {
      if (b.classList.contains("added")) return;
      await addTask(t, tag, "normal", "backlog");
      b.classList.add("added");
      b.textContent = "✓ " + t;
    });
    wrap.appendChild(b);
  }
}

/* =====================================================================
   NAVEGAÇÃO
   ===================================================================== */
function gotoView(v) {
  document.querySelectorAll(".view").forEach((el) => el.classList.add("hidden"));
  $("view-" + v).classList.remove("hidden");
  document.querySelectorAll(".nav-item").forEach((n) =>
    n.classList.toggle("active", n.dataset.view === v));
  window.scrollTo(0, 0);
  if (v === "radar") renderRadar();
  if (v === "agenda") renderAgenda();
  if (v === "overview") { renderOverview(); updateTrends(); }
  if (v === "board") renderBoard();
  if (v === "money") { renderMoney(); updateTrends(); }
}

/* =====================================================================
   OVERVIEW (bento)
   ===================================================================== */
function renderOverview() {
  const now = new Date();
  $("dateLine").textContent = now.toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });

  renderOvAgenda();
  renderOvRadar();
  renderOvBoard();
  renderOvTrends();
  renderOvMonth();
}

/* ---- mini-calendário do mês ---- */
function renderOvMonth() {
  const cursor = new Date(); cursor.setDate(1); cursor.setHours(0, 0, 0, 0);
  const label = cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  $("ovMonthTitle").textContent = "▦ " + (label.charAt(0).toUpperCase() + label.slice(1));

  const evsByDay = {};
  for (const e of state.agendaEvents || []) {
    const key = new Date(e.start).toDateString();
    (evsByDay[key] ||= []).push(e);
  }

  const gridStart = new Date(cursor);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());
  const todayStr = new Date().toDateString();

  const grid = $("ovMonthGrid");
  grid.innerHTML = "";
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart); d.setDate(gridStart.getDate() + i);
    const key = d.toDateString();
    const inMonth = d.getMonth() === cursor.getMonth();
    const isToday = key === todayStr;
    const dayEvents = (evsByDay[key] || []).sort((a, b) => a.start - b.start);
    const shown = dayEvents.slice(0, 2);
    const more = dayEvents.length - shown.length;

    const cell = document.createElement("div");
    cell.className = "ovm-cell" + (inMonth ? "" : " out") + (isToday ? " today" : "");
    cell.innerHTML = `
      <div class="ovm-cell-num">${d.getDate()}</div>
      <div class="ovm-cell-evs">
        ${shown.map((e) => `<div class="ovm-ev" style="--evc:${e.calColor || "var(--cyan)"}">
          ${e.allDay ? "" : `<span class="ovm-ev-time">${fmtTime(e.start)}</span>`}
          <span class="ovm-ev-title">${escapeHtml(e.title)}</span>
        </div>`).join("")}
        ${more > 0 ? `<div class="ovm-ev-more">+${more}</div>` : ""}
      </div>`;
    cell.addEventListener("click", () => {
      gotoView("agenda");
      monthCursor = new Date(d.getFullYear(), d.getMonth(), 1);
      ensureMonthData();
      setTimeout(() => jumpToDay(d), 260);
    });
    grid.appendChild(cell);
  }
}

const miniEmpty = (txt) => `<div class="mini-empty">${txt}</div>`;

/* ---- agenda mini: hoje + próximos ---- */
function renderOvAgenda() {
  const wrap = $("ovAgenda");
  const now = Date.now();
  const evs = (state.agendaEvents || [])
    .filter((e) => e.end > now - 3600000)     // do agora em diante (tolerância 1h)
    .sort((a, b) => a.start - b.start)
    .slice(0, 5);

  if (evs.length === 0) {
    wrap.innerHTML = miniEmpty(state.calendars.length === 0
      ? "conecte seu Google Calendar na aba Agenda"
      : "sem reuniões próximas — respira 🙂");
    return;
  }

  wrap.innerHTML = "";
  const todayStr = new Date().toDateString();
  for (const e of evs) {
    const d = new Date(e.start);
    const isToday = d.toDateString() === todayStr;
    const dayLabel = isToday ? "" :
      d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" }) + " · ";
    const div = document.createElement("div");
    div.className = "mini-item" + (e.end < now ? " past" : "");
    div.style.setProperty("--mc", e.calColor || "var(--green)");
    div.innerHTML = `
      <span class="mini-time">${dayLabel}${e.allDay ? "dia todo" : fmtTime(e.start)}</span>
      <span class="mini-txt">${escapeHtml(e.title)}</span>
      ${e.meet
        ? `<a class="mini-meet" href="${encodeURI(e.meet)}" target="_blank" rel="noopener">▶ meet</a>`
        : `<span class="mini-sub">${escapeHtml(e.calLabel || "")}</span>`}`;
    wrap.appendChild(div);
  }
}

/* ---- radar mini: mais avaliados ---- */
const radarPoints = (it) => {
  const m = /▲\s*(\d+)/.exec(it.extra || "");
  return m ? +m[1] : 0;
};

function renderOvRadar() {
  const wrap = $("ovRadar");
  const items = visibleRadarItems()
    .sort((a, b) => radarPoints(b) - radarPoints(a))
    .slice(0, 5);

  if (items.length === 0) {
    wrap.innerHTML = miniEmpty("radar vazio — abra a aba e clique em ⟳ atualizar");
    return;
  }
  const catColor = { modelos: "var(--cyan)", ferramentas: "var(--violet)",
                     mercado: "var(--amber)",
                     homeassistant: "var(--green)", negocios: "var(--red)" };
  wrap.innerHTML = "";
  for (const it of items) {
    const div = document.createElement("div");
    div.className = "mini-item";
    div.style.setProperty("--mc", catColor[it.cat] || "var(--magenta)");
    div.innerHTML = `
      <span class="mini-time">▲ ${radarPoints(it)}</span>
      <span class="mini-txt"><a href="${encodeURI(it.url)}" target="_blank" rel="noopener">${escapeHtml(it.title)}</a></span>
      <span class="mini-sub">${escapeHtml(it.source)}</span>`;
    wrap.appendChild(div);
  }
}

/* ---- board mini: mais recentes ---- */
function renderOvBoard() {
  const wrap = $("ovBoard");
  const colLabel = { backlog: "backlog", today: "a fazer", doing: "fazendo", done: "feito" };
  const colColor = { backlog: "var(--violet)", today: "var(--cyan)",
                     doing: "var(--amber)", done: "var(--green)" };
  const recent = [...state.tasks]
    .filter((t) => t.col !== "done")
    .sort((a, b) => String(b.id).localeCompare(String(a.id)))
    .slice(0, 5);

  if (recent.length === 0) {
    wrap.innerHTML = miniEmpty("board vazio — delegue sua primeira missão");
  } else {
    wrap.innerHTML = "";
    for (const t of recent) {
      const div = document.createElement("div");
      div.className = "mini-item";
      div.style.setProperty("--mc", colColor[t.col]);
      div.innerHTML = `
        <span class="mini-txt">${t.prio === "alta" ? "🔥 " : ""}${escapeHtml(t.title)}</span>
        <span class="mini-tag">${t.tag}</span>
        <span class="mini-sub">${colLabel[t.col]}</span>`;
      wrap.appendChild(div);
    }
  }

  const focus = state.tasks.find((x) => x.col === "doing");
  const doneToday = state.tasks.filter((x) => x.doneAt === todayISO()).length;
  $("ovFocusLine").innerHTML = focus
    ? `foco atual: <b>${escapeHtml(focus.title)}</b> · ${doneToday} concluída(s) hoje`
    : `nada em execução agora · ${doneToday} concluída(s) hoje`;
}

/* ---- google trends ---- */
async function updateTrends() {
  let errors = [];
  try {
    const res = await fetchAllTrends();
    state.trends = {
      brasil: res.brasil, alemanha: res.alemanha, portugal: res.portugal,
      espanha: res.espanha, uk: res.uk, at: res.at,
    };
    errors = res.errors || [];
    if (errors.length) console.error("Falhas ao buscar Google Trends:", errors);
    await store.set({ trends: state.trends });
  } catch (e) {
    console.error("Falha ao atualizar trends:", e);
    errors = [String(e)];
  }
  renderOvTrends(errors);
  renderMoney(errors); // a view Mercados também consome os trends
}

/* helper compartilhada Overview/Mercados */
function renderTrendList(elId, items, emptyMsg) {
  const wrap = $(elId);
  if (!wrap) return;
  if (!items || items.length === 0) {
    wrap.innerHTML = miniEmpty(emptyMsg || "sem dados no momento");
    return;
  }
  wrap.innerHTML = items.map((it, i) => `
    <div class="trend-item">
      <span class="trend-rank">${i + 1}</span>
      <a href="${encodeURI(it.url)}" target="_blank" rel="noopener">${escapeHtml(it.title)}</a>
      ${it.traffic ? `<span class="trend-traffic">${escapeHtml(it.traffic)}</span>` : ""}
    </div>`).join("");
}

const trendsEmptyMsg = (errors) => errors && errors.length
  ? "falha ao buscar (veja o console) — " + errors[0]
  : "sem dados no momento";

function renderOvTrends(errors) {
  const tr = state.trends || {};
  $("trendsAt").textContent = tr.at ? "atualizado " + new Date(tr.at).toLocaleTimeString("pt-BR") : "";
  const emptyMsg = trendsEmptyMsg(errors);
  renderTrendList("trendsBrasil", tr.brasil, emptyMsg);
  renderTrendList("trendsAlemanha", tr.alemanha, emptyMsg);
  renderTrendList("trendsPortugal", tr.portugal, emptyMsg);
  renderTrendList("trendsEspanha", tr.espanha, emptyMsg);
  renderTrendList("trendsUk", tr.uk, emptyMsg);
}

/* =====================================================================
   MERCADOS — inteligência de negócios por país + trends ao vivo
   (dados curados + regras em money.js)
   ===================================================================== */
function renderMoney(errors) {
  if (!$("moneyGeos")) return; // view não presente (segurança)
  renderMoneyGeos();
  renderMoneyIntel();
  renderMoneyLive();
  renderMoneyTrends(errors);
}

/* chips de seleção de país */
function renderMoneyGeos() {
  const wrap = $("moneyGeos");
  wrap.innerHTML = "";
  for (const g of MONEY_GEOS) {
    const b = document.createElement("button");
    b.className = "geo-chip" + (moneyGeo === g.key ? " sel" : "");
    b.style.setProperty("--gc", g.color);
    b.innerHTML = `<span class="geo-flag">${g.flag}</span> ${g.label}`;
    b.addEventListener("click", () => { moneyGeo = g.key; renderMoney(); });
    wrap.appendChild(b);
  }
}

/* painel curado do país selecionado */
function renderMoneyIntel() {
  const g = MONEY_GEOS.find((x) => x.key === moneyGeo);
  const intel = MONEY_INTEL[moneyGeo];
  const wrap = $("moneyIntel");
  if (!intel) { wrap.innerHTML = ""; return; }

  wrap.style.setProperty("--gc", g.color);
  wrap.innerHTML = `
    <div class="mi-snapshot">
      <div class="mi-country">${g.flag} ${g.label}</div>
      <p>${escapeHtml(intel.snapshot)}</p>
    </div>
    <div class="mi-grid">
      <div class="mi-block">
        <div class="mi-block-title">◈ Oportunidades de negócio</div>
        <div class="mi-opps">
          ${intel.oportunidades.map((o) => `
            <div class="mi-opp">
              <h4>${escapeHtml(o.t)}</h4>
              <p>${escapeHtml(o.d)}</p>
            </div>`).join("")}
        </div>
      </div>
      <div class="mi-block">
        <div class="mi-block-title">◆ Ideias de produto <span class="mi-hint">clique para mandar pro board</span></div>
        <div class="mi-products" id="miProducts"></div>
        <div class="mi-block-title mt-big">➤ Seu ângulo</div>
        <p class="mi-angle">${escapeHtml(intel.angulo)}</p>
      </div>
    </div>`;

  // ideias de produto viram card no backlog com um clique (tag empresa)
  const prodWrap = wrap.querySelector("#miProducts");
  for (const p of intel.produtos) {
    const title = `[${g.label}] ${p}`;
    const exists = state.tasks.some((t) => t.title === title);
    const b = document.createElement("button");
    b.className = "chip" + (exists ? " added" : "");
    b.textContent = (exists ? "✓ " : "") + p;
    b.addEventListener("click", async () => {
      if (b.classList.contains("added")) return;
      await addTask(title, "empresa", "normal", "backlog");
      b.classList.add("added");
      b.textContent = "✓ " + p;
    });
    prodWrap.appendChild(b);
  }
}

/* ângulos de monetização detectados nos trends AO VIVO do país */
function renderMoneyLive() {
  const g = MONEY_GEOS.find((x) => x.key === moneyGeo);
  const items = (state.trends || {})[moneyGeo] || [];
  const grid = $("moneyLiveGrid");
  $("moneyLiveHint").textContent =
    `ângulos de monetização cruzando o que está estourando agora em ${g.label}`;

  const matches = matchTrendOpportunities(items);
  if (items.length === 0) {
    grid.innerHTML = `<div class="col-empty">sem trends carregados — clique em “⟳ Atualizar trends”</div>`;
    return;
  }
  if (matches.length === 0) {
    grid.innerHTML = `<div class="col-empty">nenhum padrão monetizável óbvio nos trends de ${g.label} agora — os assuntos do dia estão fora das regras do radar de dinheiro</div>`;
    return;
  }
  grid.innerHTML = matches.map((m) => `
    <div class="ml-card" style="--mlc:${m.color}">
      <div class="ml-label">${escapeHtml(m.label)}</div>
      <div class="ml-hits">${m.hits.slice(0, 3).map((h) => `<span>${escapeHtml(h)}</span>`).join("")}</div>
      <p>${escapeHtml(m.dica)}</p>
    </div>`).join("");
}

/* grid completo de trends dentro da view Mercados */
function renderMoneyTrends(errors) {
  const tr = state.trends || {};
  const at = $("moneyTrendsAt");
  if (at) at.textContent = tr.at ? "atualizado " + new Date(tr.at).toLocaleTimeString("pt-BR") : "";
  const emptyMsg = trendsEmptyMsg(errors);
  renderTrendList("mTrendsBrasil", tr.brasil, emptyMsg);
  renderTrendList("mTrendsAlemanha", tr.alemanha, emptyMsg);
  renderTrendList("mTrendsPortugal", tr.portugal, emptyMsg);
  renderTrendList("mTrendsEspanha", tr.espanha, emptyMsg);
  renderTrendList("mTrendsUk", tr.uk, emptyMsg);
}

/* =====================================================================
   BOARD
   ===================================================================== */
function renderBoard() {
  const board = $("board");
  board.innerHTML = "";

  for (const col of COLS) {
    const el = document.createElement("section");
    el.className = "col";
    el.dataset.col = col.id;
    const tasks = state.tasks.filter((t) => t.col === col.id);

    el.innerHTML = `
      <div class="col-head">
        <span class="col-dot"></span>
        <span class="col-title">${col.title}</span>
        <span class="col-count">${tasks.length}</span>
        <button class="col-add" title="adicionar aqui">＋</button>
      </div>
      <div class="col-body"></div>`;

    const body = el.querySelector(".col-body");
    if (tasks.length === 0) body.innerHTML = `<div class="col-empty">${col.hint}</div>`;
    else for (const t of tasks) body.appendChild(makeCard(t));

    el.querySelector(".col-add").addEventListener("click", () => openTaskModal(col.id));

    el.addEventListener("dragover", (e) => { e.preventDefault(); el.classList.add("drag-over"); });
    el.addEventListener("dragleave", () => el.classList.remove("drag-over"));
    el.addEventListener("drop", async (e) => {
      e.preventDefault();
      el.classList.remove("drag-over");
      const id = e.dataTransfer.getData("text/plain");
      const task = state.tasks.find((t) => t.id === id);
      if (!task || task.col === col.id) return;
      task.col = col.id;
      task.doneAt = col.id === "done" ? todayISO() : null;
      await store.set({ tasks: state.tasks });
      renderBoard();
    });

    board.appendChild(el);
  }
}

function makeCard(t) {
  const div = document.createElement("article");
  div.className = "card" + (t.col === "done" ? " done-card" : "") + (t.img ? " has-img" : "");
  div.draggable = true;
  div.innerHTML = `
    ${t.img ? `<img class="card-thumb" src="${t.img}" alt="registro" title="clique para ampliar" />` : ""}
    <div class="card-title">${escapeHtml(t.title)}</div>
    <div class="card-meta">
      <div class="card-meta-left">
        <span class="tag ${t.tag}">${t.tag}</span>
        ${t.prio === "alta" ? '<span class="prio">🔥</span>' : ""}
        ${t.doneAt ? `<span class="card-date">✓ ${fmtBR(t.doneAt)}</span>` : ""}
      </div>
      <div class="card-meta-actions">
        <button class="card-img-btn" title="${t.img ? "trocar imagem" : "anexar imagem de registro"}">📷</button>
        <button class="card-del" title="excluir">✕</button>
      </div>
    </div>`;

  div.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", t.id);
    div.classList.add("dragging");
  });
  div.addEventListener("dragend", () => div.classList.remove("dragging"));

  div.querySelector(".card-del").addEventListener("click", async () => {
    state.tasks = state.tasks.filter((x) => x.id !== t.id);
    await store.set({ tasks: state.tasks });
    renderBoard();
  });

  // anexar / trocar imagem pelo botão 📷
  div.querySelector(".card-img-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    pickImageFor(t.id);
  });

  // miniatura abre o lightbox
  const thumb = div.querySelector(".card-thumb");
  if (thumb) thumb.addEventListener("click", () => openLightbox(t.id));

  // arrastar um ARQUIVO de imagem direto para o card
  div.addEventListener("dragover", (e) => {
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault(); e.stopPropagation();
      div.classList.add("img-drop");
    }
  });
  div.addEventListener("dragleave", () => div.classList.remove("img-drop"));
  div.addEventListener("drop", async (e) => {
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      e.preventDefault(); e.stopPropagation();
      div.classList.remove("img-drop");
      await attachImage(t.id, file);
    }
  });

  return div;
}

/* =====================================================================
   IMAGEM DE REGISTRO NO CARD
   ===================================================================== */
let imgTargetTaskId = null;

function pickImageFor(taskId) {
  imgTargetTaskId = taskId;
  $("imgInput").value = "";
  $("imgInput").click();
}

// redimensiona para no máx. 1100px e comprime em JPEG (economiza storage)
function downscaleImage(file, maxSide = 1100, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const cv = document.createElement("canvas");
      cv.width = w; cv.height = h;
      cv.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(cv.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("imagem inválida")); };
    img.src = url;
  });
}

async function attachImage(taskId, file) {
  const task = state.tasks.find((x) => x.id === taskId);
  if (!task) return;
  try {
    task.img = await downscaleImage(file);
    await store.set({ tasks: state.tasks });
    renderBoard();
  } catch (e) {
    console.error("Falha ao anexar imagem:", e);
  }
}

function openLightbox(taskId) {
  const task = state.tasks.find((x) => x.id === taskId);
  if (!task || !task.img) return;
  imgTargetTaskId = taskId;
  $("lightboxImg").src = task.img;
  $("lightboxCaption").textContent = task.title;
  $("imgOverlay").classList.remove("hidden");
}

let taskModalCol = "today";
function openTaskModal(colId) {
  taskModalCol = colId;
  $("taskModalTitle").textContent =
    `Nova missão → ${COLS.find((c) => c.id === colId).title}`;
  $("taskTitle").value = "";
  $("taskOverlay").classList.remove("hidden");
  $("taskTitle").focus();
}

async function addTask(title, tag, prio, col) {
  state.tasks.push({
    id: Date.now() + "_" + Math.random().toString(36).slice(2, 6),
    title, tag, prio, col,
    createdAt: todayISO(),
    doneAt: col === "done" ? todayISO() : null,
  });
  await store.set({ tasks: state.tasks });
  renderOverview(); renderBoard();
}

/* =====================================================================
   RADAR — dados reais
   ===================================================================== */
function visibleRadarItems() {
  const ignored = new Set(state.radarIgnored);
  return state.radarItems.filter((it) => !ignored.has(it.id));
}

async function updateRadar() {
  const btn = $("radarUpdate");
  btn.disabled = true;
  btn.textContent = "⟳ buscando fontes reais…";
  $("radarStatus").textContent = "consultando Hacker News e Reddit…";

  try {
    const { items, errors, at } = await fetchRadar();
    state.radarItems = items;
    state.radarAt = at;
    await store.set({ radarItems: items, radarAt: at });
    $("radarStatus").textContent =
      `atualizado ${new Date(at).toLocaleTimeString("pt-BR")} · ` +
      `${items.length} sinais` +
      (errors.length ? ` · ${errors.length} fonte(s) falharam` : "");
  } catch (e) {
    $("radarStatus").textContent = "falha ao atualizar: " + String(e).slice(0, 80);
  }

  btn.disabled = false;
  btn.textContent = "⟳ Atualizar radar";
  renderRadar();
  renderOverview();
}

function renderRadarFilters() {
  const wrap = $("radarFilters");
  wrap.innerHTML = "";
  const items = visibleRadarItems();
  const mk = (cat, label) => {
    const b = document.createElement("button");
    b.className = "rf" + (radarFilter === cat ? " sel" : "");
    b.dataset.cat = cat;
    const n = cat === "all" ? items.length : items.filter((i) => i.cat === cat).length;
    b.textContent = `${label} · ${n}`;
    b.addEventListener("click", () => { radarFilter = cat; renderRadar(); });
    wrap.appendChild(b);
  };
  mk("all", "Tudo");
  for (const [cat, def] of Object.entries(RADAR_CATS)) mk(cat, def.label);
}

function renderRadar() {
  // status / badge
  if (state.radarAt) {
    $("radarStatus").textContent =
      `atualizado ${new Date(state.radarAt).toLocaleString("pt-BR")} · ` +
      `${visibleRadarItems().length} sinais no ar`;
  }
  $("radarBadge").textContent = visibleRadarItems().length || "";

  renderRadarFilters();
  renderBrief();

  const feed = $("radarFeed");
  feed.innerHTML = "";
  const items = visibleRadarItems()
    .filter((it) => radarFilter === "all" || it.cat === radarFilter);

  if (items.length === 0) {
    feed.innerHTML = `<div class="col-empty">${
      state.radarItems.length === 0
        ? "clique em “⟳ Atualizar radar” para buscar sinais reais da internet"
        : "nada nesta categoria — tente atualizar ou trocar o filtro"
    }</div>`;
  }

  for (const it of items) {
    const card = document.createElement("article");
    card.className = "rcard";
    card.dataset.cat = it.cat;
    card.innerHTML = `
      <div class="rcard-top">
        <span class="rcat">${RADAR_CATS[it.cat]?.label || it.cat}</span>
        <span class="rtime">${hoursAgo(it.ts)}</span>
      </div>
      <h4><a href="${encodeURI(it.url)}" target="_blank" rel="noopener">${escapeHtml(it.title)}</a></h4>
      <div class="rmeta">${escapeHtml(it.source)}${it.extra ? " · " + escapeHtml(it.extra) : ""}</div>
      <div class="ractions">
        <button class="ra post">✦ virar post</button>
        <button class="ra test">⚗ testar</button>
        <button class="ra ignore">✕ ignorar</button>
      </div>`;

    card.querySelector(".post").addEventListener("click", () => useItem(it, "virar post"));
    card.querySelector(".test").addEventListener("click", () => useItem(it, "testar"));
    card.querySelector(".ignore").addEventListener("click", async () => {
      state.radarIgnored.push(it.id);
      await store.set({ radarIgnored: state.radarIgnored });
      renderRadar();
    });
    feed.appendChild(card);
  }

  renderUsed();
}

async function useItem(it, action) {
  // vira missão no board + entra no histórico de aproveitados
  const prefix = action === "virar post" ? "Criar post: " : "Testar: ";
  await addTask(prefix + it.title, action === "virar post" ? "conteudo" : "trabalho",
                "normal", "today");
  state.radarUsed.unshift({ title: it.title, action, date: todayISO(), url: it.url });
  state.radarIgnored.push(it.id); // sai do feed
  await store.set({ radarUsed: state.radarUsed, radarIgnored: state.radarIgnored });
  renderRadar();
}

function renderUsed() {
  $("usedCount").textContent = state.radarUsed.length;
  const list = $("usedList");
  list.innerHTML = "";
  if (state.radarUsed.length === 0) {
    list.innerHTML = `<div class="col-empty" style="margin:12px 18px">itens marcados como “virar post” ou “testar” aparecem aqui</div>`;
    return;
  }
  for (const u of state.radarUsed.slice(0, 40)) {
    const d = document.createElement("div");
    d.className = "used-item";
    d.innerHTML = `<b>${escapeHtml(u.action)}</b>
      <span>${escapeHtml(u.title)}</span>
      <span style="margin-left:auto;font-family:var(--mono);font-size:10px">${fmtBR(u.date)}</span>`;
    list.appendChild(d);
  }
}

/* ---------------- brief curado ---------------- */
function renderBrief() {
  const body = $("briefBody");
  body.innerHTML = "";
  if (state.customReport) {
    $("briefDate").textContent = state.customReportDate ? "· " + fmtBR(state.customReportDate) : "";
    const pre = document.createElement("div");
    pre.className = "rep-raw";
    pre.textContent = state.customReport;
    body.appendChild(pre);
    return;
  }
  $("briefDate").textContent = "· " + fmtBR(DEFAULT_REPORT.date);
  for (const sec of DEFAULT_REPORT.sections) {
    const s = document.createElement("div");
    s.className = "rep-section";
    s.innerHTML = `<div class="rep-section-title">${sec.icon} ${sec.title}</div>`;
    for (const it of sec.items) {
      const item = document.createElement("div");
      item.className = "rep-item";
      item.innerHTML = `
        <h3>${escapeHtml(it.title)}</h3>
        <span class="rep-src">fonte: ${escapeHtml(it.source)}</span>
        <p>${escapeHtml(it.summary)}</p>`;
      s.appendChild(item);
    }
    body.appendChild(s);
  }
}

/* =====================================================================
   AGENDA — Google Calendar via iCal secreto
   ===================================================================== */
const CAL_COLORS = ["#5eead4", "#f472b6", "#fbbf24", "#a78bfa", "#6fd08c", "#f87171"];

/* janela de 3 meses (mês anterior, atual, seguinte) em torno do mês navegado */
function monthWindow(cursor) {
  const start = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
  const end = new Date(cursor.getFullYear(), cursor.getMonth() + 2, 0, 23, 59, 59);
  return { start, end };
}

async function updateAgenda(customWin) {
  if (state.calendars.length === 0) {
    $("agendaStatus").textContent = "nenhuma agenda configurada — abra “⚙ minhas agendas”";
    $("agendaSettings").open = true;
    return;
  }
  const btn = $("agendaUpdate");
  btn.disabled = true; btn.textContent = "⟳ buscando agendas…";
  const win = customWin || monthWindow(monthCursor);
  const { events, errors, at } = await fetchAllCalendars(state.calendars, win.start, win.end);
  state.agendaEvents = events;
  state.agendaAt = at;
  state.agendaWinStart = win.start.getTime();
  state.agendaWinEnd = win.end.getTime();
  await store.set({
    agendaEvents: events, agendaAt: at,
    agendaWinStart: state.agendaWinStart, agendaWinEnd: state.agendaWinEnd,
  });
  $("agendaStatus").textContent =
    `atualizado ${new Date(at).toLocaleTimeString("pt-BR")} · ${events.length} eventos` +
    (errors.length ? ` · falhas: ${errors.join(" | ")}` : "");
  btn.disabled = false; btn.textContent = "⟳ Atualizar agenda";
  renderAgenda();
}

/* garante que o mês navegado esteja coberto pelos dados já buscados */
async function ensureMonthData() {
  const needStart = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1).getTime();
  const needEnd = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0, 23, 59, 59).getTime();
  const covered = state.agendaWinStart != null && state.agendaWinEnd != null &&
    state.agendaWinStart <= needStart && state.agendaWinEnd >= needEnd;
  if (!covered && state.calendars.length > 0) await updateAgenda(monthWindow(monthCursor));
  else renderAgenda();
}

function gotoMonth(delta) {
  monthCursor = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + delta, 1);
  ensureMonthData();
}

function gotoMonthToday() {
  monthCursor = new Date(); monthCursor.setDate(1); monthCursor.setHours(0, 0, 0, 0);
  ensureMonthData();
}

const fmtTime = (ts) =>
  new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

/* ---------------- grid do mês ---------------- */
function renderMonthCal() {
  const label = monthCursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  $("monthLabel").textContent = label.charAt(0).toUpperCase() + label.slice(1);

  const y = monthCursor.getFullYear(), m = monthCursor.getMonth();
  const gridStart = new Date(y, m, 1);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());
  const todayStr = new Date().toDateString();

  const evsByDay = {};
  for (const e of state.agendaEvents || []) {
    const key = new Date(e.start).toDateString();
    (evsByDay[key] ||= []).push(e);
  }

  const grid = $("monthGrid");
  grid.innerHTML = "";
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart); d.setDate(gridStart.getDate() + i);
    const key = d.toDateString();
    const inMonth = d.getMonth() === m;
    const isToday = key === todayStr;
    const dayEvents = (evsByDay[key] || []).sort((a, b) => a.start - b.start);
    const shown = dayEvents.slice(0, 3);
    const more = dayEvents.length - shown.length;

    const cell = document.createElement("div");
    cell.className = "month-cell" + (inMonth ? "" : " out") + (isToday ? " today" : "");
    cell.innerHTML = `
      <div class="month-cell-num">${d.getDate()}</div>
      <div class="month-cell-evs">
        ${shown.map((e) => `<div class="month-ev" style="--evc:${e.calColor || "var(--cyan)"}">
          ${e.allDay ? "" : `<span class="month-ev-time">${fmtTime(e.start)}</span>`}
          <span class="month-ev-title">${escapeHtml(e.title)}</span>
        </div>`).join("")}
        ${more > 0 ? `<div class="month-ev-more">+${more} mais</div>` : ""}
      </div>`;
    cell.addEventListener("click", () => jumpToDay(d));
    grid.appendChild(cell);
  }
}

function jumpToDay(d) {
  const key = d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const el = document.getElementById("day-" + key);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderAgenda() {
  renderMonthCal();
  renderCalList();
  fillAccountSelect();

  const list = $("agendaList");
  list.innerHTML = "";

  const allEvs = state.agendaEvents || [];
  const evs = allEvs.filter((e) => e.end >= Date.now());
  const todayCount = evs.filter((e) =>
    new Date(e.start).toDateString() === new Date().toDateString()).length;
  $("agendaBadge").textContent = todayCount || "";

  if (state.agendaAt) {
    $("agendaStatus").textContent =
      `atualizado ${new Date(state.agendaAt).toLocaleString("pt-BR")} · ${evs.length} eventos carregados`;
  }

  if (evs.length === 0) {
    list.innerHTML = `<div class="col-empty">${
      state.calendars.length === 0
        ? "adicione o endereço iCal secreto de uma agenda em “⚙ minhas agendas”"
        : "clique em “⟳ Atualizar agenda” para buscar seus eventos"
    }</div>`;
    return;
  }

  // agrupa por dia
  const byDay = {};
  for (const e of evs) {
    const d = new Date(e.start);
    const key = d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0") + "|" +
      d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
    (byDay[key] ||= []).push(e);
  }

  const todayStr = new Date().toDateString();

  for (const key of Object.keys(byDay).sort()) {
    const label = key.split("|")[1];
    const dayDate = new Date(byDay[key][0].start);
    const isToday = dayDate.toDateString() === todayStr;

    const wrap = document.createElement("div");
    wrap.id = "day-" + key.split("|")[0];
    const head = document.createElement("div");
    head.className = "ag-day-head" + (isToday ? " today" : "");
    head.textContent = (isToday ? "● hoje · " : "") + label;
    wrap.appendChild(head);

    for (const e of byDay[key].sort((a, b) => a.start - b.start)) {
      const div = document.createElement("div");
      div.className = "ag-ev";
      div.style.setProperty("--evc", e.calColor || "#5eead4");
      div.innerHTML = `
        <span class="ag-time">${e.allDay ? "dia todo" : fmtTime(e.start) + "–" + fmtTime(e.end)}</span>
        <div class="ag-body">
          <div class="ag-title">${escapeHtml(e.title)}</div>
          <div class="ag-sub">
            <span class="ag-cal">${escapeHtml(e.calLabel)}</span>
            ${e.location && !e.location.startsWith("http") ? " · " + escapeHtml(e.location) : ""}
          </div>
        </div>
        ${e.meet ? `
          <a class="ag-meet" href="${encodeURI(e.meet)}" target="_blank" rel="noopener">▶ entrar</a>
          <button class="ag-copy" title="copiar link do Meet">⧉</button>` : ""}`;
      const copyBtn = div.querySelector(".ag-copy");
      if (copyBtn) copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(e.meet);
        copyBtn.textContent = "✓";
        setTimeout(() => (copyBtn.textContent = "⧉"), 1200);
      });
      wrap.appendChild(div);
    }
    list.appendChild(wrap);
  }
}

function renderCalList() {
  const wrap = $("calList");
  wrap.innerHTML = "";
  state.calendars.forEach((c) => {
    const div = document.createElement("div");
    div.className = "cal-item";
    div.innerHTML = `
      <span class="cal-dot" style="background:${c.color}"></span>
      <b style="color:var(--ink)">${escapeHtml(c.label)}</b>
      <span>${escapeHtml(c.ics.slice(0, 60))}…</span>
      <button title="remover">✕</button>`;
    div.querySelector("button").addEventListener("click", async () => {
      state.calendars = state.calendars.filter((x) => x.id !== c.id);
      state.agendaEvents = state.agendaEvents.filter((e) => e.cal !== c.id);
      await store.set({ calendars: state.calendars, agendaEvents: state.agendaEvents });
      renderAgenda();
    });
    wrap.appendChild(div);
  });
}

function fillAccountSelect() {
  const sel = $("evAccount");
  sel.innerHTML = "";
  for (const c of state.calendars) {
    const o = document.createElement("option");
    o.value = c.label; o.textContent = c.label;
    sel.appendChild(o);
  }
  const o = document.createElement("option");
  o.value = ""; o.textContent = "(deixar o Google escolher a conta)";
  sel.appendChild(o);
}

async function addCalendar() {
  const label = $("calLabel").value.trim();
  const ics = $("calICS").value.trim();
  if (!label || !ics.startsWith("https://")) { $("calICS").focus(); return; }
  state.calendars.push({
    id: "c_" + Date.now(),
    label, ics,
    color: CAL_COLORS[state.calendars.length % CAL_COLORS.length],
  });
  await store.set({ calendars: state.calendars });
  $("calLabel").value = ""; $("calICS").value = "";
  renderCalList(); fillAccountSelect();
  updateAgenda();
}

/* =====================================================================
   DIÁRIO
   ===================================================================== */
function renderDiary() {
  $("diaryNote").value = state.diaryNotes[todayISO()] || "";
  const hist = $("diaryHistory");
  hist.innerHTML = "";
  const byDay = {};
  for (const t of state.tasks) if (t.doneAt) (byDay[t.doneAt] ||= []).push(t);
  const days = [...new Set([...Object.keys(byDay), ...Object.keys(state.diaryNotes)])]
    .sort().reverse();
  if (days.length === 0) {
    hist.innerHTML = `<div class="col-empty">conclua missões e escreva notas — o diário se monta sozinho</div>`;
    return;
  }
  for (const day of days) {
    const wrap = document.createElement("div");
    wrap.className = "diary-day";
    wrap.innerHTML = `<div class="diary-day-head">${fmtBR(day)}${day === todayISO() ? " · hoje" : ""}</div>`;
    for (const t of byDay[day] || []) {
      const e = document.createElement("div");
      e.className = "diary-entry";
      e.textContent = t.title;
      wrap.appendChild(e);
    }
    if (state.diaryNotes[day]) {
      const n = document.createElement("div");
      n.className = "diary-note-view";
      n.textContent = "“" + state.diaryNotes[day] + "”";
      wrap.appendChild(n);
    }
    hist.appendChild(wrap);
  }
}

/* =====================================================================
   UTIL / EVENTOS / INIT
   ===================================================================== */
function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function wireEvents() {
  document.querySelectorAll(".nav-item").forEach((n) =>
    n.addEventListener("click", () => gotoView(n.dataset.view)));
  document.querySelectorAll("[data-goto]").forEach((b) =>
    b.addEventListener("click", () => gotoView(b.dataset.goto)));

  document.querySelectorAll("[data-close]").forEach((b) =>
    b.addEventListener("click", () => $(b.dataset.close).classList.add("hidden")));
  document.querySelectorAll(".overlay").forEach((ov) =>
    ov.addEventListener("click", (e) => { if (e.target === ov) ov.classList.add("hidden"); }));

  $("radarUpdate").addEventListener("click", updateRadar);

  // mercados
  $("moneyUpdate").addEventListener("click", async () => {
    const btn = $("moneyUpdate");
    btn.disabled = true; btn.textContent = "⟳ buscando trends…";
    await updateTrends();
    btn.disabled = false; btn.textContent = "⟳ Atualizar trends";
  });

  // agenda
  $("agendaUpdate").addEventListener("click", () => updateAgenda());
  $("calAdd").addEventListener("click", addCalendar);
  $("monthPrev").addEventListener("click", () => gotoMonth(-1));
  $("monthNext").addEventListener("click", () => gotoMonth(1));
  $("monthToday").addEventListener("click", gotoMonthToday);
  $("newEventBtn").addEventListener("click", () => {
    $("evDate").value = todayISO();
    fillAccountSelect();
    $("eventOverlay").classList.remove("hidden");
    $("evTitle").focus();
  });
  $("evCreate").addEventListener("click", () => {
    const url = buildEventURL({
      title: $("evTitle").value.trim(),
      dateISO: $("evDate").value || todayISO(),
      timeStart: $("evStart").value,
      timeEnd: $("evEnd").value,
      details: $("evDetails").value.trim(),
      location: $("evLocation").value.trim(),
      guests: $("evGuests").value.trim(),
      account: $("evAccount").value,
    });
    window.open(url, "_blank");
    $("eventOverlay").classList.add("hidden");
  });

  $("pasteSave").addEventListener("click", async () => {
    const txt = $("pasteText").value.trim();
    if (!txt) return;
    state.customReport = txt;
    state.customReportDate = todayISO();
    await store.set({ customReport: txt, customReportDate: state.customReportDate });
    $("pasteText").value = "";
    renderBrief();
  });

  $("diaryBtn").addEventListener("click", () => {
    renderDiary();
    $("diaryOverlay").classList.remove("hidden");
  });
  $("diaryNote").addEventListener("input", async (e) => {
    state.diaryNotes[todayISO()] = e.target.value;
    await store.set({ diaryNotes: state.diaryNotes });
  });

  $("taskSave").addEventListener("click", saveTaskFromModal);
  $("taskTitle").addEventListener("keydown", (e) => { if (e.key === "Enter") saveTaskFromModal(); });

  const suggestForProject = () => {
    const text = $("projectInput").value.trim();
    if (!text) return;
    renderProjectSuggestions(matchProjectTasks(text));
  };
  $("projectSuggestBtn").addEventListener("click", suggestForProject);
  $("projectInput").addEventListener("keydown", (e) => { if (e.key === "Enter") suggestForProject(); });

  // imagem de registro
  $("imgInput").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (file && imgTargetTaskId) await attachImage(imgTargetTaskId, file);
  });
  $("imgRemove").addEventListener("click", async () => {
    const task = state.tasks.find((x) => x.id === imgTargetTaskId);
    if (task) {
      delete task.img;
      await store.set({ tasks: state.tasks });
      renderBoard();
    }
    $("imgOverlay").classList.add("hidden");
  });

  setInterval(() => {
    $("clockLine").textContent = new Date().toLocaleTimeString("pt-BR");
  }, 1000);
}

async function saveTaskFromModal() {
  const title = $("taskTitle").value.trim();
  if (!title) { $("taskTitle").focus(); return; }
  await addTask(title, $("taskTag").value, $("taskPrio").value, taskModalCol);
  $("taskOverlay").classList.add("hidden");
}

(async function init() {
  state = await store.get(DEFAULTS);

  if (state.tasks.length === 0) {
    const seed = [
      { t: "Atualizar o Radar IA (botão ⟳)", tag: "conteudo", col: "today" },
      { t: "Enviar timesheet do dia", tag: "trabalho", col: "today" },
      { t: "Esboçar pitch da empresa de web explorer 3D", tag: "empresa", col: "backlog" },
      { t: "Aplicar para 1 vaga Unreal na Europa", tag: "carreira", col: "backlog" },
    ];
    for (const s of seed) {
      state.tasks.push({
        id: Date.now() + "_" + Math.random().toString(36).slice(2, 6),
        title: s.t, tag: s.tag, prio: "normal", col: s.col,
        createdAt: todayISO(), doneAt: null,
      });
    }
    await store.set({ tasks: state.tasks });
  }

  const DEFAULT_CALENDARS = [
    { label: "juscelio.santos@neoramastudio.com", ics: "https://calendar.google.com/calendar/ical/juscelio.santos%40neoramastudio.com/private-c8fa2daadd09daca8bceca02e2bbea87/basic.ics" },
    { label: "escrevaparajd@gmail.com", ics: "https://calendar.google.com/calendar/ical/escrevaparajd%40gmail.com/private-db0841c0d3a2d10db913cc140b299308/basic.ics" },
  ];
  let addedCal = false;
  for (const dc of DEFAULT_CALENDARS) {
    if (!state.calendars.some((c) => c.ics === dc.ics)) {
      state.calendars.push({
        id: "c_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
        label: dc.label, ics: dc.ics,
        color: CAL_COLORS[state.calendars.length % CAL_COLORS.length],
      });
      addedCal = true;
    }
  }
  if (addedCal) await store.set({ calendars: state.calendars });

  wireEvents();
  renderOverview();
  renderBoard();
  renderRadar();
  updateTrends();

  // radar velho (>12h)? já dispara uma atualização automática ao abrir
  if (!state.radarAt || Date.now() - state.radarAt > 12 * 3.6e6) updateRadar();
  // agenda: atualiza sozinha ao abrir se tiver +30min e houver agendas configuradas
  if (state.calendars.length > 0 &&
      (!state.agendaAt || Date.now() - state.agendaAt > 30 * 60000)) updateAgenda();
})();
