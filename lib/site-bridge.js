// Runs on the New Openings website (a content script; see manifest.json).
// Lets the website use a few extension features, since web pages can't open
// the extension's own pages themselves.
//
// The page sends:  window.postMessage({ source: "new-openings-site", type: "open-quiz" }, origin)
//                  window.postMessage({ source: "new-openings-site", type: "opened-job", jobId }, origin)
// This script marks the page so it knows the extension is installed:
//   <html data-extension="installed">  plus a "new-openings-extension" event.

const ALLOWED = new Set(["open-quiz", "opened-job"]);

window.addEventListener("message", (event) => {
  if (event.source !== window || event.origin !== location.origin) return;
  const { source, type, jobId } = event.data ?? {};
  if (source !== "new-openings-site" || !ALLOWED.has(type)) return;
  chrome.runtime.sendMessage({ type, jobId: typeof jobId === "string" ? jobId.slice(0, 300) : undefined });
});

document.documentElement.dataset.extension = "installed";
window.dispatchEvent(new Event("new-openings-extension"));
