// Placeholder openings used until the real job APIs (Adzuna, The Muse, JSearch)
// are connected. The match % is calculated from the quiz answers in lib/fit.js.
//   experience – uses the same options as quiz question 5
//   industry   – uses the same options as quiz question 13
//   flags      – anything that could be a deal-breaker (quiz question 14)
export const SAMPLE_JOBS = [
  {
    id: "sample-garmin-ui-designer-1",
    title: "UI Designer 1",
    company: "Garmin",
    location: "Olathe, Kansas",
    type: "Full-Time",
    category: "Arts & Design",
    field: "UI/UX Design",
    setting: "On-site",
    pay: "$54,400-$70,500/yr",
    experience: "Student / No Experience",
    industry: "Technology",
    flags: [],
    description:
      "Garmin is hiring a full-time UI Designer to conceptualize, design, and prototype user interface experiences for its products using Illustrator, Photoshop, and Figma. This role suits recent grads with a design degree and strong visual/UI skills who want to work on-site at Garmin's Kansas City-area headquarters."
  },
  {
    id: "sample-hallmark-ux-intern",
    title: "UX Design Intern",
    company: "Hallmark",
    location: "Kansas City, Missouri",
    type: "Internship",
    category: "Arts & Design",
    field: "UI/UX Design",
    setting: "Hybrid",
    pay: "$22-$25/hr",
    experience: "Student / No Experience",
    industry: "Retail",
    flags: [],
    description:
      "Hallmark's digital team is looking for a summer UX intern to help research, sketch, and test new features for its e-commerce site and apps. You'll work alongside senior designers in Figma and present your project at the end of the summer."
  },
  {
    id: "sample-cerner-visual-designer",
    title: "Visual Designer",
    company: "Oracle Health",
    location: "Remote",
    type: "Full-Time",
    category: "Arts & Design",
    field: "Graphic Design",
    setting: "Remote",
    pay: "$62,000-$78,000/yr",
    experience: "1–3 Years",
    industry: "Healthcare",
    flags: [],
    description:
      "Create visual assets, icon sets, and marketing graphics for Oracle Health's clinical software. Strong typography and layout skills required; motion design experience is a plus."
  },
  {
    id: "sample-ku-web-assistant",
    title: "Web Content Assistant",
    company: "University of Kansas",
    location: "Lawrence, Kansas",
    type: "Part-Time",
    category: "Arts & Design",
    field: "Web Design",
    setting: "On-site",
    pay: "$15/hr",
    experience: "Student / No Experience",
    industry: "Education",
    flags: ["No Benefits"],
    description:
      "Update department web pages, resize and optimize images, and keep content consistent with the university's brand guidelines using WordPress and basic HTML/CSS. Flexible hours around class schedules."
  },
  {
    id: "sample-stmarys-medical-assistant",
    title: "Medical Assistant",
    company: "Saint Luke's Health System",
    location: "Kansas City, Missouri",
    type: "Full-Time",
    category: "Healthcare & Nursing",
    field: "Medical Assistant",
    setting: "On-site",
    pay: "$18-$21/hr",
    experience: "Less Than 1 Year",
    industry: "Healthcare",
    flags: ["Weekend Shifts"],
    description:
      "Room patients, take vital signs, and update records in Epic for a busy family medicine clinic. CPR / BLS certification required; some weekend shifts."
  }
];
