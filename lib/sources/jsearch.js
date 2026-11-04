// JSearch (RapidAPI) – free plan key at https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
// Searches Google for Jobs, which includes LinkedIn and Indeed listings.
// The free plan has a small monthly allowance, so this runs only twice a day.
import { stripHtml, finishJob, formatPay, roleKeywords } from "../normalize.js";
import { placeForCheck } from "../places.js";

// JSearch v5 retired /search (it now returns 404); /search-v2 uses a cursor
// for paging instead of page numbers, and `work_from_home` for remote-only.
const API = "https://jsearch.p.rapidapi.com/search-v2";
const TYPES = { "Full-Time": "FULLTIME", "Part-Time": "PARTTIME", Internship: "INTERN", "Contract/Freelance": "CONTRACTOR" };
const FROM_TYPE = { FULLTIME: "Full-Time", PARTTIME: "Part-Time", INTERN: "Internship", CONTRACTOR: "Contract/Freelance" };
const PER = { YEAR: "yearly", HOUR: "hourly" };

// One location per check; with several, each check takes the next one in turn.
export async function fetchJSearch(answers, keys, { rotation = 0 } = {}) {
  if (!keys.jsearchKey) throw new Error("Needs a RapidAPI key");

  const roles = roleKeywords(answers).slice(0, 3);
  const what = roles.length ? roles.join(" OR ") : answers.field ?? "jobs";
  const onlyRemote = (answers.settings ?? []).length === 1 && answers.settings[0] === "Remote";
  const place = placeForCheck(answers, rotation);
  const where = !onlyRemote && place && answers.relocate !== "Yes" ? ` in ${place.name}` : "";

  const params = new URLSearchParams({
    query: `${what}${where}`,
    num_pages: "1",
    country: "us",
    date_posted: "3days"
  });
  const types = (answers.types ?? []).map((t) => TYPES[t]).filter(Boolean);
  if (types.length) params.set("employment_types", types.join(","));
  if (onlyRemote) params.set("work_from_home", "true");

  const response = await fetch(`${API}?${params}`, {
    headers: { "x-rapidapi-key": keys.jsearchKey, "x-rapidapi-host": "jsearch.p.rapidapi.com" }
  });
  if (response.status === 401 || response.status === 403) throw new Error("Key was rejected – make sure you subscribed to the free plan");
  if (response.status === 429) throw new Error("Free plan limit reached for this month");
  if (!response.ok) throw new Error(`JSearch returned ${response.status}`);
  const data = await response.json();
  // v2 nests the list next to the paging cursor; older versions returned a plain list.
  const listings = Array.isArray(data.data) ? data.data : data.data?.jobs ?? data.data?.data ?? [];

  return {
    requests: 1,
    jobs: listings.map((r) => {
      const fullText = stripHtml(r.job_description);
      const place = [r.job_city, r.job_state].filter(Boolean).join(", ");
      return finishJob(
        {
          id: `jsearch-${r.job_id}`,
          source: r.job_publisher ? `JSearch (${r.job_publisher})` : "JSearch",
          title: r.job_title,
          company: r.employer_name ?? "Unknown company",
          location: r.job_is_remote ? "Remote" : place || undefined,
          lat: r.job_latitude,
          lon: r.job_longitude,
          type: FROM_TYPE[r.job_employment_type],
          setting: r.job_is_remote ? "Remote" : undefined,
          pay: formatPay(r.job_min_salary, r.job_max_salary, PER[r.job_salary_period] ?? "yearly"),
          description: fullText,
          fullText,
          url: r.job_apply_link,
          postedAt: r.job_posted_at_datetime_utc
        },
        answers
      );
    })
  };
}
