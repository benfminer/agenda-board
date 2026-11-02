// Fills the News tab for the agenda board with fresh headlines every hour.
// It runs on Google's servers, so the Sheet doesn't need to be open.
//
// Setup (once): in the Sheet, Extensions > Apps Script. Paste this in place of
// what's there, save, pick "setup" in the function menu, and press Run.

const FEEDS = [
  { source: "News in Levels", url: "https://www.newsinlevels.com/feed/" },
  { source: "NPR", url: "https://feeds.npr.org/1001/rss.xml" },
];
const ITEMS_PER_FEED = 10;
const TAB = "News";

// Run once. Starts the hourly timer (without doubling it up) and fills the tab now.
function setup() {
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === "refreshNews")
    .forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("refreshNews").timeBased().everyHours(1).create();
  refreshNews();
}

// Rows are Headline | Source | Summary. The board trims the summaries.
function refreshNews() {
  const rows = [];
  for (const feed of FEEDS) {
    try {
      const xml = UrlFetchApp.fetch(feed.url).getContentText();
      const items = XmlService.parse(xml).getRootElement().getChild("channel").getChildren("item");
      items.slice(0, ITEMS_PER_FEED).forEach((item) => {
        rows.push([item.getChildText("title"), feed.source, item.getChildText("description")]);
      });
    } catch (e) {
      // Keep the old headlines rather than show only one source.
      console.warn(`${feed.source} didn't load, keeping the old headlines: ${e}`);
      return;
    }
  }
  const sheet = SpreadsheetApp.getActive().getSheetByName(TAB);
  sheet.getRange(1, 1, 1, 3).setValues([["Headline", "Source", "Summary"]]);
  if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).clearContent();
  sheet.getRange(2, 1, rows.length, 3).setValues(rows);
}
