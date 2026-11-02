// Example data shown when no Google Sheet is connected yet.
// Dates are relative to today so the 30-day filter can be checked.
function sampleData(today) {
  const d = (n) => {
    const x = new Date(today);
    x.setDate(x.getDate() + n);
    return `${x.getMonth() + 1}/${x.getDate()}/${x.getFullYear()}`;
  };
  return {
    agenda: [
      { date: d(0), item: "Math Review #12" },
      { date: d(0), item: "Finish all maps and readings\nPages 12-15, then the map quiz" },
      { date: d(1), item: "Tomorrow's item (should not show today)" },
      { date: "", item: "No date, so it shows every day" },
    ],
    notes: [
      { note: "Alex out Nov 4-13", showuntil: d(14) },
      { note: "Ms. Lee out today", showuntil: d(0) },
      { note: "Old note (should not show)", showuntil: d(-1) },
      { note: "Bring your library book on Fridays", showuntil: "" },
    ],
    events: [
      { date: d(0), event: "Picture retakes" },
      { date: d(1), event: "Fire drill" },
      { date: d(5), event: "Field trip to the museum" },
      { date: d(29), event: "Science fair" },
      { date: d(31), event: "31 days out (should not show)" },
      { date: d(45), event: "45 days out (should not show)" },
      { date: d(-2), event: "Past event (should not show)" },
    ],
    news: [
      { headline: "The longest train \u2013 level 1", source: "News in Levels", summary: "02-11-2026 07:00 South Africa tests a very long train. The train is 7.6 kilometres long. It has 696 empty wagons." },
      { headline: "The longest train \u2013 level 2", source: "News in Levels", summary: "Should not show." },
      { headline: "AI chatbots are becoming political advisers. Their answers can mislead voters", source: "NPR", summary: "Millions of Americans are turning to AI for election information, but chatbots are getting voting facts wrong and recommending candidates, raising concerns they could influence voters' decisions." },
      { headline: "How does this fluoride-free toothpaste compare when it comes to oral health?", source: "NPR", summary: "Many people are swapping out their fluoride dental products for ones made with a mineral called hydroxyapatite. What do dentists say about it?" },
    ],
  };
}
