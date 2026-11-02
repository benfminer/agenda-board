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
  window.boardNow = now; // lets alternate views share the same clock
  const loadedAt = Date.now();

  const $ = (id) => document.getElementById(id);
  const DAY_MS = 86400000;

  // ---------- Themes ----------
  // Each look is its own page. The Sheet's Settings tab picks the default,
  // and the remote's left/right arrows switch for the rest of the day.
  const ROOT = new URL("./", document.currentScript.src);
  const THEMES = [
    { key: "original", name: "Original", path: "index.html" },
    { key: "trailhead", name: "Trailhead", path: "themes/trailhead.html" },
    { key: "daylight", name: "Daylight", path: "themes/daylight.html" },
  ];
  const currentTheme = document.documentElement.dataset.boardTheme || "original";
  let sheetTheme = "original";

  function readStore(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || "null") || fallback; } catch (e) { return fallback; }
  }
  function writeStore(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  }

  function goToTheme(key) {
    const theme = THEMES.find((t) => t.key === key) || THEMES[0];
    if (theme.key === currentTheme) return;
    try { sessionStorage.setItem("themeToast", theme.name); } catch (e) { /* ignore */ }
    location.replace(new URL(theme.path, ROOT).href + location.search);
  }

  function wantedTheme() {
    const o = readStore("themeOverride", null);
    if (o && o.day === now().toDateString() && o.basedOn === sheetTheme) return o.theme;
    return sheetTheme;
  }

  function cycleTheme(step) {
    const i = THEMES.findIndex((t) => t.key === currentTheme);
    const next = THEMES[(i + step + THEMES.length) % THEMES.length].key;
    writeStore("themeOverride", { theme: next, basedOn: sheetTheme, day: now().toDateString() });
    goToTheme(next);
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") cycleTheme(1);
    if (e.key === "ArrowLeft") cycleTheme(-1);
  });

  function showThemeToast() {
    let name = null;
    try { name = sessionStorage.getItem("themeToast"); sessionStorage.removeItem("themeToast"); } catch (e) { /* ignore */ }
    if (name) toast(`${name} theme`);
  }

  // A big message in the middle of the screen for a couple of seconds.
  function toast(text) {
    const t = document.createElement("div");
    t.textContent = text;
    t.style.cssText = "position:fixed;left:50%;top:45%;transform:translate(-50%,-50%);z-index:99;"
      + "background:rgba(0,0,0,0.8);color:#fff;font:700 5vh/1.2 sans-serif;padding:2.4vh 3vw;"
      + "border-radius:2vh;transition:opacity 0.6s;pointer-events:none";
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = "0"; }, 2000);
    setTimeout(() => t.remove(), 2800);
  }
  window.boardToast = toast;

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
    if (!$("quote-text")) return; // the music test page has no quote card
    const i = schoolDayIndex(d);
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
    sheetTheme = readStore("sheetTheme", "original");
  }

  // Reads the Theme row from the Settings tab. If the tab doesn't exist,
  // Google returns the first tab instead, which has no "setting" column.
  function themeFromSettings(rows) {
    const row = rows.find((r) => (r.setting || "").toLowerCase() === "theme");
    const value = row ? (row.value || "").trim().toLowerCase() : "";
    return THEMES.some((t) => t.key === value) ? value : "original";
  }

  // Reads the Message row from the Settings tab. Column C ("Until") is an
  // optional last day to show it, like the Notes tab.
  function messageFromSettings(rows) {
    const row = rows.find((r) => (r.setting || "").toLowerCase() === "message");
    return row && row.value ? { text: row.value, until: row.until || row.showuntil || "" } : null;
  }

  // Reads the Music row from the Settings tab: a station name, or "Off".
  function musicFromSettings(rows) {
    const row = rows.find((r) => (r.setting || "").toLowerCase() === "music");
    return row ? (row.value || "").trim() : "";
  }

  // Stations tab rows look like "SomaFM Fluid | https://...".
  function stationsFrom(rows) {
    return rows
      .filter((r) => r.station && /^https:\/\//.test(r.stream || ""))
      .map((r) => ({ name: r.station.trim(), stream: r.stream.trim() }));
  }
  // News tab rows look like "Headline | Source". IMPORTFEED formulas in the
  // Sheet fill in the headlines. Sources take turns so one doesn't hog the bar.
  function newsFrom(rows) {
    const bySource = {};
    // Skips errors like #N/A, and formulas that got typed in as plain text.
    rows.filter((r) => r.headline && !/^[#=]/.test(r.headline)).forEach((r) => {
      const source = r.source || "";
      (bySource[source] = bySource[source] || []).push({ headline: decodeEntities(r.headline), source });
    });
    const lists = Object.values(bySource);
    const out = [];
    for (let i = 0; lists.some((l) => i < l.length); i++) lists.forEach((l) => { if (l[i]) out.push(l[i]); });
    return out;
  }

  // Feeds sometimes send "&#8217;" instead of an apostrophe.
  function decodeEntities(text) {
    const t = document.createElement("textarea");
    t.innerHTML = text;
    return t.value;
  }

  window.boardMusic = () => ({
    choice: (data && data.music) || "",
    stations: (data && data.stations) || [],
  });

  // ---------- Day types (Regular, Minimum, No School) ----------
  // Special Days rows look like "11/25/2026 | Minimum" or "11/11/2026 | No School".
  function dayType(d) {
    if (isWeekend(d)) return "No School";
    const today = startOfDay(d);
    const row = ((data && data.special) || []).find((r) => {
      const rd = parseDate(r.date);
      return rd && daysBetween(rd, today) === 0;
    });
    const raw = row ? (row.schedule || row.type || row.daytype || "") : "";
    const v = raw.toLowerCase().replace(/[^a-z]/g, "");
    if (v.includes("noschool") || v.includes("holiday")) return "No School";
    const named = Object.keys(CONFIG.schedules).find((k) => v.startsWith(k.toLowerCase()));
    return named || CONFIG.weekdaySchedules[d.getDay()] || "Regular";
  }

  function periodsFor(d) {
    const type = dayType(d);
    return type === "No School" ? [] : (CONFIG.schedules[type] || CONFIG.schedules.Regular);
  }
  window.boardPeriods = periodsFor; // shared with the Daylight view
  window.boardDayType = dayType;

  async function refreshSheet() {
    const id = sheetId();
    if (!id || params.get("sample")) {
      data = sampleData(now());
      dataSource = "sample";
      renderData();
      return;
    }
    try {
      // Optional tabs: if one is missing, Google sends the first tab instead,
      // whose rows have no "setting"/"schedule" column and are ignored.
      const [agenda, notes, events, settings, special, stations, news] = await Promise.all([
        fetchTab(id, CONFIG.tabs.agenda),
        fetchTab(id, CONFIG.tabs.notes),
        fetchTab(id, CONFIG.tabs.events),
        fetchTab(id, CONFIG.tabs.settings).catch(() => []),
        fetchTab(id, CONFIG.tabs.special).catch(() => []),
        fetchTab(id, CONFIG.tabs.stations).catch(() => []),
        fetchTab(id, CONFIG.tabs.news).catch(() => []),
      ]);
      data = {
        agenda, notes, events, special,
        message: messageFromSettings(settings),
        music: musicFromSettings(settings),
        stations: stationsFrom(stations),
        news: newsFrom(news),
      };
      dataSource = "sheet";
      lastUpdate = new Date();
      sheetTheme = themeFromSettings(settings);
      writeStore("sheetTheme", sheetTheme);
      // A Sheet change cancels any earlier remote pick for good.
      const o = readStore("themeOverride", null);
      if (o && o.basedOn !== sheetTheme) writeStore("themeOverride", null);
      writeStore("boardData", { data, at: lastUpdate.getTime() });
    } catch (e) {
      console.warn("Sheet load failed", e);
      dataSource = data ? "stale" : "error";
    }
    renderData();
    goToTheme(wantedTheme());
  }

  function renderData() {
    const today = startOfDay(now());
    safe(() => renderAnnouncement(today));
    safe(() => renderAgenda(today));
    safe(() => renderNotes(today));
    safe(() => renderEvents(today));
    safe(renderNews);
    safe(renderStatus);
  }

  // News bar along the bottom: one headline at a time.
  let newsIndex = 0;
  function renderNews() {
    const el = $("news");
    if (!el) return;
    const items = (data && data.news) || [];
    el.classList.toggle("hidden", !items.length);
    if (!items.length) return;
    const item = items[newsIndex % items.length];
    $("news-headline").textContent = item.headline;
    $("news-source").textContent = item.source;
  }

  function nextHeadline() {
    const items = (data && data.news) || [];
    if (items.length < 2) return;
    const text = $("news-text");
    text.classList.add("fade");
    setTimeout(() => {
      newsIndex = (newsIndex + 1) % items.length;
      safe(renderNews);
      text.classList.remove("fade");
    }, 600);
  }

  // Big strip across the top, from the Message row in the Settings tab.
  function renderAnnouncement(today) {
    const el = $("announcement");
    if (!el) return;
    const m = data && data.message;
    const until = m ? parseDate(m.until) : null;
    const show = m && m.text && (!until || until >= today);
    el.textContent = show ? m.text : "";
    el.classList.toggle("hidden", !show);
    $("board").classList.toggle("has-msg", !!show);
  }

  function renderAgenda(today) {
    const list = $("agenda-list");
    // Rows with no date show every day; dated rows show only on that day.
    const items = (data ? data.agenda : []).filter((r) => {
      if (!r.item) return false;
      if (!r.date) return true;
      const d = parseDate(r.date);
      return d && daysBetween(d, today) === 0;
    });
    if (!items.length) {
      list.innerHTML = `<li class="empty">${isWeekend(today) ? "No school today. Enjoy your weekend!" : "Agenda coming soon."}</li>`;
    } else {
      // Extra lines in a cell (Option+Enter) become smaller sub-points.
      list.innerHTML = items.map((r, i) => {
        const [first, ...rest] = r.item.split("\n").map((l) => l.trim()).filter(Boolean);
        const subs = rest.map((l) => `<span class="sub">${escapeHtml(l)}</span>`).join("");
        return `<li><span class="num">${i + 1}</span><span>${escapeHtml(first)}${subs ? `<span class="subs">${subs}</span>` : ""}</span></li>`;
      }).join("");
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

  // Five columns: day, picture, high/low, and chance of rain.
  // Rain only shows at 30% or more, same as the line at the top.
  function renderForecast(daily) {
    const el = $("forecast");
    if (!el) return;
    const highs = daily.temperature_2m_max.map(Math.round);
    const lows = daily.temperature_2m_min.map(Math.round);
    el.innerHTML = daily.time.map((dateStr, i) => {
      const [y, m, d] = dateStr.split("-").map(Number);
      const day = i === 0 ? "Today" : new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short" });
      const [icon, desc] = weatherLook(daily.weather_code[i], 1);
      const rain = daily.precipitation_probability_max[i] || 0;
      return `<div class="fc-day${i === 0 ? " today" : ""}">`
        + `<div class="fc-name">${day}</div>`
        + `<div class="fc-icon" title="${desc}">${icon}</div>`
        + `<div class="fc-temps"><span class="fc-hi">${highs[i]}°</span> <span class="fc-lo">${lows[i]}°</span></div>`
        + `<div class="fc-rain${rain >= 40 ? " wet" : ""}">${rain >= 30 ? `💧 ${rain}%` : "&nbsp;"}</div>`
        + `</div>`;
    }).join("");
  }

  async function refreshWeather() {
    const w = CONFIG.weather;
    const url = "https://api.open-meteo.com/v1/forecast"
      + `?latitude=${w.latitude}&longitude=${w.longitude}`
      + "&current=temperature_2m,weather_code,is_day"
      + "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max"
      + `&temperature_unit=fahrenheit&timezone=${encodeURIComponent(w.timezone)}&forecast_days=5`;
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
      safe(() => renderForecast(j.daily));
    } catch (e) {
      console.warn("Weather load failed", e);
    }
  }

  function hasIndependentWork(d) {
    return !(CONFIG.noIndependentWorkDays || []).includes(d.getDay());
  }

  // ---------- Bell ----------
  let audioCtx = null;
  try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* no audio */ }

  function soundBlocked() {
    return !audioCtx || audioCtx.state !== "running";
  }

  function unlockSound() {
    // The same remote press also hides the browser's toolbar.
    const root = document.documentElement;
    if (!document.fullscreenElement && root.requestFullscreen) root.requestFullscreen().catch(() => {});
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
    document.dispatchEvent(new Event("bell")); // lets music get quieter
    playChime();
    $("banner-sub").textContent = `${format12(minutesOf(period.start))} - ${format12(minutesOf(period.end))} class: ${CONFIG.independentWorkMinutes} minutes left`;
    $("banner").classList.remove("hidden");
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => $("banner").classList.add("hidden"), CONFIG.bannerSeconds * 1000);
  }

  // Remembered across theme switches so the bell never rings twice.
  const rung = new Set(readStore("bellsRung", []));
  function checkBells(d) {
    if (!hasIndependentWork(d)) return;
    const mins = d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
    const dayKey = d.toDateString();
    periodsFor(d).forEach((p) => {
      const at = minutesOf(p.end) - CONFIG.independentWorkMinutes;
      const key = `${dayKey} ${at}`;
      if (mins >= at && mins < at + 1 && !rung.has(key)) {
        rung.add(key);
        writeStore("bellsRung", [...rung].filter((k) => k.startsWith(dayKey)));
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

  // Asks the browser to keep the screen on while the board is showing.
  // Browsers drop this when the page is hidden, so ask again when it returns.
  async function keepAwake() {
    if (!("wakeLock" in navigator) || document.visibilityState !== "visible") return;
    try { await navigator.wakeLock.request("screen"); } catch (e) { console.warn("Wake lock unavailable", e); }
  }
  document.addEventListener("visibilitychange", keepAwake);

  function checkNightlyReload(d) {
    if (d.getHours() === 3 && d.getMinutes() === 0 && Date.now() - loadedAt > 3600000) {
      location.reload();
    }
  }

  // ---------- Main loop ----------
  let lastDay = "";
  // Runs one piece of the board. If it breaks, the rest keeps working.
  function safe(fn) {
    try { fn(); } catch (e) { console.warn("Board error", e); }
  }

  function tick() {
    const d = now();
    safe(() => renderClock(d));
    safe(() => checkBells(d));
    safe(() => checkNightlyReload(d));
    const dayKey = d.toDateString();
    if (dayKey !== lastDay) {
      lastDay = dayKey;
      safe(() => renderDaily(d));
      if (data) safe(renderData);
    }
  }

  safe(loadCached);
  safe(() => { if (sheetId() && !params.get("sample")) goToTheme(wantedTheme()); });
  safe(showThemeToast);
  keepAwake();
  tick();
  refreshSheet();
  refreshWeather();
  setInterval(tick, 1000);
  setInterval(refreshSheet, CONFIG.sheetRefreshMinutes * 60000);
  setInterval(refreshWeather, CONFIG.weatherRefreshMinutes * 60000);
  setInterval(shiftPixels, 5 * 60000);
  setInterval(nextHeadline, CONFIG.newsSeconds * 1000);
  window.addEventListener("resize", () => data && renderData());

  // Give the browser a moment to decide whether sound is allowed.
  setTimeout(() => {
    if (soundBlocked()) $("sound-prompt").classList.remove("hidden");
  }, 1500);
})();
