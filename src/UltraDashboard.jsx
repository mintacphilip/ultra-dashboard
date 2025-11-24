import React, { useState } from "react";

// Ultra Marathon Schedule Dashboard
// Supports:
// - Uploading a CSV of races (replaces current list)
// - Toggling "Registered" for each race
// - Editing finish time after the race
// - Adding races manually
// - Deleting specific races
// - Website column with clickable race URLs
// - Sorting races by calendar month (January → December)

const initialRaces = [
  {
    id: 1,
    name: "Black Mountain 100",
    month: "March",
    website: "https://example.com/black-mountain-100",
    registered: true,
    finishTime: "26:15:42",
  },
  {
    id: 2,
    name: "UTMB – Chamonix",
    month: "August",
    website: "https://utmb.world",
    registered: false,
    finishTime: "",
  },
  {
    id: 3,
    name: "Crazy Mountain 100",
    month: "July",
    website: "https://example.com/crazy-mountain-100",
    registered: false,
    finishTime: "",
  },
];

const weeklySchedule = [
  { day: "Mon", focus: "Recovery", details: "30 min easy + mobility", miles: 4 },
  { day: "Tue", focus: "Uphill Repeats", details: "10 x 2 min hill + jog down", miles: 8 },
  { day: "Wed", focus: "Aerobic", details: "60–75 min easy trail run", miles: 9 },
  { day: "Thu", focus: "Speed / Tempo", details: "20 min tempo + strides", miles: 7 },
  { day: "Fri", focus: "Off / Cross", details: "Bike / swim + strength", miles: 0 },
  { day: "Sat", focus: "Long Run", details: "4–6 hr hilly long run", miles: 20 },
  { day: "Sun", focus: "Back-to-Back", details: "2–3 hr easy trail", miles: 14 },
];

const summary = {
  yearMiles: 1345,
  thisWeekMiles: 62,
  targetWeekMiles: 70,
};

// Month order helper for sorting races by calendar month
const monthOrder = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function sortByMonth(races) {
  return [...races].sort((a, b) => {
    const am = (a.month || "").trim();
    const bm = (b.month || "").trim();
    const ai = monthOrder.indexOf(am);
    const bi = monthOrder.indexOf(bm);

    const aIndex = ai === -1 ? Number.MAX_SAFE_INTEGER : ai;
    const bIndex = bi === -1 ? Number.MAX_SAFE_INTEGER : bi;

    if (aIndex !== bIndex) return aIndex - bIndex;
    // Stable-ish secondary sort by name to avoid random ordering when months match/unknown
    return (a.name || "").localeCompare(b.name || "");
  });
}

function StatCard({ label, value, sublabel }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <span className="text-2xl font-semibold text-slate-50">{value}</span>
      {sublabel && <span className="text-xs text-slate-400">{sublabel}</span>}
    </div>
  );
}

function RaceRow({ race, onToggleRegistered, onFinishTimeChange, onDelete }) {
  const hasWebsite = Boolean(race.website && race.website.trim());

  return (
    <tr className="border-b border-slate-800/70 last:border-none">
      <td className="px-3 py-2 text-center">
        <input
          type="checkbox"
          checked={race.registered}
          onChange={() => onToggleRegistered(race.id)}
          className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-400"
        />
      </td>
      <td className="px-3 py-2 text-sm font-medium text-slate-100">
        {race.name}
      </td>
      <td className="px-3 py-2 text-xs text-slate-300">{race.month}</td>
      <td className="px-3 py-2 text-xs">
        {hasWebsite ? (
          <a
            href={race.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-emerald-500/50 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/20"
          >
            <span className="truncate max-w-[140px]">{race.website}</span>
          </a>
        ) : (
          <span className="text-slate-500">—</span>
        )}
      </td>
      <td className="px-3 py-2 text-xs text-slate-300">
        <input
          type="text"
          value={race.finishTime}
          onChange={(e) => onFinishTimeChange(race.id, e.target.value)}
          placeholder="HH:MM:SS"
          className="w-28 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 focus:border-emerald-400 focus:outline-none"
        />
      </td>
      <td className="px-3 py-2 text-right">
        <button
          type="button"
          onClick={() => onDelete(race.id)}
          className="rounded-md border border-red-700/80 bg-red-900/40 px-2 py-1 text-xs font-medium text-red-200 hover:bg-red-900/70"
        >
          Delete
        </button>
      </td>
    </tr>
  );
}

function ScheduleRow({ block }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm">
      <div className="flex flex-col">
        <span className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
          {block.day}
        </span>
        <span className="font-medium text-slate-50">{block.focus}</span>
        <span className="text-xs text-slate-400">{block.details}</span>
      </div>
      <div className="flex flex-col items-end">
        <span className="text-xs uppercase tracking-wide text-slate-400">
          Miles
        </span>
        <span className="text-lg font-semibold text-slate-50">{block.miles}</span>
      </div>
    </div>
  );
}

// --- CSV parsing helper ---
// This function parses the CSV text into an array of race objects matching the
// internal shape used by the dashboard.
function parseCsvToRaces(text) {
  const lines = text
    .split("\n")
    .map((line) => line.replace(/\r$/, ""))
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) return [];

  const firstLineCells = lines[0].split(",");

  // Heuristic: if the first non-empty row contains any non-numeric text,
  // treat it as a header row. Otherwise, treat the file as headerless
  // like your Race Schedule.csv (index,race,month,website,...).
  const looksLikeHeader = firstLineCells.some((cell) => {
    const trimmed = cell.trim();
    if (!trimmed) return false;
    return Number.isNaN(Number(trimmed));
  });

  let nameIdx;
  let monthIdx;
  let websiteIdx;
  let startIndex;

  if (looksLikeHeader) {
    const headers = firstLineCells.map((h) => h.trim().toLowerCase());

    // Support a few reasonable header names:
    // name: "name", "race", "race name", "race_name", "race title", "event", "event name"
    // month: "month", "race month", "month held", "month_of_race", "race month held"
    // website: "website", "url", "link", "race website", "race url"
    const nameCandidates = [
      "name",
      "race",
      "race name",
      "race_name",
      "race title",
      "event",
      "event name",
    ];
    const monthCandidates = [
      "month",
      "race month",
      "month held",
      "month_of_race",
      "race month held",
    ];
    const websiteCandidates = [
      "website",
      "url",
      "link",
      "race website",
      "race url",
    ];

    nameIdx = nameCandidates
      .map((key) => headers.indexOf(key))
      .find((idx) => idx !== -1);
    monthIdx = monthCandidates
      .map((key) => headers.indexOf(key))
      .find((idx) => idx !== -1);
    websiteIdx = websiteCandidates
      .map((key) => headers.indexOf(key))
      .find((idx) => idx !== -1);

    startIndex = 1; // skip header row
  } else {
    // Headerless CSV shaped like: index,race,month,website,...
    // This matches your Race Schedule.csv layout.
    nameIdx = 1; // race name
    monthIdx = 2; // month
    websiteIdx = 3; // website URL
    startIndex = 0; // first row is data
  }

  if (nameIdx == null || nameIdx === -1 || monthIdx == null || monthIdx === -1) {
    throw new Error(
      "CSV must provide race name and month columns. " +
        "Example (no headers): index,race name,month,website"
    );
  }

  const parsed = lines.slice(startIndex).map((line, index) => {
    const cells = line.split(",");
    const name = (cells[nameIdx] || "").trim();
    const month = (cells[monthIdx] || "").trim();
    const website =
      websiteIdx != null && websiteIdx !== -1 && cells[websiteIdx]
        ? cells[websiteIdx].trim()
        : "";

    return {
      id: Date.now() + index,
      name,
      month,
      website,
      // CSV doesn't carry these yet; you can manage them in-app
      registered: false,
      finishTime: "",
    };
  });

  return parsed.filter((race) => race.name && race.month);
}

// Simple smoke tests for CSV parsing logic
function runCsvParserSmokeTests() {
  if (
    typeof process !== "undefined" &&
    process.env &&
    process.env.NODE_ENV === "production"
  ) {
    return;
  }

  // Wrap each test block in try/catch so that any parsing error is logged
  // but does NOT break the app at module load time.

  try {
    // Headerless CSV like your Race Schedule.csv
    const sampleHeaderless = [
      "1,Moggollon 100,September,https://example.com/moggollon",
      "2,Falling Water 100k,April,https://example.com/falling-water",
      "",
    ].join("\n");

    const result1 = parseCsvToRaces(sampleHeaderless);

    console.assert(result1.length === 2, "headerless: should parse 2 races");
    console.assert(
      result1[0].name === "Moggollon 100",
      "headerless: first race name"
    );
    console.assert(
      result1[0].month === "September",
      "headerless: first race month"
    );
    console.assert(
      result1[0].website === "https://example.com/moggollon",
      "headerless: first race website"
    );
    console.assert(
      result1[1].name === "Falling Water 100k",
      "headerless: second race name"
    );
    console.assert(
      result1[1].month === "April",
      "headerless: second race month"
    );
    console.assert(
      result1[1].website === "https://example.com/falling-water",
      "headerless: second race website"
    );
  } catch (err) {
    console.warn("CSV parser smoke test (headerless) failed:", err);
  }

  try {
    // Headered CSV with name/month columns
    const sampleHeadered = [
      "race,month,website",
      "UTMB,August,https://utmb.world",
      "",
    ].join("\n");

    const result2 = parseCsvToRaces(sampleHeadered);

    console.assert(result2.length === 1, "headered: should parse 1 race");
    console.assert(result2[0].name === "UTMB", "headered: race name");
    console.assert(result2[0].month === "August", "headered: race month");
    console.assert(
      result2[0].website === "https://utmb.world",
      "headered: race website"
    );
  } catch (err) {
    console.warn("CSV parser smoke test (headered) failed:", err);
  }

  try {
    // Headered CSV with more verbose headers
    const sampleVerboseHeadered = [
      "Race Name,Month Held,URL",
      "Spartathlon,September,https://example.com/spartathlon",
      "",
    ].join("\n");

    const result3 = parseCsvToRaces(sampleVerboseHeadered);

    console.assert(
      result3.length === 1,
      "verbose headered: should parse 1 race"
    );
    console.assert(
      result3[0].name === "Spartathlon",
      "verbose headered: race name"
    );
    console.assert(
      result3[0].month === "September",
      "verbose headered: race month"
    );
    console.assert(
      result3[0].website === "https://example.com/spartathlon",
      "verbose headered: race website"
    );
  } catch (err) {
    console.warn("CSV parser smoke test (verbose headered) failed:", err);
  }

  try {
    // Additional safety test: file with only headers and no data
    const headersOnly = ["race,month,website"].join("\n");
    const result4 = parseCsvToRaces(headersOnly);
    console.assert(result4.length === 0, "headersOnly: should parse 0 races");
  } catch (err) {
    console.warn("CSV parser smoke test (headers only) failed:", err);
  }
}

runCsvParserSmokeTests();

export default function UltraDashboard() {
  const [races, setRaces] = useState(initialRaces);
  const [newRaceName, setNewRaceName] = useState("");
  const [newRaceMonth, setNewRaceMonth] = useState("");
  const [newRaceWebsite, setNewRaceWebsite] = useState("");
  const [newRaceRegistered, setNewRaceRegistered] = useState(false);
  const [newRaceFinishTime, setNewRaceFinishTime] = useState("");

  const weeklyProgressPct = Math.round(
    (summary.thisWeekMiles / summary.targetWeekMiles) * 100
  );

  const nextRaceName = races[0]?.name || "No races yet";
  const nextRaceMonth = races[0]?.month || "";

  const handleToggleRegistered = (id) => {
    setRaces((prev) =>
      prev.map((race) =>
        race.id === id ? { ...race, registered: !race.registered } : race
      )
    );
  };

  const handleFinishTimeChange = (id, value) => {
    setRaces((prev) =>
      prev.map((race) =>
        race.id === id ? { ...race, finishTime: value } : race
      )
    );
  };

  const handleDeleteRace = (id) => {
    setRaces((prev) => prev.filter((race) => race.id !== id));
  };

  const handleAddRace = (e) => {
    e.preventDefault();
    if (!newRaceName.trim() || !newRaceMonth.trim()) return;

    setRaces((prev) =>
      sortByMonth([
        {
          id: Date.now(),
          name: newRaceName.trim(),
          month: newRaceMonth.trim(),
          website: newRaceWebsite.trim(),
          registered: newRaceRegistered,
          finishTime: newRaceFinishTime.trim(),
        },
        ...prev,
      ])
    );

    setNewRaceName("");
    setNewRaceMonth("");
    setNewRaceWebsite("");
    setNewRaceRegistered(false);
    setNewRaceFinishTime("");
  };

  const handleCsvUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text !== "string") return;

      try {
        const parsed = parseCsvToRaces(text);
        if (parsed.length === 0) return;
        // Replace current list with parsed races, sorted by month
        setRaces(sortByMonth(parsed));
      } catch (err) {
        // Surface a friendly error to the user if parsing fails
        alert(
          (err && err.message) ||
            "Unable to parse CSV. Please ensure it includes race name and month columns."
        );
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        {/* Header */}
        <header className="flex flex-col gap-3 border-b border-slate-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Ultra Marathon Schedule Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Load your race season from CSV, jump straight to race websites, and log finish times.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-400">
            <span className="rounded-full border border-slate-700 px-3 py-1">
              Mode: Base / Build
            </span>
            <span className="rounded-full border border-slate-700 px-3 py-1">
              Focus: Mountain Ultras
            </span>
          </div>
        </header>

        {/* Top summary cards */}
        <section className="grid gap-4 md:grid-cols-4">
          <StatCard
            label="Year-to-date miles"
            value={`${summary.yearMiles} mi`}
            sublabel="Logged across all runs"
          />
          <StatCard
            label="This week"
            value={`${summary.thisWeekMiles} / ${summary.targetWeekMiles} mi`}
            sublabel={`${weeklyProgressPct}% of target volume`}
          />
          <StatCard
            label="Next race"
            value={nextRaceName}
            sublabel={nextRaceMonth ? `Held in ${nextRaceMonth}` : ""}
          />
          <StatCard
            label="Races on calendar"
            value={races.length}
            sublabel="Imported + manual entries"
          />
        </section>

        {/* Main grid: races + weekly plan */}
        <main className="grid gap-6 lg:grid-cols-3">
          {/* Races section */}
          <section className="lg:col-span-2 flex flex-col gap-4">
            <div className="mb-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  Race Calendar
                </h2>
                <span className="text-xs text-slate-400">
                  Upload via CSV or add manually. Columns: Registered, Name, Month, Website, Finish Time.
                </span>
              </div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <label className="text-xs font-medium text-slate-300">
                  Import races from CSV
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvUpload}
                    className="mt-1 block text-xs text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-500/90 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-950 hover:file:bg-emerald-400"
                  />
                </label>
                <p className="text-[11px] text-slate-500">
                  Expected format: either a header row with name + month (+ optional website) columns, or rows like index,race name,month,website (as in your Race Schedule CSV)
                </p>
              </div>
            </div>

            {/* Manual add form */}
            <form
              onSubmit={handleAddRace}
              className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-3 text-xs sm:flex-row sm:items-end"
            >
              <div className="flex flex-1 flex-col gap-1">
                <label className="text-[11px] font-medium text-slate-300">
                  Race name
                </label>
                <input
                  type="text"
                  value={newRaceName}
                  onChange={(e) => setNewRaceName(e.target.value)}
                  placeholder="e.g., Hellbender 100"
                  className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-slate-300">
                  Month
                </label>
                <input
                  type="text"
                  value={newRaceMonth}
                  onChange={(e) => setNewRaceMonth(e.target.value)}
                  placeholder="e.g., April"
                  className="w-24 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-slate-300">
                  Website
                </label>
                <input
                  type="text"
                  value={newRaceWebsite}
                  onChange={(e) => setNewRaceWebsite(e.target.value)}
                  placeholder="https://..."
                  className="w-40 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-slate-300">
                  Finish time
                </label>
                <input
                  type="text"
                  value={newRaceFinishTime}
                  onChange={(e) => setNewRaceFinishTime(e.target.value)}
                  placeholder="optional"
                  className="w-24 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="flex items-center gap-2 text-[11px] font-medium text-slate-300">
                  <input
                    type="checkbox"
                    checked={newRaceRegistered}
                    onChange={(e) => setNewRaceRegistered(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-900 text-emerald-400"
                  />
                  Registered
                </label>
              </div>

              <button
                type="submit"
                className="mt-1 rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400 sm:mt-0"
              >
                Add race
              </button>
            </form>

            {/* Races table */}
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-xl">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400">
                  <tr>
                    <th className="px-3 py-2 text-center font-medium">Reg?</th>
                    <th className="px-3 py-2 font-medium">Race</th>
                    <th className="px-3 py-2 font-medium">Month</th>
                    <th className="px-3 py-2 font-medium">Website</th>
                    <th className="px-3 py-2 font-medium">Finish time</th>
                    <th className="px-3 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {races.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-4 text-center text-xs text-slate-500"
                      >
                        No races yet. Upload a CSV or add one manually.
                      </td>
                    </tr>
                  ) : (
                    races.map((race) => (
                      <RaceRow
                        key={race.id}
                        race={race}
                        onToggleRegistered={handleToggleRegistered}
                        onFinishTimeChange={handleFinishTimeChange}
                        onDelete={handleDeleteRace}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Weekly schedule */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  This Week's Plan
                </h2>
                <p className="text-xs text-slate-400">
                  Adjust volumes, not intent, when life happens.
                </p>
              </div>
              <div className="text-right text-xs text-slate-400">
                <div>Planned: {summary.targetWeekMiles} mi</div>
                <div>Current: {summary.thisWeekMiles} mi</div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {weeklySchedule.map((block) => (
                <ScheduleRow key={block.day} block={block} />
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
