# Agenda Board Setup

## 1. Make the Google Sheet
1. Create a new Google Sheet with tabs named exactly **Agenda**, **Notes**, **Events**, and **Settings**.
2. Put these headers in row 1 of each tab (or import the files in `sheet-template/`):
   - Agenda: `Date` | `Item`
   - Notes: `Note` | `Show until`
   - Events: `Date` | `Event`
   - Settings: `Setting` | `Value`, then a row with `Theme` | `Original`
3. Click **Share**, set General access to **Anyone with the link**, role **Viewer**. Copy the link.
4. Paste the link into `config.js` as `sheetUrl`.

Privacy: anyone with the link can see the sheet. Use first names or initials in Notes.

## Using the Sheet day to day
- **Agenda**: one row per item, with today's date. Items show in the order of the rows. You can add rows for future days ahead of time.
- **Notes**: shows until the end of the "Show until" date. Leave that blank to keep a note up until you delete it.
- **Events**: only events in the next 30 days show up, with a countdown.
- Dates can be typed like `11/4/2026`, `11/4`, or `2026-11-04`.
- The TV checks for changes every 5 minutes.

## Picking the look (theme)
There are three looks: **Original**, **Trailhead**, and **Daylight**.
- **From the Sheet:** in the Settings tab, change the Value next to Theme. The TV switches within 5 minutes. Tip: select that cell and use Insert > Dropdown with the three names so nobody has to type them.
- **From the remote:** press left or right to flip through the looks right away. A remote pick lasts until the end of the day, then the board goes back to the Sheet's choice. Changing the Sheet always wins.

## 2. Put it on GitHub Pages
1. Make a public GitHub repo and upload everything in this folder.
2. In the repo go to **Settings > Pages**, choose **Deploy from a branch**, branch `main`, folder `/ (root)`.
3. After a minute the board is live at `https://<your-username>.github.io/<repo-name>/`.

## 3. Set up the Fire TV
1. On the Fire TV, install **Fully Kiosk Browser** (search the Amazon Appstore, or use the Downloader app if it is not listed).
2. Set the Start URL to your GitHub Pages link.
3. In Fully Kiosk settings:
   - Web Content Settings: turn on **Autoplay Videos/Audio** (lets the bell play without pressing OK).
   - Device Management: turn on **Keep Screen On** and **Launch on Boot**.
4. Fire TV settings: **Display & Sounds > Screen Saver > Start Time: Never** if available.

If you use the built-in Silk browser instead, press OK on the remote once after the board loads to turn on the bell sound.

## Changing things later
- Word and quote lists: `words.js` and `quotes.js`. Each school day moves to the next one, starting from `listStartDate` in `config.js`.
- Period times and the bell: `periods` and `independentWorkMinutes` in `config.js`. Fridays have no bell or independent work time; change `noIndependentWorkDays` to adjust.
- The TV reloads itself every night at 3 AM, so changes pushed to GitHub show up the next morning.

## Testing a specific time
Add `?now=` to the address, for example `?now=2026-11-02T08:59:55`, to see what the board does at that moment (handy for checking the bell).
