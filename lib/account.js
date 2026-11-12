// The extension's own sign-in and saved jobs, talking to Supabase directly.
//
// The extension signs in separately from the website (Chrome's sign-in window
// via chrome.identity), so each has its own session. If they shared one, each
// refresh would cancel the other's and people would keep getting signed out.
//
// Stored in chrome.storage.local:
//   account     – { accessToken, refreshToken, expiresAt, email, name }
//   pendingSave – the job someone clicked Add to List on before signing in
import { SUPABASE_URL, SUPABASE_KEY } from "../docs/js/config.js";

export const SITE_URL = "https://alexkramer2.github.io/new-openings/";

const hasChrome = typeof chrome !== "undefined" && Boolean(chrome.storage?.local);

async function readStorage(key) {
  if (!hasChrome) return undefined;
  return (await chrome.storage.local.get(key))[key];
}

async function writeStorage(key, value) {
  if (!hasChrome) return;
  if (value === undefined) await chrome.storage.local.remove(key);
  else await chrome.storage.local.set({ [key]: value });
}

// Name and email are inside the access token itself.
function profileFrom(accessToken) {
  try {
    const payload = JSON.parse(atob(accessToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    const meta = payload.user_metadata ?? {};
    return { email: payload.email ?? "", name: meta.full_name || meta.name || payload.email || "" };
  } catch {
    return { email: "", name: "" };
  }
}

function accountFrom({ access_token, refresh_token, expires_at, expires_in }) {
  const expiresAt = Number(expires_at) || Math.floor(Date.now() / 1000) + Number(expires_in || 3600);
  return { accessToken: access_token, refreshToken: refresh_token, expiresAt, ...profileFrom(access_token) };
}

export async function getAccount() {
  return (await readStorage("account")) ?? null;
}

// Opens Google's sign-in in a small Chrome window. Run from the background
// worker: the popup closes as soon as that window takes focus.
export async function signIn() {
  const redirectTo = chrome.identity.getRedirectURL(); // https://<extension id>.chromiumapp.org/
  const url = `${SUPABASE_URL}/auth/v1/authorize?${new URLSearchParams({ provider: "google", redirect_to: redirectTo })}`;
  const result = await chrome.identity.launchWebAuthFlow({ url, interactive: true });
  const params = new URLSearchParams(new URL(result).hash.slice(1));
  if (params.get("error")) throw new Error(params.get("error_description") || params.get("error"));
  if (!params.get("access_token")) throw new Error("Sign-in didn’t finish");
  const account = accountFrom(Object.fromEntries(params));
  await writeStorage("account", account);
  return account;
}

export async function signOut() {
  const account = await getAccount();
  await writeStorage("account", undefined);
  if (account) {
    // Ends this session on Supabase too; the website's own sign-in is unaffected.
    await fetch(`${SUPABASE_URL}/auth/v1/logout?scope=local`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${account.accessToken}` }
    }).catch(() => {});
  }
}

// A valid access token, refreshing it when it's about to expire.
// Returns null (and forgets the account) if the session has ended.
async function accessToken() {
  const account = await getAccount();
  if (!account) return null;
  if (account.expiresAt * 1000 - 60000 > Date.now()) return account.accessToken;

  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: account.refreshToken })
  });
  if (!response.ok) {
    await writeStorage("account", undefined);
    return null;
  }
  const fresh = accountFrom(await response.json());
  await writeStorage("account", fresh);
  return fresh.accessToken;
}

async function rest(path, options = {}) {
  const token = await accessToken();
  if (!token) throw new Error("signed-out");
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...options.headers }
  });
  if (!response.ok) throw new Error(`Saving failed (${response.status})`);
  return response.status === 204 || options.method === "POST" ? null : response.json();
}

// Saves the job as the card looked when saved (match % and tag colors included),
// so the website can show it without the quiz answers. Saving twice is harmless.
export async function saveJob(job) {
  const { id, title, company, location, type, field, setting, pay, description, url, source, postedAt, match, fits } = job;
  await rest("saved_jobs?on_conflict=user_id,job_id", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify({
      job_id: id,
      job: { id, title, company, location, type, field, setting, pay, description, url, source, postedAt, match, fits }
    })
  });
}

// IDs of everything this person has saved, so the popup can show "Saved ✓".
export async function savedJobIds() {
  try {
    const rows = await rest("saved_jobs?select=job_id");
    return new Set(rows.map((row) => row.job_id));
  } catch {
    return new Set();
  }
}

export async function setPendingSave(job) {
  await writeStorage("pendingSave", job);
}

// After signing in: save the job they clicked Add to List on, if any.
export async function savePendingJob() {
  const job = await readStorage("pendingSave");
  if (!job) return null;
  await saveJob(job);
  await writeStorage("pendingSave", undefined);
  return job;
}
