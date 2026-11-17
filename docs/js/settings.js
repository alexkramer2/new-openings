// Settings page: profile (from Google), how to change job preferences, and
// deleting the account.
//   ?demo – sample profile, no sign-in, nothing is deleted
import { supabase, displayName } from "./supabase-client.js";

const DEMO = new URLSearchParams(location.search).has("demo");

const photo = document.getElementById("profile-photo");
const deleteButton = document.getElementById("delete-account");
const deleteStatus = document.getElementById("delete-status");

const PHOTO_KEY = "profilePhoto"; // a picture chosen with the edit button (this browser only for now)

function chosenPhoto() {
  try {
    return localStorage.getItem(PHOTO_KEY);
  } catch {
    return null;
  }
}

function showProfile(user) {
  const name = displayName(user);
  document.getElementById("profile-name").textContent = name;
  document.getElementById("profile-email").textContent = user.email ?? "";

  // Picture they chose, else their Google photo, else the first letter of their name.
  const picture = chosenPhoto() || user.user_metadata?.avatar_url || user.user_metadata?.picture;
  if (picture) {
    const img = new Image();
    img.src = picture;
    img.alt = "";
    img.referrerPolicy = "no-referrer";
    img.onerror = () => photo.replaceChildren(name.charAt(0).toUpperCase());
    photo.replaceChildren(img);
  } else {
    photo.textContent = name.charAt(0).toUpperCase();
  }
}

let user = null;
if (DEMO) {
  user = { email: "you@example.com", user_metadata: { full_name: "Sample Person" } };
} else {
  const { data } = await supabase.auth.getSession();
  if (!data.session) location.replace("signin.html");
  user = data.session?.user ?? null;
}

if (user) showProfile(user);

// Edit button: pick a new picture. It's shrunk to a small square so it fits
// in the browser's storage; saving it to the account comes later.
document.getElementById("photo-input").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file || !user) return;
  try {
    const bitmap = await createImageBitmap(file);
    const size = 200;
    const side = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    canvas.getContext("2d").drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      size,
      size
    );
    localStorage.setItem(PHOTO_KEY, canvas.toDataURL("image/jpeg", 0.85));
  } catch {
    return; // not an image, or storage is blocked
  }
  showProfile(user);
  event.target.value = "";
});

// Retake Quiz: the quiz lives in the extension, so ask it to open the quiz
// (lib/site-bridge.js in the extension listens on this site).
const quizButton = document.getElementById("retake-quiz");
const quizNote = document.getElementById("quiz-note");
const hasExtension = () => document.documentElement.dataset.extension === "installed";

quizButton.addEventListener("click", () => {
  if (hasExtension()) {
    window.postMessage({ source: "new-openings-site", type: "open-quiz" }, location.origin);
  } else {
    quizNote.hidden = false;
  }
});

document.getElementById("sign-out").addEventListener("click", async () => {
  if (DEMO) return;
  await supabase.auth.signOut();
  location.replace("signin.html");
});

// Delete Account: asks first, then removes the account on Supabase. Saved jobs
// go with it (the database deletes them along with the account).
deleteButton.addEventListener("click", async () => {
  const sure = confirm(
    "Delete your New Openings account?\n\nThis permanently removes your account and every saved job. It can’t be undone."
  );
  if (!sure) return;
  if (DEMO) {
    deleteStatus.textContent = "Demo only: nothing was deleted.";
    return;
  }

  deleteButton.disabled = true;
  deleteStatus.textContent = "Deleting…";
  const { error } = await supabase.rpc("delete_account");
  if (error) {
    deleteButton.disabled = false;
    deleteStatus.textContent = "Your account couldn’t be deleted right now. Please try again later.";
    return;
  }
  try {
    localStorage.removeItem("uploads");
    localStorage.removeItem("savedJobsFilters");
    localStorage.removeItem(PHOTO_KEY);
  } catch {}
  await supabase.auth.signOut();
  location.replace("signin.html");
});
