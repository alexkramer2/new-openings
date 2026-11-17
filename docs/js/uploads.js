// Uploads page (Figma node 56:143): Resume, Cover Letter and Portfolio uploads,
// plus Website and LinkedIn links. For now only the file NAMES and the links
// are remembered, in this browser (localStorage). Saving the files online comes later.
//   ?demo – skip the sign-in check, for design reviews
import { supabase, displayName } from "./supabase-client.js";

const STORE_KEY = "uploads";
const DEMO = new URLSearchParams(location.search).has("demo");

let saved = {};
try {
  saved = JSON.parse(localStorage.getItem(STORE_KEY)) ?? {};
} catch {}

function remember() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(saved));
  } catch {}
}

// ---------- Upload boxes ----------

function showUpload(box) {
  const name = saved[box.dataset.key];
  box.classList.toggle("is-done", Boolean(name));
  box.querySelector(".upload__file").textContent = name ?? "";
  box.querySelector(".upload__icon").src = name ? "assets/icon-upload-done.svg" : "assets/icon-upload.svg";
  box.querySelector(".upload__remove").hidden = !name;
}

function useFile(box, file) {
  if (!file) return;
  saved[box.dataset.key] = file.name;
  remember();
  showUpload(box);
}

for (const box of document.querySelectorAll(".upload")) {
  const input = box.querySelector("input[type=file]");
  input.addEventListener("change", () => useFile(box, input.files[0]));

  // Dropping a file on the box works too.
  box.addEventListener("dragover", (event) => {
    event.preventDefault();
    box.classList.add("is-dragging");
  });
  box.addEventListener("dragleave", () => box.classList.remove("is-dragging"));
  box.addEventListener("drop", (event) => {
    event.preventDefault();
    box.classList.remove("is-dragging");
    useFile(box, event.dataTransfer.files[0]);
  });

  // Remove: forget the file. The box is a <label>, so stop the click from
  // also opening the file picker.
  const remove = box.querySelector(".upload__remove");
  remove.setAttribute("aria-label", `Remove ${box.querySelector(".upload__title").textContent.replace("Upload ", "").toLowerCase()}`);
  remove.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    delete saved[box.dataset.key];
    remember();
    input.value = "";
    showUpload(box);
  });

  showUpload(box);
}

// ---------- Links: Add Link opens a box + Save; saved links show in green ----------

function showLink(row) {
  const url = saved[row.dataset.key];
  const link = row.querySelector(".link__saved");
  link.hidden = !url;
  link.href = url ?? "";
  link.textContent = url ? url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "") : "";
  row.querySelector(".link__button").textContent = url ? "Change Link" : "Add Link";
}

for (const row of document.querySelectorAll(".link")) {
  const form = row.querySelector(".link__form");
  const input = form.querySelector("input");

  row.querySelector(".link__button").addEventListener("click", () => {
    form.hidden = !form.hidden;
    if (!form.hidden) {
      input.value = saved[row.dataset.key] ?? "";
      input.focus();
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    saved[row.dataset.key] = input.value.trim();
    remember();
    form.hidden = true;
    showLink(row);
  });

  showLink(row);
}

// ---------- Signed out → sign-in page, like Saved Jobs ----------

if (!DEMO) {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
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
