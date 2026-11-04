// Shared state for the popup, quiz and background worker, kept in chrome.storage.local:
//   jobs       – every opening we know about (sample jobs until real ones arrive)
//   seenIds    – openings the user has already seen in the popup (drives the badge)
//   clearedIds – openings the user removed with Clear
//   quizAnswers, quizStep – start-up quiz answers and where the user left off
//   sources    – API keys, last-check status and this month's request counts
import { SAMPLE_JOBS } from "../data/sample-jobs.js";
import { SAMPLE_QUIZ_ANSWERS } from "../data/sample-quiz.js";
import { matchScore } from "./fit.js";
import { dedupeKey } from "./normalize.js";

const hasChromeStorage = typeof chrome !== "undefined" && chrome.storage?.local;

// Outside the extension (e.g. opening popup.html directly to preview it) there is
// no chrome.storage, so fall back to an in-memory copy seeded with the samples.
const memory = { jobs: SAMPLE_JOBS, seenIds: [], clearedIds: [] };

const KEYS = ["jobs", "seenIds", "clearedIds"];
const MAX_JOBS = 200;
const MAX_AGE_DAYS = 30;
export const BADGE_MIN_MATCH = 60; // only yellow and green matches count toward the badge
export const POPUP_LIMIT = 30; // best matches shown in the popup

async function read() {
  if (!hasChromeStorage) return memory;
  const data = await chrome.storage.local.get(KEYS);
  return {
    jobs: data.jobs ?? [],
    seenIds: data.seenIds ?? [],
    clearedIds: data.clearedIds ?? []
  };
}

async function write(patch) {
  if (!hasChromeStorage) return Object.assign(memory, patch);
  await chrome.storage.local.set(patch);
}

const isSample = (job) => job.id.startsWith("sample-");

// Sample jobs fill the popup until the first real check brings jobs in.
// Refreshed on every install or reload, so edits to sample-jobs.js show up.
export async function seedSampleJobs() {
  const { jobs } = await read();
  const realJobs = jobs.filter((job) => !isSample(job));
  await write({ jobs: realJobs.length ? realJobs : SAMPLE_JOBS });
}

// Add newly found jobs. Duplicates (same title + company, even from another
// service) are skipped, old postings drop off, and the list is capped.
export async function addJobs(found) {
  const { jobs, seenIds, clearedIds } = await read();
  const real = jobs.filter((job) => !isSample(job));
  const keys = new Set(real.map(dedupeKey));
  const added = [];
  for (const job of found) {
    const key = dedupeKey(job);
    if (keys.has(key)) continue;
    keys.add(key);
    added.push({ ...job, foundAt: new Date().toISOString() });
  }
  if (!added.length && real.length === jobs.length) return 0;

  const cutoff = Date.now() - MAX_AGE_DAYS * 86400000;
  const kept = [...added, ...real]
    .filter((job) => new Date(job.postedAt ?? job.foundAt).getTime() >= cutoff)
    .sort((a, b) => new Date(b.postedAt ?? b.foundAt) - new Date(a.postedAt ?? a.foundAt))
    .slice(0, MAX_JOBS);
  if (!kept.length) return 0; // keep the samples until something real shows up

  const ids = new Set(kept.map((job) => job.id));
  await write({
    jobs: kept,
    seenIds: seenIds.filter((id) => ids.has(id)),
    clearedIds: clearedIds.filter((id) => ids.has(id))
  });
  return added.length;
}

export async function getVisibleJobs() {
  const { jobs, clearedIds } = await read();
  return jobs.filter((job) => !clearedIds.includes(job.id));
}

export async function getUnseenCount() {
  const [{ jobs, seenIds, clearedIds }, answers] = await Promise.all([read(), getMatchAnswers()]);
  return jobs.filter(
    (job) =>
      !seenIds.includes(job.id) && !clearedIds.includes(job.id) && matchScore(job, answers) >= BADGE_MIN_MATCH
  ).length;
}

export async function markSeen(ids) {
  const { seenIds } = await read();
  await write({ seenIds: [...new Set([...seenIds, ...ids])] });
}

export async function clearJob(id) {
  const { clearedIds } = await read();
  if (!clearedIds.includes(id)) await write({ clearedIds: [...clearedIds, id] });
}

// ---------- Quiz ----------

// Quiz answers are saved after every question, so closing the tab midway
// keeps progress. `quizStep` is the index of the question to resume on.
export async function getQuizProgress() {
  if (!hasChromeStorage) return { answers: memory.quizAnswers ?? {}, step: memory.quizStep ?? -1 };
  const data = await chrome.storage.local.get(["quizAnswers", "quizStep"]);
  return { answers: data.quizAnswers ?? {}, step: data.quizStep ?? -1 };
}

export async function saveQuizProgress(answers, step) {
  await write({ quizAnswers: answers, quizStep: step });
}

// Answers used for matching: whatever the user has answered so far, with the
// stand-in answers filling the questions that aren't answered yet.
export async function getMatchAnswers() {
  const { answers } = await getQuizProgress();
  const merged = { ...SAMPLE_QUIZ_ANSWERS };
  for (const [key, value] of Object.entries(answers)) {
    if (Array.isArray(value) ? value.length : value) merged[key] = value;
  }
  return merged;
}

// ---------- Job sources ----------

const thisMonth = () => new Date().toISOString().slice(0, 7);

export async function getSources() {
  const data = hasChromeStorage ? await chrome.storage.local.get("sources") : memory;
  const sources = { keys: {}, status: {}, usage: {}, ...data.sources };
  if (sources.usage.month !== thisMonth()) sources.usage = { month: thisMonth() };
  return sources;
}

export async function saveSources(patch) {
  const sources = await getSources();
  await write({ sources: { ...sources, ...patch } });
}

// ---------- Badge ----------

// Red count on the toolbar icon. Only visible when the extension is pinned.
export async function updateBadge() {
  if (typeof chrome === "undefined" || !chrome.action) return;
  const count = await getUnseenCount();
  await chrome.action.setBadgeBackgroundColor({ color: "#E0342B" });
  await chrome.action.setBadgeTextColor?.({ color: "#FFFFFF" });
  await chrome.action.setBadgeText({ text: count > 0 ? String(count) : "" });
}
