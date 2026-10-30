(function () {
  "use strict";

  // ---------- Time (supports ?now=2026-10-30T08:59:55 for testing) ----------
  const params = new URLSearchParams(location.search);
  let timeOffset = 0;
  if (params.get("now")) {
    const t = new Date(params.get("now"));
    if (!isNaN(t)) timeOffset = t.getTime() - Date.now();
  }
  const now = () => new Date(Date.now() + timeOffset);
  const loadedAt = Date.now();

  const $ = (id) => document.getElementById(id);
  const DAY_MS = 86400000;

  function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  function addDays(d, n) {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  }
  function daysBetween(a, b) {
    return Math.round((startOfDay(b) - startOfDay(a)) / DAY_MS);
  }
  function isWeekend(d) {
    return d.getDay() === 0 || d.getDay() === 6;
  }
  function minutesOf(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  }
  function format12(mins) {
    let h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    h = h % 12 || 12;
    return `${h}:${String(m).padStart(2, "0")}`;
  }

  // Reads dates the way people type them in a sheet: 10/30/2026, 10/30, 2026-10-30, Nov 4 2026.
  function parseDate(str) {
    if (!str) return null;
    const s = String(str).trim();
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    m = s.match(/^(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?/);
    if (m) {
      let y = m[3] ? +m[3] : now().getFullYear();
      if (y < 100) y += 2000;
      return new Date(y, +m[1] - 1, +m[2]);
    }
    const t = new Date(s);
    return isNaN(t) ? null : startOfDay(t);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ---------- Clock and date ----------
  function renderClock(d) {
    let h = d.getHours() % 12 || 12;
    const m = String(d.getMinutes()).padStart(2, "0");
    const ampm = d.getHours() < 12 ? "AM" : "PM";
    $("clock").innerHTML = `${h}:${m}<span class="ampm">${ampm}</span>`;
    $("weekday").textContent = d.toLocaleDateString("en-US", { weekday: "long" });
    $("fulldate").textContent = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }

  // ---------- Word and quote of the day (weekdays only) ----------
  function schoolDayIndex(d) {
    const start = parseDate(CONFIG.listStartDate) || startOfDay(d);
    let day = startOfDay(d);
    while (isWeekend(day)) day = addDays(day, -1); // weekends keep Friday's item
    if (day <= start) return 0;
    let n = 0;
    for (let x = new Date(start); x < day; x = addDays(x, 1)) {
      if (!isWeekend(x)) n++;
    }
    return n;
  }

  function renderDaily(d) {
    const i = schoolDayIndex(d);
    const w = WORDS[i % WORDS.length];
    $("word").textContent = w.word;
    $("word-pos").textContent = `(${w.pos})`;
    $("word-def").textContent = w.definition;
    $("word-ex").textContent = `"${w.example}"`;
    const q = QUOTES[i % QUOTES.length];
    $("quote-text").textContent = `"${q.text}"`;
    $("quote-author").textContent = q.author ? q.author : "";
  }

  // ---------- Google Sheet data ----------
  function sheetId() {
    const s = (CONFIG.sheetUrl || "").trim();
    if (!s) return "";
    const m = s.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return m ? m[1] : s;
  }

  function parseCsv(text) {
    const rows = [];
    let row = [], field = "", inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (c === '"') inQuotes = false;
        else field += c;
      } else if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); rows.push(row); row = []; field = "";
      } else field += c;
    }
    if (field || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  // Turns CSV rows into objects keyed by header, e.g. "Show until" -> showuntil.
  function rowsToObjects(rows) {
    if (!rows.length) return [];
    const keys = rows[0].map((h) => h.toLowerCase().replace(/[^a-z]/g, ""));
    return rows.slice(1)
      .map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] || "").trim()])))
      .filter((o) => Object.values(o).some((v) => v));
  }

  async function fetchTab(id, tab) {
    const url = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(tab)}&_=${Date.now()}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Sheet returned ${res.status}`);
    return rowsToObjects(parseCsv(await res.text()));
  }

  let data = null;
  let dataSource = "";
  let lastUpdate = null;

  function loadCached() {
    try {
      const c = JSON.parse(localStorage.getItem("boardData") || "null");
      if (c && c.data) { data = c.data; lastUpdate = new Date(c.at); }
    } catch (e) { /* storage unavailable */ }
  }

  async function refreshSheet() {
    const id = sheetId();
    if (!id) {
      data = sampleData(now());
      dataSource = "sample";
      renderData();
      return;
    }
    try {
      const [agenda, notes, events] = await Promise.all([
        fetchTab(id, CONFIG.tabs.agenda),
        fetchTab(id, CONFIG.tabs.notes),
        fetchTab(id, CONFIG.tabs.events),
      ]);
      data = { agenda, notes, events };
      dataSource = "sheet";
      lastUpdate = new Date();
      try { localStorage.setItem("boardData", JSON.stringify({ data, at: lastUpdate.getTime() })); } catch (e) { /* ignore */ }
    } catch (e) {
      console.warn("Sheet load failed", e);
      dataSource = data ? "stale" : "error";
    }
    renderData();
  }

  function renderData() {
    const today = startOfDay(now());
    renderAgenda(today);
    renderNotes(today);
    renderEvents(today);
    renderStatus();
  }

  function renderAgenda(today) {
    const list = $("agenda-list");
    const items = (data ? data.agenda : []).filter((r) => {
      const d = parseDate(r.date);
      return d && daysBetween(d, today) === 0 && r.item;
    });
    if (!items.length) {
      list.innerHTML = `<li class="empty">${isWeekend(today) ? "No school today. Enjoy your weekend!" : "Agenda coming soon."}</li>`;
    } else {
      list.innerHTML = items.map((r, i) => `<li><span class="num">${i + 1}</span><span>${escapeHtml(r.item)}</span></li>`).join("");
    }
    fitText($("agenda-fit"), list);
  }

  function renderNotes(today) {
    const list = $("notes-list");
    const notes = (data ? data.notes : []).filter((r) => {
      if (!r.note) return false;
      const until = parseDate(r.showuntil);
      return !until || until >= today;
    });
    list.innerHTML = notes.length
      ? notes.map((r) => `<li>${escapeHtml(r.note)}</li>`).join("")
      : `<li class="empty" style="border:none">No notes today.</li>`;
    fitText($("notes-fit"), list);
  }

  function renderEvents(today) {
    const list = $("events-list");
    const events = (data ? data.events : [])
      .map((r) => ({ ...r, d: parseDate(r.date) }))
      .filter((r) => r.d && r.event)
      .map((r) => ({ ...r, away: daysBetween(today, r.d) }))
      .filter((r) => r.away >= 0 && r.away <= CONFIG.eventDaysAhead)
      .sort((a, b) => a.away - b.away);
    if (!events.length) {
      list.innerHTML = `<li class="empty" style="display:block">Nothing in the next ${CONFIG.eventDaysAhead} days.</li>`;
    } else {
      list.innerHTML = events.map((r) => {
        const when = r.d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const count = r.away === 0 ? "Today" : r.away === 1 ? "Tomorrow" : `in ${r.away} days`;
        return `<li class="${r.away <= 1 ? "soon" : ""}"><span class="when">${when}</span><span>${escapeHtml(r.event)}</span><span class="count">${count}</span></li>`;
      }).join("");
    }
    fitText($("events-fit"), list);
  }

  // Shrinks a list's text until it fits its box, so long agendas never get cut off.
  function fitText(box, list) {
    list.style.fontSize = "";
    const base = parseFloat(getComputedStyle(list).fontSize);
    let scale = 1;
    while (box.scrollHeight > box.clientHeight + 1 && scale > 0.4) {
      scale -= 0.05;
      list.style.fontSize = `${base * scale}px`;
    }
  }

  function renderStatus() {
    const el = $("status");
    el.className = "status";
    if (dataSource === "sample") {
      el.textContent = "Showing sample data. Add your Google Sheet link in config.js.";
      el.classList.add("warn");
    } else if (dataSource === "stale" || dataSource === "error") {
      el.textContent = lastUpdate
        ? `Can't reach the Google Sheet. Showing info from ${lastUpdate.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.`
        : "Can't reach the Google Sheet. Check the link and sharing settings.";
      el.classList.add("warn");
    } else if (lastUpdate) {
      el.textContent = `Updated ${lastUpdate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
    }
  }

  // ---------- Weather (Open-Meteo, no key needed) ----------
  function weatherLook(code, isDay) {
    if (code === 0) return [isDay ? "☀️" : "🌙", "Clear"];
    if (code === 1) return [isDay ? "🌤️" : "🌙", "Mostly clear"];
    if (code === 2) return ["⛅", "Partly cloudy"];
    if (code === 3) return ["☁️", "Cloudy"];
    if (code === 45 || code === 48) return ["🌫️", "Foggy"];
    if (code >= 51 && code <= 57) return ["🌦️", "Drizzle"];
    if (code >= 61 && code <= 67) return ["🌧️", "Rain"];
    if (code >= 71 && code <= 77) return ["❄️", "Snow"];
    if (code >= 80 && code <= 82) return ["🌧️", "Showers"];
    if (code === 85 || code === 86) return ["❄️", "Snow showers"];
    if (code >= 95) return ["⛈️", "Thunderstorms"];
    return ["🌡️", ""];
  }

  async function refreshWeather() {
    const w = CONFIG.weather;
    const url = "https://api.open-meteo.com/v1/forecast"
      + `?latitude=${w.latitude}&longitude=${w.longitude}`
      + "&current=temperature_2m,weather_code,is_day"
      + "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max"
      + `&temperature_unit=fahrenheit&timezone=${encodeURIComponent(w.timezone)}&forecast_days=1`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Weather returned ${res.status}`);
      const j = await res.json();
      const [icon, desc] = weatherLook(j.current.weather_code, j.current.is_day);
      const hi = Math.round(j.daily.temperature_2m_max[0]);
      const lo = Math.round(j.daily.temperature_2m_min[0]);
      const rain = j.daily.precipitation_probability_max[0];
      $("w-icon").textContent = icon;
      $("w-temp").textContent = `${Math.round(j.current.temperature_2m)}°F`;
      $("w-desc").textContent = `${desc}  ·  High ${hi}° Low ${lo}°${rain >= 30 ? `  ·  ${rain}% rain` : ""}`;
    } catch (e) {
      console.warn("Weather load failed", e);
    }
  }

  // ---------- Schedule strip ----------
  function hasIndependentWork(d) {
    return !(CONFIG.noIndependentWorkDays || []).includes(d.getDay());
  }

  function renderSchedule(d) {
    const mins = d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
    const weekend = isWeekend(d);
    const indepToday = hasIndependentWork(d);
    $("schedule").innerHTML = CONFIG.periods.map((p) => {
      const s = minutesOf(p.start), e = minutesOf(p.end);
      const indepAt = indepToday ? e - CONFIG.independentWorkMinutes : e;
      let cls = "", state = "";
      if (weekend) state = "";
      else if (mins < s) state = "Later";
      else if (mins < indepAt) { cls = "class"; state = "Class time"; }
      else if (mins < e) { cls = "indep"; state = "Independent work"; }
      else { cls = "done"; state = "Done"; }
      return `<div class="period ${cls}"><div class="range">${format12(s)} - ${format12(e)}</div><div class="state">${state}</div></div>`;
    }).join("");
  }

  // ---------- Bell ----------
  let audioCtx = null;
  try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* no audio */ }

  function soundBlocked() {
    return !audioCtx || audioCtx.state !== "running";
  }

  function unlockSound() {
    if (!audioCtx) return;
    audioCtx.resume().then(() => {
      $("sound-prompt").classList.add("hidden");
      playTone(880, audioCtx.currentTime, 0.15, 0.4); // quiet "sound is on" blip
    });
  }
  ["keydown", "click", "touchstart"].forEach((ev) => window.addEventListener(ev, unlockSound));

  function playTone(freq, at, volume, length) {
    const osc = audioCtx.createOscillator();
    const overtone = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    overtone.type = "sine";
    osc.frequency.value = freq;
    overtone.frequency.value = freq * 2.76; // bell-like overtone
    const og = audioCtx.createGain();
    og.gain.value = 0.25;
    overtone.connect(og).connect(gain);
    osc.connect(gain).connect(audioCtx.destination);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(volume, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
    osc.start(at); overtone.start(at);
    osc.stop(at + length); overtone.stop(at + length);
  }

  function playChime() {
    if (soundBlocked()) return;
    const t = audioCtx.currentTime + 0.05;
    // Two soft "ding-dong" pairs.
    playTone(659, t, 0.5, 1.6);
    playTone(523, t + 0.6, 0.5, 2.0);
    playTone(659, t + 1.6, 0.5, 1.6);
    playTone(523, t + 2.2, 0.5, 2.4);
  }

  let bannerTimer = null;
  function ring(period) {
    playChime();
    $("banner-sub").textContent = `${format12(minutesOf(period.start))} - ${format12(minutesOf(period.end))} class: ${CONFIG.independentWorkMinutes} minutes left`;
    $("banner").classList.remove("hidden");
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => $("banner").classList.add("hidden"), CONFIG.bannerSeconds * 1000);
  }

  const rung = new Set();
  function checkBells(d) {
    if (isWeekend(d) || !hasIndependentWork(d)) return;
    const mins = d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
    const dayKey = d.toDateString();
    CONFIG.periods.forEach((p) => {
      const at = minutesOf(p.end) - CONFIG.independentWorkMinutes;
      const key = `${dayKey} ${at}`;
      if (mins >= at && mins < at + 1 && !rung.has(key)) {
        rung.add(key);
        ring(p);
      }
    });
  }

  // ---------- Screen care ----------
  function shiftPixels() {
    const x = Math.round(Math.random() * 8 - 4);
    const y = Math.round(Math.random() * 8 - 4);
    $("board").style.transform = `translate(${x}px, ${y}px)`;
  }

  function checkNightlyReload(d) {
    if (d.getHours() === 3 && d.getMinutes() === 0 && Date.now() - loadedAt > 3600000) {
      location.reload();
    }
  }

  // ---------- Main loop ----------
  let lastDay = "";
  function tick() {
    const d = now();
    renderClock(d);
    renderSchedule(d);
    checkBells(d);
    checkNightlyReload(d);
    const dayKey = d.toDateString();
    if (dayKey !== lastDay) {
      lastDay = dayKey;
      renderDaily(d);
      if (data) renderData();
    }
  }

  loadCached();
  tick();
  refreshSheet();
  refreshWeather();
  setInterval(tick, 1000);
  setInterval(refreshSheet, CONFIG.sheetRefreshMinutes * 60000);
  setInterval(refreshWeather, CONFIG.weatherRefreshMinutes * 60000);
  setInterval(shiftPixels, 5 * 60000);
  window.addEventListener("resize", () => data && renderData());

  // Give the browser a moment to decide whether sound is allowed.
  setTimeout(() => {
    if (soundBlocked()) $("sound-prompt").classList.remove("hidden");
  }, 1500);
})();
