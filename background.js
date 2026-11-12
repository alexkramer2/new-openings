import { seedSampleJobs, updateBadge } from "./lib/store.js";
import { checkForJobs } from "./lib/checker.js";
import { signIn, savePendingJob, SITE_URL } from "./lib/account.js";

const ALARM = "check-jobs";

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  await seedSampleJobs();
  await updateBadge();
  chrome.alarms.create(ALARM, { periodInMinutes: 60 });
  // First install: open the start-up quiz in its own tab.
  if (reason === chrome.runtime.OnInstalledReason.INSTALL) {
    chrome.tabs.create({ url: chrome.runtime.getURL("quiz/quiz.html") });
  }
  checkForJobs();
});

chrome.runtime.onStartup.addListener(async () => {
  await updateBadge();
  checkForJobs();
});

// Every hour: each service runs only if it's due (see lib/checker.js).
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM) checkForJobs();
});

// "Check now" from the popup, or the quiz finishing with new answers.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "check-now") {
    checkForJobs({ force: true }).then(sendResponse, (error) => sendResponse({ error: error.message }));
    return true; // keep the channel open for the async reply
  }
  // "Sign in with Google" in the popup. Runs here because the popup closes
  // when Google's sign-in window opens.
  if (message?.type === "sign-in") {
    finishSignIn().then(sendResponse, (error) => sendResponse({ error: error.message }));
    return true;
  }
});

async function finishSignIn() {
  await chrome.storage.local.remove("signInError");
  try {
    await signIn();
    const saved = await savePendingJob();
    // Show them their list, with the job they just saved on it.
    if (saved) chrome.tabs.create({ url: SITE_URL });
    return { ok: true };
  } catch (error) {
    // Closing Google's window counts as cancelling, not an error worth showing.
    const cancelled = /did not approve|canceled|cancelled|closed/i.test(error.message);
    if (!cancelled) await chrome.storage.local.set({ signInError: error.message });
    return { error: error.message };
  }
}
