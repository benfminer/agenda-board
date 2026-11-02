# Agenda Board Guide

The classroom agenda board runs on the Fire TV and reads everything from a Google Sheet.

- **Live board:** https://benfminer.github.io/agenda-board/
- **Google Sheet:** "ALC Agenda" (the link is in `config.js` as `sheetUrl`)
- **Code:** https://github.com/benfminer/agenda-board

## What's on the board
- **Header:** day, date, clock, and current weather for 92105 (City Heights).
- **Today's Agenda:** from the Agenda tab.
- **Notes:** from the Notes tab. Hidden when there are no notes, so Coming Up gets the space.
- **Coming Up:** events from the Events tab within the next 30 days, with a countdown.
- **5-Day Forecast:** automatic, from the free Open-Meteo weather service. Each day shows a picture and a word (Sunny, Cloudy, Foggy, Rain...). Today's is the weather right now (matching the top); the other days show their forecast. The chance of rain shows only when it's 30% or more.
- **Quote of the Day:** automatic, from a built-in list of 180 quotes (`quotes.js`). A new one each school day.
- **Music:** radio from the station picked in the Settings tab. The station (and song, when known) shows under the quote.
- **In the News:** headlines with a short summary from the News tab (News in Levels and NPR) along the bottom, one at a time, changing every 20 seconds. Hidden if the tab is missing or empty.
- **Bell:** a soft chime plus a big "Independent Work Time" banner 30 minutes before each period ends.

## The Google Sheet
The Sheet must be shared as **Anyone with the link: Viewer**. Anyone with the link can see it, so use first names, initials, or staff names only.

Tab names must match (capital letters don't matter): **Agenda**, **Notes**, **Events**, **Settings**, **Special Days**, **Stations**, **News**. Starter files are in `sheet-template/`.

### Agenda (`Date` | `Item`)
- One row per item. Items show in row order.
- **Leave the Date blank** and the item shows every day until you delete it.
- **Give it a date** and it shows only on that day, so you can plan ahead.
- **Sub-points:** start a new line inside the cell (Mac: Option + Enter, Windows/Chromebook: Ctrl + Enter). Extra lines show as smaller bullets under the item. No need to indent with spaces.
- Emojis work.

### Notes (`Note` | `Show until`)
- Shows until the end of the "Show until" date. Leave it blank to keep a note up until you delete it.

### Events (`Date` | `Event`)
- Only events from today through the next 30 days show, soonest first, with "Today," "Tomorrow," or "in 12 days."

### Settings (`Setting` | `Value` | `Until`)
| Setting | Value | Until |
|---|---|---|
| Theme | Original, Trailhead, Chalkboard, Notebook, Departure Board, or Pastel (a dropdown works well) | |
| Message | Announcement text, or blank for none | Optional last day to show it |
| Music | A station name from the Stations tab, or Off (a dropdown from `Stations!A2:A50`) | |

- **Message:** shows as a big colored strip across the top. Meant for urgent announcements; the rest of the board shrinks a bit to make room. Put a date in Until to have it disappear after that day, or leave Until blank and delete the message when you're done.

### Stations (`Station` | `Stream` | `Ads` | `About`)
- The list of radio stations for music. Starter list: `sheet-template/stations.csv`. Only Station and Stream are used; the other columns are notes.
- The station (and song, when known) shows in small type under the Quote of the Day. Add `?music=Station Name` to the address to preview a station without changing the Sheet.
- Music plays whenever the board is on (turn the TV off after school), and starts with the same OK press as the bell. It gets quieter while the bell rings.
- **To switch stations from the TV:** move Silk's pointer to the music button under the Quote of the Day (it shows the station, or "Music off") and press OK. Pick a station or Off from the list. A pick lasts the rest of the day, or until the Sheet's Music setting changes. (Silk keeps the remote's arrows and rewind/fast-forward for itself, so those can't switch stations.)
- Remote: **Play/pause** pauses only the music; the independent work bell still rings. A pause lasts until you press it again or the board reloads overnight.
- SomaFM stations and KUSC also show the song playing. The others show just the station name.
- Station links aren't official and can stop working. If one does, the board shows "(connecting)" and keeps retrying; pick another station.

### News (`Headline` | `Source` | `Summary`)
- Headlines and short summaries for the "In the News" bar, from News in Levels (easy English, Level 1 only) and NPR.
- A small Google Apps Script fills this tab every hour, on Google's servers, so the Sheet doesn't need to be open. The script is `sheet-template/news-refresh.gs`. To set it up (once): in the Sheet, **Extensions > Apps Script**, paste the script in place of what's there, save, choose **setup** in the function menu, and press **Run**. Approve Google's permission screens (it's your own script, so choose Advanced > Go to project if Google warns it's unverified).
- To change sources, edit the `FEEDS` list at the top of the script.
- The board shows as many whole sentences of each summary as fit. The sources take turns. Delete the rows (or the tab) to hide the bar.

### Special Days (`Date` | `Schedule`)
- **Every Wednesday is automatically a minimum day.** Nothing to enter.
- Add a row only for exceptions. Schedule is a dropdown with:
  - `Minimum`: a special minimum Thursday, for example.
  - `Regular`: a Wednesday that runs a full day.
  - `No School` also works, but isn't needed since the TV is off on those days.

### Typing dates
`11/4/2026`, `11/4/26`, `11/4`, and `2026-11-04` all work.

### How fast changes show up
| What | How often |
|---|---|
| Sheet (agenda, notes, events, theme, message, music, special days, news) | Every minute, plus a minute or two for Google to publish the edit |
| News headlines | Every hour (the Apps Script in the News tab's setup) |
| Weather and forecast | Every 30 minutes |
| Quote | Once per school day |
| Song name (SomaFM and KUSC) | Every 30 seconds |
| Whole page reload (picks up code changes) | Every night at 3 AM |

## The schedule
| Day | Periods | Independent work bell |
|---|---|---|
| Regular (Mon, Tue, Thu) | 7:30-9:30, 8:00-10:00, 10:00-12:00, 12:00-2:00 | 9:00, 9:30, 11:30, 1:30 |
| Minimum (every Wed, plus special days) | 7:30-9:30, 8:00-10:00, 10:00-12:00 | 9:00, 9:30, 11:30 |
| Friday (math review) | Regular periods, all "Class time" | No bell |

## The looks
- **Original:** dark navy, colorful section headings.
- **Trailhead:** light, outdoorsy, mountain banner (Rivian-inspired).
- **Chalkboard:** green chalkboard in a wood frame, colored chalk headings.
- **Notebook:** ruled paper with a red margin line and sticky-note cards.
- **Departure Board:** black with big yellow letters, like a train station sign.
- **Pastel:** light and calm, soft colored cards with rounded corners.

**Switching:**
- **From the Sheet:** change Theme in the Settings tab. The TV follows within a couple of minutes.
- **From the TV:** point at the Look button under the quote and press OK, then pick a look. It lasts the rest of the day, or until someone changes Theme in the Sheet.
- **From a keyboard:** press left or right to flip through the looks. This doesn't work from the Fire TV remote, because Silk uses the arrows for its pointer.

## Fire TV setup (Toshiba 75C350NU, Silk browser)
1. **Open the board in Silk:** go to https://benfminer.github.io/agenda-board/
2. **Each morning, press OK once.** That turns on the bell sound and switches to full screen. The prompt at the top reminds you. Press OK again after a theme change, since switching looks reloads the page.
3. **Screensaver off:** Home > Settings > Display & Audio > Screen Saver > Start Time > **Never**. Also check Display & Audio for a Power Controls or Sleep option and turn off any auto-off timer. The board also asks the TV to stay awake as a backup.
4. **Quick access:** on the home screen, highlight Silk, press the Options button (three lines), and choose Move to put it at the front of the row. Silk reopens to the board.

Fully Kiosk Browser was the original plan but isn't available in the Amazon Appstore, so Silk is the setup.

## Troubleshooting
- **Blank board, or an old layout:** the TV is using an old saved copy of a file. Refresh the page in Silk. (Every file link carries a version tag, which should prevent this; see below.)
- **Toolbar showing:** press OK, or use Silk's menu (three lines) > full screen.
- **Bell didn't sound:** someone needs to press OK after the page loads.
- **Small yellow note in the corner, "Can't reach the Google Sheet":** check the Sheet's sharing is still "Anyone with the link." The board keeps showing the last info it got.
- **Test any moment:** add `?now=` to the address, for example `https://benfminer.github.io/agenda-board/?now=2026-11-04T11:29:55`, to see exactly what the board does then (handy for the bell and minimum days). Add `?sample=1` to see sample data instead of the Sheet.

## For code changes
- Settings live in `config.js`: Sheet link, weather location, schedules (`schedules`, `weekdaySchedules`), bell timing (`independentWorkMinutes`), no-bell days (`noIndependentWorkDays`, Friday = 5), quote start date (`listStartDate`), and refresh timing.
- Files: `index.html` + `style.css` (Original), `themes/trailhead.*` (its own full stylesheet), `themes/chalkboard.*`, `notebook.*`, `departure.*`, `pastel.*` (each adds a small stylesheet on top of `style.css`), shared logic in `app.js`. Music is `music.js`.
- **After changing any file, bump the `?v=` number** on the script and stylesheet links in `index.html` and every `themes/` page (all use the same number). Otherwise the TV may mix old and new files and break.
- Pushing to `main` on GitHub publishes in about a minute. The TV picks it up at its 3 AM reload, or right away on refresh.
- The old Word of the Day list is in the git history if you ever want it back.
