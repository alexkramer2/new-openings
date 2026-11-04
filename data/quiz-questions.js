// The start-up quiz, in order. `label` is what the step list on the left shows.
// `type` picks how the answer is shown in quiz.js:
//   multi    – pick any number of boxes (`exclusive` can't be combined with others)
//   single   – pick one box
//   dropdown – the field list (question 2)
//   roles    – roles for the chosen field
//   skills   – skills for the chosen field, plus a text box
//   text     – one text box (`optional` lets the user skip it)
//   places   – city search with suggestions; picked cities become removable chips
//   pay      – amount plus yearly / hourly
//   date     – start date options, with a date picker for "Pick a Date"
//   ranking  – drag to reorder
export const QUESTIONS = [
  {
    id: "types",
    label: "Job type",
    type: "multi",
    title: "What Kind of Position Are You Looking For?",
    description: "Pick all that apply. We’ll only notify you about openings that match, and you can change this anytime.",
    options: ["Full-Time", "Part-Time", "Internship", "Contract/Freelance"]
  },
  {
    id: "field",
    label: "Field (dropdown)",
    type: "dropdown",
    title: "What Field Do You Want to Work In?",
    description: "Choose the field closest to the work you want. You’ll pick specific roles on the next screen."
  },
  {
    id: "roles",
    label: "Roles (multi)",
    type: "roles",
    title: "Which Roles Are You Interested In?",
    description: "Pick all that apply, or choose any role to see everything in your field."
  },
  {
    id: "titles",
    label: "Job titles",
    type: "text",
    optional: true,
    title: "Any Specific Job Titles in Mind?",
    description: "Openings with these words in the title get a higher match. Separate titles with commas, or leave this blank to skip.",
    placeholder: "UI Designer, Product Designer"
  },
  {
    id: "experience",
    label: "Experience",
    type: "single",
    title: "How Much Experience Do You Have?",
    description: "Count internships and part-time work in your field. This helps us skip roles that are too senior or too junior.",
    options: ["Student / No Experience", "Less Than 1 Year", "1–3 Years", "3–5 Years", "5+ Years"]
  },
  {
    id: "locations",
    label: "Location",
    type: "places",
    title: "Where Do You Want to Work?",
    description: "Search for a city and pick it from the list. Add every place you’d consider, up to 5. Remote openings show up no matter where you are.",
    placeholder: "Search for a city",
    max: 5
  },
  {
    id: "commute",
    label: "Commute distance",
    type: "single",
    title: "How Far Are You Willing to Commute?",
    description: "Measured from whichever of your locations is closest. This only applies to on-site and hybrid jobs.",
    options: ["Within 10 Miles", "Within 25 Miles", "Within 50 Miles", "Any Distance"]
  },
  {
    id: "settings",
    label: "Work setting",
    type: "multi",
    title: "Which Work Settings Work for You?",
    description: "Pick all that apply. Hybrid means some days in the office and some days at home.",
    options: ["On-site", "Hybrid", "Remote"]
  },
  {
    id: "relocate",
    label: "Relocating",
    type: "single",
    title: "Are You Open to Relocating?",
    description: "If you are, openings in other cities can still be a good match.",
    options: ["Yes", "No", "Maybe"]
  },
  {
    id: "minPay",
    label: "Minimum pay",
    type: "pay",
    title: "What’s the Lowest Pay You’d Accept?",
    description: "Openings that pay less get a lower match. Openings that don’t list pay aren’t counted against.",
    placeholder: "50,000"
  },
  {
    id: "startDate",
    label: "Start date",
    type: "date",
    title: "When Can You Start?",
    description: "We’ll favor openings that line up with when you’re available.",
    options: ["As Soon As Possible", "Within 1 Month", "Within 3 Months", "Pick a Date"]
  },
  {
    id: "skills",
    label: "Skills",
    type: "skills",
    title: "Which Skills and Tools Do You Have?",
    description: "Pick all that apply. We look for these in each job description. Add anything else in the box below.",
    placeholder: "Other skills, separated by commas"
  },
  {
    id: "industries",
    label: "Industries",
    type: "multi",
    title: "Which Industries Interest You?",
    description: "This is about the kind of company, not your role. A designer could work at a hospital or a tech company.",
    options: ["Technology", "Healthcare", "Education", "Finance", "Government", "Nonprofit", "Retail", "Manufacturing", "Media & Entertainment", "Agency / Consulting", "Hospitality", "No Preference"],
    exclusive: "No Preference"
  },
  {
    id: "dealBreakers",
    label: "Deal-breakers",
    type: "multi",
    title: "Any Deal-Breakers?",
    description: "Openings with these still show up, but with a very low match so they sink to the bottom.",
    options: ["Unpaid", "Commission Only", "Frequent Travel", "Night Shifts", "Weekend Shifts", "No Benefits", "Must Have a Car", "None"],
    exclusive: "None"
  },
  {
    id: "ranking",
    label: "Ranking",
    type: "ranking",
    title: "What Matters Most to You?",
    description: "Drag to put these in order, most important at the top. The top ones count more toward each job’s match.",
    options: ["Pay", "Location", "Role", "Work Setting", "Job Type"]
  }
];
