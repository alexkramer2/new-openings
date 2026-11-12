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
const filterButtons = [...document.querySelectorAll(".type-filter__option")];

// ---------- Saved jobs ----------

let savedJobs = [];
let loadError = "";

// Each row's `job` is the card as the extension showed it when it was saved
// (including match % and tag colors); `rowId` is kept so it can be removed.
async function loadSaved() {
  if (DEMO) return params.has("empty") ? [] : SAMPLE_SAVED_JOBS;
  const { data, error } = await supabase
    .from("saved_jobs")
    .select("id, job, saved_at")
    .order("saved_at", { ascending: false });
  if (error) {
    loadError = "Your saved jobs couldn’t load. Refresh the page to try again.";
    return [];
  }
  return data.map((row) => ({ ...row.job, rowId: row.id }));
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

  // The title opens the real posting.
  const link = card.querySelector(".card__link");
  if (job.url) link.href = job.url;
  else link.removeAttribute("target");

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
  } else if (savedJobs.length && typeFilter !== "Any") {
    // Something is saved, but not of the chosen type.
    empty.querySelector(".empty__title").textContent =
      typeFilter === "Internship" ? "No internships saved" : "No full-time jobs saved";
    empty.querySelector(".empty__body").textContent = "Choose “Any” to see everything on your list.";
  }
  return empty;
}

function render() {
  // Best matches first. Jobs whose type wasn't listed only show under "Any".
  const jobs = savedJobs
    .filter((job) => typeFilter === "Any" || job.type === typeFilter)
    .sort((a, b) => b.match - a.match);
  grid.replaceChildren(...(jobs.length ? jobs.map(renderCard) : [renderEmpty()]));
}

// ---------- Full-Time / Internship / Any toggle ----------

function syncFilter() {
  for (const button of filterButtons) {
    const on = button.dataset.type === typeFilter;
    button.setAttribute("aria-checked", String(on));
    button.tabIndex = on ? 0 : -1;
  }
}

for (const button of filterButtons) {
  button.addEventListener("click", () => {
    typeFilter = button.dataset.type;
    try {
      localStorage.setItem(FILTER_KEY, typeFilter);
    } catch {}
    syncFilter();
    render();
  });
}

// Arrow keys move between the three options, like other radio groups.
document.getElementById("type-filter").addEventListener("keydown", (event) => {
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
  if (!step) return;
  event.preventDefault();
  const i = filterButtons.findIndex((b) => b.dataset.type === typeFilter);
  const next = filterButtons[(i + step + filterButtons.length) % filterButtons.length];
  next.click();
  next.focus();
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
  render();
}
