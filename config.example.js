// ============================================================================
// WGU Program Tracker — config.js schema & example
//
// Copy this file to "config.js" (same folder as index.html) and edit it.
// index.html reads window.WGU_TRACKER_CONFIG and renders everything from it —
// you never need to touch index.html itself.
//
// Fastest way to fill this in for a real program: open setup/setup.html in
// your browser and drop in your WGU Program Guide PDF. It reads the course
// list straight out of the PDF, lets you check and adjust it, and downloads
// a finished config.js. This file documents every field that page produces,
// and is a fine starting point to hand-edit if you'd rather skip the PDF step.
// ============================================================================

window.WGU_TRACKER_CONFIG = {

  // Header ------------------------------------------------------------------
  eyebrow: "WGU · Bachelor of Science, Example Program",   // small caps line above the title
  programName: "Example Program Tracker",                   // page title (<h1>)
  goalNote: "goal: finish in 3 terms or fewer",              // optional, appended to the subtitle
  footerNote: "Built from your WGU Program Guide. Course requirements, transfer rules, and tuition can change — re-verify with your program mentor.",

  // A short slug used as the localStorage key so progress from one program's
  // tracker never collides with another if you keep several open in the same
  // browser. Defaults to a slugified programName if you leave this out.
  storageKey: "example-program",

  // Budget -------------------------------------------------------------------
  ratePerTerm: 4795,        // WGU tuition per term for this program; set 0/omit to hide the Budget card entirely
  termMonths: 6,            // WGU terms are 6 months for essentially every program — leave as-is unless yours differs
  startDate: "2026-11-01",  // "YYYY-MM-DD", or omit/null if you don't have a start date yet (hides all date ranges)

  // The toggle at the top of the Budget card. Each option is a candidate
  // number of terms to spread your remaining courses across; the tracker
  // computes cost for each and flags the cheapest. List your realistic plan
  // first (it's selected by default) and any stretch/compressed options after.
  planOptions: [
    { value: "3", label: "3-term plan",   terms: 3 },
    { value: "2", label: "2-term stretch", terms: 2 },
    { value: "1", label: "1-term stretch", terms: 1 }
  ],

  // Notes -------------------------------------------------------------------
  // Optional collapsible callouts under the header — use for caveats like
  // "assessment types below are unconfirmed guesses" or "these 2 courses are
  // covered by transfer credit, confirmed via WGU's transfer table." Omit or
  // leave as [] to hide the Notes section entirely.
  notes: [
    {
      mark: "?",                     // a single glyph shown in the callout's left margin
      color: "var(--money)",         // optional border/mark color; omit for the default green "confirmed" look
      bg: "var(--money-soft)",
      html: "<p><strong>Heads up:</strong> assessment type (OA vs. PA) isn't published anywhere official by WGU — it only shows up on each course's Course of Study page after you enroll. Anything below marked with a dashed pill is an unconfirmed guess, not WGU-sourced.</p>"
    }
  ],

  // Program requirements ------------------------------------------------------
  // Optional things your program needs that AREN'T courses and carry no CUs:
  // content/basic-skills exams, state licensure steps, background checks, etc.
  // Each gets its own status button in a "Program requirements" section.
  // (Clinicals, student teaching and portfolios are usually real courses with
  // CUs in the Program Guide — put those under `courses`, not here.)
  // Omit or leave as [] to hide the section.
  requirements: [
    {
      id: "state-licensure",          // short unique id; used to save progress — don't change it once you've started
      name: "State licensure requirements",
      note: "Check your state's section of the WGU Student Handbook."
    }
  ],

  // Courses -------------------------------------------------------------------
  // One entry per course in your program. `term` is just YOUR planned
  // grouping (which of your own terms you intend to take it in) — WGU
  // programs are self-paced and don't assign courses to terms themselves.
  courses: [
    {
      term: 1,                        // which of your planned terms this falls under (1, 2, 3, ...)
      code: "D000",                   // WGU course code — optional; most Program Guides don't list codes. Leave "" if unknown.
      name: "Example Foundations Course",
      cu: 3,                          // competency units
      prereq: "No prerequisite — good early win",   // free-text note shown under the course name
      notes: ["Aligned with CompTIA Security+ (per the Program Guide)."],  // optional extra note lines, one per entry
      cert: null,                     // e.g. "CompTIA Security+" if a certification satisfies this course by transfer
      transfer: false,                // true = already satisfied by transfer credit; hides all progress tracking for it
      inPerson: null,                 // null, or "Clinical" | "Lab" | "Student teaching" | "Field experience":
                                      // adds an "In person" badge and its own status button; the course
                                      // isn't Complete until that part is too
      assess: { type: "unknown", guess: false, tasks: 1 },
      // assess.type: "unknown" | "objective" (proctored exam) | "performance" (paper/project)
      // assess.guess: true = you're inferring this, not confirmed by WGU (shows a dashed "(unconfirmed)" pill)
      // assess.tasks: default task count for a performance course; adjustable later with +/- in the tracker
      prep: [   // optional — 0 or more prep-guide entries; omit entirely if you have no guide yet
        {
          url: "https://example.com/student-guide",
          source: "Example unofficial student guide",
          notes: [
            "Whatever's actually useful to know before starting this course goes here, one bullet per line."
          ]
        }
      ]
    },
    {
      term: 1,
      code: "D001",
      name: "Example Transfer Course",
      cu: 4,
      prereq: "Satisfied by transfer credit at enrollment",
      cert: "CompTIA Security+",
      transfer: true,
      assess: { type: "n/a", guess: false, tasks: 0 }
    },
    {
      term: 2,
      code: "D002",
      name: "Example Capstone-Style Course",
      cu: 4,
      prereq: "Needs everything above done first",
      cert: null,
      transfer: false,
      assess: { type: "performance", guess: true, tasks: 1 }
    }
  ]
};
