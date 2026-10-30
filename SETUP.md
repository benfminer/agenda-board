# Agenda Board Setup

## 1. Make the Google Sheet
1. Create a new Google Sheet with tabs named exactly **Agenda**, **Notes**, **Events**, **Settings**, and **Special Days**.
2. Put these headers in row 1 of each tab (or import the files in `sheet-template/`):
   - Agenda: `Date` | `Item`
   - Notes: `Note` | `Show until`
   - Events: `Date` | `Event`
   - Settings: `Setting` | `Value` | `Until`, then rows `Theme` | `Original` and `Message` | (blank)
   - Special Days: `Date` | `Schedule`
3. Click **Share**, set General access to **Anyone with the link**, role **Viewer**. Copy the link.
4. Paste the link into `config.js` as `sheetUrl`.

Privacy: anyone with the link can see the sheet. Use first names or initials in Notes.

## Using the Sheet day to day
- **Agenda**: one row per item. Leave the Date blank and the item shows every day until you delete it. Give it a date and it shows only on that day, so you can plan days ahead. Items show in the order of the rows.
- **Notes**: shows until the end of the "Show until" date. Leave that blank to keep a note up until you delete it.
- **Events**: only events in the next 30 days show up, with a countdown.
- Dates can be typed like `11/4/2026`, `11/4`, or `2026-11-04`.
- The TV checks for changes every minute (Google can take a minute or two to publish an edit).

## Picking the look (theme)
There are three looks: **Original**, **Trailhead**, and **Daylight**.
- **From the Sheet:** in the Settings tab, change the Value next to Theme. The TV switches within a few minutes. Tip: select that cell and use Insert > Dropdown with the three names so nobody has to type them.
- **From the remote:** press left or right to flip through the looks right away. A remote pick lasts until the end of the day, then the board goes back to the Sheet's choice. Changing the Sheet always wins.

## Announcements
In the Settings tab, type your message next to **Message** (column B). It shows as a big strip across the top of the board. Put a date in column C (Until) to have it disappear after that day, or leave C blank and delete the message when you're done.

## Minimum days and days off
- Every **Wednesday** is automatically a minimum day (school ends at 12:00, no 12:00 to 2:00 period, no 1:30 bell).
- For anything else, add a row to the **Special Days** tab: the date, then `Minimum`, `No School`, or `Regular`.
  - `Minimum`: a special minimum Thursday, for example.
  - `No School`: holidays and breaks. No bell, and the board says "No school today."
  - `Regular`: a Wednesday that runs a full day.
- Fridays still have no independent work time or bell, whatever the schedule.
- Period times live in `config.js` under `schedules`.

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
- Quote list: `quotes.js`. Each school day moves to the next quote, starting from `listStartDate` in `config.js`. (The old Word of the Day list is in the git history if you ever want it back.)
- Period times and the bell: `periods` and `independentWorkMinutes` in `config.js`. Fridays have no bell or independent work time; change `noIndependentWorkDays` to adjust.
- The TV reloads itself every night at 3 AM, so changes pushed to GitHub show up the next morning.

## Testing a specific time
Add `?now=` to the address, for example `?now=2026-11-02T08:59:55`, to see what the board does at that moment (handy for checking the bell).

## After changing code
Bump the `?v=` number on the script and stylesheet links in `index.html` and the two `themes/` pages (all files use the same number). This makes the TV load the new code instead of an old saved copy.
