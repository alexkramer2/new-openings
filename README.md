# New Openings

A Chrome extension that finds new job openings matching what you're looking for, scores how well each one fits, and shows a red count on its icon when good matches come in.

Made by Alex Kramer for IXD at the University of Kansas.

## Install it (about 2 minutes)

New Openings isn't on the Chrome Web Store yet, so it installs as a developer extension.

1. **Download** `New-Openings.zip` from the [latest release](https://github.com/alexkramer2/new-openings/releases/latest).
2. **Unzip it.** Double-click the zip and you'll get a `New-Openings` folder. Put it somewhere you'll keep it, like Documents, because Chrome loads the extension from this folder.
3. In Chrome, go to **chrome://extensions** and turn on **Developer mode** (switch in the top right).
4. Click **Load unpacked** and choose the `New-Openings` folder.
5. **Take the quiz** that opens in a new tab. It sets what kinds of jobs you're matched with.
6. **Pin it:** click the puzzle-piece icon in Chrome's toolbar, then the pin next to New Openings. Otherwise you won't see the red count of new jobs.

Chrome may show a "Disable developer mode extensions" message when it starts. Click the ✕ to keep New Openings running.

## Using it

- Click the briefcase icon to see your best matches. Click a job title to open the real posting.
- Green tags fit your quiz answers, blue tags don't, and gray tags weren't listed by the job site.
- ⚙ → **Retake Quiz** to change your answers.
- ⚙ → **Job Sources** to add more job sites. The Muse works right away with no setup. Adzuna (thousands of job boards) and JSearch (LinkedIn and Indeed) each need a free key, with sign-up links on that screen. Your keys stay in your own browser.

## Updating

Download the new zip, replace your `New-Openings` folder with the new one, then press the reload arrow on New Openings in **chrome://extensions**. Your quiz answers and keys are kept.

## For developers

- `manifest.json`: extension config
- `popup/`: the dropdown, built from the Figma "New Openings" frame
- `quiz/`: the start-up quiz (questions in `data/quiz-questions.js`, fields and roles in `data/fields.js`, skills in `data/skills.js`)
- `background.js` + `lib/checker.js`: hourly checks; The Muse every 2 hr, Adzuna every 4 hr, JSearch every 12 hr, each stopped at a monthly limit so free plans never run out
- `lib/sources/`: one file per job service; `lib/normalize.js` turns their listings into the card format
- `lib/fit.js`: tag colors and the match %
- `lib/places.js`: city search for the location question (Photon / OpenStreetMap, no key)
- `lib/store.js`: saved state (jobs, seen, cleared, quiz answers, keys) and the badge count
- `data/sample-jobs.js`: placeholder openings shown until the first real check
- `assets/`, `fonts/`, `icons/`, `styles/`: Figma icons, bundled fonts, toolbar icon (drawn from `assets/logo.svg`, with pixel-aligned `logo-16.svg` / `logo-32.svg` for the toolbar)
