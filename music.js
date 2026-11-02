// Radio for the board. The Music row in the Settings tab picks a station
// from the Stations tab (or "Off"). Clicking the music line under the quote
// (move Silk's pointer there with the arrows, then OK) opens a list to pick
// another station for the rest of the day. Play/pause on the remote stops the
// music (the bell still rings).
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
  let ourChangeAt = 0;  // when this code last started or stopped the audio

  function readStore(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function writeStore(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
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
    ourChangeAt = Date.now();
    const switching = !playing || playing.stream !== station.stream;
    playing = station;
    lastProgress = Date.now();
    audio.src = station.stream;
    setVolume();
    audio.play().catch(() => {}); // blocked until the first remote press
    if (switching) { song = ""; refreshSong(); }
  }

  function stop() {
    ourChangeAt = Date.now();
    playing = null;
    song = "";
    audio.pause();
    audio.removeAttribute("src"); // drop the stream so it doesn't keep downloading
    audio.load();
  }

  // The music line doubles as the button that opens the station list.
  function renderNowPlaying() {
    const el = $("music-now");
    if (!el) return;
    el.classList.toggle("hidden", !window.boardMusic().stations.length);
    if (paused && wantedStation()) {
      el.textContent = "\u266A Music paused";
      return;
    }
    if (!playing) {
      el.textContent = "\u266A Music off";
      return;
    }
    const flowing = unlocked && !audio.paused && Date.now() - lastProgress < 3000;
    const name = song ? `${song} · ${playing.name}` : playing.name; // song first, it gets cut off last
    el.textContent = flowing ? `♪ ${name}` : `♪ ${playing.name} (connecting)`;
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
    const station = paused ? null : wantedStation();
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

  // A station picked from the list lasts the rest of the day, or until the
  // Sheet's Music setting changes.
  function pickStation(name) {
    const choice = previewChoice || window.boardMusic().choice;
    writeStore("musicOverride", { name, basedOn: choice, day: window.boardNow().toDateString() });
    paused = false;
    if (window.boardToast) window.boardToast(name === "Off" ? "Music off" : name);
    update();
  }

  // ---------- Station list ----------
  // Silk keeps the remote's arrows for its pointer, so picking a station has
  // to be something you can click.
  const PICKER_SECONDS = 30; // closes on its own if nobody picks
  let pickerTimer = 0;

  const style = document.createElement("style");
  style.textContent = `
    .music-now { cursor: pointer; }
    #music-picker { position: fixed; inset: 0; z-index: 98; display: flex; align-items: center;
      justify-content: center; background: rgba(0, 0, 0, 0.55); }
    #music-picker .panel { background: #1b2233; color: #fff; border-radius: 2vh; padding: 3vh 2.5vw;
      box-shadow: 0 2vh 8vh rgba(0, 0, 0, 0.6); font-family: inherit; }
    #music-picker h3 { font-size: 3.4vh; margin: 0 0 2vh; }
    #music-picker .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.2vh 1vw; }
    #music-picker button { font: inherit; font-size: 2.6vh; text-align: left; color: #fff; cursor: pointer;
      background: rgba(255, 255, 255, 0.08); border: 0.25vh solid transparent; border-radius: 1.2vh;
      padding: 1.2vh 1.2vw; }
    #music-picker button.current { border-color: #ffc857; background: rgba(255, 200, 87, 0.18); }`;
  document.head.appendChild(style);

  function openPicker() {
    closePicker();
    const { stations } = window.boardMusic();
    if (!stations.length) return;
    const current = paused ? "" : (playing && playing.name) || "Off";
    const picker = document.createElement("div");
    picker.id = "music-picker";
    picker.innerHTML = `<div class="panel"><h3>\u266A Pick music</h3><div class="grid"></div></div>`;
    ["Off", ...stations.map((s) => s.name)].forEach((name) => {
      const b = document.createElement("button");
      b.textContent = name;
      if (name === current) b.className = "current";
      b.addEventListener("click", () => { closePicker(); pickStation(name); });
      picker.querySelector(".grid").appendChild(b);
    });
    picker.addEventListener("click", (e) => { if (e.target === picker) closePicker(); }); // click outside the list
    document.body.appendChild(picker);
    pickerTimer = setTimeout(closePicker, PICKER_SECONDS * 1000);
  }

  function closePicker() {
    clearTimeout(pickerTimer);
    const picker = $("music-picker");
    if (picker) picker.remove();
  }

  const musicLine = $("music-now");
  if (musicLine) musicLine.addEventListener("click", openPicker);

  // Pausing only stops the music. The bell plays separately and still rings.
  function setPaused(value) {
    if (paused === value) return;
    paused = value;
    if (window.boardToast) window.boardToast(!wantedStation() ? "Music off" : paused ? "Music paused" : "Music on");
    update();
  }

  // Play/pause on the remote. (Silk keeps the arrows and rewind/fast-forward.)
  window.addEventListener("keydown", (e) => {
    if (e.key === "MediaPlayPause" || e.keyCode === 179) setPaused(!paused);
    if (e.key === "MediaPause") setPaused(true);
    if (e.key === "MediaPlay") setPaused(false);
  });

  // Some browsers send the remote's media buttons here instead of as keys.
  if ("mediaSession" in navigator) {
    const on = (action, fn) => { try { navigator.mediaSession.setActionHandler(action, fn); } catch (e) { /* unsupported */ } };
    on("play", () => setPaused(false));
    on("pause", () => setPaused(true));
    on("stop", () => setPaused(true));
  }

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
  // If the browser itself paused the music (say, from the remote), treat it
  // as a pause instead of a dropped stream, so it doesn't restart on its own.
  audio.addEventListener("pause", () => {
    if (playing && !audio.error && !audio.ended && Date.now() - ourChangeAt > 1000) setPaused(true);
    renderNowPlaying();
  });
  audio.addEventListener("timeupdate", () => { lastProgress = Date.now(); });
  setInterval(update, 1000);
  setInterval(refreshSong, 30000);
  update();
})();
