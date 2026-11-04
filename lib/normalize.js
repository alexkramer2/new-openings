// Turns listings from different job services into the one shape the popup uses:
// { id, source, title, company, location, type, category, field, setting, pay,
//   experience, industry, flags, description, url, postedAt }
// Anything a service doesn't tell us stays null and shows as "not listed".
import { FIELDS, ANY_ROLE } from "../data/fields.js";

export function stripHtml(html) {
  return (html ?? "")
    .replace(/<(br|\/p|\/li|\/div)[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&rsquo;|&lsquo;/g, "’")
    .replace(/&quot;|&ldquo;|&rdquo;/g, "\"")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Short summary for the card; the full posting is one click away.
export function summarize(text, max = 300) {
  if (text.length <= max) return text;
  return `${text.slice(0, text.lastIndexOf(" ", max))}…`;
}

const has = (text, pattern) => pattern.test(text);

export function detectType(text) {
  if (has(text, /\bintern(ship)?s?\b/i)) return "Internship";
  if (has(text, /\bpart[- ]time\b/i)) return "Part-Time";
  if (has(text, /\b(contract(or)?|freelance|temporary|temp)\b/i)) return "Contract/Freelance";
  if (has(text, /\bfull[- ]time\b/i)) return "Full-Time";
  return null;
}

export function detectSetting(text) {
  if (has(text, /\bhybrid\b/i)) return "Hybrid";
  if (has(text, /\b(fully remote|100% remote|remote[- ]first|work from home|wfh)\b/i)) return "Remote";
  if (has(text, /\b(on[- ]?site|in[- ]office|in[- ]person)\b/i)) return "On-site";
  return null;
}

export function detectExperience(title) {
  if (has(title, /\bintern(ship)?\b/i)) return "Student / No Experience";
  if (has(title, /\b(senior|sr\.?|lead|principal|staff|director|head of|manager)\b/i)) return "5+ Years";
  if (has(title, /\b(junior|jr\.?|entry[- ]level|associate|assistant|trainee|apprentice|graduate)\b/i)) return "Less Than 1 Year";
  return null;
}

export function detectFlags(text) {
  const flags = [];
  if (has(text, /\bunpaid\b/i)) flags.push("Unpaid");
  if (has(text, /\b(commission[- ]only|100% commission|commission based)\b/i)) flags.push("Commission Only");
  if (has(text, /\b(extensive|frequent|significant) travel\b|\btravel (up to )?([5-9]\d)%/i)) flags.push("Frequent Travel");
  if (has(text, /\b(night shifts?|overnight|graveyard)\b/i)) flags.push("Night Shifts");
  if (has(text, /\bweekends?\b.{0,20}\b(required|shifts?|availability)\b|\bweekend shifts?\b/i)) flags.push("Weekend Shifts");
  if (has(text, /\b(no benefits|benefits not (included|provided))\b/i)) flags.push("No Benefits");
  if (has(text, /\b(reliable|own|personal) (vehicle|transportation|car)\b|\bvalid driver'?s license\b/i)) flags.push("Must Have a Car");
  return flags;
}

const money = (n) => `$${Math.round(n).toLocaleString("en-US")}`;

// (54400, 70500, "yearly") -> "$54,400-$70,500/yr"
export function formatPay(min, max, per) {
  if (!min && !max) return null;
  const suffix = per === "hourly" ? "/hr" : "/yr";
  if (min && max && Math.round(min) !== Math.round(max)) return `${money(min)}-${money(max)}${suffix}`;
  return `${money(min || max)}${suffix}`;
}

// Words in a role name worth looking for in a job title. "UI/UX Design" ->
// ["ui", "ux"]; "Nursing" -> ["nurs"] so it also matches "Nurse".
const GENERIC = new Set(["design", "development", "management", "and", "rep", "of", "in"]);
function roleWords(role) {
  return role
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w && !GENERIC.has(w))
    .map((w) => (w.length > 5 ? w.slice(0, 5) : w));
}

// The user's role that this job's title matches, if any.
export function matchRole(title, answers) {
  const roles = (answers.roles ?? []).filter((r) => r !== ANY_ROLE);
  const words = title.toLowerCase().split(/[^a-z]+/);
  return roles.find((role) => {
    const keys = roleWords(role);
    return keys.length && keys.some((k) => words.some((w) => (k.length < 3 ? w === k : w.startsWith(k))));
  });
}

// Search keywords for the user's roles (or the field's roles for "Any role").
export function roleKeywords(answers) {
  const roles = (answers.roles ?? []).filter((r) => r !== ANY_ROLE);
  const list = roles.length ? roles : (FIELDS[answers.field] ?? []).slice(0, 4);
  return list.map((r) => r.replace(/\s*\/\s*/g, " "));
}

// Fill in the shared fields every source needs.
export function finishJob(job, answers) {
  const text = `${job.title} ${job.fullText ?? job.description ?? ""}`;
  // Job type from the title and opening lines only; the fine print at the end
  // of a posting often mentions every type ("full-time, part-time, temporary…").
  const intro = `${job.title} ${(job.fullText ?? "").slice(0, 400)}`;
  // A job is in the user's field only if its title matches one of the field's
  // roles. Job sites file plenty of unrelated jobs under broad categories.
  const role =
    matchRole(job.title, answers) ?? matchRole(job.title, { roles: FIELDS[answers.field] ?? [] });
  // What the service told us wins; otherwise guess from the title and description.
  const known = Object.fromEntries(Object.entries(job).filter(([, v]) => v !== undefined && v !== null));
  const result = {
    type: detectType(intro),
    setting: detectSetting(text),
    experience: detectExperience(job.title),
    industry: null,
    pay: null,
    ...known,
    field: role ?? job.field ?? null,
    category: role ? answers.field : null,
    flags: detectFlags(text),
    description: summarize(job.description ?? "")
  };
  delete result.fullText;
  return result;
}

// Same title at the same company from two services = one job.
export function dedupeKey(job) {
  const clean = (s) => (s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return `${clean(job.title)}|${clean(job.company)}`;
}
