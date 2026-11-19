/* Shared helpers for the test platform and the test maker.
   Works in the browser (window.TP) and in Node (module.exports). */
(function (root) {
  var TP = {};
  TP.LETTERS = "ABCDEFGH";

  /* ---------- small utils ---------- */
  TP.esc = function (s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  };
  // inline markup: __underline__ and **bold**
  TP.inline = function (s) {
    return TP.esc(s)
      .replace(/__(.+?)__/g, "<u>$1</u>")
      .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  };
  // a block whose lines all start with "|" is drawn as a table
  // (| a | b | rows; a |---|---| line marks the row above it as the header)
  TP.tableHTML = function (block) {
    var rows = block.trim().split("\n").map(function (l) {
      return l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(function (c) { return c.trim(); });
    });
    var html = '<table class="ptable">', headDone = false;
    rows.forEach(function (r, i) {
      if (r.every(function (c) { return /^:?-{2,}:?$/.test(c); })) return;
      var isHead = !headDone && rows[i + 1] && rows[i + 1].every(function (c) { return /^:?-{2,}:?$/.test(c); });
      if (isHead) headDone = true;
      var tag = isHead ? "th" : "td";
      html += "<tr>" + r.map(function (c) { return "<" + tag + ">" + TP.inline(c) + "</" + tag + ">"; }).join("") + "</tr>";
    });
    return html + "</table>";
  };
  TP.passageHTML = function (text) {
    return String(text || "").trim().split(/\n\s*\n/).map(function (p) {
      p = p.trim();
      if (p.split("\n").every(function (l) { return /^\s*\|/.test(l); })) return TP.tableHTML(p);
      return "<p>" + TP.inline(p).replace(/\n/g, "<br>") + "</p>";
    }).join("");
  };

  /* ---------- short answers: compared by a scrambled fingerprint ---------- */
  TP.normShort = function (s) {
    return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  };
  TP.shortHash = function (answer, id) { return TP.hash(TP.normShort(answer) + "|" + id); };

  /* ---------- review text, scrambled so it can't be read before the test ---------- */
  function toUtf8(s) { return unescape(encodeURIComponent(s)); }
  function fromUtf8(s) { return decodeURIComponent(escape(s)); }
  TP.encodeText = function (str, salt) {
    var sb = saltBytes("rv" + salt), s = toUtf8(str), out = "";
    for (var i = 0; i < s.length; i++) out += String.fromCharCode((s.charCodeAt(i) ^ sb[i % sb.length] ^ ((i * 7) & 255)) & 255);
    return b64e(out);
  };
  TP.decodeText = function (str, salt) {
    var sb = saltBytes("rv" + salt), bin = b64d(str), out = "";
    for (var i = 0; i < bin.length; i++) out += String.fromCharCode((bin.charCodeAt(i) ^ sb[i % sb.length] ^ ((i * 7) & 255)) & 255);
    return fromUtf8(out);
  };
  TP.shuffle = function (arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };
  TP.hash = function (str) { // FNV-1a, 32-bit, hex
    var h = 0x811c9dc5;
    str = String(str);
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return ("0000000" + h.toString(16)).slice(-8);
  };
  TP.slug = function (s) {
    return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "test";
  };

  /* ---------- answer-key encoding (keeps keys out of plain sight) ---------- */
  function saltBytes(s) {
    var a = [];
    for (var i = 0; i < s.length; i++) a.push(s.charCodeAt(i) & 255);
    return a.length ? a : [42];
  }
  var b64e = typeof btoa === "function" ? btoa : function (s) { return Buffer.from(s, "binary").toString("base64"); };
  var b64d = typeof atob === "function" ? atob : function (s) { return Buffer.from(s, "base64").toString("binary"); };
  TP.encodeKey = function (arr, salt) {
    var sb = saltBytes(salt), out = "";
    for (var i = 0; i < arr.length; i++) {
      var c = ((arr[i] + 17 + i * 3) & 255) ^ sb[i % sb.length] ^ ((i * 29) & 255);
      out += String.fromCharCode(c & 255);
    }
    return b64e(out);
  };
  TP.decodeKey = function (str, salt) {
    var sb = saltBytes(salt), bin = b64d(str), res = [];
    for (var i = 0; i < bin.length; i++) {
      var c = bin.charCodeAt(i) ^ sb[i % sb.length] ^ ((i * 29) & 255);
      res.push((((c - 17 - i * 3) % 256) + 256) % 256);
    }
    return res;
  };

  /* ---------- text format parser (used by maker + build) ----------
     === PASSAGE: Title          (starts a new text; passage lines follow)
     1. Question text
     A. option ... (2 to 8 options)
     ANSWER: B      (or KUNCI:)
     TYPE: Detail   (or TIPE:)   optional
     EXPLANATION: … (or PEMBAHASAN:) optional, may continue on next lines
  */
  TP.parseText = function (raw) {
    var lines = String(raw || "").replace(/\r/g, "").split("\n");
    var sections = [], errors = [], sec = null, q = null, mode = null;
    function newSection(title) {
      sec = { title: title || "", passage: "", questions: [] };
      sections.push(sec); q = null; mode = "passage";
    }
    function finishQ() { q = null; }
    for (var n = 0; n < lines.length; n++) {
      var line = lines[n], t = line.trim(), m;
      if ((m = t.match(/^={2,}\s*(?:PASSAGE|TEXT|TEKS|BACAAN)\s*:?\s*(.*)$/i))) {
        finishQ(); newSection(m[1].trim()); continue;
      }
      if ((m = t.match(/^(\d{1,3})\s*[.)]\s+(.+)$/)) && mode !== "explanation-strict") {
        if (!sec) newSection("");
        q = { q: m[2].trim(), o: [], a: null, t: "", e: "", line: n + 1 };
        sec.questions.push(q); mode = "question"; continue;
      }
      if (q && (m = t.match(/^([A-Ha-h])\s*[.)]\s+(.+)$/)) && (mode === "question" || mode === "options")) {
        q.o.push(m[2].trim()); mode = "options"; continue;
      }
      if (q && (m = t.match(/^(?:ANSWER|KUNCI|JAWABAN)\s*:\s*([A-Ha-h])\b/i))) {
        q.a = TP.LETTERS.indexOf(m[1].toUpperCase()); mode = "meta"; continue;
      }
      if (q && (m = t.match(/^(?:TYPE|TIPE)\s*:\s*(.+)$/i))) { q.t = m[1].trim(); mode = "meta"; continue; }
      if (q && (m = t.match(/^(?:EXPLANATION|PEMBAHASAN)\s*:\s*(.*)$/i))) { q.e = m[1].trim(); mode = "explanation"; continue; }
      if (t === "") {
        if (mode === "passage" && sec) sec.passage += "\n";
        continue;
      }
      if (mode === "passage" && sec && !q) { sec.passage += line + "\n"; continue; }
      if (q && mode === "question") { q.q += "\n" + t; continue; }
      if (q && mode === "explanation") { q.e += " " + t; continue; }
      if (q && mode === "options" && q.o.length) { q.o[q.o.length - 1] += " " + t; continue; }
      errors.push("Line " + (n + 1) + ": not understood → \"" + t.slice(0, 60) + "\"");
    }
    var count = 0;
    sections.forEach(function (s, si) {
      s.passage = s.passage.replace(/\n{3,}/g, "\n\n").trim();
      if (!s.questions.length) errors.push("Text " + (si + 1) + (s.title ? " (" + s.title + ")" : "") + " has no questions.");
      s.questions.forEach(function (qq) {
        count++;
        var label = "Question " + count + " (line " + qq.line + ")";
        if (qq.o.length < 2) errors.push(label + ": needs at least 2 options (A., B., …).");
        if (qq.a == null) errors.push(label + ": missing ANSWER: line.");
        else if (qq.a >= qq.o.length) errors.push(label + ": answer " + TP.LETTERS[qq.a] + " but only " + qq.o.length + " options.");
      });
    });
    if (!count) errors.push("No questions found. Questions must start with a number, e.g. \"1. What is ...\"");
    return { sections: sections, errors: errors, count: count };
  };

  /* ---------- build the test file students load ---------- */
  TP.buildTestObject = function (meta, parsed) {
    var id = meta.id || TP.slug(meta.title);
    var keys = [], sections = parsed.sections.map(function (s) {
      return {
        title: s.title, passage: s.passage,
        questions: s.questions.map(function (q) { keys.push(q.a); return { q: q.q, o: q.o, t: q.t || "General" }; })
      };
    });
    var obj = {
      id: id,
      title: meta.title || "Untitled test",
      description: meta.description || "",
      duration: Number(meta.duration) || 30,
      maxLeaves: Number(meta.maxLeaves) || 3,
      shuffleTexts: meta.shuffleTexts !== false,
      shuffleOptions: meta.shuffleOptions !== false,
      showResult: meta.showResult !== false,
      attempts: Number(meta.attempts) || 1,
      open: meta.open !== false,
      classes: meta.classes || [],
      codeHash: meta.code ? TP.hash(String(meta.code).trim().toUpperCase()) : "",
      sections: sections,
      key: TP.encodeKey(keys, id)
    };
    return obj;
  };
  TP.testFileSource = function (obj) {
    return "/* Test file generated by maker.html — upload into the tests/ folder\n" +
      "   and add \"tests/" + obj.id + ".js\" to the tests list in config.js. */\n" +
      "registerTest(" + JSON.stringify(obj, null, 1) + ");\n";
  };

  /* ---------- printable answer key for the teacher ---------- */
  TP.answerKeyHTML = function (meta, parsed, teacher) {
    var n = 0, rows = "", types = {};
    parsed.sections.forEach(function (s, si) {
      rows += '<tr class="sec"><td colspan="4">' + TP.esc(s.title || ("Text " + (si + 1))) + "</td></tr>";
      s.questions.forEach(function (q) {
        n++;
        var ty = q.t || "General"; types[ty] = (types[ty] || 0) + 1;
        rows += "<tr><td>" + n + "</td><td><b>" + TP.LETTERS[q.a] + "</b></td><td>" + TP.esc(ty) +
          "</td><td>" + TP.inline(q.e || "") + "</td></tr>";
      });
    });
    var typeList = Object.keys(types).map(function (k) { return TP.esc(k) + " (" + types[k] + ")"; }).join(" · ");
    return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Answer key — ' + TP.esc(meta.title) +
      '</title><style>body{font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:900px;margin:30px auto;padding:0 20px;color:#1d2433}' +
      'h1{font-size:22px;margin:0}p.m{color:#5b6475;margin:4px 0 18px}table{border-collapse:collapse;width:100%;font-size:14px}' +
      'td,th{border:1px solid #d5dae3;padding:7px 9px;vertical-align:top;text-align:left}th{background:#eef2f8}' +
      'tr.sec td{background:#f7f9fc;font-weight:600}td:nth-child(1),td:nth-child(2){text-align:center;width:38px}td:nth-child(3){width:140px}' +
      '.warn{background:#fff6e0;border:1px solid #f0d58a;padding:8px 12px;border-radius:6px;font-size:13px;margin-bottom:14px}' +
      '@media print{.warn{display:none}}</style></head><body>' +
      '<div class="warn">Teacher only. Keep this file off the student website.</div>' +
      "<h1>Answer key — " + TP.esc(meta.title) + "</h1>" +
      '<p class="m">' + n + " questions · " + typeList + (teacher ? " · " + TP.esc(teacher) : "") + "</p>" +
      "<table><tr><th>No</th><th>Key</th><th>Type</th><th>Explanation</th></tr>" + rows + "</table>" +
      '<p class="m" style="margin-top:14px">Numbers follow the original order. When "shuffle texts/options" is on, each student sees a different order, but scoring and the results sheet always use this original numbering.</p>' +
      "</body></html>";
  };

  if (typeof module !== "undefined" && module.exports) module.exports = TP;
  else root.TP = TP;
})(typeof window !== "undefined" ? window : this);
