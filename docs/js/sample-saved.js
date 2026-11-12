// Stand-in saved jobs until "Add to List" in the extension saves to an account.
// A saved job is the popup's job plus the match % and tag colors from when it
// was saved, so the website doesn't need the quiz answers.
//   fits – per tag: true (green, fits the quiz), false (blue), null (gray, not listed)
export const SAMPLE_SAVED_JOBS = [
  {
    id: "sample-garmin-ui-designer-1",
    title: "UI Designer 1",
    company: "Garmin",
    location: "Olathe, Kansas",
    type: "Full-Time",
    field: "UI/UX Design",
    setting: "On-site",
    pay: "$54,400-$70,500/yr",
    description:
      "Garmin is hiring a full-time UI Designer to conceptualize, design, and prototype user interface experiences for its products using Illustrator, Photoshop, and Figma. This role suits recent grads with a design degree and strong visual/UI skills who want to work on-site at Garmin's Kansas City-area headquarters.",
    url: "https://careers.garmin.com/",
    match: 83,
    fits: { type: true, field: true, setting: true, pay: true }
  },
  {
    id: "sample-hallmark-ux-intern",
    title: "UX Design Intern",
    company: "Hallmark",
    location: "Kansas City, Missouri",
    type: "Internship",
    field: "UI/UX Design",
    setting: "Hybrid",
    pay: "$22-$25/hr",
    description:
      "Hallmark's digital team is looking for a summer UX intern to help research, sketch, and test new features for its e-commerce site and apps. You'll work alongside senior designers in Figma and present your project at the end of the summer.",
    url: "https://careers.hallmark.com/",
    match: 91,
    fits: { type: true, field: true, setting: true, pay: true }
  },
  {
    id: "sample-oracle-visual-designer",
    title: "Visual Designer",
    company: "Oracle Health",
    location: "Remote",
    type: "Full-Time",
    field: "Graphic Design",
    setting: "Remote",
    pay: "$62,000-$78,000/yr",
    description:
      "Create visual assets, icon sets, and marketing graphics for Oracle Health's clinical software. Strong typography and layout skills required; motion design experience is a plus.",
    url: "https://www.oracle.com/careers/",
    match: 64,
    fits: { type: true, field: false, setting: false, pay: true }
  },
  {
    id: "sample-prairie-ux-research-intern",
    title: "UX Research Intern",
    company: "Prairie Labs",
    location: "Overland Park, Kansas",
    type: "Internship",
    field: "UI/UX Design",
    setting: "Hybrid",
    pay: null,
    description:
      "Plan and run usability tests, synthesize interview findings, and share insights with product designers. Great fit for students in HCI, psychology, or design programs.",
    url: null,
    match: 78,
    fits: { type: true, field: true, setting: true, pay: null }
  },
  {
    id: "sample-northwind-junior-designer",
    title: "Junior Product Designer",
    company: "Northwind Studio",
    location: "Lawrence, Kansas",
    type: "Full-Time",
    field: "Product Design",
    setting: "On-site",
    pay: "$58,000-$66,000/yr",
    description:
      "Join a small product team designing scheduling and billing tools for clinics. You'll own flows end to end, from sketches to polished Figma prototypes.",
    url: null,
    match: 72,
    fits: { type: true, field: false, setting: true, pay: true }
  },
  {
    id: "sample-ku-web-assistant",
    title: "Web Content Assistant",
    company: "University of Kansas",
    location: "Lawrence, Kansas",
    type: "Part-Time",
    field: "Web Design",
    setting: "On-site",
    pay: "$15/hr",
    description:
      "Update department web pages, resize and optimize images, and keep content consistent with the university's brand guidelines using WordPress and basic HTML/CSS. Flexible hours around class schedules.",
    url: "https://employment.ku.edu/",
    match: 43,
    fits: { type: false, field: false, setting: true, pay: false }
  }
];
