# Classroom Agenda Board

A classroom TV display that shows the day's agenda, notes, upcoming events, weather, a quote of the day, the class schedule, an independent work bell, and radio music. Everything comes from a Google Sheet, so you update the board by editing the Sheet.

## Links

| What | Link |
|---|---|
| **Live board** | https://benfminer.github.io/agenda-board/ |
| **Full guide** | [SETUP.md](SETUP.md) |
| **Google Sheet** | "ALC Agenda" (link is in `config.js`) |

## Everyday use

1. **Open the live board in Silk** on the Fire TV.
2. **Press OK on the remote once** after the page loads. This turns on the bell sound (and music) and switches to full screen.
3. **Edit the Google Sheet** to change what's on the board. Changes show up within a couple of minutes.

## Google Sheet tabs

| Tab | What it does |
|---|---|
| **Agenda** | Today's agenda. Leave the date blank to show an item every day. |
| **Notes** | Short notes, with an optional "Show until" date. |
| **Events** | Upcoming events with a countdown (next 30 days). |
| **Settings** | Theme, an announcement Message, and the Music station. |
| **Special Days** | Exceptions to the normal schedule (minimum days, regular Wednesdays). |
| **Stations** | The list of radio stations the Music setting picks from. |
| **News** | Headlines and summaries for the bottom bar (News in Levels and NPR), filled in every hour by an Apps Script (`sheet-template/news-refresh.gs`). |

Starter files for every tab are in [`sheet-template/`](sheet-template/).

## Remote control

| Button | What it does |
|---|---|
| **OK** | Turns on sound and full screen (once per page load), and clicks whatever Silk's pointer is on |
| **Arrows** | Move Silk's pointer (Silk keeps the arrows, and rewind/fast-forward scroll the page) |
| **Play / Pause** | Pause or resume the music. The bell still rings. |

**Changing the music:** move the pointer to the music button under the Quote of the Day and press OK. A list of stations opens; point at one (or Off) and press OK. The pick lasts the rest of the day. Changing the Sheet always wins.

**Changing the look:** use the Theme setting in the Sheet. (Left/right on a keyboard also works, but Silk keeps the remote's arrows for its pointer.)

## Music

- Pick a station from the **Music** dropdown in the Settings tab, or choose **Off**.
- The station (and song, when known) shows under the Quote of the Day.
- The music gets quieter while the bell rings.
- Switching looks reloads the page, so press OK again to bring the music back.
- SomaFM stations and KUSC also show the song that's playing.
- To preview a station without changing the Sheet, add `?music=` and the station name to the board's address, like `https://benfminer.github.io/agenda-board/?music=SomaFM Fluid`.

## Changing the code

Settings like the schedule, weather location, and music volume are in `config.js`. After changing any file, bump the `?v=` number on every page so the TV doesn't mix old and new files. See [SETUP.md](SETUP.md#for-code-changes) for details. Pushing to `main` publishes the board in about a minute.
