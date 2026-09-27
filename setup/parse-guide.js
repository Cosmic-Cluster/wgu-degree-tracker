// ============================================================================
// parse-guide.js — turns the text of a WGU Program Guide PDF into course data.
//
// This file has NO dependency on pdf.js or the browser. It takes plain data:
//
//   pages = [ { items: [ { str, x, y, width }, ... ] }, ... ]
//
// where x/y are PDF coordinates (y grows UPWARD, as in PDF space) — exactly
// what pdf.js's page.getTextContent() gives you once you pull out
// transform[4] / transform[5]. setup.html does that conversion; the test
// script (setup/test/run-tests.js) does the same thing in Node.
//
// Why positions instead of plain text? The "Standard Path" table wraps long
// course names onto two or three lines, and the CU/Term numbers sit on their
// own line, vertically centered between the wrapped name lines. Plain text
// loses that; positions let us attach each name fragment to the numbers row
// nearest to it.
//
// Works as a classic <script> (sets window.WGUGuideParser) and as a Node
// module (module.exports), so the same code is used by the page and the tests.
// ============================================================================

(function (root) {
  "use strict";

  // How close (in PDF points) two text items' baselines must be to count as
  // the same line. Table rows in the guides are ~38pt apart; wrapped name
  // lines are ~12pt apart, so 2pt is safely "same line only".
  var SAME_LINE_TOLERANCE = 2;

  // A wrapped name fragment is attached to the nearest numbers row if it is
  // within this many points vertically. Observed offsets are ~6pt; rows are
  // ~38pt apart, so 20pt leaves room without grabbing a neighbouring row.
  var MAX_FRAGMENT_DISTANCE = 20;

  // A trailing number only counts as a CU/Term cell if there is at least this
  // much horizontal gap between it and the course name. Keeps names like
  // "Calculus 1" (if WGU ever wrote one that way) from being split.
  var MIN_CELL_GAP = 15;

  // Lines that end the Standard Path table.
  var STOP_PATTERNS = [
    /^Total CUs\b/i,
    /^Changes to Curriculum\b/i,
    /^Prerequisites\b/i,
    /^Areas of Study\b/i,
    /^Accessibility\b/i,
    /^Certifications\b/i
  ];

  // Section headings that describe requirements OUTSIDE the course list.
  // Each one found in the guide becomes a suggested "program requirement"
  // the student can keep or drop on the setup page. Notes paraphrase what
  // the guide itself says — nothing here is invented.
  var REQUIREMENT_HEADINGS = [
    {
      pattern: /^External Content (&|and) Basic Skills Exams$/i,
      id: "content-basic-skills-exams",
      name: "Content & basic skills exams",
      note: "Your Program Guide says you must pass the content exam(s) for your program, plus a basic skills exam for initial-licensure programs. These are often registered and paid for by you, with score reports sent to WGU. The WGU Student Handbook lists which exams your state needs."
    },
    {
      pattern: /^State Licensure Requirements$/i,
      id: "state-licensure",
      name: "State licensure requirements",
      note: "Your Program Guide says some states add requirements outside the degree, such as extra exams, performance assessments, state-history coursework, or background clearances. Check your state's section in the WGU Student Handbook."
    }
  ];

  // In-person components. These are the labels the tracker shows on a course
  // card and uses for that course's extra status button.
  var IN_PERSON_TYPES = ["Clinical", "Lab", "Student teaching", "Field experience"];

  // Course NAMES that say outright the course is in-person. Only the name is
  // trusted: descriptions mention "clinical judgment" etc. constantly, so
  // scanning them would mark nearly every nursing course, rightly or not.
  function inPersonFromName(name) {
    if (/\bStudent Teaching\b/i.test(name)) return "Student teaching";
    if (/\bClinical\b/i.test(name)) return "Clinical";
    if (/\b(Practicum|Field Experience)\b/i.test(name)) return "Field experience";
    return null;
  }

  // --------------------------------------------------------------------------
  // Small helpers
  // --------------------------------------------------------------------------

  function collapse(s) { return String(s).replace(/\s+/g, " ").trim(); }

  // Lowercase, strip punctuation — used to compare course names from
  // different parts of the guide.
  function norm(s) { return collapse(String(s).toLowerCase().replace(/[^a-z0-9]+/g, " ")); }

  // Join tokens into text, adding a space only where there is a visible gap.
  // pdf.js sometimes splits "Human-Centric" into "Human", "-", "Centric"
  // with no gap between them; a blind join would give "Human - Centric".
  function joinTokens(toks) {
    var out = "";
    toks.forEach(function (t, i) {
      if (i > 0) {
        var prev = toks[i - 1];
        var touching = prev.width > 0 && (t.x - (prev.x + prev.width)) < 1;
        if (!touching) out += " ";
      }
      out += t.str;
    });
    return collapse(out);
  }

  function isNumber(s) { return /^\d{1,3}$/.test(s.trim()); }

  // Group a page's text items into lines (same baseline), top to bottom,
  // each line's tokens left to right.
  function toLines(page) {
    var items = page.items
      .filter(function (it) { return it.str && it.str.trim(); })
      .map(function (it) { return { str: it.str.trim(), x: it.x, y: it.y, width: it.width || 0 }; });
    items.sort(function (a, b) { return b.y - a.y || a.x - b.x; });

    var lines = [];
    items.forEach(function (it) {
      var line = lines.length ? lines[lines.length - 1] : null;
      if (line && Math.abs(line.y - it.y) <= SAME_LINE_TOLERANCE) {
        line.tokens.push(it);
      } else {
        lines.push({ y: it.y, tokens: [it] });
      }
    });
    lines.forEach(function (l) {
      l.tokens.sort(function (a, b) { return a.x - b.x; });
      l.text = joinTokens(l.tokens);
    });
    return lines;
  }

  // Split one line into the name part and the trailing numeric cells
  // (CUs, then one or more Term columns).
  function splitCells(line) {
    var toks = line.tokens;
    var i = toks.length;
    while (i > 0 && isNumber(toks[i - 1].str)) i--;
    var nameToks = toks.slice(0, i);
    var cellToks = toks.slice(i);
    if (cellToks.length && nameToks.length) {
      var last = nameToks[nameToks.length - 1];
      var gap = cellToks[0].x - (last.x + last.width);
      // If width info is missing (0), fall back to "cells are right of 45% of the name start"
      if (last.width === 0) gap = cellToks[0].x - last.x - 40;
      if (gap < MIN_CELL_GAP) { nameToks = toks; cellToks = []; }
    }
    return {
      name: joinTokens(nameToks),
      cells: cellToks.map(function (t) { return parseInt(t.str, 10); })
    };
  }

  function isFooter(text) {
    return /©|Western Governors University/.test(text);
  }

  function isHeaderLine(line) {
    var words = line.tokens.map(function (t) { return t.str; }).join(" ");
    return /\bCUs\b/.test(words) && /\b(Course|Title|Description)\b/.test(words);
  }

  // --------------------------------------------------------------------------
  // Main entry point
  // --------------------------------------------------------------------------

  function parse(pages) {
    var warnings = [];
    var allLines = pages.map(toLines);
    var fullText = allLines.map(function (ls) {
      return ls.map(function (l) { return l.text; }).join("\n");
    }).join("\n");

    var result = {
      programTitle: null,
      programCode: null,
      catalogVersion: null,
      level: null,               // "undergraduate" | "graduate" | null
      minCuPerTerm: null,        // what the guide itself says the minimum is
      termColumns: [],
      sections: [],              // names of standard-path parts, when a guide has more than one table           // e.g. ["Term"] or ["Option A", "Option B"]; [] = guide gives no terms
      statedTotalCu: null,       // "Total CUs" line, if the guide has one
      courses: [],
      requirements: [],
      warnings: warnings
    };

    // ---- find the Standard Path table --------------------------------------
    var start = null;
    for (var p = 0; p < allLines.length && !start; p++) {
      for (var li = 0; li < allLines[p].length; li++) {
        if (/^Standard Path for\b/i.test(allLines[p][li].text)) { start = { p: p, li: li }; break; }
      }
    }
    if (!start) {
      warnings.push("Couldn't find a \"Standard Path for …\" table in this PDF. Is it a WGU Program Guide?");
      return result;
    }

    // Title = "Standard Path for X" plus any wrapped title lines, up to the header row.
    var titleParts = [allLines[start.p][start.li].text.replace(/^Standard Path for\s*/i, "")];
    var headerAt = null, optionLine = null;
    var sp = start.p, sl = start.li + 1;
    while (sp < allLines.length && !headerAt) {
      while (sl < allLines[sp].length) {
        var ln = allLines[sp][sl];
        if (isHeaderLine(ln)) { headerAt = { p: sp, li: sl }; break; }
        if (/\bOption\b/.test(ln.text)) optionLine = ln;
        else if (!isFooter(ln.text) && !/^\d+$/.test(ln.text)) titleParts.push(ln.text);
        sl++;
      }
      if (!headerAt) { sp++; sl = 0; }
    }
    result.programTitle = collapse(titleParts.join(" "));
    if (!headerAt) {
      warnings.push("Found the Standard Path title but not its column header row (Course / CUs / Term).");
      return result;
    }

    // Term columns
    var headerWords = allLines[headerAt.p][headerAt.li].tokens.map(function (t) { return t.str; }).join(" ");
    var termCount = (headerWords.match(/\bTerm\b/g) || []).length;
    if (termCount > 1 && optionLine) {
      var labels = optionLine.text.match(/Option\s+\S+/g) || [];
      for (var k = 0; k < termCount; k++) result.termColumns.push(labels[k] || ("Term column " + (k + 1)));
    } else if (termCount === 1) {
      result.termColumns.push("Term");
    }

    // ---- walk the table rows until a stop line ------------------------------
    var rows = [];            // {page, y, cells, frags:[{y,text}]}
    var nameLines = [];       // {page, y, text}  — name-only lines, attached later
    var stopped = false;
    var firstParen = result.programTitle.match(/\(([^)]+)\)\s*$/);
    var sections = [firstParen ? firstParen[1] : ""];   // section names, index = row.section
    for (p = headerAt.p; p < allLines.length && !stopped; p++) {
      var lines = allLines[p];
      for (li = (p === headerAt.p ? headerAt.li + 1 : 0); li < lines.length; li++) {
        var line = lines[li];
        var text = line.text;
        var totalMatch = text.match(/^Total CUs\s+(\d+)/i);
        if (totalMatch) result.statedTotalCu = parseInt(totalMatch[1], 10);
        if (STOP_PATTERNS.some(function (re) { return re.test(text); })) { stopped = true; break; }
        if (isFooter(text) || isHeaderLine(line) || /^(Option\s+\S+\s*)+$/.test(text) || /^(Term\s*)+$/.test(text)) continue;
        // Some guides split the standard path into several tables, e.g.
        // prelicensure nursing: "... (Pre-Nursing)" then "... (Nursing)",
        // with term numbers restarting at 1 in each. Track which section
        // each row belongs to so terms can be offset later.
        if (/^Standard Path for\b/i.test(text)) {
          var secName = text.replace(/^Standard Path for\s*/i, "");
          var paren = secName.match(/\(([^)]+)\)\s*$/);
          sections.push(paren ? paren[1] : secName);
          continue;
        }

        var split = splitCells(line);
        if (split.cells.length) {
          var row = { page: p, y: line.y, cells: split.cells, frags: [], section: sections.length - 1 };
          if (split.name) row.frags.push({ y: line.y, text: split.name });
          rows.push(row);
        } else if (split.name) {
          nameLines.push({ page: p, y: line.y, text: split.name });
        }
      }
    }
    if (!stopped) warnings.push("The course table never hit a \"Total CUs\" line or a following section, so the end of the table was guessed.");

    // Attach wrapped name fragments to the nearest numbers row on the same page.
    nameLines.forEach(function (nl) {
      var best = null, bestD = Infinity;
      rows.forEach(function (r) {
        if (r.page !== nl.page) return;
        var d = Math.abs(r.y - nl.y);
        if (d < bestD) { bestD = d; best = r; }
      });
      if (best && bestD <= MAX_FRAGMENT_DISTANCE) best.frags.push({ y: nl.y, text: nl.text });
      else warnings.push("Ignored stray text inside the course table: \"" + nl.text + "\"");
    });

    // ---- build course records ---------------------------------------------
    rows.forEach(function (r) {
      if (!r.frags.length) {
        // A number with no name next to it is almost always a page number.
        if (r.cells.length > 1) warnings.push("Ignored a row of numbers with no course name: " + r.cells.join(" "));
        return;
      }
      r.frags.sort(function (a, b) { return b.y - a.y; });
      var name = collapse(r.frags.map(function (f) { return f.text; }).join(" "));
      var course = {
        name: name,
        code: "",
        cu: r.cells[0],
        guideTerms: r.cells.slice(1),   // one entry per term column (may be empty)
        transfer: false,
        notes: [],
        inPerson: inPersonFromName(name),   // null | one of IN_PERSON_TYPES
        section: r.section
      };
      if (result.termColumns.length && course.guideTerms.length !== result.termColumns.length) {
        warnings.push("\"" + name + "\" has " + course.guideTerms.length + " term value(s) but the table has " + result.termColumns.length + " term column(s) — check its term.");
      }
      // Term 0 in the guide = satisfied before you start (e.g. "Advanced Standing for RN License").
      if (course.guideTerms.length && course.guideTerms[0] === 0) {
        course.transfer = true;
        course.notes.push("Guide lists this in term 0 — satisfied before you start (advanced standing / transfer).");
      }
      result.courses.push(course);
    });

    // Multi-section standard path: make term numbers continue across
    // sections (Nursing term 1 becomes term 5 after a 4-term Pre-Nursing
    // section) and label each course with its section.
    if (sections.length > 1) {
      var offset = 0;
      for (var s = 0; s < sections.length; s++) {
        var inSec = result.courses.filter(function (c) { return c.section === s; });
        var maxInSec = 0;
        inSec.forEach(function (c) {
          c.notes.unshift(sections[s] + " part of the standard path.");
          c.guideTerms = c.guideTerms.map(function (t) { return t > 0 ? t + offset : t; });
          c.guideTerms.forEach(function (t) { if (t > maxInSec) maxInSec = t; });
        });
        offset = Math.max(offset, maxInSec);
      }
      result.sections = sections.slice();
      // "Nursing - Prelicensure (Pre-Nursing)" -> "Nursing - Prelicensure"
      result.programTitle = result.programTitle.replace(/\s*\([^)]+\)\s*$/, "");
      warnings.push("This guide splits its standard path into " + sections.length + " parts (" + sections.join(", ") +
        "), each numbering its terms from 1. Terms were renumbered to run on continuously. Moving from one part to the next may need a separate admission or approval, so check with your program mentor.");
    }
    result.courses.forEach(function (c) { delete c.section; });

    var sum = result.courses.reduce(function (s, c) { return s + c.cu; }, 0);
    if (result.statedTotalCu !== null && sum !== result.statedTotalCu) {
      warnings.push("Parsed courses add up to " + sum + " CUs but the guide's Total CUs line says " + result.statedTotalCu + ". Some rows were probably misread — compare against the PDF.");
    }
    if (result.statedTotalCu === null) {
      warnings.push("This guide has no \"Total CUs\" line, so the parsed total (" + sum + " CUs) couldn't be double-checked. Compare against the PDF.");
    }

    // ---- metadata -----------------------------------------------------------
    var codeMatch = fullText.match(/Program Code:\s*([A-Z0-9]+)/);
    var verMatch = fullText.match(/Catalog Version:\s*(\d{6})/);
    if (!codeMatch) {
      // Older guides put "MATELED 202411  © 2019 ..." in the page footer instead.
      // Some list two codes: "BSPNTR/BSNPLTR 202303 © ..." — keep the first.
      var foot = fullText.match(/^([A-Z][A-Z0-9]{2,11})(?:\/[A-Z0-9]+)*\s+(\d{6})\s+©/m);
      if (foot) { codeMatch = [null, foot[1]]; verMatch = verMatch || [null, foot[2]]; }
    }
    result.programCode = codeMatch ? codeMatch[1] : null;
    result.catalogVersion = verMatch ? verMatch[1] : null;

    if (/^Bachelor/i.test(result.programTitle)) result.level = "undergraduate";
    else if (/^Master/i.test(result.programTitle)) result.level = "graduate";

    var flat = collapse(fullText);
    var gradMin = flat.match(/Graduate students are expected to enroll in a minimum of (\d+)/i);
    var ugMin = flat.match(/undergraduate student, you will be expected to enroll in a minimum of (\d+)/i);
    if (result.level === "graduate" && gradMin) result.minCuPerTerm = parseInt(gradMin[1], 10);
    if (result.level === "undergraduate" && ugMin) result.minCuPerTerm = parseInt(ugMin[1], 10);

    // ---- course codes (only some guides list them, usually under Prerequisites)
    var byNorm = {};
    result.courses.forEach(function (c) { byNorm[norm(c.name)] = c; });
    var codeRe = /^[•●\-\s]*([A-Z]{1,2}\d{3,4})\s+(.{4,})$/;
    allLines.forEach(function (ls) {
      ls.forEach(function (l) {
        var m = l.text.match(codeRe);
        if (!m) return;
        var code = m[1], label = norm(m[2]);
        var hit = byNorm[label];
        var loose = false;
        if (!hit) {
          // The guide sometimes shortens names in the prerequisite list
          // ("Security Fundamentals" vs "Cybersecurity Fundamentals"). Accept a
          // containment match only when exactly one course fits.
          var cands = result.courses.filter(function (c) {
            var n = norm(c.name);
            return n.indexOf(label) !== -1 || label.indexOf(n) !== -1;
          });
          if (cands.length === 1) { hit = cands[0]; loose = true; }
        }
        if (hit && !hit.code) {
          hit.code = code;
          if (loose) hit.notes.push("Course code " + code + " was matched to a differently worded name in the guide (\"" + collapse(m[2]) + "\") — double-check it.");
        }
      });
    });

    // ---- certification alignments ------------------------------------------
    var certRe = /The course (.+?) has alignment (?:with|to) (?:the )?(.+?)\.(?=\s|$)/g;
    var cm;
    while ((cm = certRe.exec(flat)) !== null) {
      var target = byNorm[norm(cm[1])];
      if (target) target.notes.push("Aligned with " + collapse(cm[2]) + " (per the Program Guide).");
    }

    // ---- requirements outside the course list ------------------------------
    var seen = {};
    allLines.forEach(function (ls) {
      ls.forEach(function (l) {
        REQUIREMENT_HEADINGS.forEach(function (h) {
          if (!seen[h.id] && h.pattern.test(l.text)) {
            seen[h.id] = true;
            result.requirements.push({ id: h.id, name: h.name, note: h.note, source: "guide" });
          }
        });
      });
    });

    return result;
  }

  // --------------------------------------------------------------------------
  // Term bucketing
  // --------------------------------------------------------------------------

  // Assign a planned term to each course.
  //   mode "guide":  use the guide's own term column (columnIndex picks Option A/B etc.)
  //   mode "target": walk courses in guide order, starting a new term once the
  //                  current one has at least cuPerTerm CUs. "At least" (not
  //                  "at most") because the number the guide gives is WGU's
  //                  per-term MINIMUM; filling only up to it would plan terms
  //                  below the minimum whenever course sizes don't add up evenly.
  // Transfer courses always go in term 1 (they're already done, so they cost
  // nothing and shouldn't push other courses later).
  function assignTerms(courses, mode, opts) {
    opts = opts || {};
    if (mode === "guide") {
      var col = opts.columnIndex || 0;
      return courses.map(function (c) {
        var t = c.guideTerms[col];
        return c.transfer ? 1 : (t && t > 0 ? t : 1);
      });
    }
    var target = Math.max(1, opts.cuPerTerm || 12);
    var term = 1, used = 0;
    return courses.map(function (c) {
      if (c.transfer) return 1;
      if (used >= target) { term++; used = 0; }
      used += c.cu;
      return term;
    });
  }

  // --------------------------------------------------------------------------
  // Web-page course list (pasted by the student)
  // --------------------------------------------------------------------------

  // Program Guide PDFs often DON'T say which courses have in-person parts, but
  // the program's page on wgu.edu sometimes does, in a list like:
  //
  //   Basic Nursing Skills (in-person learning lab experience)
  //   Adult Health I*
  //   *This course includes online coursework and in-person clinical requirements.
  //
  // This reads that pasted text and reports which courses to mark. It never
  // changes courses itself; the setup page applies the result. Lines are
  // matched to courses by name (longest name wins, so "Adult Health II" is not
  // taken as "Adult Health I").
  function readWebCourseList(text, courses) {
    var lines = String(text).split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);

    // What does an asterisk mean on this page? Read the footnote.
    var starMeaning = null;
    lines.forEach(function (l) {
      if (!/^\*\s*\S/.test(l) || /^\*\s+\S/.test(l) && !/course|requirement/i.test(l)) return;
      if (/clinical/i.test(l)) starMeaning = starMeaning || "Clinical";
      else if (/\blab/i.test(l)) starMeaning = starMeaning || "Lab";
      else if (/in-?person/i.test(l)) starMeaning = starMeaning || "Field experience";
    });

    var normed = courses.map(function (c) { return norm(c.name); });
    var results = [];      // {index, inPerson, note}
    var seen = {};
    lines.forEach(function (raw) {
      // Strip list bullets ("* ", "• ", "- "), but not a footnote's leading "*".
      var line = raw.replace(/^[•●\-–]\s+/, "").replace(/^\*\s+/, "");
      var ln = norm(line);
      var best = -1, bestLen = 0;
      normed.forEach(function (n, i) {
        if (n && (ln === n || ln.indexOf(n + " ") === 0) && n.length > bestLen) { best = i; bestLen = n.length; }
      });
      if (best === -1 || seen[best]) return;

      // Everything after the course name on this line.
      var rest = line.slice(Math.min(line.length, courses[best].name.length));
      var paren = (rest.match(/\(([^)]*)\)/) || [])[1] || "";
      var type = null, note = null;
      if (/in-?person/i.test(paren)) {
        type = /\blab/i.test(paren) ? "Lab" : /clinical/i.test(paren) ? "Clinical" : "Field experience";
        note = "Program web page: " + paren.trim() + ".";
      } else if (/virtual/i.test(paren)) {
        note = "Program web page: " + paren.trim() + " (not in person).";
      }
      if (/^\s*\*/.test(rest) || /\*\s*$/.test(line)) {
        type = starMeaning || "Field experience";
        note = (note ? note + " " : "") + "Program web page marks this course as including in-person " +
          (starMeaning ? starMeaning.toLowerCase() : "") + " requirements.";
        note = note.replace("in-person  requirements", "in-person requirements");
      }
      seen[best] = true;
      if (type || note) results.push({ index: best, inPerson: type, note: note });
    });
    return { matchedLines: Object.keys(seen).length, marks: results, starMeaning: starMeaning };
  }

  var api = { parse: parse, assignTerms: assignTerms, readWebCourseList: readWebCourseList, IN_PERSON_TYPES: IN_PERSON_TYPES, _norm: norm };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.WGUGuideParser = api;
})(typeof window !== "undefined" ? window : this);
