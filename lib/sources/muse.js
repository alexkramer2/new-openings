// The Muse – free, no key needed (500 requests/hour without one).
// Docs: https://www.themuse.com/developers/api/v2
import { SOURCE_CATEGORIES } from "../../data/source-categories.js";
import { stripHtml, finishJob } from "../normalize.js";
import { userPlaces } from "../places.js";

const API = "https://www.themuse.com/api/public/jobs";
const PAGES = 5; // 20 jobs per page
const MAX_AGE_DAYS = 30;

const LEVEL_TO_EXPERIENCE = {
  Internship: "Student / No Experience",
  "Entry Level": "Less Than 1 Year",
  "Mid Level": "1–3 Years",
  "Senior Level": "5+ Years",
  management: "5+ Years"
};

export async function fetchMuse(answers) {
  // The Muse's `level` filter currently returns nothing and results aren't
  // sorted by date, so ask by category and location only, read a few pages,
  // and let the match score handle experience.
  const params = new URLSearchParams();
  for (const c of SOURCE_CATEGORIES[answers.field]?.muse ?? []) params.append("category", c);
  // The Muse takes several locations at once, written "City, ST".
  const homes = userPlaces(answers).map((p) => p.name).filter((name) => /, [A-Z]{2}$/.test(name));
  const settings = answers.settings ?? [];
  if (answers.relocate !== "Yes") for (const home of homes) params.append("location", home);
  if (settings.includes("Remote") || !homes.length) params.append("location", "Flexible / Remote");

  const results = [];
  let requests = 0;
  for (let page = 0; page < PAGES; page++) {
    params.set("page", String(page));
    requests++;
    const response = await fetch(`${API}?${params}`);
    if (!response.ok) throw new Error(`The Muse returned ${response.status}`);
    const data = await response.json();
    results.push(...data.results);
    if (page + 1 >= data.page_count) break;
  }

  const cutoff = Date.now() - MAX_AGE_DAYS * 86400000;
  return {
    requests,
    jobs: results
      .filter((r) => new Date(r.publication_date).getTime() >= cutoff)
      .map((r) => {
        const places = r.locations.map((l) => l.name);
        const remote = places.includes("Flexible / Remote");
        const near = places.find((p) => homes.includes(p));
        const shown = near ?? places.find((p) => p !== "Flexible / Remote") ?? "Remote";
        const extra = places.filter((p) => p !== shown && p !== "Flexible / Remote").length;
        const fullText = stripHtml(r.contents);
        const level = r.levels[0]?.name;
        return finishJob(
          {
            id: `muse-${r.id}`,
            source: "The Muse",
            title: r.name,
            company: r.company?.name ?? "Unknown company",
            location: extra ? `${shown} + ${extra} more` : shown,
            type: level === "Internship" ? "Internship" : undefined,
            field: r.categories[0]?.name,
            setting: remote && !near ? "Remote" : undefined,
            experience: LEVEL_TO_EXPERIENCE[level],
            description: fullText,
            fullText,
            url: r.refs?.landing_page,
            postedAt: r.publication_date
          },
          answers
        );
      })
  };
}
