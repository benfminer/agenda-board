// Board settings. This is the only file you should normally need to edit.
const CONFIG = {
  // Paste the full Google Sheet link here (the sheet must be shared as
  // "Anyone with the link can view"). Leave it blank to show sample data.
  sheetUrl: "https://docs.google.com/spreadsheets/d/1YUe5vWZbMZC_54jU0HRcJsj-ajtwBHXJNg2eTfFXskw/edit?usp=sharing",

  // Tab names in the Google Sheet. They must match exactly.
  tabs: { agenda: "Agenda", notes: "Notes", events: "Events", settings: "Settings", special: "Special Days", stations: "Stations", news: "News" },

  // Weather location (92105, City Heights, San Diego).
  weather: { latitude: 32.74, longitude: -117.09, timezone: "America/Los_Angeles" },

  // The first school day of the quote list (YYYY-MM-DD).
  // Each weekday after this moves to the next quote. Weekends are skipped.
  listStartDate: "2026-10-30",

  // Class periods for each kind of day, in 24-hour time. The bell rings
  // independentWorkMinutes before each period ends.
  schedules: {
    Regular: [
      { start: "07:30", end: "09:30" },
      { start: "08:00", end: "10:00" },
      { start: "10:00", end: "12:00" },
      { start: "12:00", end: "14:00" },
    ],
    // Minimum days: same periods, school ends at 12:00.
    Minimum: [
      { start: "07:30", end: "09:30" },
      { start: "08:00", end: "10:00" },
      { start: "10:00", end: "12:00" },
    ],
  },
  // Which schedule each weekday uses unless the Special Days tab says
  // otherwise (1 = Monday ... 5 = Friday). Wednesdays are minimum days.
  weekdaySchedules: { 1: "Regular", 2: "Regular", 3: "Minimum", 4: "Regular", 5: "Regular" },
  independentWorkMinutes: 30,

  // Days with no independent work time and no bell (0 = Sunday ... 5 = Friday).
  // Fridays are math review and catch-up days.
  noIndependentWorkDays: [5],

  // How long the "Independent work time" banner stays up, in seconds.
  bannerSeconds: 120,

  // Only show upcoming events this many days ahead.
  eventDaysAhead: 30,

  // Music volume, from 0 (silent) to 1 (full). The TV's own volume still
  // applies on top of this.
  musicVolume: 0.6,

  // How long each news headline stays up, in seconds.
  newsSeconds: 15,

  // How often to check for new data, in minutes.
  sheetRefreshMinutes: 1,
  weatherRefreshMinutes: 30,
};
