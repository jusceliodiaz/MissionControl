/* =====================================================================
   Mission Control — calendar.js
   Lê agendas reais do Google Calendar via "endereço secreto iCal"
   (sem OAuth). Faz parse dos VEVENTs, expande recorrências
   (FREQ=DAILY/WEEKLY/MONTHLY/YEARLY com INTERVAL/BYDAY/UNTIL/COUNT,
   EXDATE e overrides via RECURRENCE-ID) e extrai links de Meet.
   ===================================================================== */

/* ------------------- parse de datas ICS ------------------- */
function parseICSDate(val, params = "") {
  // 20260706 | 20260706T170000 | 20260706T200000Z
  const allDay = /VALUE=DATE(;|$)/.test(params) || (val.length === 8);
  const y = +val.slice(0, 4), mo = +val.slice(4, 6) - 1, d = +val.slice(6, 8);
  if (allDay) return { date: new Date(y, mo, d), allDay: true };
  const h = +val.slice(9, 11), mi = +val.slice(11, 13), s = +val.slice(13, 15) || 0;
  if (val.endsWith("Z")) return { date: new Date(Date.UTC(y, mo, d, h, mi, s)), allDay: false };
  // com TZID ou flutuante: tratamos como hora local (agenda do usuário)
  return { date: new Date(y, mo, d, h, mi, s), allDay: false };
}

/* ------------------- unfold + parse de VEVENTs ------------------- */
function parseICS(text) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  const events = [];
  let cur = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") { cur = {}; continue; }
    if (line === "END:VEVENT") { if (cur) events.push(cur); cur = null; continue; }
    if (!cur) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const left = line.slice(0, idx);
    const val = line.slice(idx + 1);
    const [key, ...paramArr] = left.split(";");
    const params = paramArr.join(";");
    switch (key) {
      case "SUMMARY":     cur.summary = unescapeICS(val); break;
      case "LOCATION":    cur.location = unescapeICS(val); break;
      case "DESCRIPTION": cur.description = unescapeICS(val); break;
      case "UID":         cur.uid = val; break;
      case "STATUS":      cur.status = val; break;
      case "DTSTART":     cur.start = parseICSDate(val, params); break;
      case "DTEND":       cur.end = parseICSDate(val, params); break;
      case "RRULE":       cur.rrule = val; break;
      case "RECURRENCE-ID": cur.recurrenceId = parseICSDate(val, params).date.getTime(); break;
      case "X-GOOGLE-CONFERENCE": cur.meet = val; break;
      case "EXDATE":
        cur.exdates = cur.exdates || [];
        for (const v of val.split(","))
          cur.exdates.push(dayKey(parseICSDate(v, params).date));
        break;
    }
  }
  return events;
}

const unescapeICS = (s) =>
  s.replace(/\\n/g, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");

const dayKey = (d) =>
  d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();

/* ------------------- expansão de recorrência ------------------- */
const BYDAY_MAP = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

function parseRRule(str) {
  const r = {};
  for (const part of str.split(";")) {
    const [k, v] = part.split("=");
    r[k] = v;
  }
  return {
    freq: r.FREQ,
    interval: +(r.INTERVAL || 1),
    count: r.COUNT ? +r.COUNT : null,
    until: r.UNTIL ? parseICSDate(r.UNTIL).date : null,
    byday: r.BYDAY ? r.BYDAY.split(",").map((d) => BYDAY_MAP[d.slice(-2)]) : null,
  };
}

function expandEvent(ev, winStart, winEnd) {
  const durMs = ev.end && ev.start ? ev.end.date - ev.start.date : 3600000;
  const base = (startDate) => ({
    uid: ev.uid,
    title: ev.summary || "(sem título)",
    start: startDate,
    end: new Date(startDate.getTime() + durMs),
    allDay: ev.start?.allDay || false,
    location: ev.location || "",
    meet: ev.meet || extractMeet(ev.description) || extractMeet(ev.location),
    description: ev.description || "",
  });

  if (!ev.start) return [];
  if (!ev.rrule) {
    const d = ev.start.date;
    return d <= winEnd && (ev.end?.date || d) >= winStart ? [base(d)] : [];
  }

  const rule = parseRRule(ev.rrule);
  const out = [];
  const ex = new Set(ev.exdates || []);
  let occurrences = 0;
  const limit = rule.count || 800;
  const start = ev.start.date;

  const pushIf = (d) => {
    occurrences++;
    if (occurrences > limit) return false;
    if (rule.until && d > rule.until) return false;
    if (d >= winStart && d <= winEnd && !ex.has(dayKey(d)))
      out.push(base(new Date(d)));
    return d <= winEnd;
  };

  if (rule.freq === "WEEKLY") {
    const days = rule.byday || [start.getDay()];
    // início da semana da DTSTART (domingo)
    const week0 = new Date(start); week0.setHours(start.getHours(), start.getMinutes(), 0, 0);
    week0.setDate(start.getDate() - start.getDay());
    for (let w = 0; w < 400; w += rule.interval) {
      let anyInWindow = false;
      for (const dow of days.sort()) {
        const d = new Date(week0);
        d.setDate(week0.getDate() + w * 7 + dow);
        if (d < start) continue;
        if (!pushIf(d)) { if (d > winEnd) return out; }
        else anyInWindow = true;
      }
      if (occurrences > limit) break;
      const probe = new Date(week0); probe.setDate(week0.getDate() + w * 7);
      if (probe > winEnd) break;
    }
  } else if (rule.freq === "DAILY") {
    for (let i = 0; i < 1200; i += rule.interval) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      if (!pushIf(d) && d > winEnd) break;
    }
  } else if (rule.freq === "MONTHLY") {
    for (let i = 0; i < 60; i += rule.interval) {
      const d = new Date(start); d.setMonth(start.getMonth() + i);
      if (!pushIf(d) && d > winEnd) break;
    }
  } else if (rule.freq === "YEARLY") {
    for (let i = 0; i < 8; i += rule.interval) {
      const d = new Date(start); d.setFullYear(start.getFullYear() + i);
      if (!pushIf(d) && d > winEnd) break;
    }
  } else {
    // regra não suportada: mostra só a primeira ocorrência
    if (start >= winStart && start <= winEnd) out.push(base(start));
  }
  return out;
}

const extractMeet = (txt) => {
  if (!txt) return "";
  const m = txt.match(/https:\/\/meet\.google\.com\/[a-z0-9-]+/i);
  return m ? m[0] : "";
};

/* ------------------- fetch + montagem ------------------- */

async function fetchCalendar(cal, winStart, winEnd) {
  const r = await fetch(cal.ics);
  if (!r.ok) throw new Error(cal.label + " -> HTTP " + r.status);
  const raw = parseICS(await r.text());

  // separa masters e overrides (RECURRENCE-ID)
  const overrides = new Map(); // uid|ts -> ev
  const masters = [];
  for (const ev of raw) {
    if (ev.status === "CANCELLED" && ev.recurrenceId) {
      overrides.set(ev.uid + "|" + ev.recurrenceId, null); // instância cancelada
    } else if (ev.recurrenceId) {
      overrides.set(ev.uid + "|" + ev.recurrenceId, ev);
    } else {
      masters.push(ev);
    }
  }

  const items = [];
  for (const ev of masters) {
    for (const inst of expandEvent(ev, winStart, winEnd)) {
      const key = ev.uid + "|" + inst.start.getTime();
      if (overrides.has(key)) {
        const ov = overrides.get(key);
        if (ov === null) continue; // cancelada
        const durMs = ov.end && ov.start ? ov.end.date - ov.start.date : 3600000;
        items.push({
          ...inst,
          title: ov.summary || inst.title,
          start: ov.start.date,
          end: new Date(ov.start.date.getTime() + durMs),
          meet: ov.meet || extractMeet(ov.description) || inst.meet,
          location: ov.location || inst.location,
        });
        overrides.delete(key);
      } else {
        items.push(inst);
      }
    }
  }
  // overrides órfãos dentro da janela (instância movida)
  for (const ov of overrides.values()) {
    if (!ov || !ov.start) continue;
    if (ov.start.date >= winStart && ov.start.date <= winEnd) {
      const durMs = ov.end ? ov.end.date - ov.start.date : 3600000;
      items.push({
        uid: ov.uid, title: ov.summary || "(sem título)",
        start: ov.start.date, end: new Date(ov.start.date.getTime() + durMs),
        allDay: ov.start.allDay, location: ov.location || "",
        meet: ov.meet || extractMeet(ov.description), description: ov.description || "",
      });
    }
  }

  return items.map((i) => ({ ...i, cal: cal.id, calLabel: cal.label, calColor: cal.color,
                             start: i.start.getTime(), end: i.end.getTime() }));
}

async function fetchAllCalendars(calendars, winStart, winEnd) {
  if (!winStart || !winEnd) {
    const now = new Date();
    winStart = new Date(now); winStart.setDate(now.getDate() - 7); winStart.setHours(0,0,0,0);
    winEnd   = new Date(now); winEnd.setDate(now.getDate() + 21);  winEnd.setHours(23,59,59,0);
  }

  const settled = await Promise.allSettled(
    calendars.map((c) => fetchCalendar(c, winStart, winEnd)));

  const events = [];
  const errors = [];
  settled.forEach((s, i) => {
    if (s.status === "fulfilled") events.push(...s.value);
    else errors.push(calendars[i].label + ": " + String(s.reason).slice(0, 60));
  });
  events.sort((a, b) => a.start - b.start);
  return { events, errors, at: Date.now() };
}

/* ------------------- criação de evento (URL template) ------------------- */
function buildEventURL({ title, dateISO, timeStart, timeEnd, details, location, guests, account }) {
  const d = dateISO.replaceAll("-", "");
  const s = d + "T" + (timeStart || "09:00").replace(":", "") + "00";
  const e = d + "T" + (timeEnd   || "10:00").replace(":", "") + "00";
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: title || "Novo evento",
    dates: s + "/" + e,
  });
  if (details)  p.set("details", details);
  if (location) p.set("location", location);
  if (guests)   p.set("add", guests.split(/[,;\s]+/).filter(Boolean).join(","));
  let url = "https://calendar.google.com/calendar/render?" + p.toString();
  if (account) url += "&authuser=" + encodeURIComponent(account);
  return url;
}
