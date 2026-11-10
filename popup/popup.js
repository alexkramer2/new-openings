import {
  getVisibleJobs,
  getMatchAnswers,
  getSources,
  saveSources,
  markSeen,
  clearJob,
  updateBadge,
  POPUP_LIMIT
} from "../lib/store.js";
import { tagFits, matchScore } from "../lib/fit.js";

const isExtension = typeof chrome !== "undefined" && Boolean(chrome.runtime?.id);

const list = document.getElementById("job-list");
const cardTemplate = document.getElementById("job-card");
const emptyTemplate = document.getElementById("empty-state");

const ARC_LENGTH = 2 * Math.PI * 29; // circumference of the match arc (r = 29)

// Shown in gray when a job site doesn't say.
const NOT_LISTED = { type: "Type not listed", field: "Field not listed", setting: "Setting not listed", pay: "Pay not listed" };

function matchLevel(percent) {
  if (percent > 75) return "is-high";
  if (percent >= 60) return "is-medium";
  return "is-low";
}

function renderCard(job, index, answers) {
  const card = cardTemplate.content.firstElementChild.cloneNode(true);
  card.style.animationDelay = `${Math.min(index, 8) * 60}ms`;

  // textContent (not innerHTML) so text from job sites can't inject markup
  for (const el of card.querySelectorAll("[data-field]")) {
    el.textContent = job[el.dataset.field] ?? NOT_LISTED[el.dataset.field] ?? "";
  }

  // The title opens the real posting in a new tab.
  const link = card.querySelector(".card__link");
  if (job.url) link.href = job.url;
  else link.removeAttribute("target");

  if (job.source) card.querySelector(".card__source").textContent = `via ${job.source}`;

  // Green tags fit the quiz answers, blue ones don't, gray ones weren't listed.
  const fits = tagFits(job, answers);
  for (const tag of card.querySelectorAll(".tag")) {
    const field = tag.dataset.field;
    const unknown = job[field] == null;
    tag.classList.toggle("tag--unknown", unknown);
    tag.classList.toggle("tag--fit", !unknown && fits[field]);
  }

  const match = card.querySelector(".match");
  const arc = card.querySelector(".match__arc");
  match.classList.add(matchLevel(job.match));
  match.setAttribute("aria-label", `${job.match}% match`);
  card.querySelector(".match__percent").textContent = `${job.match}%`;
  arc.style.strokeDasharray = ARC_LENGTH;
  arc.style.strokeDashoffset = ARC_LENGTH;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      arc.style.strokeDashoffset = ARC_LENGTH * (1 - job.match / 100);
    });
  });

  // Saving jobs isn't built yet, so say so instead of doing nothing.
  const add = card.querySelector(".card__add");
  add.addEventListener("click", () => {
    add.textContent = "Coming Soon";
    setTimeout(() => (add.textContent = "Add to List"), 1500);
  });

  card.querySelector(".card__clear").addEventListener("click", async () => {
    card.classList.add("is-leaving");
    await clearJob(job.id);
    await updateBadge();
    card.addEventListener(
      "animationend",
      () => {
        card.remove();
        if (!list.querySelector(".card")) showEmpty();
      },
      { once: true }
    );
  });

  return card;
}

// ---------- Views: job list, Settings (⚙), Saved Jobs, Job Sources ----------

const views = {
  jobs: document.getElementById("view-jobs"),
  settings: document.getElementById("view-settings"),
  saved: document.getElementById("view-saved"),
  sources: document.getElementById("view-sources")
};

function showView(name) {
  for (const [key, el] of Object.entries(views)) el.hidden = key !== name;
  views[name].querySelector("button")?.focus();
  if (name === "sources") renderSources();
}

document.getElementById("settings").addEventListener("click", () => showView("settings"));
for (const button of document.querySelectorAll("[data-go]")) {
  button.addEventListener("click", () => showView(button.dataset.go));
}

// Retake Quiz opens the quiz in a new tab, at question 1 with the saved answers.
document.getElementById("retake-quiz").addEventListener("click", () => {
  if (isExtension) {
    chrome.tabs.create({ url: chrome.runtime.getURL("quiz/quiz.html?edit") });
    window.close();
  } else {
    window.open("../quiz/quiz.html?edit", "_blank");
  }
});

// ---------- Job Sources ----------

const LIMITS = { muse: 2500, adzuna: 250, jsearch: 100 }; // matches lib/checker.js
const form = document.getElementById("sources-form");
const checkButton = document.getElementById("check-now");
const checkResult = document.getElementById("check-result");

function timeAgo(iso) {
  const minutes = Math.round((Date.now() - new Date(iso)) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours} hr ago` : `${Math.round(hours / 24)} days ago`;
}

async function renderSources() {
  const { keys, status, usage } = await getSources();
  for (const input of form.querySelectorAll("input")) input.value = keys[input.name] ?? "";
  for (const box of form.querySelectorAll(".source")) {
    const id = box.dataset.source;
    const s = status[id];
    const line = box.querySelector(".source__status");
    const used = `${usage[id] ?? 0} of ${LIMITS[id]} checks used this month`;
    if (s?.ok) line.textContent = `Connected · checked ${timeAgo(s.checkedAt)} · ${s.found} found · ${used}`;
    else if (s?.message) line.textContent = `${s.message}${s.checkedAt ? ` · ${used}` : ""}`;
    else line.textContent = id === "muse" ? "Waiting for the first check" : "Add a key to turn this on";
    line.classList.toggle("is-error", Boolean(s && !s.ok && s.checkedAt));
    line.classList.toggle("is-ok", Boolean(s?.ok));
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const keys = Object.fromEntries([...form.querySelectorAll("input")].map((i) => [i.name, i.value.trim()]));
  await saveSources({ keys });
  checkButton.disabled = true;
  checkResult.textContent = "Checking…";
  // In the extension the background worker checks; in a plain browser preview
  // the popup runs the check itself.
  const result = isExtension
    ? await chrome.runtime.sendMessage({ type: "check-now" })
    : await (await import("../lib/checker.js")).checkForJobs({ force: true }).catch((e) => ({ error: e.message }));
  checkButton.disabled = false;
  checkResult.textContent = result?.error
    ? `Something went wrong: ${result.error}`
    : `${result.added} new ${result.added === 1 ? "opening" : "openings"} found`;
  await renderSources();
  await renderJobs();
});

// ---------- Full-Time / Internship / Any toggle ----------

const FILTER_KEY = "popupTypeFilter";
const filterButtons = [...document.querySelectorAll(".type-filter__option")];
let typeFilter = "Any";
try {
  typeFilter = localStorage.getItem(FILTER_KEY) ?? "Any"; // remembered between popups
} catch {}

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
    renderJobs();
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
syncFilter();

// ---------- Job list ----------

const EMPTY_FOR = {
  "Full-Time": "No full-time openings right now",
  Internship: "No internships right now"
};

function showEmpty() {
  const empty = emptyTemplate.content.cloneNode(true);
  if (EMPTY_FOR[typeFilter]) {
    empty.querySelector(".empty__title").textContent = EMPTY_FOR[typeFilter];
    empty.querySelector(".empty__body").textContent = "Try “Any” to see every opening, or check back later.";
  }
  list.replaceChildren(empty);
}

async function renderJobs() {
  const [visible, answers] = await Promise.all([getVisibleJobs(), getMatchAnswers()]);
  // Jobs whose type wasn't listed only show under "Any".
  const jobs = visible
    .filter((job) => typeFilter === "Any" || job.type === typeFilter)
    .map((job) => ({ ...job, match: matchScore(job, answers) }))
    .sort((a, b) => b.match - a.match) // best matches first; low matches still show, at the bottom
    .slice(0, POPUP_LIMIT);
  if (jobs.length === 0) showEmpty();
  else list.replaceChildren(...jobs.map((job, i) => renderCard(job, i, answers)));
  return jobs;
}

async function init() {
  const jobs = await renderJobs();
  // Opening the popup counts as seeing these openings, so the badge clears.
  await markSeen(jobs.map((job) => job.id));
  await updateBadge();
}

init();
