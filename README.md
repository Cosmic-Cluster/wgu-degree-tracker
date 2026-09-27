# WGU Degree Tracker

A free, private progress tracker for any Western Governors University degree, Bachelor's or Master's. It shows your competency units, courses, assessments and tuition in one page that runs in your browser. You set it up from your program's own **Program Guide PDF**. Nothing to install, no account, and nothing is uploaded anywhere.

> **Unofficial.** Not affiliated with or endorsed by WGU. Course lists come from your Program Guide; assessment types and study tips come from unofficial student sources and are marked as unconfirmed. Always check your plan with your program mentor.

<!-- TODO: add a screenshot here, e.g. docs/screenshot.png -->

## What it does

- **Progress:** CUs complete out of your total, per term and overall
- **Each course:** materials status, assessment type (OA exam or PA paper/project) with a status for each exam or task, and optional "How to prepare" notes
- **In-person parts:** mark clinicals, labs or student teaching. The course isn't complete until that part is done
- **Program requirements:** track things that aren't courses, like content exams or state licensure steps
- **Budget:** WGU charges a flat rate per 6-month term, so the tracker shows what your plan costs and what finishing in fewer terms would save
- **Private:** your progress stays in your browser, with Export/Import to back it up or move it to another computer

## Who it's for

It works best for **self-paced programs**, where you can move faster and finish in fewer terms: IT, business, RN-to-BSN, and the coursework before student teaching in education programs.

Programs with fixed schedules get less out of it. In prelicensure nursing, the nursing courses run in a set order with clinicals, so the tracker can still follow your progress, but its plan-and-save features won't apply. It doesn't track clinical hours or compliance paperwork.

Some programs, such as prelicensure nursing and teacher licensure, are only offered in certain states. Check your program's page on wgu.edu before enrolling.

## Get started

You need your **Program Guide PDF**. Find it on your program's page on wgu.edu (look for "Program Guide"), or in your student portal.

### 1. Get the files

- **Easiest:** click the green **Code** button above → **Download ZIP**, then unzip it anywhere.
- **With GitHub:** click **Fork**, then clone your fork.

### 2. Make your `config.js`

Pick one way:

**A. The setup page (recommended)**
1. Open `setup/setup.html` in your browser (double-click it).
2. Drop in your Program Guide PDF.
3. Check what it found, fix anything that looks off, and add your tuition and start date.
4. Click **Download config.js**.
5. Move `config.js` into the main folder, next to `index.html`.

**B. Start from an example**
- If there's a file for your program in `examples/`, copy it to the main folder, rename it to `config.js`, and edit the lines marked `EDIT ME`.
- Otherwise, copy `config.example.js` to `config.js` and fill it in. Every field is explained in the file.

**C. Ask an AI assistant**
- Any AI assistant can build or update `config.js` for you. See [AI-GUIDE.md](AI-GUIDE.md) for how to ask, and for the rules it should follow. The tracker itself never needs AI.

### 3. Open the tracker

Double-click `index.html`. That's it.

## Putting it online (optional)

To get a link you can open from any device:

1. Fork this repo and add your `config.js` to it.
2. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch → `main` / root → Save**.
3. After a minute or two it's live at `https://<your-username>.github.io/wgu-degree-tracker/`.

**Note:** on a public repo, your `config.js` is public too: your course plan, tuition figure and start date. Your *progress* is not, because that stays in your browser. If you'd rather keep your plan private, just use it from your computer.

## Your progress and privacy

- Progress is saved in your browser's local storage, on your computer only. Nothing is sent anywhere.
- It's tied to that browser on that computer. Clearing browser data erases it, and it won't appear on your phone automatically.
- Use **Export progress** to save a backup file, and **Import progress** to restore it or move to another device.
- Re-running setup later (say, for a new catalog version) keeps progress for every course whose name or code didn't change.

## FAQ

**Why does every course say "Type: unknown"?** WGU doesn't say in the Program Guide whether a course is an exam (OA) or a paper/project (PA). You'll see it on each course's Course of Study page after you enroll. Click the pill to set it.

**The setup page got something wrong.** Fix it in the table before downloading. If it's a pattern (it misreads a whole table), please [open an issue](../../issues) and say which program and catalog version. Please don't attach the PDF itself.

**Where do I find a course's code (like D482)?** Most Program Guides don't list them. They're optional, and the tracker works without them.

## For developers

- No build step, no dependencies at runtime. Plain HTML, CSS and JavaScript. npm is used for developer tooling only.
- `npm install`, then `npm run lint` and `npm test` (unit tests, the pdf.js security guard, and config schema checks). CI runs these plus secret scanning and `npm audit` on every push and pull request (`.github/workflows/ci.yml`).
- `setup/parse-guide.js` reads the Program Guide. Before changing it, also run the real-guide tests: `npm run test:guides -- "<folder of PDFs>"`. PDFs aren't committed, because they're WGU's documents.
- `config.schema.json` describes the config format.
- [DECISIONS.md](DECISIONS.md) explains why things are the way they are. Read it before changing the parser or the pdf.js version.
- [AGENTS.md](AGENTS.md) holds instructions for AI coding assistants.
- [SECURITY.md](SECURITY.md) covers how to report a vulnerability, and the known, mitigated pdf.js CVE you may see flagged by Dependabot.

## License

[MIT](LICENSE) © 2026 Cosmic-Cluster. The bundled PDF reader ([pdf.js](https://github.com/mozilla/pdf.js), in `setup/vendor/pdfjs/`) is Apache-2.0 licensed by Mozilla.

WGU and Western Governors University are trademarks of Western Governors University. This project is not affiliated with WGU.
