// Checks the job services for new openings. The background worker calls this
// every hour; each service only runs when it's due and under its monthly limit,
// so the free plans are never used up (and never charged).
import { fetchMuse } from "./sources/muse.js";
import { fetchAdzuna } from "./sources/adzuna.js";
import { fetchJSearch } from "./sources/jsearch.js";
import { addJobs, getMatchAnswers, getSources, saveSources, updateBadge } from "./store.js";

const HOUR = 3600000;

export const SOURCES = {
  muse: { name: "The Muse", fetch: fetchMuse, every: 2 * HOUR, monthlyLimit: 2500, needsKey: false },
  adzuna: { name: "Adzuna", fetch: fetchAdzuna, every: 4 * HOUR, monthlyLimit: 250, needsKey: true },
  jsearch: { name: "JSearch", fetch: fetchJSearch, every: 12 * HOUR, monthlyLimit: 100, needsKey: true }
};

export function hasKeys(id, keys) {
  if (id === "adzuna") return Boolean(keys.adzunaId && keys.adzunaKey);
  if (id === "jsearch") return Boolean(keys.jsearchKey);
  return true;
}

// `force` skips the "is it due yet" wait (Check Now button, after the quiz),
// but never the monthly limit.
export async function checkForJobs({ force = false } = {}) {
  const [answers, sources] = await Promise.all([getMatchAnswers(), getSources()]);
  const { keys, status, usage } = sources;
  const found = [];

  await Promise.all(
    Object.entries(SOURCES).map(async ([id, source]) => {
      const last = status[id]?.checkedAt ? new Date(status[id].checkedAt).getTime() : 0;
      const used = usage[id] ?? 0;
      if (!hasKeys(id, keys)) {
        status[id] = { ...status[id], ok: false, message: "Add a key to turn this on" };
        return;
      }
      if (used >= source.monthlyLimit) {
        status[id] = { ...status[id], ok: false, message: "Monthly limit reached – resumes next month" };
        return;
      }
      if (!force && Date.now() - last < source.every) return;

      // `rotation` steps through the user's locations, one per check, for
      // services that search one place at a time.
      const rotation = status[id]?.rotation ?? 0;
      try {
        const result = await source.fetch(answers, keys, { rotation });
        usage[id] = used + result.requests;
        found.push(...result.jobs);
        status[id] = {
          ok: true,
          checkedAt: new Date().toISOString(),
          found: result.jobs.length,
          message: "",
          rotation: rotation + 1
        };
      } catch (error) {
        usage[id] = used + 1;
        status[id] = { ok: false, checkedAt: new Date().toISOString(), message: error.message };
      }
    })
  );

  await saveSources({ status, usage });
  const added = await addJobs(found);
  await updateBadge();
  return { added, status };
}
