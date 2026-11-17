// Runs on job application sites (a content script; see manifest.json).
// Watches for the "application submitted" message and tells the background
// worker, which marks the matching saved job as Applied.
//
// Only reads this page's address, title and visible text; nothing is sent
// anywhere except to the extension's own background worker.

(() => {
  const host = location.hostname;

  // Each site's "you're done" wording (lowercase). Checked against the page text.
  const DONE_PHRASES = [
    "thank you for applying",
    "thanks for applying",
    "application submitted",
    "application has been submitted",
    "application was submitted",
    "application was successfully submitted",
    "your application has been received",
    "we have received your application",
    "we've received your application",
    "we received your application"
  ];

  // Company name from the address, where the site puts it there.
  function companyFromUrl() {
    const parts = location.pathname.split("/").filter(Boolean);
    const params = new URLSearchParams(location.search);
    if (/greenhouse\.io$/.test(host)) return params.get("for") || (parts[0] === "embed" ? "" : parts[0]);
    if (/lever\.co$/.test(host) || /ashbyhq\.com$/.test(host) || /smartrecruiters\.com$/.test(host)) return parts[0];
    if (/myworkdayjobs\.com$/.test(host)) return host.split(".")[0];
    return "";
  }

  function jobTitle() {
    const heading = document.querySelector("h1, h2, .app-title, .posting-headline h2");
    return (heading?.textContent || document.title || "").trim().slice(0, 200);
  }

  // Lever's and Greenhouse's thank-you pages have their own addresses.
  function urlSaysDone() {
    return /\/thanks\b/.test(location.pathname) || /\/confirmation\b/.test(location.pathname);
  }

  function textSaysDone() {
    const text = (document.body?.innerText || "").toLowerCase();
    return DONE_PHRASES.some((phrase) => text.includes(phrase));
  }

  let sent = false;
  let lastTitle = "";

  function check() {
    if (sent) return;
    // Remember the job title while the form is showing; the thank-you page often drops it.
    const title = jobTitle();
    if (title && !/thank|submitted|received/i.test(title)) lastTitle = title;
    if (!urlSaysDone() && !textSaysDone()) return;
    sent = true;
    observer.disconnect();
    chrome.runtime.sendMessage({
      type: "application-submitted",
      url: location.href,
      company: companyFromUrl(),
      title: lastTitle || title
    });
  }

  // Many application sites change the page without reloading, so keep watching.
  let pending = 0;
  const observer = new MutationObserver(() => {
    clearTimeout(pending);
    pending = setTimeout(check, 400);
  });

  function start() {
    check();
    if (!sent && document.body) observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
