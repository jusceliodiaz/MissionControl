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
  social: { igUser: "", liUser: "", log: [] },
};

let state = null;
let radarFilter = "all";
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

const SUGG_WORK = [
  { t: "Enviar timesheet do dia", tag: "trabalho" },
  { t: "Revisar bake de materiais Datasmith → Unreal", tag: "trabalho" },
  { t: "Atualizar o Radar IA e separar 2 pautas", tag: "conteudo" },
  { t: "Postar 1 conteúdo sobre IA no LinkedIn/Instagram", tag: "conteudo" },
  { t: "Gravar 1 aula ou short para o curso", tag: "conteudo" },
  { t: "Aplicar para 1 vaga Unreal/3D na Europa", tag: "carreira" },
  { t: "Atualizar portfólio com o último projeto", tag: "carreira" },
  { t: "Estudar Houdini por 30 minutos", tag: "carreira" },
  { t: "Comentar em 3 posts de archviz (networking)", tag: "carreira" },
  { t: "Esboçar pitch da empresa de web explorer 3D", tag: "empresa" },
  { t: "Mapear 3 clientes-piloto para o web explorer", tag: "empresa" },
  { t: "Organizar biblioteca de materiais/assets", tag: "trabalho" },
  { t: "Backup dos projetos da semana", tag: "trabalho" },
];

const SUGG_AGENDA = [
  { t: "Bloco de foco profundo (2h sem interrupção)", s: "09:00", e: "11:00" },
  { t: "Revisão semanal de projetos", s: "17:00", e: "17:45" },
  { t: "Gravação de aula do curso", s: "14:00", e: "15:30" },
  { t: "Planejamento de conteúdo da semana", s: "10:00", e: "10:45" },
  { t: "Call de prospecção — web explorer", s: "15:00", e: "15:30" },
  { t: "Estudo de Houdini", s: "19:00", e: "19:45" },
  { t: "Revisar candidaturas de vagas na Europa", s: "18:00", e: "18:30" },
];

const DEFAULTS_SOCIAL = { igUser: "", liUser: "", log: [] }; // log: {date, ig, li}

/* =====================================================================
   NAVEGAÇÃO
   ===================================================================== */
function gotoView(v) {
  document.querySelectorAll(".view").forEach((el) => el.classList.add("hidden"));
  $("view-" + v).classList.remove("hidden");
  document.querySelectorAll(".nav-item").forEach((n) =>
    n.classList.toggle("active", n.dataset.view === v));
  if (v === "radar") renderRadar();
  if (v === "agenda") renderAgenda();
  if (v === "overview") renderOverview();
  if (v === "board") renderBoard();
}

/* =====================================================================
   OVERVIEW (bento)
   ===================================================================== */
function renderOverview() {
  const now = new Date();
  const h = now.getHours();
  const saud = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  $("greeting").innerHTML = `${saud}.<br>O que importa agora.`;
  $("dateLine").textContent = now.toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });

  const t = state.tasks;
  $("statTodo").textContent  = t.filter((x) => x.col === "today" || x.col === "backlog").length;
  $("statDoing").textContent = t.filter((x) => x.col === "doing").length;
  $("statRadar").textContent = visibleRadarItems().length;

  renderOvAgenda();
  renderOvRadar();
  renderOvBoard();
  renderSuggestions();
  renderOvSocial();
  renderOvGauge();
  renderStatSparks();
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
    const count = (evsByDay[key] || []).length;

    const cell = document.createElement("div");
    cell.className = "ovm-cell" + (inMonth ? "" : " out") + (isToday ? " today" : "");
    cell.title = count ? `${count} evento(s)` : "";
    cell.innerHTML = `<span>${d.getDate()}</span>${count ? `<span class="ovm-dot"></span>` : ""}`;
    cell.addEventListener("click", () => {
      gotoView("agenda");
      monthCursor = new Date(d.getFullYear(), d.getMonth(), 1);
      ensureMonthData();
      setTimeout(() => jumpToDay(d), 260);
    });
    grid.appendChild(cell);
  }
}

/* ---- gauge circular: progresso do dia ---- */
function renderOvGauge() {
  const t = state.tasks;
  const activeToday = t.filter((x) => x.col === "today" || x.col === "doing").length;
  const doneToday = t.filter((x) => x.doneAt === todayISO()).length;
  const total = activeToday + doneToday;
  const pct = total === 0 ? 0 : Math.round((doneToday / total) * 100);

  const r = 42, C = 2 * Math.PI * r;
  const offset = C * (1 - pct / 100);
  const color = pct >= 75 ? "var(--green)" : pct >= 40 ? "var(--cyan)" : "var(--amber)";

  $("ovGaugeSvg").innerHTML = `
    <circle class="track" cx="50" cy="50" r="${r}" />
    <circle class="fill" cx="50" cy="50" r="${r}" stroke="${color}"
      stroke-dasharray="${C}" stroke-dashoffset="${offset}" />`;
  $("ovGaugePct").textContent = total === 0 ? "—" : pct + "%";
}

/* ---- mini-gráficos SVG dos stat-cards ---- */
function barsSVG(values, colors) {
  const max = Math.max(1, ...values);
  const n = values.length;
  const gap = 4, w = 100 / n;
  const bars = values.map((v, i) => {
    const h = Math.max(2, (v / max) * 22);
    const x = i * w + gap / 2;
    const bw = w - gap;
    return `<rect x="${x}" y="${22 - h}" width="${bw}" height="${h}" rx="1.5" fill="${colors[i % colors.length]}" opacity="${v === 0 ? .25 : 1}" />`;
  }).join("");
  return `<svg viewBox="0 0 100 22" preserveAspectRatio="none">${bars}</svg>`;
}

function renderStatSparks() {
  const t = state.tasks;
  $("sparkTodo").innerHTML = barsSVG(
    [t.filter((x) => x.col === "backlog").length, t.filter((x) => x.col === "today").length],
    ["var(--violet)", "var(--cyan)"]);

  const doing = t.filter((x) => x.col === "doing").length;
  const activeTotal = t.filter((x) => x.col !== "done").length;
  $("sparkDoing").innerHTML = barsSVG(
    [Math.max(0, activeTotal - doing), doing],
    ["var(--line)", "var(--amber)"]);

  const items = visibleRadarItems();
  $("sparkRadar").innerHTML = barsSVG(
    Object.keys(RADAR_CATS).map((cat) => items.filter((i) => i.cat === cat).length),
    ["var(--cyan)", "var(--violet)", "var(--amber)", "var(--magenta)"]);

  const days = [...Array(7)].map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i);
    return d.toDateString();
  });
  const perDay = days.map((ds) =>
    (state.agendaEvents || []).filter((e) => new Date(e.start).toDateString() === ds).length);
  $("sparkMeets").innerHTML = barsSVG(perDay, ["var(--green)"]);
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

  const todayMeets = (state.agendaEvents || []).filter((e) =>
    new Date(e.start).toDateString() === new Date().toDateString());
  $("statMeets").textContent = todayMeets.length;

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
    .filter((it) => it.cat !== "vagas")
    .sort((a, b) => radarPoints(b) - radarPoints(a))
    .slice(0, 5);

  if (items.length === 0) {
    wrap.innerHTML = miniEmpty("radar vazio — abra a aba e clique em ⟳ atualizar");
    return;
  }
  const catColor = { modelos: "var(--cyan)", ferramentas: "var(--violet)",
                     mercado: "var(--amber)", vagas: "var(--magenta)" };
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

/* ---- sugestões (trabalho + agenda) ---- */
function renderSuggestions() {
  const workWrap = $("suggWork");
  workWrap.innerHTML = "";
  const existing = new Set(state.tasks.map((t) => t.title));
  const pool = SUGG_WORK.filter((s) => !existing.has(s.t));
  for (const s of pool.sort(() => Math.random() - 0.5).slice(0, 4)) {
    const b = document.createElement("button");
    b.className = "chip";
    b.textContent = s.t;
    b.addEventListener("click", () => addTask(s.t, s.tag, "normal", "today"));
    workWrap.appendChild(b);
  }

  const agWrap = $("suggAgenda");
  agWrap.innerHTML = "";
  for (const s of [...SUGG_AGENDA].sort(() => Math.random() - 0.5).slice(0, 3)) {
    const b = document.createElement("button");
    b.className = "chip";
    b.textContent = s.t;
    b.addEventListener("click", () => {
      // abre o criador de evento já preenchido
      $("evTitle").value = s.t;
      $("evDate").value = todayISO();
      $("evStart").value = s.s; $("evEnd").value = s.e;
      fillAccountSelect();
      $("eventOverlay").classList.remove("hidden");
    });
    agWrap.appendChild(b);
  }
}

/* ---- social: instagram & linkedin ---- */
function renderOvSocial() {
  const soc = state.social || { igUser: "", liUser: "", log: [] };
  $("igOpen").href = soc.igUser
    ? "https://www.instagram.com/" + encodeURIComponent(soc.igUser) + "/"
    : "https://www.instagram.com/";
  $("liOpen").href = soc.liUser || "https://www.linkedin.com/feed/";

  const log = [...(soc.log || [])].sort((a, b) => a.date.localeCompare(b.date));
  const last = log[log.length - 1];
  const prev = log[log.length - 2];

  const setMetric = (spanId, deltaId, key) => {
    const span = $(spanId), em = $(deltaId);
    if (!last || last[key] == null) { span.textContent = "—"; em.textContent = ""; return; }
    span.textContent = Number(last[key]).toLocaleString("pt-BR");
    if (prev && prev[key] != null) {
      const d = last[key] - prev[key];
      em.textContent = (d >= 0 ? "+" : "") + d.toLocaleString("pt-BR");
      em.classList.toggle("down", d < 0);
    } else em.textContent = "";
  };
  setMetric("igCount", "igDelta", "ig");
  setMetric("liCount", "liDelta", "li");

  // posts de conteúdo concluídos nos últimos 7 dias
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
  const cutISO = cutoff.toISOString().slice(0, 10);
  const posts = state.tasks.filter((t) =>
    t.tag === "conteudo" && t.doneAt && t.doneAt >= cutISO).length;
  $("socPosts").textContent = `${posts} post(s) de conteúdo concluídos em 7 dias`;
}

function openSocialModal() {
  const soc = state.social || { igUser: "", liUser: "", log: [] };
  $("socIgUser").value = soc.igUser || "";
  $("socLiUser").value = soc.liUser || "";
  $("socIgN").value = ""; $("socLiN").value = "";

  const hist = $("socHistory");
  hist.innerHTML = "";
  for (const r of [...(soc.log || [])].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8)) {
    const d = document.createElement("div");
    d.className = "soc-hist-row";
    d.innerHTML = `<span>${fmtBR(r.date)}</span>
      <span>IG <b>${r.ig ?? "—"}</b></span>
      <span>LI <b>${r.li ?? "—"}</b></span>`;
    hist.appendChild(d);
  }
  $("socOverlay").classList.remove("hidden");
}

async function saveSocial() {
  const soc = state.social || { igUser: "", liUser: "", log: [] };
  soc.igUser = $("socIgUser").value.trim().replace(/^@/, "");
  soc.liUser = $("socLiUser").value.trim();
  const ig = $("socIgN").value !== "" ? +$("socIgN").value : null;
  const li = $("socLiN").value !== "" ? +$("socLiN").value : null;
  if (ig != null || li != null) {
    soc.log = (soc.log || []).filter((r) => r.date !== todayISO());
    soc.log.push({ date: todayISO(), ig, li });
  }
  state.social = soc;
  await store.set({ social: soc });
  $("socOverlay").classList.add("hidden");
  renderOvSocial();
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
  $("radarStatus").textContent = "consultando Hacker News, Reddit, Remotive e RemoteOK…";

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

  const evs = state.agendaEvents || [];
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
  let scrollTarget = null;

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
      const past = e.end < Date.now();
      const div = document.createElement("div");
      div.className = "ag-ev" + (past ? " past" : "");
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
          <a class="ag-meet" href="${encodeURI(e.meet)}" target="_blank" rel="noopener">
            ${past ? "link" : "▶ entrar"}</a>
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
    if (isToday) scrollTarget = head;
  }

  if (scrollTarget) setTimeout(() =>
    scrollTarget.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
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
  $("shuffleBtn").addEventListener("click", renderSuggestions);

  // social
  $("socLogBtn").addEventListener("click", openSocialModal);
  $("socSave").addEventListener("click", saveSocial);

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

  // radar velho (>12h)? já dispara uma atualização automática ao abrir
  if (!state.radarAt || Date.now() - state.radarAt > 12 * 3.6e6) updateRadar();
  // agenda: atualiza sozinha ao abrir se tiver +30min e houver agendas configuradas
  if (state.calendars.length > 0 &&
      (!state.agendaAt || Date.now() - state.agendaAt > 30 * 60000)) updateAgenda();
})();
