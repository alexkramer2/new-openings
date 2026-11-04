import { QUESTIONS } from "../data/quiz-questions.js";
import { FIELDS, ANY_ROLE, OTHER_FIELD } from "../data/fields.js";
import { SKILLS, GENERAL_SKILLS } from "../data/skills.js";
import { getQuizProgress, saveQuizProgress } from "../lib/store.js";
import { searchPlaces, currentPlace, userPlaces } from "../lib/places.js";

const screens = {
  welcome: document.getElementById("welcome"),
  question: document.getElementById("question"),
  done: document.getElementById("done")
};
const stepsEl = document.getElementById("steps");
const titleEl = document.getElementById("question-title");
const descriptionEl = document.getElementById("question-description");
const answerEl = document.getElementById("answer");
const errorEl = document.getElementById("error");
const backButton = document.getElementById("back");
const nextButton = document.getElementById("next");

let answers = {};
let current = 0; // index into QUESTIONS

// ---------- Layout: zoom the 1728 × 1117 Figma frame to fit the window ----------

function fitStage() {
  const scale = Math.min(window.innerWidth / 1728, window.innerHeight / 1117);
  document.documentElement.style.zoom = String(Math.min(scale, 1.25));
}
window.addEventListener("resize", fitStage);
fitStage();

// ---------- Screens ----------

function show(name) {
  for (const [key, el] of Object.entries(screens)) el.hidden = key !== name;
}

function goTo(index) {
  current = index;
  show("question");
  renderQuestion();
  saveQuizProgress(answers, current);
}

async function finish() {
  show("done");
  await saveQuizProgress(answers, QUESTIONS.length);
  // Look for jobs that match the new answers right away.
  if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
    chrome.runtime.sendMessage({ type: "check-now" }).catch(() => {});
  }
}

// ---------- Answer helpers ----------

const PICK_A_DATE = "Pick a Date";
const hasText = (value) => typeof value === "string" && value.trim() !== "";
const hasItems = (value) => Array.isArray(value) && value.length > 0;

function isAnswered(question) {
  const value = answers[question.id];
  switch (question.type) {
    case "multi":
      return hasItems(value);
    case "single":
      return hasText(value);
    case "dropdown":
      return hasText(value) && (value !== OTHER_FIELD || hasText(answers.otherField));
    case "roles":
      return answers.field === OTHER_FIELD ? hasText(answers.otherRoles) : hasItems(value);
    case "skills":
      return hasItems(value) || hasText(answers.otherSkills);
    case "text":
      return question.optional ? value !== undefined : hasText(value);
    case "places":
      return userPlaces(answers).length > 0;
    case "pay":
      return value?.amount > 0 && Boolean(value.per);
    case "date":
      return Boolean(value?.when) && (value.when !== PICK_A_DATE || Boolean(value.date));
    case "ranking":
      return hasItems(value);
    default:
      return false;
  }
}

function errorMessage(question) {
  const value = answers[question.id];
  switch (question.type) {
    case "single":
      return "Select one";
    case "dropdown":
      return answers.field === OTHER_FIELD ? "Type the field you want to work in" : "Select a field";
    case "roles":
      return answers.field === OTHER_FIELD ? "Type at least one role" : "Select at least one";
    case "text":
      return question.error ?? "Type an answer";
    case "places":
      return "Add at least one location";
    case "pay":
      return value?.amount > 0 ? "Select per year or per hour" : "Enter an amount";
    case "date":
      return value?.when === PICK_A_DATE ? "Pick a date" : "Select one";
    default:
      return "Select at least one";
  }
}

function clearError() {
  errorEl.textContent = "";
}

function changed() {
  clearError();
  saveQuizProgress(answers, current);
}

// ---------- Step list ----------

function renderSteps() {
  const template = document.getElementById("step-item");
  stepsEl.replaceChildren(
    ...QUESTIONS.map((question, i) => {
      const item = template.content.firstElementChild.cloneNode(true);
      item.querySelector(".step__number").textContent = `${i + 1}.`;
      item.querySelector(".step__label").textContent = question.label;

      const isCurrent = i === current;
      const isComplete = !isCurrent && isAnswered(question);
      item.classList.toggle("is-current", isCurrent);
      item.classList.toggle("is-complete", isComplete);
      if (isCurrent) item.setAttribute("aria-current", "step");

      // Answered questions can be clicked to jump back to them.
      if (isComplete) {
        const jump = document.createElement("button");
        jump.type = "button";
        jump.className = "step__jump";
        jump.append(...item.childNodes);
        jump.addEventListener("click", () => goTo(i));
        item.append(jump);
      }
      return item;
    })
  );
}

// ---------- Building blocks (styles from the Figma components) ----------

// Grid of option boxes. `single` allows one pick; `exclusive` is an option
// (like "None") that can't be combined with the others.
function optionGrid(options, selected, onChange, { single = false, exclusive } = {}) {
  const grid = document.createElement("div");
  grid.className = options.length > 4 ? "options options--compact" : "options";
  grid.setAttribute("role", single ? "radiogroup" : "group");

  const sync = () => {
    for (const box of grid.children) {
      const on = selected.includes(box.textContent);
      box.setAttribute(single ? "aria-checked" : "aria-pressed", String(on));
    }
  };

  for (const option of options) {
    const box = document.createElement("button");
    box.type = "button";
    box.className = "option";
    box.textContent = option;
    if (single) box.setAttribute("role", "radio");
    box.addEventListener("click", () => {
      if (single) {
        selected = [option];
      } else {
        selected = selected.includes(option)
          ? selected.filter((o) => o !== option)
          : [...selected, option];
        if (exclusive && selected.includes(exclusive)) {
          selected = option === exclusive ? [exclusive] : selected.filter((o) => o !== exclusive);
        }
      }
      sync();
      onChange(selected);
    });
    grid.append(box);
  }
  sync();
  return grid;
}

function textInput(value, placeholder, onInput, attrs = {}) {
  const input = document.createElement("input");
  input.type = "text";
  input.className = "text-input";
  input.value = value ?? "";
  input.placeholder = placeholder;
  input.setAttribute("aria-label", placeholder);
  Object.assign(input, attrs);
  input.addEventListener("input", () => onInput(input.value));
  return input;
}

function dropdown(options, value, onChange) {
  const wrapper = document.createElement("div");
  wrapper.className = "dropdown";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "dropdown__button";
  button.setAttribute("aria-haspopup", "listbox");
  button.setAttribute("aria-expanded", "false");

  const label = document.createElement("span");
  label.className = "dropdown__value";
  const chevron = document.createElement("img");
  chevron.className = "dropdown__chevron";
  chevron.src = "../assets/icon-chevron.svg";
  chevron.width = 19.4142;
  chevron.height = 11.1213;
  chevron.alt = "";
  button.append(label, chevron);

  const list = document.createElement("ul");
  list.className = "dropdown__list";
  list.setAttribute("role", "listbox");
  list.id = "dropdown-list";
  list.hidden = true;
  button.setAttribute("aria-controls", list.id);

  const items = options.map((option, i) => {
    const item = document.createElement("li");
    item.className = "dropdown__option";
    item.id = `dropdown-option-${i}`;
    item.setAttribute("role", "option");
    item.setAttribute("aria-selected", String(option === value));
    const text = document.createElement("span");
    text.textContent = option;
    item.append(text);
    item.addEventListener("mouseenter", () => setActive(i));
    item.addEventListener("click", () => choose(i));
    list.append(item);
    return item;
  });

  let active = Math.max(0, options.indexOf(value));

  function setLabel() {
    label.textContent = value || "Select Option";
    label.classList.toggle("is-placeholder", !value);
  }

  function setActive(i) {
    active = i;
    items.forEach((item, j) => item.classList.toggle("is-active", j === i));
    button.setAttribute("aria-activedescendant", items[i].id);
    items[i].scrollIntoView({ block: "nearest" });
  }

  function open() {
    list.hidden = false;
    wrapper.classList.add("is-open");
    button.setAttribute("aria-expanded", "true");
    setActive(active);
    document.addEventListener("click", closeOnOutsideClick, true);
  }

  function close() {
    list.hidden = true;
    wrapper.classList.remove("is-open");
    button.setAttribute("aria-expanded", "false");
    button.removeAttribute("aria-activedescendant");
    document.removeEventListener("click", closeOnOutsideClick, true);
  }

  function closeOnOutsideClick(event) {
    if (!wrapper.contains(event.target)) close();
  }

  function choose(i) {
    value = options[i];
    items.forEach((item, j) => item.setAttribute("aria-selected", String(j === i)));
    setLabel();
    close();
    button.focus();
    onChange(value);
  }

  button.addEventListener("click", () => (list.hidden ? open() : close()));
  button.addEventListener("keydown", (event) => {
    const isOpen = !list.hidden;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) return open();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive(Math.min(options.length - 1, Math.max(0, active + step)));
    } else if ((event.key === "Enter" || event.key === " ") && isOpen) {
      event.preventDefault();
      choose(active);
    } else if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      close();
    }
  });

  setLabel();
  wrapper.append(button, list);
  return wrapper;
}

// City search: type, pick a suggestion, and it becomes a chip. Up to `max` places.
function placesPicker(places, { placeholder, max }, onChange) {
  const wrapper = document.createElement("div");
  wrapper.className = "places";

  const search = document.createElement("div");
  search.className = "dropdown places__search";
  const input = document.createElement("input");
  input.type = "text";
  input.className = "text-input places__input";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-label", "Search for a city");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("aria-controls", "place-list");
  const list = document.createElement("ul");
  list.className = "dropdown__list";
  list.id = "place-list";
  list.setAttribute("role", "listbox");
  list.hidden = true;
  search.append(input, list);

  const here = document.createElement("button");
  here.type = "button";
  here.className = "places__here";
  here.innerHTML = '<img src="../assets/icon-location.svg" width="15" height="19.57" alt="" /><span>Use My Current Location</span>';

  const status = document.createElement("p");
  status.className = "places__status";
  status.setAttribute("aria-live", "polite");

  const chips = document.createElement("ul");
  chips.className = "places__chips";
  chips.setAttribute("aria-label", "Your locations");

  let suggestions = [];
  let active = -1;
  let timer;
  let request;

  function renderChips() {
    chips.replaceChildren(
      ...places.map((place) => {
        const chip = document.createElement("li");
        chip.className = "place-chip";
        const name = document.createElement("span");
        name.textContent = place.name;
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "place-chip__remove";
        remove.setAttribute("aria-label", `Remove ${place.name}`);
        remove.textContent = "✕";
        remove.addEventListener("click", () => {
          places = places.filter((p) => p.name !== place.name);
          update();
          input.focus();
        });
        chip.append(name, remove);
        return chip;
      })
    );
    const full = places.length >= max;
    input.disabled = full;
    here.disabled = full;
    input.placeholder = full ? `That’s the limit of ${max} locations` : placeholder;
  }

  function update() {
    renderChips();
    onChange(places);
  }

  function add(place) {
    if (places.some((p) => p.name === place.name)) {
      status.textContent = `${place.name} is already on your list`;
    } else if (places.length < max) {
      places = [...places, place];
      status.textContent = "";
      update();
    }
    input.value = "";
    close();
    if (!input.disabled) input.focus();
  }

  function close() {
    list.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    active = -1;
  }

  function setActive(i) {
    active = i;
    [...list.children].forEach((item, j) => item.classList.toggle("is-active", j === i));
    if (i >= 0) {
      input.setAttribute("aria-activedescendant", list.children[i].id);
      list.children[i].scrollIntoView({ block: "nearest" });
    }
  }

  function showSuggestions(results) {
    suggestions = results;
    list.replaceChildren(
      ...results.map((place, i) => {
        const item = document.createElement("li");
        item.className = "dropdown__option";
        item.id = `place-option-${i}`;
        item.setAttribute("role", "option");
        const text = document.createElement("span");
        text.textContent = place.name;
        item.append(text);
        item.addEventListener("mouseenter", () => setActive(i));
        item.addEventListener("mousedown", (event) => event.preventDefault()); // keep focus in the box
        item.addEventListener("click", () => add(place));
        return item;
      })
    );
    list.hidden = results.length === 0;
    input.setAttribute("aria-expanded", String(results.length > 0));
    setActive(results.length ? 0 : -1);
  }

  input.addEventListener("input", () => {
    clearTimeout(timer);
    request?.abort();
    status.textContent = "";
    const text = input.value;
    if (text.trim().length < 2) return close();
    // Wait for a pause in typing before searching.
    timer = setTimeout(async () => {
      request = new AbortController();
      try {
        const results = await searchPlaces(text, { signal: request.signal });
        showSuggestions(results);
        if (!results.length) status.textContent = "No US cities match that. Check the spelling?";
      } catch (error) {
        if (error.name !== "AbortError") status.textContent = "City search isn’t working right now. Try again in a moment.";
      }
    }, 250);
  });

  input.addEventListener("keydown", (event) => {
    if (list.hidden) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive(Math.min(suggestions.length - 1, Math.max(0, active + step)));
    } else if (event.key === "Enter" && active >= 0) {
      event.preventDefault();
      add(suggestions[active]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  });
  input.addEventListener("blur", close);

  here.addEventListener("click", async () => {
    here.disabled = true;
    status.textContent = "Finding your location…";
    try {
      add(await currentPlace());
    } catch (error) {
      status.textContent = `${error.message}. You can search for your city instead.`;
    }
    here.disabled = places.length >= max;
  });

  renderChips();
  wrapper.append(search, here, status, chips);
  return wrapper;
}

// Drag to reorder, with up/down buttons for keyboard users.
function rankingList(order, onChange) {
  const list = document.createElement("ol");
  list.className = "ranking";
  let dragged = null;

  function render() {
    list.replaceChildren(
      ...order.map((item, i) => {
        const row = document.createElement("li");
        row.className = "ranking__item";
        row.draggable = true;
        row.dataset.item = item;

        const number = document.createElement("span");
        number.className = "ranking__number";
        number.textContent = `${i + 1}.`;
        const label = document.createElement("span");
        label.className = "ranking__label";
        label.textContent = item;
        const handle = document.createElement("span");
        handle.className = "ranking__handle";
        handle.setAttribute("aria-hidden", "true");

        const up = moveButton("up", item, i === 0, () => move(i, i - 1));
        const down = moveButton("down", item, i === order.length - 1, () => move(i, i + 1));

        row.append(number, label, up, down, handle);
        row.addEventListener("dragstart", (event) => {
          dragged = item;
          row.classList.add("is-dragging");
          event.dataTransfer.effectAllowed = "move";
        });
        row.addEventListener("dragend", () => {
          dragged = null;
          row.classList.remove("is-dragging");
        });
        row.addEventListener("dragover", (event) => {
          event.preventDefault();
          if (!dragged || dragged === item) return;
          move(order.indexOf(dragged), order.indexOf(item));
        });
        return row;
      })
    );
  }

  function moveButton(direction, item, disabled, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `ranking__move ranking__move--${direction}`;
    button.setAttribute("aria-label", `Move ${item} ${direction}`);
    button.disabled = disabled;
    const icon = document.createElement("img");
    icon.src = "../assets/icon-chevron.svg";
    icon.width = 19.4142;
    icon.height = 11.1213;
    icon.alt = "";
    button.append(icon);
    button.addEventListener("click", () => {
      onClick();
      // Keep focus on the item that moved (on its other button if it hit the end).
      const row = list.querySelector(`[data-item="${CSS.escape(item)}"]`);
      const same = row.querySelector(`.ranking__move--${direction}`);
      (same.disabled ? row.querySelector(".ranking__move:not(:disabled)") : same).focus();
    });
    return button;
  }

  function move(from, to) {
    if (to < 0 || to >= order.length || from === to) return;
    order = [...order];
    order.splice(to, 0, order.splice(from, 1)[0]);
    render();
    onChange(order);
  }

  render();
  return list;
}

// ---------- Render the current question ----------

function renderQuestion() {
  const question = QUESTIONS[current];
  titleEl.textContent = question.title;
  descriptionEl.textContent = question.description;
  backButton.classList.toggle("is-hidden", current === 0); // no Back on question 1
  nextButton.textContent = current === QUESTIONS.length - 1 ? "Finish" : "Next";
  clearError();

  // Ranking always has an order, so save the starting one right away.
  if (question.type === "ranking" && !hasItems(answers.ranking)) {
    answers.ranking = [...question.options];
  }
  renderSteps();

  const field = answers.field;
  const set = (key) => (value) => {
    answers[key] = value;
    changed();
  };

  switch (question.type) {
    case "multi":
      answerEl.replaceChildren(
        optionGrid(question.options, answers[question.id] ?? [], set(question.id), {
          exclusive: question.exclusive
        })
      );
      break;

    case "single":
      answerEl.replaceChildren(
        optionGrid(question.options, [answers[question.id]].filter(Boolean), (picked) => set(question.id)(picked[0]), {
          single: true
        })
      );
      break;

    case "dropdown": {
      const otherBox = textInput(answers.otherField, "Type your field", set("otherField"));
      otherBox.hidden = field !== OTHER_FIELD;
      const select = dropdown(Object.keys(FIELDS), field, (picked) => {
        // A new field means the old roles and skills no longer apply.
        if (picked !== answers.field) {
          answers.roles = [];
          answers.skills = [];
        }
        answers.field = picked;
        otherBox.hidden = picked !== OTHER_FIELD;
        if (!otherBox.hidden) otherBox.focus();
        changed();
      });
      answerEl.replaceChildren(select, otherBox);
      break;
    }

    case "roles":
      if (!field) return goTo(QUESTIONS.findIndex((q) => q.type === "dropdown"));
      if (field === OTHER_FIELD) {
        descriptionEl.textContent = "Type the roles you’re looking for, separated by commas.";
        answerEl.replaceChildren(textInput(answers.otherRoles, "Roles, separated by commas", set("otherRoles")));
      } else {
        answerEl.replaceChildren(
          optionGrid([...FIELDS[field], ANY_ROLE], answers.roles ?? [], set("roles"), { exclusive: ANY_ROLE })
        );
      }
      break;

    case "skills": {
      const options = SKILLS[field] ?? GENERAL_SKILLS;
      answerEl.replaceChildren(
        optionGrid(options, answers.skills ?? [], set("skills")),
        textInput(answers.otherSkills, question.placeholder, set("otherSkills"))
      );
      break;
    }

    case "text":
      answerEl.replaceChildren(textInput(answers[question.id], question.placeholder, set(question.id)));
      break;

    case "places":
      // Older answers had one typed-in location; carry it over as a chip.
      answerEl.replaceChildren(
        placesPicker(userPlaces(answers), question, (places) => {
          answers.locations = places;
          delete answers.location;
          changed();
        })
      );
      break;

    case "pay": {
      const pay = { amount: 0, per: "yearly", ...answers.minPay };
      const PER = { "Per Year": "yearly", "Per Hour": "hourly" };
      const amount = textInput(pay.amount ? pay.amount.toLocaleString() : "", question.placeholder, (text) => {
        pay.amount = Number(text.replace(/[^\d.]/g, "")) || 0;
        set("minPay")({ ...pay });
      }, { inputMode: "decimal" });
      amount.classList.add("text-input--money");
      const money = document.createElement("label");
      money.className = "money";
      money.append(amount);
      const per = optionGrid(Object.keys(PER), [Object.keys(PER).find((k) => PER[k] === pay.per)], (picked) => {
        pay.per = PER[picked[0]];
        set("minPay")({ ...pay });
        amount.placeholder = pay.per === "hourly" ? "20" : question.placeholder;
      }, { single: true });
      per.classList.add("options--toggle");
      answerEl.replaceChildren(money, per);
      break;
    }

    case "date": {
      const start = { ...answers.startDate };
      const picker = document.createElement("input");
      picker.type = "date";
      picker.className = "text-input";
      picker.setAttribute("aria-label", "Start date");
      picker.min = new Date().toISOString().slice(0, 10);
      picker.value = start.date ?? "";
      picker.hidden = start.when !== PICK_A_DATE;
      picker.addEventListener("input", () => {
        start.date = picker.value;
        set("startDate")({ ...start });
      });
      const grid = optionGrid(question.options, [start.when].filter(Boolean), (picked) => {
        start.when = picked[0];
        picker.hidden = start.when !== PICK_A_DATE;
        if (!picker.hidden) picker.focus();
        set("startDate")({ ...start });
      }, { single: true });
      answerEl.replaceChildren(grid, picker);
      break;
    }

    case "ranking":
      answerEl.replaceChildren(rankingList(answers.ranking, set("ranking")));
      break;
  }
}

// ---------- Navigation ----------

document.getElementById("start").addEventListener("click", () => goTo(0));
document.getElementById("edit").addEventListener("click", () => goTo(0));

backButton.addEventListener("click", () => {
  if (current > 0) goTo(current - 1);
});

nextButton.addEventListener("click", () => {
  const question = QUESTIONS[current];
  // Skipping an optional question still counts as answering it.
  if (question.optional && answers[question.id] === undefined) answers[question.id] = "";
  if (!isAnswered(question)) {
    errorEl.textContent = errorMessage(question);
    return;
  }
  if (current < QUESTIONS.length - 1) goTo(current + 1);
  else finish();
});

// ---------- Start: resume where the user left off ----------

const progress = await getQuizProgress();
answers = progress.answers;
const editing = new URLSearchParams(location.search).has("edit"); // opened from the popup's ⚙
if (editing) goTo(0);
else if (progress.step >= QUESTIONS.length) show("done");
else if (progress.step >= 0) goTo(progress.step);
else show("welcome");
