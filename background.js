import { seedSampleJobs, updateBadge } from "./lib/store.js";
import { checkForJobs } from "./lib/checker.js";

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
});
