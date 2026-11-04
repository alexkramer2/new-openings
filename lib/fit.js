// How well a job fits the user's quiz answers.
//   tagFits()    – which tags on the card turn green
//   matchScore() – the match % in the ring
import { ANY_ROLE } from "../data/fields.js";
import { userPlaces, distanceMiles } from "./places.js";

const COMMUTE_MILES = { "Within 10 Miles": 10, "Within 25 Miles": 25, "Within 50 Miles": 50 };

const HOURS_PER_YEAR = 2080;

// "$54,400-$70,500/yr" -> yearly 54400. Uses the low end of the range so a job
// only counts as fitting if even its lowest pay is enough.
function lowPayPerYear(pay) {
  const amount = Number(pay?.match(/\$([\d,.]+)/)?.[1].replace(/,/g, ""));
  if (!amount) return null;
  return /\/hr|hour/i.test(pay) ? amount * HOURS_PER_YEAR : amount;
}

function minPayPerYear(minPay) {
  if (!minPay?.amount) return null;
  return minPay.per === "hourly" ? minPay.amount * HOURS_PER_YEAR : minPay.amount;
}

const list = (text) =>
  (text ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

export function tagFits(job, answers) {
  const low = lowPayPerYear(job.pay);
  const min = minPayPerYear(answers.minPay);
  return {
    type: (answers.types ?? []).includes(job.type),
    field:
      (answers.roles ?? []).includes(job.field) ||
      ((answers.roles ?? []).includes(ANY_ROLE) && job.category === answers.field),
    setting: (answers.settings ?? []).includes(job.setting),
    pay: low !== null && (min === null || low >= min)
  };
}

// ---------- Match score ----------
// Each part scores 0–1, or null when there's nothing to compare (the job didn't
// list it, or the user skipped it). Null parts are left out instead of counting
// against the job. The parts from the ranking question get the most weight.

const EXPERIENCE = ["Student / No Experience", "Less Than 1 Year", "1–3 Years", "3–5 Years", "5+ Years"];

const scorers = {
  type: (job, a) => (job.type ? ((a.types ?? []).includes(job.type) ? 1 : 0) : null),

  role(job, a) {
    const roles = a.roles ?? [];
    if (roles.includes(job.field)) return 1;
    if (job.category && job.category === a.field) return roles.includes(ANY_ROLE) ? 1 : 0.5;
    return 0;
  },

  setting: (job, a) => (job.setting ? ((a.settings ?? []).includes(job.setting) ? 1 : 0) : null),

  pay(job, a) {
    const low = lowPayPerYear(job.pay);
    const min = minPayPerYear(a.minPay);
    if (low === null || min === null) return null;
    if (low >= min) return 1;
    return Math.max(0, 1 - ((min - low) / min) * 2); // 25% under → 0.5, 50% under → 0
  },

  location(job, a) {
    if (job.setting === "Remote") return (a.settings ?? []).includes("Remote") ? 1 : 0.5;
    const places = userPlaces(a);
    if (!places.length || !job.location) return null;
    const farAway = a.relocate === "Yes" ? 0.8 : a.commute === "Any Distance" || a.relocate === "Maybe" ? 0.5 : 0.2;

    // When the job site gives map coordinates, measure from the closest of the
    // user's locations against their commute answer.
    const mapped = places.filter((p) => p.lat != null);
    if (job.lat != null && job.lon != null && mapped.length) {
      const miles = Math.min(...mapped.map((p) => distanceMiles(p, { lat: job.lat, lon: job.lon })));
      const limit = COMMUTE_MILES[a.commute] ?? Infinity;
      if (miles <= limit) return 1;
      return miles <= limit * 2 ? 0.6 : farAway;
    }
    // Otherwise compare city names.
    const where = job.location.toLowerCase();
    return places.some((p) => p.city && where.includes(p.city.toLowerCase())) ? 1 : farAway;
  },

  experience(job, a) {
    const want = EXPERIENCE.indexOf(a.experience);
    const need = EXPERIENCE.indexOf(job.experience);
    if (want === -1 || need === -1) return null;
    const gap = need - want; // positive = job wants more experience than the user has
    if (gap <= 0) return gap < -2 ? 0.6 : 1;
    return gap === 1 ? 0.5 : 0;
  },

  skills(job, a) {
    const skills = [...(a.skills ?? []), ...list(a.otherSkills)].map((s) => s.toLowerCase());
    if (!skills.length || !job.description) return null;
    const text = `${job.title} ${job.description}`.toLowerCase();
    // "Adobe Photoshop" also matches "Photoshop"; "CPR / BLS" matches either.
    const variants = (s) => [s, s.replace(/^(adobe|microsoft|google) /, ""), ...s.split(/\s*\/\s*/)];
    const found = skills.filter((s) => variants(s).some((v) => v.length > 1 && text.includes(v))).length;
    return Math.min(1, found / Math.min(3, skills.length));
  },

  titles(job, a) {
    const titles = list(a.titles);
    if (!titles.length) return null;
    const title = job.title.toLowerCase();
    if (titles.some((t) => title.includes(t))) return 1;
    const words = titles.flatMap((t) => t.split(/\s+/)).filter((w) => w.length > 2);
    return words.some((w) => title.includes(w)) ? 0.5 : 0;
  },

  industry(job, a) {
    const industries = a.industries ?? [];
    if (!industries.length || industries.includes("No Preference") || !job.industry) return null;
    return industries.includes(job.industry) ? 1 : 0.3;
  },

  startDate(job, a) {
    if (!job.startDate || !a.startDate?.when) return null;
    const start = new Date(job.startDate);
    const days = (start - Date.now()) / 86400000;
    const ready = {
      "As Soon As Possible": 0,
      "Within 1 Month": 30,
      "Within 3 Months": 90,
      "Pick a Date": (new Date(a.startDate.date) - Date.now()) / 86400000
    }[a.startDate.when];
    if (ready === undefined || Number.isNaN(ready)) return null;
    return days >= ready - 14 ? 1 : 0.5;
  }
};

// Ranking answer label -> scorer it boosts.
const RANKED = { Pay: "pay", Location: "location", Role: "role", "Work Setting": "setting", "Job Type": "type" };
const DEFAULT_RANKING = ["Pay", "Location", "Role", "Work Setting", "Job Type"];
const OTHER_WEIGHTS = { experience: 2.5, skills: 2.5, titles: 1.5, industry: 1, startDate: 1 };

function weights(answers) {
  const ranking = answers.ranking?.length ? answers.ranking : DEFAULT_RANKING;
  const w = { ...OTHER_WEIGHTS };
  ranking.forEach((label, i) => {
    w[RANKED[label]] = 6 - i; // 1st = 6, 5th = 2
  });
  return w;
}

export function matchScore(job, answers) {
  const w = weights(answers);
  let total = 0;
  let max = 0;
  for (const [part, score] of Object.entries(scorers)) {
    const value = score(job, answers);
    if (value === null) continue;
    total += value * w[part];
    max += w[part];
  }
  let percent = max ? Math.round((total / max) * 100) : 0;

  // A job in a different field can't be a good match, however well the rest lines up.
  if (scorers.role(job, answers) === 0) percent = Math.min(percent, 40);

  // Deal-breakers keep the job visible but push it to the bottom.
  const breakers = (answers.dealBreakers ?? []).filter((d) => d !== "None");
  if (breakers.some((d) => (job.flags ?? []).includes(d))) percent = Math.min(percent, 15);
  return percent;
}
