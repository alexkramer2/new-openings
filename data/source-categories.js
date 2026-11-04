// How each quiz field (question 2) maps onto each job service's own categories.
//   muse   – The Muse `category` values (can list several)
//   adzuna – Adzuna category tag (one per search)
export const SOURCE_CATEGORIES = {
  "Agriculture & Environment": { muse: ["Farming and Outdoors", "Animal Care"], adzuna: "energy-oil-gas-jobs" },
  "Arts & Design": { muse: ["Design and UX", "Design", "UX", "Arts"], adzuna: "creative-design-jobs" },
  "Business & Management": { muse: ["Business Operations", "Management", "Project Management", "Administration and Office"], adzuna: "consultancy-jobs" },
  "Communications & Media": { muse: ["Media, PR, and Communications", "Writing and Editing", "Videography"], adzuna: "pr-advertising-marketing-jobs" },
  "Construction & Trades": { muse: ["Construction", "Installation, Maintenance, and Repairs"], adzuna: "trade-construction-jobs" },
  "Education & Teaching": { muse: ["Education"], adzuna: "teaching-jobs" },
  "Engineering": { muse: ["Science and Engineering"], adzuna: "engineering-jobs" },
  "Finance & Accounting": { muse: ["Accounting and Finance", "Accounting"], adzuna: "accounting-finance-jobs" },
  "Food & Hospitality": { muse: ["Food and Hospitality Services"], adzuna: "hospitality-catering-jobs" },
  "Government & Public Service": { muse: ["Protective Services", "Social Services"], adzuna: "other-general-jobs" },
  "Healthcare & Nursing": { muse: ["Healthcare", "Nurses", "Mental Health", "Physical Assistant"], adzuna: "healthcare-nursing-jobs" },
  "Human Resources": { muse: ["Human Resources and Recruitment", "HR", "Recruiting"], adzuna: "hr-jobs" },
  "Law & Legal": { muse: ["Legal Services", "Law"], adzuna: "legal-jobs" },
  "Logistics & Transportation": { muse: ["Transportation and Logistics", "Manufacturing and Warehouse"], adzuna: "logistics-warehouse-jobs" },
  "Marketing & Advertising": { muse: ["Advertising and Marketing", "Marketing"], adzuna: "pr-advertising-marketing-jobs" },
  "Real Estate": { muse: ["Real Estate"], adzuna: "property-jobs" },
  "Retail & Customer Service": { muse: ["Retail", "Customer Service"], adzuna: "retail-jobs" },
  "Sales": { muse: ["Sales", "Account Management"], adzuna: "sales-jobs" },
  "Science & Research": { muse: ["Science and Engineering", "Data and Analytics", "Data Science"], adzuna: "scientific-qa-jobs" },
  "Skilled Labor & Manufacturing": { muse: ["Manufacturing and Warehouse", "Mechanic"], adzuna: "manufacturing-jobs" },
  "Social Work & Nonprofit": { muse: ["Social Services", "Mental Health"], adzuna: "social-work-jobs" },
  "Software & IT": { muse: ["Software Engineering", "Computer and IT", "Data and Analytics", "IT"], adzuna: "it-jobs" },
  "Sports, Fitness & Recreation": { muse: ["Sports, Fitness, and Recreation"], adzuna: "other-general-jobs" }
};
