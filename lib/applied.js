// Auto-detecting "Applied": when an application site says the application was
// submitted (lib/apply-detector.js), find which saved job it was and mark it.
//
// A job counts as a match when enough of these line up:
//   • the application's address is the saved job's own link   (sure thing)
//   • the company in the address matches the saved company      (strong)
//   • the page's job title shares words with the saved title    (helps)
//   • the job's link was opened from the popup or website in the last 3 hours (helps)
import { jobsToMatch, markApplied } from "./account.js";

const RECENT_MS = 3 * 60 * 60 * 1000;
const NEEDED = 60;

// Remembers which job links were just opened (newest first, up to 10).
export async function recordOpenedJob(jobId) {
  const { openedJobs = [] } = await chrome.storage.local.get("openedJobs");
  const list = [{ jobId, at: Date.now() }, ...openedJobs.filter((o) => o.jobId !== jobId)].slice(0, 10);
  await chrome.storage.local.set({ openedJobs: list });
}

function plain(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|corp|corporation|co|company|careers|jobs)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function words(text) {
  return new Set(
    String(text ?? "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2)
  );
}

function sameCompany(saved, fromPage) {
  const a = plain(saved);
  const b = plain(fromPage);
  return a.length >= 3 && b.length >= 3 && (a.includes(b) || b.includes(a));
}

// Share of the saved title's words that appear in the page's title (0–1).
function titleOverlap(saved, fromPage) {
  const want = words(saved);
  if (!want.size) return 0;
  const have = words(fromPage);
  let hits = 0;
  for (const w of want) if (have.has(w)) hits++;
  return hits / want.size;
}

function sameLink(savedUrl, pageUrl) {
  try {
    const a = new URL(savedUrl);
    const b = new URL(pageUrl);
    const base = (a.hostname + a.pathname).replace(/\/$/, "");
    return base.length > 15 && (b.hostname + b.pathname).startsWith(base);
  } catch {
    return false;
  }
}

export function pickJob(jobs, page, openedJobs = [], now = Date.now()) {
  const recent = new Set(openedJobs.filter((o) => now - o.at < RECENT_MS).map((o) => o.jobId));
  const companyMatches = jobs.filter((job) => sameCompany(job.company, page.company));

  let best = null;
  for (const job of jobs) {
    let score = 0;
    if (sameLink(job.url, page.url)) score += 100;
    if (sameCompany(job.company, page.company)) {
      score += 40;
      if (companyMatches.length === 1) score += 25; // the only saved job at that company
    }
    score += titleOverlap(job.title, page.title) * 40;
    if (recent.has(job.job_id)) score += 30;
    if (!best || score > best.score) best = { job, score };
  }
  return best && best.score >= NEEDED ? best.job : null;
}

export async function markAppliedFromPage(page) {
  try {
    const jobs = await jobsToMatch();
    const { openedJobs = [] } = await chrome.storage.local.get("openedJobs");
    const job = pickJob(jobs, page, openedJobs);
    if (!job) return null;
    await markApplied(job.job_id);
    return job;
  } catch {
    return null; // signed out, offline, or the database isn't set up yet
  }
}
