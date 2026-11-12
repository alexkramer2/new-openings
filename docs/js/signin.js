// Sign-in page: "Sign in with Google" through Supabase, then on to Saved Jobs.
import { supabase } from "./supabase-client.js";

const button = document.getElementById("google-signin");
const status = document.getElementById("signin-status");
const savedJobsPage = new URL("./", location.href).href;

// Already signed in? Skip straight to the list.
const { data } = await supabase.auth.getSession();
if (data.session) location.replace(savedJobsPage);

button.addEventListener("click", async () => {
  button.disabled = true;
  status.textContent = "Opening Google…";
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: savedJobsPage }
  });
  // On success the browser leaves for Google, so we only get here on an error.
  if (error) {
    button.disabled = false;
    status.textContent = `Couldn’t start sign-in: ${error.message}`;
  }
});
