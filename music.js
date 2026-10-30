// Radio for the board. The Music row in the Settings tab picks a station
// from the Stations tab (or "Off"). The remote's up/down arrows switch
// stations for the rest of the day, and play/pause stops the music.
// Music only plays from the first class to the end of the last class.
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const BELL_SECONDS = 8; // how long the music stays quiet for the bell
  const audio = new Audio();
  audio.preload = "none";

  let unlocked = false; // the browser allows sound after the first remote press
  let paused = false;   // play/pause button on the remote
  let ducked = false;
  let playing = null;   // the station currently loaded
  let retryAt = 0;
  let lastProgress = 0; // last time the stream actually moved forward
  let song = "";        // "Title by Artist", when the station tells us

  function readStore(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function writeStore(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
  }

  function minutesOf(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  }

  function schoolHours(d) {
    const periods = window.boardPeriods ? window.boardPeriods(d) : [];
    if (!periods.length) return false;
    const mins = d.getHours() * 60 + d.getMinutes();
    const start = Math.min(...periods.map((p) => minutesOf(p.start)));
    const end = Math.max(...periods.map((p) => minutesOf(p.end)));
    return mins >= start && mins < end;
  }

  function findStation(name, stations) {
    const n = (name || "").trim().toLowerCase();
    return stations.find((s) => s.name.toLowerCase() === n) || null;
  }

  // For previews: ?music=Station Name plays that station instead.
  const previewChoice = new URLSearchParams(location.search).get("music");

  // The Sheet's pick, unless the remote picked something else today.
  function wantedStation() {
    const { stations } = window.boardMusic();
    const choice = previewChoice || window.boardMusic().choice;
    const o = readStore("musicOverride", null);
    if (o && o.day === window.boardNow().toDateString() && o.basedOn === choice) {
      return o.name === "Off" ? null : findStation(o.name, stations);
    }
    return findStation(choice, stations);
  }

  function setVolume() {
    audio.volume = CONFIG.musicVolume * (ducked ? 0.25 : 1);
  }

  function start(station) {
    const switching = !playing || playing.stream !== station.stream;
    playing = station;
    lastProgress = Date.now();
    audio.src = station.stream;
    setVolume();
    audio.play().catch(() => {}); // blocked until the first remote press
    if (switching) { song = ""; refreshSong(); }
  }

  function stop() {
    playing = null;
    song = "";
    audio.pause();
    audio.removeAttribute("src"); // drop the stream so it doesn't keep downloading
    audio.load();
  }

  function renderNowPlaying() {
    const el = $("music-now");
    if (!el) return;
    const show = playing && unlocked;
    const flowing = show && !audio.paused && Date.now() - lastProgress < 3000;
    const name = song ? `${song} · ${playing.name}` : playing.name; // song first, it gets cut off last
    el.textContent = !show ? "" : flowing ? `♪ ${name}` : `♪ ${playing.name} (connecting)`;
    el.classList.toggle("hidden", !show);
  }

  // ---------- Song info ----------
  // Only some stations say what's playing: SomaFM, and stations that stream
  // through Triton (like KUSC). The rest just show the station name.
  function songSource(stream) {
    let m = stream.match(/somafm\.com\/([a-z0-9]+?)-\d+/i);
    if (m) return { kind: "soma", url: `https://api.somafm.com/songs/${m[1]}.json` };
    m = stream.match(/streamtheworld\.com\/api\/livestream-redirect\/([a-z0-9_]+)/i);
    if (m) return { kind: "triton", url: `https://np.tritondigital.com/public/nowplaying?mountName=${m[1]}&numberToFetch=1&eventType=track` };
    return null;
  }

  async function refreshSong() {
    const station = playing;
    const source = station && songSource(station.stream);
    if (!source) { song = ""; return; }
    try {
      const res = await fetch(source.url, { cache: "no-store" });
      const text = await res.text();
      let title = "", artist = "", fresh = true;
      if (source.kind === "soma") {
        const s = JSON.parse(text).songs[0] || {};
        title = s.title || ""; artist = s.artist || "";
      } else {
        const doc = new DOMParser().parseFromString(text, "text/xml");
        const prop = (n) => {
          const el = doc.querySelector(`property[name="${n}"]`);
          return el ? el.textContent.trim() : "";
        };
        title = prop("cue_title"); artist = prop("track_artist_name");
        // Some stations stop updating. Skip a song that ended a while ago.
        const end = Number(prop("cue_time_start")) + Number(prop("cue_time_duration")) * 1000;
        fresh = !end || Date.now() < end + 5 * 60000;
      }
      if (playing !== station) return; // switched stations while loading
      song = fresh && title ? (artist ? `${title} by ${artist}` : title) : "";
    } catch (e) {
      if (playing === station) song = "";
    }
    renderNowPlaying();
  }

  function stuck() {
    return audio.paused || Date.now() - lastProgress > 15000;
  }

  // Checked every second: start, stop, or switch to match what's wanted.
  function update() {
    const station = paused || !schoolHours(window.boardNow()) ? null : wantedStation();
    if (!station) {
      if (playing) stop();
    } else if (!playing || playing.stream !== station.stream) {
      start(station);
    } else if (unlocked && stuck() && Date.now() > retryAt) {
      // The stream dropped or froze. Try again every 15 seconds.
      retryAt = Date.now() + 15000;
      start(station);
    }
    renderNowPlaying();
  }

  // Up/down on the remote: next or previous station, then "Off".
  function cycleStation(step) {
    const { stations } = window.boardMusic();
    const choice = previewChoice || window.boardMusic().choice;
    if (!stations.length) return;
    const names = stations.map((s) => s.name).concat("Off");
    const current = (playing && playing.name) || "Off";
    const i = names.indexOf(current);
    const next = names[(i + step + names.length) % names.length];
    writeStore("musicOverride", { name: next, basedOn: choice, day: window.boardNow().toDateString() });
    paused = false;
    if (window.boardToast) window.boardToast(next === "Off" ? "Music off" : next);
    update();
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") cycleStation(1);
    if (e.key === "ArrowDown") cycleStation(-1);
    if (e.key === "MediaPlayPause" || e.keyCode === 179) {
      paused = !paused;
      if (window.boardToast) window.boardToast(paused ? "Music paused" : "Music on");
      update();
    }
  });

  // The same OK press that turns on the bell also turns on the music.
  // Any later press also restarts music the browser blocked or that froze.
  ["keydown", "click", "touchstart"].forEach((ev) =>
    window.addEventListener(ev, () => {
      unlocked = true;
      if (playing && stuck()) start(playing);
    })
  );

  // Turn the music down so students hear the bell.
  document.addEventListener("bell", () => {
    ducked = true;
    setVolume();
    setTimeout(() => { ducked = false; setVolume(); }, BELL_SECONDS * 1000);
  });

  audio.addEventListener("playing", () => { unlocked = true; renderNowPlaying(); });
  audio.addEventListener("pause", renderNowPlaying);
  audio.addEventListener("timeupdate", () => { lastProgress = Date.now(); });
  setInterval(update, 1000);
  setInterval(refreshSong, 30000);
  update();
})();
