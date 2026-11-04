// Adzuna – free key at https://developer.adzuna.com (App ID + App Key).
// Pulls from thousands of job boards. One request per check.
import { SOURCE_CATEGORIES } from "../../data/source-categories.js";
import { stripHtml, finishJob, formatPay, roleKeywords } from "../normalize.js";
import { placeForCheck } from "../places.js";

const API = "https://api.adzuna.com/v1/api/jobs/us/search/1";
const MILES_TO_KM = { "Within 10 Miles": 16, "Within 25 Miles": 40, "Within 50 Miles": 80 };

// One location per check; with several, each check takes the next one in turn.
export async function fetchAdzuna(answers, keys, { rotation = 0 } = {}) {
  if (!keys.adzunaId || !keys.adzunaKey) throw new Error("Needs an App ID and App Key");
  const place = placeForCheck(answers, rotation);

  const params = new URLSearchParams({
    app_id: keys.adzunaId,
    app_key: keys.adzunaKey,
    results_per_page: "50",
    max_days_old: "14",
    sort_by: "date",
    "content-type": "application/json"
  });
  // Any of the role words ("ui ux graphic"), narrowed to the field's category.
  const GENERIC = ["design", "development", "management", "and"];
  const words = [...new Set(roleKeywords(answers).flatMap((r) => r.toLowerCase().split(/\s+/)))].filter(
    (w) => w.length > 1 && !GENERIC.includes(w)
  );
  if (words.length) params.set("what_or", words.join(" "));
  const category = SOURCE_CATEGORIES[answers.field]?.adzuna;
  if (category) params.set("category", category);

  const onlyRemote = (answers.settings ?? []).length === 1 && answers.settings[0] === "Remote";
  if (onlyRemote) {
    params.set("what_and", "remote");
  } else if (place && answers.relocate !== "Yes") {
    params.set("where", place.name);
    const km = MILES_TO_KM[answers.commute];
    if (km) params.set("distance", String(km));
  }

  const response = await fetch(`${API}?${params}`);
  if (response.status === 401 || response.status === 403) throw new Error("Key was rejected – check the App ID and App Key");
  if (!response.ok) throw new Error(`Adzuna returned ${response.status}`);
  const data = await response.json();

  return {
    requests: 1,
    jobs: (data.results ?? []).map((r) => {
      const fullText = stripHtml(r.description);
      const predicted = String(r.salary_is_predicted) === "1";
      return finishJob(
        {
          id: `adzuna-${r.id}`,
          source: "Adzuna",
          title: stripHtml(r.title),
          company: r.company?.display_name ?? "Unknown company",
          location: r.location?.display_name,
          lat: r.latitude,
          lon: r.longitude,
          type:
            r.contract_time === "part_time"
              ? "Part-Time"
              : r.contract_type === "contract"
                ? "Contract/Freelance"
                : r.contract_time === "full_time"
                  ? "Full-Time"
                  : undefined,
          field: r.category?.label?.replace(/ Jobs$/, ""),
          pay: predicted ? undefined : formatPay(r.salary_min, r.salary_max, "yearly"),
          description: fullText,
          fullText,
          url: r.redirect_url,
          postedAt: r.created
        },
        answers
      );
    })
  };
}
