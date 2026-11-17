// Saved Jobs home page: the jobs the signed-in person saved with "Add to List"
// in the extension, loaded from Supabase. Not signed in → the sign-in page.
//   ?demo        – show sample jobs instead (no sign-in), for design reviews
//   ?demo&empty  – demo with no saved jobs, to see the empty card
import { SAMPLE_SAVED_JOBS } from "./sample-saved.js";
import { supabase, displayName } from "./supabase-client.js";

const params = new URLSearchParams(location.search);
const DEMO = params.has("demo");
const FILTER_KEY = "savedJobsTypeFilter";
const ARC_LENGTH = 2 * Math.PI * 29; // circumference of the match arc (r = 29)
const NOT_LISTED = { type: "Type not listed", field: "Field not listed", setting: "Setting not listed", pay: "Pay not listed" };

const grid = document.getElementById("job-grid");
const cardTemplate = document.getElementById("job-card");
const emptyTemplate = document.getElementById("empty-card");

// ---------- Saved jobs ----------

let savedJobs = [];
let loadError = "";

// Each row's `job` is the card as the extension showed it when it was saved
// (including match % and tag colors); `rowId` is kept so it can be removed.
async function loadSaved() {
  if (DEMO) return params.has("empty") ? [] : SAMPLE_SAVED_JOBS;
  const query = (columns) =>
    supabase.from("saved_jobs").select(columns).order("saved_at", { ascending: false });
  let { data, error } = await query("id, job, saved_at, status, applied_at");
  // Before the Applied columns exist in the database, load without them.
  if (error) ({ data, error } = await query("id, job, saved_at"));
  if (error) {
    loadError = "Your saved jobs couldn’t load. Refresh the page to try again.";
    return [];
  }
  return data.map((row) => ({
    ...row.job,
    rowId: row.id,
    savedAt: row.saved_at,
    status: row.status ?? "saved",
    appliedAt: row.applied_at ?? null
  }));
}

// Undo on the Applied bar: back to "want to apply".
async function setStatus(job, status) {
  const previous = { status: job.status, appliedAt: job.appliedAt };
  job.status = status;
  job.appliedAt = status === "applied" ? new Date().toISOString() : null;
  if (DEMO || !job.rowId) return true;
  const { error } = await supabase
    .from("saved_jobs")
    .update({ status, applied_at: job.appliedAt })
    .eq("id", job.rowId);
  if (error) Object.assign(job, previous);
  return !error;
}

async function removeSaved(job) {
  savedJobs = savedJobs.filter((j) => j !== job);
  if (DEMO || !job.rowId) return true;
  const { error } = await supabase.from("saved_jobs").delete().eq("id", job.rowId);
  return !error;
}

let typeFilter = "Any";
try {
  typeFilter = localStorage.getItem(FILTER_KEY) ?? "Any";
} catch {}

// ---------- Cards ----------

function matchLevel(percent) {
  if (percent > 75) return "is-high";
  if (percent >= 60) return "is-medium";
  return "is-low";
}

function renderCard(job, index) {
  const card = cardTemplate.content.firstElementChild.cloneNode(true);
  card.style.animationDelay = `${Math.min(index, 12) * 40}ms`;

  // textContent (not innerHTML) so text from job sites can't inject markup
  for (const el of card.querySelectorAll("[data-field]")) {
    el.textContent = job[el.dataset.field] ?? NOT_LISTED[el.dataset.field] ?? "";
  }

  // Green fits the quiz answers, blue doesn't, gray wasn't listed.
  for (const tag of card.querySelectorAll(".tag")) {
    const field = tag.dataset.field;
    const unknown = job[field] == null;
    tag.classList.toggle("tag--unknown", unknown);
    tag.classList.toggle("tag--fit", !unknown && job.fits?.[field] === true);
  }

  // The title opens the real posting. The extension (if installed) notes which
  // job was opened, to recognize the application afterwards.
  const link = card.querySelector(".card__link");
  if (job.url) link.href = job.url;
  else link.removeAttribute("target");
  link.addEventListener("click", () => {
    window.postMessage({ source: "new-openings-site", type: "opened-job", jobId: job.id }, location.origin);
  });

  // Green "Applied" bar above the card, with Undo.
  const applied = card.querySelector(".card__applied");
  applied.hidden = job.status !== "applied";
  card.classList.toggle("is-applied", job.status === "applied");
  const undo = card.querySelector(".card__undo");
  undo.setAttribute("aria-label", `Undo applied for ${job.title}`);
  undo.addEventListener("click", async () => {
    const ok = await setStatus(job, "saved");
    applied.hidden = job.status !== "applied";
    card.classList.toggle("is-applied", job.status === "applied");
  });

  const match = card.querySelector(".match");
  const arc = card.querySelector(".match__arc");
  match.classList.add(matchLevel(job.match));
  match.setAttribute("aria-label", `${job.match}% match`);
  card.querySelector(".match__percent").textContent = `${job.match}%`;
  arc.style.strokeDasharray = ARC_LENGTH;
  arc.style.strokeDashoffset = ARC_LENGTH;
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      arc.style.strokeDashoffset = ARC_LENGTH * (1 - job.match / 100);
    })
  );

  const remove = card.querySelector(".card__remove");
  remove.setAttribute("aria-label", `Remove ${job.title} from your list`);
  remove.addEventListener("click", async () => {
    card.classList.add("is-leaving");
    const ok = await removeSaved(job);
    if (!ok) {
      // Put it back if the database refused.
      savedJobs.push(job);
      loadError = "That job couldn’t be removed. Try again.";
    }
    render();
  });

  return card;
}

function renderEmpty() {
  const empty = emptyTemplate.content.firstElementChild.cloneNode(true);
  if (loadError) {
    empty.querySelector(".empty__title").textContent = "Something went wrong";
    empty.querySelector(".empty__body").textContent = loadError;
  } else if (savedJobs.length && typeFilter === "Any") {
    // Something is saved, but the other filters hide it all.
    empty.querySelector(".empty__title").textContent = "No saved jobs match";
    empty.querySelector(".empty__body").textContent = "Try changing or clearing the filters above.";
  } else if (savedJobs.length && typeFilter !== "Any") {
    // Something is saved, but not of the chosen type.
    empty.querySelector(".empty__title").textContent =
      typeFilter === "Internship" ? "No internships saved" : "No full-time jobs saved";
    empty.querySelector(".empty__body").textContent = "Set Type to “Any” to see everything on your list.";
  }
  return empty;
}

// ---------- Sort and filters ----------

const FILTERS_KEY = "savedJobsFilters";
const controls = {
  sort: document.getElementById("sort"),
  setting: document.getElementById("setting"),
  field: document.getElementById("field"),
  location: document.getElementById("location")
};
const payToggle = document.getElementById("pay-toggle");

let filters = { sort: "match", setting: "", field: "", location: "", meetsPay: false };
try {
  filters = { ...filters, ...JSON.parse(localStorage.getItem(FILTERS_KEY)) };
} catch {}

function saveFilters() {
  try {
    localStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
  } catch {}
}

// "$54,400-$70,500/yr" → 54400; "$22-$25/hr" → 22 × 2080 hours. No pay → -1 (last).
function yearlyPay(pay) {
  const amount = Number(String(pay ?? "").match(/[\d,.]+/)?.[0]?.replace(/,/g, ""));
  if (!amount) return -1;
  return /hr|hour/i.test(pay) ? amount * 2080 : /k\b/i.test(pay) ? amount * 1000 : amount;
}

// "Kansas City, Missouri" → "Missouri"; "Remote" stays "Remote".
function placeOf(job) {
  const location = job.location?.trim();
  if (!location) return "";
  return location.split(",").pop().trim();
}

// Field and Location choices come from what's actually saved.
function fillChoices(select, values, label) {
  const current = filters[select.id];
  const options = [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  if (current && !options.includes(current)) options.push(current);
  select.replaceChildren(
    new Option(`${label}: Any`, ""),
    ...options.map((value) => new Option(value, value))
  );
  select.value = current;
}

function syncControls() {
  fillChoices(controls.field, savedJobs.map((job) => job.field), "Field");
  fillChoices(controls.location, savedJobs.map(placeOf), "Location");
  for (const [key, select] of Object.entries(controls)) {
    select.value = filters[key];
    select.classList.toggle("is-on", key !== "sort" && Boolean(filters[key]));
  }
  payToggle.setAttribute("aria-pressed", String(filters.meetsPay));
}

for (const [key, select] of Object.entries(controls)) {
  select.addEventListener("change", () => {
    filters[key] = select.value;
    saveFilters();
    syncControls();
    render();
  });
}

payToggle.addEventListener("click", () => {
  filters.meetsPay = !filters.meetsPay;
  saveFilters();
  syncControls();
  render();
});

const SORTS = {
  match: (a, b) => b.match - a.match,
  newest: (a, b) => (b.savedAt ?? "").localeCompare(a.savedAt ?? "") || a.order - b.order,
  pay: (a, b) => yearlyPay(b.pay) - yearlyPay(a.pay) || b.match - a.match,
  company: (a, b) => (a.company ?? "").localeCompare(b.company ?? "")
};

function render() {
  // Jobs whose type wasn't listed only show under "Any".
  const jobs = savedJobs
    .map((job, order) => ({ job, order, savedAt: job.savedAt, match: job.match, pay: job.pay, company: job.company }))
    .filter(({ job }) => typeFilter === "Any" || job.type === typeFilter)
    .filter(({ job }) => !filters.setting || job.setting === filters.setting)
    .filter(({ job }) => !filters.field || job.field === filters.field)
    .filter(({ job }) => !filters.location || placeOf(job) === filters.location)
    // Meets My Pay: the pay tag was green (fits the quiz's minimum) when saved.
    .filter(({ job }) => !filters.meetsPay || job.fits?.pay === true)
    .sort(SORTS[filters.sort] ?? SORTS.match)
    .map(({ job }) => job);
  grid.replaceChildren(...(jobs.length ? jobs.map(renderCard) : [renderEmpty()]));
}

// ---------- Type dropdown: Full-Time / Internship / Any ----------

const typeSelect = document.getElementById("type");

function syncFilter() {
  typeSelect.value = typeFilter;
  typeSelect.classList.toggle("is-on", typeFilter !== "Any");
}

typeSelect.addEventListener("change", () => {
  typeFilter = typeSelect.value;
  try {
    localStorage.setItem(FILTER_KEY, typeFilter);
  } catch {}
  syncFilter();
  render();
});

// ---------- Start: check sign-in, then load the list ----------

syncFilter();

let signedIn = false;
if (!DEMO) {
  const { data } = await supabase.auth.getSession();
  signedIn = Boolean(data.session);
  if (!signedIn) {
    location.replace("signin.html");
  } else {
    document.getElementById("account").hidden = false;
    document.getElementById("account-name").textContent = displayName(data.session.user);
    document.getElementById("sign-out").addEventListener("click", async () => {
      await supabase.auth.signOut();
      location.replace("signin.html");
    });
  }
}

if (DEMO || signedIn) {
  savedJobs = await loadSaved();
  syncControls();
  render();
}
