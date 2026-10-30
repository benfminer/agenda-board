// Daylight view: moving sky, sun arc, and a timeline of the school day.
(function () {
  "use strict";
  const now = window.boardNow || (() => new Date());
  const $ = (id) => document.getElementById(id);

  // Sky colors through the day: [hour, top color, bottom color, night amount]
  const SKY = [
    [0, "#060a1c", "#141b3a", 1],
    [5.5, "#141b3a", "#3b2f5c", 0.9],
    [7, "#3d5a9e", "#f7a986", 0.2],
    [8.5, "#4f94dd", "#ffd8b0", 0],
    [11, "#2f7fe0", "#a9d8ff", 0],
    [13.5, "#3a7fd0", "#ffe2a8", 0],
    [15.5, "#d9785a", "#ffcf7a", 0],
    [17.5, "#3a2a62", "#e8826e", 0.4],
    [19.5, "#0c1230", "#1d2550", 1],
    [24, "#060a1c", "#141b3a", 1],
  ];

  function mix(a, b, t) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const ch = (p, s) => (p >> s) & 255;
    const c = [16, 8, 0].map((s) => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * t));
    return `rgb(${c.join(",")})`;
  }

  function paintSky(d) {
    const h = d.getHours() + d.getMinutes() / 60;
    let i = 0;
    while (i < SKY.length - 2 && SKY[i + 1][0] <= h) i++;
    const [h0, t0, b0, n0] = SKY[i], [h1, t1, b1, n1] = SKY[i + 1];
    const t = (h - h0) / (h1 - h0);
    const root = document.documentElement.style;
    root.setProperty("--sky-top", mix(t0, t1, t));
    root.setProperty("--sky-bottom", mix(b0, b1, t));
    root.setProperty("--night", (n0 + (n1 - n0) * t).toFixed(2));
  }

  const mins = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
  const fmt = (m) => `${(Math.floor(m / 60) % 12) || 12}:${String(m % 60).padStart(2, "0")}`;
  const indepToday = (d) => !(CONFIG.noIndependentWorkDays || []).includes(d.getDay());

  // Today's periods (Regular, Minimum, or none), split into two lanes so
  // overlapping groups sit side by side.
  function dayPlan(d) {
    const periods = (window.boardPeriods ? window.boardPeriods(d) : CONFIG.schedules.Regular)
      .map((p) => ({ s: mins(p.start), e: mins(p.end) }));
    if (!periods.length) return null;
    const lanes = [];
    [...periods].sort((a, b) => a.s - b.s).forEach((p) => {
      const lane = lanes.find((l) => l[l.length - 1].e <= p.s);
      lane ? lane.push(p) : lanes.push([p]);
    });
    const start = Math.min(...periods.map((p) => p.s));
    const end = Math.max(...periods.map((p) => p.e));
    const type = window.boardDayType ? window.boardDayType(d) : "Regular";
    return { lanes, start, end, type, pct: (m) => ((m - start) / (end - start)) * 100 };
  }

  // Sun arc across the top, matching the school day.
  const arcPoint = (p) => [22 + 56 * p, 84 - 74 * Math.sin(Math.PI * p)];
  function arcPath(upTo) {
    const pts = [];
    for (let i = 0; i <= 60; i++) pts.push(arcPoint((i / 60) * upTo));
    return "M" + pts.map((q) => q.map((v) => v.toFixed(2)).join(" ")).join(" L");
  }
  $("arc-full").setAttribute("d", arcPath(1));

  function paintSun(plan, m) {
    const sun = $("sun");
    if (!plan || m < plan.start || m > plan.end) {
      sun.classList.add("off");
      $("arc-done").setAttribute("d", plan && m > plan.end ? arcPath(1) : "");
      return;
    }
    const p = (m - plan.start) / (plan.end - plan.start);
    const [x, y] = arcPoint(p);
    sun.classList.remove("off");
    sun.style.left = `${x}%`;
    sun.style.top = `${y}%`;
    $("arc-done").setAttribute("d", arcPath(p));
  }

  function dayNote(d, plan, m) {
    if (!plan) return d.getDay() === 0 || d.getDay() === 6 ? "Enjoy your weekend" : "No school today";
    const tag = plan.type === "Minimum" ? `Minimum day, out at ${fmt(plan.end)}` : "";
    if (m < plan.start) return tag || `School starts at ${fmt(plan.start)}`;
    if (m >= plan.end) return "School's out. See you tomorrow!";
    const left = Math.ceil(plan.end - m);
    const time = left <= 60 ? `${left} minutes left` : `${Math.floor(left / 60)} hr ${left % 60} min left`;
    return tag ? `${tag} · ${time}` : `${time} in the school day`;
  }

  function paintTimeline(d, plan, m) {
    if (!plan) {
      $("timeline").innerHTML = `<div class="no-school">${dayNote(d, null, m)}</div>`;
      return;
    }
    const indep = indepToday(d);
    let html = plan.lanes.map((lane) => `<div class="lane">${lane.map((p) => {
      const indepAt = indep ? p.e - CONFIG.independentWorkMinutes : p.e;
      let cls = "bar";
      if (m >= p.e) cls += " past";
      else if (m >= p.s) cls += " active" + (m >= indepAt ? " in-indep" : "");
      const indepWidth = indep ? (CONFIG.independentWorkMinutes / (p.e - p.s)) * 100 : 0;
      return `<div class="${cls}" style="left:${plan.pct(p.s)}%;width:${plan.pct(p.e) - plan.pct(p.s)}%">`
        + (indepWidth ? `<div class="indep" style="width:${indepWidth}%"></div>` : "")
        + `<span class="label">${fmt(p.s)} - ${fmt(p.e)}</span></div>`;
    }).join("")}</div>`).join("");
    if (m >= plan.start && m <= plan.end) html += `<div class="now-line" style="left:${plan.pct(m)}%"></div>`;
    $("timeline").innerHTML = html;
  }

  function update() {
    const d = now();
    const m = d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
    const plan = dayPlan(d);
    paintSky(d);
    paintSun(plan, m);
    paintTimeline(d, plan, m);
    $("day-note").textContent = dayNote(d, plan, m);
  }

  update();
  setInterval(update, 15000);
})();
