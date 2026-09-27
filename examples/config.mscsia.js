// ============================================================================
// Example config: WGU Master of Science, Cybersecurity and Information
// Assurance (MSCSIA), catalog 202610.
//
// To use it: copy this file to the main folder as "config.js" (next to
// index.html), then edit the parts marked EDIT ME.
//
// Where the data comes from:
//   - Courses, CUs, standard-path terms, prerequisites and certification
//     alignments: the MSCSIA Program Guide, catalog 202610 (published 6/1/2026).
//   - Assessment types and "How to prepare" notes: unofficial student sources,
//     linked per course. Anything not confirmed by WGU is marked
//     guess: true, which shows a dashed "(unconfirmed)" pill in the tracker.
//
// Nothing here is official. Check your own Program Guide and Course of
// Study pages, because WGU revises programs.
// ============================================================================

window.WGU_TRACKER_CONFIG = {

  eyebrow: "WGU · Master of Science, Cybersecurity and Information Assurance",
  programName: "MSCSIA Tracker",
  goalNote: "",                       // EDIT ME, e.g. "goal: finish in 2 terms"
  footerNote: "Built from the MSCSIA Program Guide (catalog 202610) plus unofficial student sources. Course requirements, transfer rules and tuition can change, so re-verify with your program mentor.",
  storageKey: "mscsia",

  // EDIT ME: check WGU's current tuition for this program. This was the
  // posted per-term rate when this example was written (Sep 2026).
  ratePerTerm: 5125,
  termMonths: 6,
  startDate: null,                    // EDIT ME: "YYYY-MM-DD" to show term dates

  // The standard path is 4 terms. Many students finish faster, especially
  // with transfer credit, so compressed options are listed too.
  planOptions: [
    { value: "4", label: "4-term plan",    terms: 4 },
    { value: "3", label: "3-term stretch", terms: 3 },
    { value: "2", label: "2-term stretch", terms: 2 },
    { value: "1", label: "1-term stretch", terms: 1 }
  ],

  notes: [
    {
      mark: "✓",
      html: "<p><strong>Certifications can transfer in.</strong> WGU's Transfer and Non-Transfer Credit table for this program lists CompTIA CySA+ for Security Operations (D483), CompTIA PenTest+ for Penetration Testing (D484), and CompTIA SecurityX / CASP+ for Cybersecurity Architecture and Engineering (D488). If yours is accepted, set <code>transfer: true</code> on that course in config.js. Confirm eligibility and timing with your enrollment counselor.</p>"
    },
    {
      mark: "?", color: "var(--money)", bg: "var(--money-soft)",
      html: "<p><strong>Assessment types are best guesses.</strong> WGU only shows whether a course is an OA (proctored exam) or PA (paper/project) on its Course of Study page after you enroll. For courses whose codes carried over from the previous catalog (D482, D485, D487, D489, D490), unofficial student sources gave enough signal for a guess, marked \"unconfirmed\". E121, E122 and E123 are new or renamed in this catalog and have no public track record, so they're left unknown.</p>"
    }
  ],

  requirements: [],

  courses: [
    {
      term: 1, code: "E123", name: "Cybersecurity Fundamentals", cu: 2,
      prereq: "Foundational: required before all remaining courses (except D487 and E122)",
      notes: [], cert: null, transfer: false, inPerson: null,
      assess: { type: "objective", guess: true, tasks: 1 },
      prep: [{
        url: "https://meetcyber.net/wgu-security-foundations-d481-cad4ed33a663",
        source: "meetcyber.net student guide (written for D481, E123's predecessor)",
        notes: [
          "Per the r/WGUCyberSecurity \"New MSCSIA program\" thread (Oct 2026 catalog update), E123 replaces D481 Security Foundations. The ISC2 CC certification bundled with the old course is gone, but the course covers the same ground.",
          "Not independently confirmed for E123: the assessment format below is carried over from the D481 guide. Treat the topic list as solid and the numbers as an estimate.",
          "If accurate: 25-question objective exam, weighted ~36% information-assurance principles, 44% network security operations, 20% networking infrastructure/protocols.",
          "Study: CIA triad, access control models (RBAC/DAC/MAC/ABAC), authentication vs. authorization, policy vs. procedure vs. standard vs. guideline, BIA/DRP/BCP, social engineering types (pretexting, vishing, quid pro quo, tailgating), IDS vs. IPS, OSI/TCP-IP layers, common ports (443/143/161).",
          "Tip: take the pre-assessment first and only study what you miss. One source calls it \"basically a vocabulary check\" for people already working in the field."
        ]
      }]
    },
    {
      term: 1, code: "D482", name: "Secure Network Design", cu: 3,
      prereq: "Foundational: required before all remaining courses (except D487 and E122)",
      notes: [], cert: null, transfer: false, inPerson: null,
      assess: { type: "performance", guess: true, tasks: 1 },
      prep: [{
        url: "https://meetcyber.net/wgu-secure-network-design-d482-7d20e53bf177",
        source: "meetcyber.net student guide",
        notes: [
          "One PA project (network-merger scenario), not an exam.",
          "Deliverables: vulnerability analysis, merged topology diagram (OSI + TCP/IP mapping), security recommendations with cost-benefit, PCI-DSS & HIPAA compliance notes, implementation plan with budget justification, emerging-threat mitigation.",
          "Study: OSI model, defense-in-depth, network segmentation, zero trust, VPN, DMZ, CVSS scoring.",
          "The budget/cost-benefit justification is weighted heavily, so don't skimp on that section."
        ]
      }]
    },
    {
      term: 1, code: "D487", name: "Secure Software Design", cu: 3,
      prereq: "No prerequisite",
      notes: [], cert: null, transfer: false, inPerson: null,
      assess: { type: "objective", guess: true, tasks: 1 },
      prep: [{
        url: "https://github.com/purplepyram1d/WGU-D487-Secure-Software-Design",
        source: "GitHub student notes (unofficial; D487 unchanged by the Oct 2026 update)",
        notes: [
          "Objective Assessment (OA), not a paper: the repo is titled \"Notes for WGU D487 OA\".",
          "Core framework: Security Development Lifecycle (SDL), phases A1–A5 plus Post-Release Support (security assessment → design → development → testing → readiness → shipping).",
          "Study: threat modeling across SDL phases, security testing types (white-box/black-box, static/dynamic), NIST frameworks, OWASP SAMM/BSIMM, compliance & policy analysis, risk assessment/requirements.",
          "The repo flags high-risk exam areas: terminology distinctions between similar concepts, phase-specific context, and role responsibilities.",
          "Unofficial student notes, not WGU material: a good study aid, not guaranteed accurate."
        ]
      }]
    },
    {
      term: 2, code: "D483", name: "Security Operations", cu: 4,
      prereq: "Needs E123 and D482 done first",
      notes: ["Aligned with CompTIA CySA+ (per the Program Guide). WGU's transfer table lists CySA+ as satisfying this course."],
      cert: null, transfer: false, inPerson: null,
      assess: { type: "unknown", guess: false, tasks: 1 }
    },
    {
      term: 2, code: "D485", name: "Cloud Security", cu: 4,
      prereq: "Needs E123, D482 and D483 done first",
      notes: [], cert: null, transfer: false, inPerson: null,
      assess: { type: "performance", guess: true, tasks: 1 },
      prep: [{
        url: "https://www.studocu.com/en-us/document/western-governors-university/cloud-security/syllabus-d485/119160478",
        source: "Studocu syllabus (unofficial; D485 unchanged by the Oct 2026 update)",
        notes: [
          "Performance Assessment (PA), one task: \"DGN1 Task 1: Cloud Security Implementation Plan and Presentation\".",
          "Three graded competencies: designing secure cloud solutions for data protection, implementing identity & access management, analyzing a risk-mitigation plan for cloud threats.",
          "Hands-on labs in Azure feed into the implementation plan and presentation."
        ]
      }]
    },
    {
      term: 3, code: "D484", name: "Penetration Testing", cu: 4,
      prereq: "Needs E123, D482 and D483 done first",
      notes: ["Aligned with CompTIA PenTest+ (per the Program Guide). WGU's transfer table lists PenTest+ as satisfying this course."],
      cert: null, transfer: false, inPerson: null,
      assess: { type: "unknown", guess: false, tasks: 1 }
    },
    {
      term: 3, code: "D488", name: "Cybersecurity Architecture and Engineering", cu: 4,
      prereq: "Needs D484 and D485 done first",
      notes: ["Aligned with CompTIA SecurityX (per the Program Guide). WGU's transfer table lists SecurityX / CASP+ as satisfying this course."],
      cert: null, transfer: false, inPerson: null,
      assess: { type: "unknown", guess: false, tasks: 1 }
    },
    {
      term: 3, code: "E122", name: "Human-Centric Risk in Cybersecurity", cu: 2,
      prereq: "No prerequisite",
      notes: [], cert: null, transfer: false, inPerson: null,
      assess: { type: "unknown", guess: false, tasks: 1 }
    },
    {
      term: 4, code: "D489", name: "Cybersecurity Management", cu: 4,
      prereq: "Needs D488 done first",
      notes: ["Aligned with ISACA CISM (per the Program Guide)."],
      cert: null, transfer: false, inPerson: null,
      assess: { type: "performance", guess: true, tasks: 1 },
      prep: [{
        url: "https://wgu-accelerators.net/courses/13bedb870134/",
        source: "WGU accelerator course guide (unofficial; D489 unchanged by the Oct 2026 update)",
        notes: [
          "Performance Assessment (PA): the main deliverable is security policy/governance documentation. One source mentions \"possible OA components\"; treat PA as the working assumption until the Course of Study page says otherwise.",
          "Deliverables: comprehensive security policy documentation, a governance plan, and strategic recommendations aligned to a rubric.",
          "Iterative: submit drafts early for revisions before final rubric review.",
          "A task-code reference (\"DEN1 Task 1\") suggests one main task, not independently confirmed.",
          "This is management level, above D482/D485: study policy vs. governance frameworks and risk-management strategy, not technical implementation."
        ]
      }]
    },
    {
      term: 4, code: "E121", name: "Governance, Risk, and Compliance in the Age of Artificial Intelligence", cu: 2,
      prereq: "Needs all prerequisite courses above done first",
      notes: ["Aligned with ISACA AAISM (per the Program Guide)."],
      cert: null, transfer: false, inPerson: null,
      assess: { type: "unknown", guess: false, tasks: 1 }
    },
    {
      term: 4, code: "D490", name: "Cybersecurity Graduate Capstone", cu: 4,
      prereq: "Needs every other course done first: always last",
      notes: [], cert: null, transfer: false, inPerson: null,
      assess: { type: "performance", guess: true, tasks: 1 },
      prep: [{
        url: "https://wguaccelerators.net/resources/wgu-d490-cybersecurity-graduate-capstone",
        source: "WGU accelerator resource (unofficial; D490 unchanged by the Oct 2026 update)",
        notes: [
          "Performance Assessment: \"a comprehensive cybersecurity project addressing real-world problems (such as risk assessments or security plans)\" plus a presentation, graded against a detailed rubric.",
          "Task count set to 1 (project + presentation as one deliverable). The source didn't confirm separate tasks, so this is a grounded guess, not WGU-official.",
          "Tips: pick a focused topic early tied to your career goals, use WGU's capstone templates, review NIST/ISO frameworks, attend capstone cohort sessions for planning feedback, submit drafts early."
        ]
      }]
    }
  ]
};
