/* UTBK-style test platform — student side. */
(function () {
  "use strict";
  var C = window.APP_CONFIG || {};
  var TP = window.TP;
  var TESTS = [];
  var LOAD_ERRORS = [];
  window.registerTest = function (t) { if (t && t.id) TESTS.push(prep(t)); };

  var app = document.getElementById("app");
  var modalRoot = document.getElementById("modal-root");

  /* ---------------- storage ---------------- */
  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) { } }
  };
  function stateKey(testId, st) { return "tp_state|" + testId + "|" + st.kelas + "|" + st.name; }
  function doneKey(testId, st) { return "tp_done|" + testId + "|" + st.kelas + "|" + st.name; }

  /* ---------------- config helpers ---------------- */
  function classList() {
    var out = {}, cl = C.classes || {};
    Object.keys(cl).forEach(function (k) {
      var v = cl[k];
      var names = Array.isArray(v) ? v : String(v).split(/\r?\n/);
      names = names.map(function (s) { return String(s).trim(); }).filter(Boolean);
      out[k] = names;
    });
    return out;
  }
  function formInfo() {
    var link = String(C.googleFormPrefilledLink || "").trim();
    if (!link) return null;
    try {
      var u = new URL(link);
      var action = u.origin + u.pathname.replace(/\/(viewform|edit|prefill)[^/]*$/, "/formResponse");
      var map = {};
      u.searchParams.forEach(function (v, k) { if (k.indexOf("entry.") === 0) map[v.trim().toUpperCase()] = k; });
      return { action: action, map: map };
    } catch (e) { return null; }
  }
  function codeFor(t) { // config.js accessCodes win over the code inside the test file
    var ac = C.accessCodes || {};
    if (Object.prototype.hasOwnProperty.call(ac, t.id)) {
      var raw = String(ac[t.id] || "").trim();
      if (!raw) return null;
      var m = raw.match(/^hidden:([0-9a-f]{8})$/i); // scrambled code made in maker.html
      return { hash: m ? m[1].toLowerCase() : TP.hash(raw.toUpperCase()) };
    }
    return t.codeHash ? { hash: t.codeHash } : null;
  }
  function isUnlimited(st) {
    return (C.unlimitedAttemptsFor || []).some(function (n) { return n === st.name; });
  }

  /* ---------------- test prep ---------------- */
  function prep(t) {
    t.duration = Number(t.duration) || 30;
    t.maxLeaves = Number((C.antiCheat || {}).maxViolations) || Number(t.maxLeaves) || 3;
    t.attempts = Number(t.attempts) || 1;
    t._flat = []; // original order: {si, qi, g}
    t.sections.forEach(function (s, si) {
      s._start = t._flat.length;
      s.questions.forEach(function (q, qi) { t._flat.push({ si: si, qi: qi, g: t._flat.length }); });
    });
    t._count = t._flat.length;
    return t;
  }
  function Q(t, g) { var f = t._flat[g]; return t.sections[f.si].questions[f.qi]; }

  /* question kinds: "mc" (A–E, default), "table" (one choice per row), "short" (typed answer) */
  function kindOf(q) { return q.kind || "mc"; }
  function isAnswered(q, a) {
    if (a == null) return false;
    var k = kindOf(q);
    if (k === "table") return a.some(function (x) { return x != null; });
    if (k === "short") return String(a).trim() !== "";
    return true;
  }
  function isCorrect(t, q, a, keyVal) {
    if (!isAnswered(q, a)) return false;
    var k = kindOf(q);
    if (k === "table") {
      for (var r = 0; r < q.rows.length; r++) {
        if (a[r] == null || a[r] !== ((keyVal >> r) & 1)) return false;
      }
      return true;
    }
    if (k === "short") return TP.shortHash(a, t.id) === q.h;
    return a === keyVal;
  }
  function answerCode(q, a) { // short form for the results sheet
    var k = kindOf(q);
    if (!isAnswered(q, a)) return "-";
    if (k === "table") return "[" + q.rows.map(function (_, r) { return a[r] == null ? "-" : String(a[r] + 1); }).join("") + "]"; // 1 = first column, 2 = second
    if (k === "short") return '"' + String(a).trim().slice(0, 40) + '"';
    return TP.LETTERS[a];
  }

  function loadScripts(list) {
    return list.reduce(function (p, src) {
      return p.then(function () {
        return new Promise(function (res) {
          var s = document.createElement("script");
          s.src = src + (src.indexOf("?") > -1 ? "&" : "?") + "v=" + Date.now();
          s.onload = function () { res(); };
          s.onerror = function () { LOAD_ERRORS.push(src); res(); };
          document.body.appendChild(s);
        });
      });
    }, Promise.resolve());
  }

  /* ---------------- modal ---------------- */
  function modal(html, cls) {
    modalRoot.innerHTML = '<div class="modal-back"><div class="modal ' + (cls || "") + '">' + html + "</div></div>";
    return modalRoot.querySelector(".modal");
  }
  function closeModal() { modalRoot.innerHTML = ""; }
  function confirmBox(title, body, okText, cancelText, onOk, okCls) {
    var m = modal("<h3>" + title + "</h3><div>" + body + '</div><div class="actions">' +
      '<button class="btn ghost" data-x="no">' + (cancelText || "Batal") + '</button>' +
      '<button class="btn ' + (okCls || "") + '" data-x="ok">' + (okText || "OK") + "</button></div>");
    m.querySelector('[data-x=no]').onclick = closeModal;
    m.querySelector('[data-x=ok]').onclick = function () { closeModal(); onOk(); };
  }

  /* ---------------- fullscreen ---------------- */
  var docEl = document.documentElement;
  var fsSupported = !!(docEl.requestFullscreen || docEl.webkitRequestFullscreen);
  function isFs() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
  function enterFs() {
    try {
      var p = docEl.requestFullscreen ? docEl.requestFullscreen({ navigationUI: "hide" }) : docEl.webkitRequestFullscreen();
      if (p && p.catch) p.catch(function () { });
    } catch (e) { }
  }
  function exitFs() {
    try {
      if (!isFs()) return;
      var p = document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen();
      if (p && p.catch) p.catch(function () { });
    } catch (e) { }
  }

  /* ---------------- shell pages ---------------- */
  function topbar(st) {
    return '<div class="topbar"><h1>' + TP.esc(C.appTitle || "UTBK Training") + "</h1>" +
      (st ? '<div class="who">' + TP.esc(st.name) + " · " + TP.esc(st.kelas) +
        ' <a href="#" id="chg">Ganti</a></div>' : "") + "</div>";
  }
  function footer() {
    return '<div class="footer">' + (C.teacher ? TP.esc(C.teacher) + " · " : "") + "UTBK Training</div>";
  }
  function testModeBanner() {
    return formInfo() ? "" : '<div class="banner warn"><b>Mode uji coba:</b> skor belum dikirim ke guru karena link Google Form belum diisi di <code>config.js</code>.</div>';
  }

  function renderLogin() {
    document.body.classList.remove("in-test");
    var cl = classList(), names = Object.keys(cl);
    app.innerHTML = topbar(null) + '<div class="page">' + testModeBanner() +
      '<div class="card"><h2>Selamat datang 👋</h2><p class="muted">Pilih kelas dan namamu sebelum mengerjakan tes.</p>' +
      '<label class="field" for="kelas">Kelas</label><select id="kelas"><option value="">— pilih kelas —</option>' +
      names.map(function (k) { return '<option>' + TP.esc(k) + "</option>"; }).join("") + "</select>" +
      '<label class="field" for="nama">Nama</label><select id="nama" disabled><option value="">— pilih kelas dulu —</option></select>' +
      '<button class="btn block" id="go" disabled>Masuk</button></div>' + footer() + "</div>";
    var kSel = document.getElementById("kelas"), nSel = document.getElementById("nama"), go = document.getElementById("go");
    kSel.onchange = function () {
      var list = cl[kSel.value] || [];
      nSel.innerHTML = '<option value="">— pilih namamu —</option>' + list.map(function (n) { return "<option>" + TP.esc(n) + "</option>"; }).join("");
      nSel.disabled = !list.length; go.disabled = true;
    };
    nSel.onchange = function () { go.disabled = !nSel.value; };
    go.onclick = function () {
      var st = { kelas: kSel.value, name: nSel.value };
      confirmBox("Ini benar kamu?", "<p><b>" + TP.esc(st.name) + "</b><br>" + TP.esc(st.kelas) +
        '</p><p class="muted small">Nama ini akan dikirim bersama skormu ke guru.</p>', "Ya, benar", "Bukan",
        function () { LS.set("tp_student", st); renderHome(); });
    };
  }

  function attemptsOf(t, st) { return LS.get(doneKey(t.id, st), []); }
  function extraKey(t, st) { return "tp_extra|" + t.id + "|" + st.kelas + "|" + st.name; }
  function attemptsLeft(t, st) {
    if (isUnlimited(st)) return 99;
    return t.attempts + (LS.get(extraKey(t, st), 0) || 0) - attemptsOf(t, st).length;
  }
  function resetHash() {
    var raw = String(C.teacherResetCode || "").trim();
    if (!raw) return "";
    var m = raw.match(/^hidden:([0-9a-f]{8})$/i);
    return m ? m[1].toLowerCase() : TP.hash(raw.toUpperCase());
  }
  function askTeacherReset(t, st) {
    var m = modal("<h3>Buka kesempatan lagi</h3><p>Minta <b>guru</b> mengetik PIN di bawah ini.</p>" +
      '<input type="password" id="rpin" autocomplete="off" placeholder="PIN guru">' +
      '<p class="muted small" id="rmsg" style="min-height:1.2em"></p>' +
      '<div class="actions"><button class="btn ghost" id="rno">Batal</button><button class="btn" id="rok">Buka</button></div>');
    var inp = m.querySelector("#rpin"); inp.focus();
    m.querySelector("#rno").onclick = closeModal;
    function tryIt() {
      if (TP.hash(inp.value.trim().toUpperCase()) !== resetHash()) { m.querySelector("#rmsg").textContent = "PIN salah."; inp.value = ""; return; }
      LS.set(extraKey(t, st), (LS.get(extraKey(t, st), 0) || 0) + 1);
      closeModal(); renderHome();
    }
    m.querySelector("#rok").onclick = tryIt;
    inp.onkeydown = function (e) { if (e.key === "Enter") tryIt(); };
  }

  function renderHome() {
    inReview = false;
    document.body.classList.remove("in-test");
    var st = LS.get("tp_student", null);
    if (!st) return renderLogin();
    var visible = TESTS.filter(function (t) {
      return t.open !== false && (!t.classes || !t.classes.length || t.classes.indexOf(st.kelas) > -1);
    });
    var cards = visible.map(function (t) {
      var done = attemptsOf(t, st);
      var left = attemptsLeft(t, st);
      var last = done[done.length - 1];
      var status = "";
      if (done.length) status = '<span class="chip ok">Selesai' + (t.showResult !== false && last ? " · skor " + last.score : "") + "</span>";
      var revBtn = (last && last.rev && t.rv) ? '<button class="btn ghost" data-rev="' + TP.esc(t.id) + '">Pembahasan</button>' : "";
      return '<div class="card test-card"><div><h3>' + TP.esc(t.title) + "</h3>" +
        (t.description ? '<div class="muted small">' + TP.esc(t.description) + "</div>" : "") +
        '<div class="chips"><span class="chip">' + t._count + ' soal</span><span class="chip">' + t.duration +
        " menit</span>" + (codeFor(t) ? '<span class="chip">butuh kode</span>' : "") + status + "</div></div>" +
        '<div class="card-actions">' + revBtn +
        (left > 0 ? '<button class="btn" data-id="' + TP.esc(t.id) + '">' + (done.length ? "Kerjakan lagi" : "Mulai") + "</button>"
          : '<div style="text-align:right"><span class="chip closed">Kesempatan habis</span>' +
            (resetHash() ? '<br><button class="clear-link" data-reset="' + TP.esc(t.id) + '">Buka lagi (guru)</button>' : "") + "</div>") + "</div></div>";
    }).join("");
    if (!visible.length) cards = '<div class="card muted">Belum ada tes untukmu saat ini.</div>';
    var errs = LOAD_ERRORS.length ? '<div class="banner warn">Tidak bisa memuat: ' + LOAD_ERRORS.map(TP.esc).join(", ") + "</div>" : "";
    app.innerHTML = topbar(st) + '<div class="page">' + testModeBanner() + errs +
      '<p class="muted" style="margin:0 0 14px">Daftar tes</p>' + cards + footer() + "</div>";
    document.getElementById("chg").onclick = function (e) { e.preventDefault(); LS.del("tp_student"); renderLogin(); };
    app.querySelectorAll("[data-rev]").forEach(function (b) {
      b.onclick = function () {
        var t = TESTS.filter(function (x) { return x.id === b.getAttribute("data-rev"); })[0], d = attemptsOf(t, st);
        renderReview(t, d[d.length - 1]);
      };
    });
    app.querySelectorAll("[data-reset]").forEach(function (b) {
      b.onclick = function () { askTeacherReset(TESTS.filter(function (t) { return t.id === b.getAttribute("data-reset"); })[0], st); };
    });
    app.querySelectorAll("[data-id]").forEach(function (b) {
      b.onclick = function () { renderRules(TESTS.filter(function (t) { return t.id === b.getAttribute("data-id"); })[0]); };
    });
  }

  function renderRules(t) {
    var st = LS.get("tp_student", null);
    app.innerHTML = topbar(st) + '<div class="page"><div class="card"><h2>' + TP.esc(t.title) + "</h2>" +
      '<div class="chips"><span class="chip">' + t._count + ' soal</span><span class="chip">' + t.duration + " menit</span></div>" +
      '<h3 style="margin:20px 0 4px;font-size:16px">Peraturan</h3><ul class="rules">' +
      "<li>Waktu <b>" + t.duration + " menit</b> dimulai saat kamu menekan <i>Mulai Tes</i> dan terus berjalan walaupun halaman ditutup.</li>" +
      "<li>Tes berjalan dalam <b>layar penuh</b>. Jangan pindah tab, membuka aplikasi lain, atau keluar dari layar penuh.</li>" +
      "<li>Keluar dari halaman tes lebih dari " + Math.round(GRACE / 1000) + " detik dihitung <b>pelanggaran</b> dan dicatat untuk guru. Pada pelanggaran ke-" + t.maxLeaves +
      ", jawabanmu <b>dikumpulkan otomatis</b>.</li>" +
      (isTouch ? "<li>Pakai tablet/HP? Matikan notifikasi (mode <i>Jangan Ganggu</i>) dan tutup aplikasi lain sebelum mulai.</li>" : "") +
      "<li>Tandai soal yang ingin dicek lagi dengan tombol <b>Ragu-ragu</b>.</li>" +
      "<li>Saat waktu habis, jawaban dikumpulkan otomatis. Soal kosong dihitung salah (tidak ada pengurangan nilai).</li>" +
      (t.attempts === 1 ? "<li>Tes ini hanya bisa dikerjakan <b>satu kali</b>.</li>" : "") +
      "</ul>" +
      (codeFor(t) ? '<label class="field" for="code">Kode tes (dari guru)</label><input type="text" id="code" autocomplete="off" placeholder="Masukkan kode">' : "") +
      '<label class="check"><input type="checkbox" id="agree"> <span>Saya <b>' + TP.esc(st.name) + "</b> sudah membaca peraturan dan akan mengerjakan dengan jujur.</span></label>" +
      '<button class="btn block" id="start" disabled>Mulai Tes</button>' +
      '<button class="btn ghost block" id="back" style="margin-top:10px">Kembali</button></div>' + footer() + "</div>";
    document.getElementById("chg").onclick = function (e) { e.preventDefault(); LS.del("tp_student"); renderLogin(); };
    var agree = document.getElementById("agree"), start = document.getElementById("start");
    agree.onchange = function () { start.disabled = !agree.checked; };
    document.getElementById("back").onclick = renderHome;
    start.onclick = function () {
      var need = codeFor(t);
      if (need) {
        var c = document.getElementById("code").value.trim().toUpperCase();
        if (TP.hash(c) !== need.hash) {
          modal('<h3>Kode salah</h3><p>Tanyakan kode tes kepada gurumu.</p><div class="actions"><button class="btn" id="mok">OK</button></div>');
          document.getElementById("mok").onclick = closeModal; return;
        }
      }
      enterFs();
      beginTest(t, st);
    };
  }

  /* ---------------- the test ---------------- */
  var T = null, S = null; // current test + state
  var running = false, unloading = false, lastLeave = 0, tick = null, pos = 0;

  function save() { if (T && S) LS.set(stateKey(T.id, S), S); }

  function beginTest(t, st) {
    var secOrder = t.sections.map(function (_, i) { return i; });
    if (t.shuffleTexts) secOrder = TP.shuffle(secOrder);
    var optOrder = {};
    t._flat.forEach(function (f) {
      var n = (Q(t, f.g).o || []).length, idx = [];
      for (var i = 0; i < n; i++) idx.push(i);
      optOrder[f.g] = t.shuffleOptions ? TP.shuffle(idx) : idx;
    });
    var now = Date.now();
    S = {
      testId: t.id, kelas: st.kelas, name: st.name, secOrder: secOrder, optOrder: optOrder,
      answers: {}, flags: {}, pos: 0, start: now, end: now + t.duration * 60000, leaves: [],
      attempt: attemptsOf(t, st).length + 1, submitted: false
    };
    T = t;
    save();
    LS.set("tp_active", { testId: t.id, kelas: st.kelas, name: st.name });
    runTest();
  }

  function seq() { // display order → original index g
    var out = [];
    S.secOrder.forEach(function (si) {
      var s = T.sections[si];
      for (var qi = 0; qi < s.questions.length; qi++) out.push(s._start + qi);
    });
    return out;
  }

  function runTest() {
    running = true; unloading = false;
    pos = S.pos || 0;
    document.body.classList.add("in-test");
    app.innerHTML =
      '<div class="cbt"><div class="cbt-top"><div class="t-title">' + TP.esc(T.title) + "</div>" +
      '<div class="t-student">' + TP.esc(S.name) + " · " + TP.esc(S.kelas) + "</div>" +
      '<button class="btn-grid" id="gridBtn">Daftar Soal</button>' +
      '<div class="timer" id="timer" title="Sisa waktu">--:--</div></div>' +
      '<div class="cbt-body">' +
      '<section class="pane passage-pane"><div class="pane-head" id="pHead"></div><div class="pane-body passage" id="passage"></div></section>' +
      '<section class="pane question-pane"><div class="pane-head" id="qHead"></div><div class="pane-body"><div class="qtext" id="qtext"></div><div class="options" id="opts"></div>' +
      '<button class="clear-link" id="clear">Hapus pilihan</button></div>' +
      '<div class="qnav"><button class="btn ghost" id="prev">‹ Sebelumnya</button>' +
      '<label class="ragu"><input type="checkbox" id="flag"> Ragu-ragu</label>' +
      '<button class="btn" id="next">Selanjutnya ›</button></div></section>' +
      '<aside class="pane grid-pane" id="gridPane"><div class="pane-head"><b>Nomor Soal</b></div><div class="pane-body">' +
      '<div class="qgrid" id="qgrid"></div>' +
      '<div class="legend"><span class="l-ans">Sudah dijawab</span><span class="l-flag">Ragu-ragu</span><span>Belum dijawab</span></div>' +
      '<div class="stat-line" id="stat"></div><div class="leave-count" id="leaves"></div>' +
      '<button class="btn ok block" id="finish">Selesai &amp; Kumpulkan</button></div></aside></div></div>';

    var order = seq();
    var grid = document.getElementById("qgrid");
    grid.innerHTML = order.map(function (g, i) { return '<button class="qn" data-p="' + i + '">' + (i + 1) + "</button>"; }).join("");
    grid.onclick = function (e) {
      var b = e.target.closest("[data-p]"); if (!b) return;
      go(+b.getAttribute("data-p"));
      document.getElementById("gridPane").classList.remove("open");
    };
    document.getElementById("gridBtn").onclick = function () { document.getElementById("gridPane").classList.toggle("open"); };
    document.getElementById("prev").onclick = function () { go(pos - 1); };
    document.getElementById("next").onclick = function () { go(pos + 1); };
    document.getElementById("flag").onchange = function (e) {
      var g = order[pos];
      if (e.target.checked) S.flags[g] = 1; else delete S.flags[g];
      save(); paintGrid(); paintHead();
    };
    document.getElementById("clear").onclick = function () { delete S.answers[order[pos]]; save(); paintQuestion(); paintGrid(); };
    document.getElementById("finish").onclick = askFinish;

    function go(p) {
      if (p < 0 || p >= order.length) { if (p >= order.length) askFinish(); return; }
      pos = p; S.pos = p; save(); paintQuestion(); paintGrid();
      document.querySelector(".question-pane .pane-body").scrollTop = 0;
    }
    function sectionRange(si) {
      var first = -1, last = -1;
      order.forEach(function (g, i) { if (T._flat[g].si === si) { if (first < 0) first = i; last = i; } });
      return [first + 1, last + 1];
    }
    var shownSec = -1;
    function paintHead() {
      var g = order[pos];
      document.getElementById("qHead").innerHTML = "<span>Soal <b>" + (pos + 1) + "</b> dari " + order.length + "</span>" +
        (S.flags[g] ? '<span class="flag-badge">Ragu-ragu</span>' : "");
    }
    function paintQuestion() {
      var g = order[pos], f = T._flat[g], sec = T.sections[f.si], q = Q(T, g);
      if (shownSec !== f.si) {
        var r = sectionRange(f.si), hasText = !!(sec.passage && sec.passage.trim());
        var dispIdx = S.secOrder.indexOf(f.si) + 1;
        var secName = T.shuffleTexts ? "Teks " + dispIdx : (sec.title || "Teks " + dispIdx);
        document.getElementById("pHead").innerHTML = "<b>" + TP.esc(secName) + "</b><span>" +
          (r[0] === r[1] ? "Soal " + r[0] : "Soal " + r[0] + "–" + r[1]) + "</span>";
        document.getElementById("passage").innerHTML = hasText ? TP.passageHTML(sec.passage) : '<p class="muted">(Tidak ada bacaan untuk soal ini.)</p>';
        document.getElementById("passage").scrollTop = 0;
        shownSec = f.si;
      }
      paintHead();
      document.getElementById("qtext").innerHTML = TP.inline(q.q).replace(/\n/g, "<br>");
      var kind = kindOf(q), a = S.answers[g], optsEl = document.getElementById("opts");
      if (kind === "table") {
        optsEl.innerHTML = '<table class="qtable"><tr><th>Pernyataan</th>' + q.cols.map(function (c) { return "<th>" + TP.esc(c) + "</th>"; }).join("") + "</tr>" +
          q.rows.map(function (row, r) {
            return "<tr><td>" + TP.inline(row) + "</td>" + q.cols.map(function (c, ci) {
              var on = a && a[r] === ci;
              return '<td class="pick"><button class="tick' + (on ? " sel" : "") + '" data-r="' + r + '" data-c="' + ci + '" aria-label="' + TP.esc(c) + '">' + (on ? "✓" : "") + "</button></td>";
            }).join("") + "</tr>";
          }).join("") + '</table><p class="muted small">Pilih satu kolom untuk setiap baris. Soal ini benar hanya jika semua baris benar.</p>';
      } else if (kind === "short") {
        optsEl.innerHTML = '<input type="text" class="short-in" id="shortIn" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Ketik jawabanmu di sini" value="' + TP.esc(a || "") + '">' +
          '<p class="muted small">Ketik jawaban persis seperti di teks. Huruf besar/kecil tidak berpengaruh.</p>';
        var inp = document.getElementById("shortIn");
        inp.oninput = function () {
          if (inp.value.trim()) S.answers[g] = inp.value; else delete S.answers[g];
          save(); paintGrid();
          document.getElementById("clear").style.visibility = S.answers[g] == null ? "hidden" : "visible";
        };
      } else {
        var oo = S.optOrder[g];
        optsEl.innerHTML = oo.map(function (orig, i) {
          return '<button class="opt' + (a === orig ? " sel" : "") + '" data-o="' + orig + '"><span class="L">' +
            TP.LETTERS[i] + "</span><span>" + TP.inline(q.o[orig]) + "</span></button>";
        }).join("");
      }
      document.getElementById("clear").style.visibility = S.answers[g] == null ? "hidden" : "visible";
      document.getElementById("flag").checked = !!S.flags[g];
      document.getElementById("prev").disabled = pos === 0;
      document.getElementById("next").textContent = pos === order.length - 1 ? "Selesai ›" : "Selanjutnya ›";
    }
    document.getElementById("opts").onclick = function (e) {
      var g = order[pos], t = e.target.closest("[data-r]");
      if (t) {
        var q = Q(T, g), cur = Array.isArray(S.answers[g]) ? S.answers[g].slice() : q.rows.map(function () { return null; });
        cur[+t.getAttribute("data-r")] = +t.getAttribute("data-c");
        S.answers[g] = cur;
        save(); paintQuestion(); paintGrid(); return;
      }
      var b = e.target.closest("[data-o]"); if (!b) return;
      S.answers[g] = +b.getAttribute("data-o");
      save(); paintQuestion(); paintGrid();
    };
    function paintGrid() {
      var answered = 0, flagged = 0;
      grid.querySelectorAll(".qn").forEach(function (b, i) {
        var g = order[i], a = isAnswered(Q(T, g), S.answers[g]), fl = !!S.flags[g];
        if (a) answered++; if (fl) flagged++;
        b.className = "qn" + (fl ? " flag" : a ? " ans" : "") + (i === pos ? " cur" : "");
      });
      document.getElementById("stat").textContent = "Dijawab " + answered + "/" + order.length + (flagged ? " · Ragu-ragu " + flagged : "");
      var lv = document.getElementById("leaves");
      lv.textContent = "Pelanggaran: " + S.leaves.length + " / " + T.maxLeaves;
      lv.className = "leave-count" + (S.leaves.length ? " hot" : "");
    }
    window.__tpPaint = function () { paintGrid(); };

    paintQuestion(); paintGrid();
    startTimer();
    keepAwake();
  }

  function startTimer() {
    clearInterval(tick);
    var el = document.getElementById("timer");
    function upd() {
      var rem = S.end - Date.now();
      if (rem <= 0) { el.textContent = "00:00"; submit("Waktu habis"); return; }
      var s = Math.ceil(rem / 1000), m = Math.floor(s / 60);
      el.textContent = (m < 10 ? "0" : "") + m + ":" + ("0" + (s % 60)).slice(-2);
      el.className = "timer" + (rem <= 60000 ? " danger" : rem <= 5 * 60000 ? " warn" : "");
    }
    upd(); tick = setInterval(upd, 250);
  }

  function counts() {
    var a = 0, f = 0;
    T._flat.forEach(function (x) { if (isAnswered(Q(T, x.g), S.answers[x.g])) a++; if (S.flags[x.g]) f++; });
    return { answered: a, empty: T._count - a, flagged: f };
  }
  function askFinish() {
    var c = counts();
    confirmBox("Kumpulkan jawaban?",
      "<p>Dijawab: <b>" + c.answered + "</b> dari " + T._count + "<br>Belum dijawab: <b>" + c.empty + "</b>" +
      (c.flagged ? "<br>Masih ragu-ragu: <b>" + c.flagged + "</b>" : "") +
      '</p><p class="muted small">Setelah dikumpulkan, jawaban tidak bisa diubah.</p>',
      "Ya, kumpulkan", "Periksa lagi", function () { submit("Dikumpulkan siswa"); }, "ok");
  }

  /* ---------------- anti-cheat ---------------- */
  function fmtClock(ts) { var d = new Date(ts); return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2) + ":" + ("0" + d.getSeconds()).slice(-2); }
  function onLeave(reason) {
    if (!running || unloading || !S || S.submitted) return;
    var now = Date.now();
    if (now - lastLeave < 2000) return;
    lastLeave = now;
    S.leaves.push({ at: now, r: reason });
    save();
    if (window.__tpPaint) window.__tpPaint();
    if (S.leaves.length >= T.maxLeaves) { submit("Otomatis: keluar " + S.leaves.length + "x"); return; }
    showLeaveWarning(reason);
  }
  function showLeaveWarning(reason) {
    var left = T.maxLeaves - S.leaves.length;
    var m = modal("<h3>⚠️ Peringatan pelanggaran</h3>" +
      '<div class="big">' + S.leaves.length + " / " + T.maxLeaves + "</div>" +
      "<p>Kamu terdeteksi <b>" + TP.esc(reason) + "</b>. Kejadian ini sudah dicatat untuk guru.</p>" +
      "<p>Sisa " + left + " kali lagi sebelum jawabanmu <b>dikumpulkan otomatis</b>.</p>" +
      '<div class="actions"><button class="btn" id="backIn">Kembali ke tes</button></div>', "alert");
    m.querySelector("#backIn").onclick = function () { if (fsSupported && !isFs()) enterFs(); closeModal(); };
  }
  /* Tablets/phones: notifications, the keyboard and gestures cause false alarms,
     so there we only count real tab/app switches. Short leaves are ignored everywhere. */
  var AC = C.antiCheat || {};
  var GRACE = (AC.ignoreShorterThanSeconds != null ? Number(AC.ignoreShorterThanSeconds) : 3) * 1000;
  var isTouch = (window.matchMedia && matchMedia("(pointer: coarse)").matches) ||
    (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  var awayAt = 0, awayWhy = "";
  function goneAway(why) {
    if (!running || unloading || !S || S.submitted || awayAt) return;
    awayAt = Date.now(); awayWhy = why;
  }
  function cameBack() {
    if (!awayAt) return;
    var away = Date.now() - awayAt; awayAt = 0;
    if (!running || !S || S.submitted) return;
    keepAwake();
    if (away >= GRACE) onLeave(awayWhy + " (" + Math.round(away / 1000) + " detik)");
    else { S.shortLeaves = (S.shortLeaves || 0) + 1; save(); }
  }
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) goneAway("pindah tab / membuka aplikasi lain"); else cameBack();
  });
  window.addEventListener("blur", function () {
    if (isTouch) return; // tablets: notifications/keyboard steal focus — ignore
    setTimeout(function () { if (running && !document.hidden && !document.hasFocus()) goneAway("keluar dari jendela tes"); }, 300);
  });
  window.addEventListener("focus", function () { if (!document.hidden) cameBack(); });
  function fsChange() {
    if (!running || !fsSupported || isFs() || document.hidden) return;
    if (isTouch) { askFullscreen(); return; } // gestures exit fullscreen on tablets: just ask to go back
    onLeave("keluar dari layar penuh");
  }
  function askFullscreen() {
    if (modalRoot.innerHTML) return;
    var m = modal("<h3>Layar penuh</h3><p>Tes dikerjakan dalam layar penuh. Ketuk tombol di bawah untuk kembali.</p>" +
      '<div class="actions"><button class="btn" id="fsBack">Kembali ke layar penuh</button></div>');
    m.querySelector("#fsBack").onclick = function () { enterFs(); closeModal(); };
  }
  document.addEventListener("fullscreenchange", fsChange);
  document.addEventListener("webkitfullscreenchange", fsChange);
  /* keep the screen on during the test, so auto-lock doesn't count as leaving */
  var wakeLock = null;
  function keepAwake() {
    try {
      if (running && navigator.wakeLock && !wakeLock) navigator.wakeLock.request("screen").then(function (w) {
        wakeLock = w; w.addEventListener && w.addEventListener("release", function () { wakeLock = null; });
      }).catch(function () { });
    } catch (e) { }
  }
  function releaseAwake() { try { if (wakeLock) wakeLock.release(); } catch (e) { } wakeLock = null; }
  window.addEventListener("beforeunload", function (e) {
    if (!running) return;
    unloading = true;
    setTimeout(function () { unloading = false; }, 1500); // user may cancel
    e.preventDefault(); e.returnValue = "";
  });
  ["contextmenu", "copy", "cut", "paste", "dragstart"].forEach(function (ev) {
    document.addEventListener(ev, function (e) { if (running) e.preventDefault(); });
  });
  document.addEventListener("keydown", function (e) {
    if (!running) return;
    var k = (e.key || "").toLowerCase();
    if (e.key === "F12" || ((e.ctrlKey || e.metaKey) && ["c", "x", "v", "u", "s", "p", "a", "f"].indexOf(k) > -1) ||
      ((e.ctrlKey || e.metaKey) && e.shiftKey && ["i", "j", "c"].indexOf(k) > -1)) { e.preventDefault(); }
    var typing = e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName);
    if (!typing && !modalRoot.innerHTML && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (e.key === "ArrowRight") { var n = document.getElementById("next"); if (n) n.click(); }
      if (e.key === "ArrowLeft") { var p = document.getElementById("prev"); if (p && !p.disabled) p.click(); }
    }
  });

  /* ---------------- submit + send ---------------- */
  function fmtDur(ms) { var s = Math.max(0, Math.round(ms / 1000)); return Math.floor(s / 60) + "m " + ("0" + (s % 60)).slice(-2) + "s"; }
  function grade(t, s) {
    var key = TP.decodeKey(t.key, t.id), correct = 0, types = {}, ans = [];
    t._flat.forEach(function (f) {
      var q = Q(t, f.g), ty = q.t || "General", a = s.answers[f.g], ok = isCorrect(t, q, a, key[f.g]);
      types[ty] = types[ty] || { c: 0, n: 0 };
      types[ty].n++; if (ok) { types[ty].c++; correct++; }
      ans.push((f.g + 1) + answerCode(q, a) + (ok ? "✓" : "✗"));
    });
    return { correct: correct, total: t._count, score: Math.round(correct / t._count * 100), types: types, answers: ans.join(" ") };
  }

  function submit(reason) {
    if (!S || S.submitted) return;
    running = false; awayAt = 0;
    clearInterval(tick);
    releaseAwake();
    closeModal();
    var t = T, s = S;
    s.submitted = true; s.finishedAt = Date.now(); s.reason = reason;
    var r = grade(t, s);
    var typeTxt = Object.keys(r.types).map(function (k) { return k + " " + r.types[k].c + "/" + r.types[k].n; }).join("; ");
    var leaveTxt = s.leaves.length ? s.leaves.length + "x (" + s.leaves.map(function (l) { return fmtClock(l.at) + " " + l.r; }).join(", ") + ")" : "0x";
    var c = counts();
    var note = "Benar " + r.correct + "/" + r.total + " | " + typeTxt + " | Kosong " + c.empty +
      " | Waktu " + fmtDur(Math.min(s.finishedAt, s.end) - s.start) + " | Pelanggaran " + leaveTxt + (s.shortLeaves ? " | Keluar singkat diabaikan " + s.shortLeaves + "x" : "") +
      " | " + reason + " | Percobaan ke-" + s.attempt;
    var payload = {
      id: t.id + "|" + s.kelas + "|" + s.name + "|" + s.start,
      NAMA: s.name, KELAS: s.kelas, TES: t.title, SKOR: String(r.score), CATATAN: note, JAWABAN: r.answers
    };
    var done = attemptsOf(t, s);
    var rec = { score: r.score, correct: r.correct, total: r.total, at: s.finishedAt };
    if (t.showReview && t.rv) rec.rev = { answers: s.answers, optOrder: s.optOrder, secOrder: s.secOrder };
    done.push(rec);
    LS.set(doneKey(t.id, s), done);
    LS.del(stateKey(t.id, s));
    LS.del("tp_active");
    var q = LS.get("tp_queue", []); q.push(payload); LS.set("tp_queue", q);
    exitFs();
    document.body.classList.remove("in-test");
    renderResult(t, r, reason, "sending", rec);
    flushQueue().then(function (st) { if (!inReview) renderResult(t, r, reason, st, rec); });
    T = null; S = null;
  }

  function sendOne(p) {
    var f = formInfo();
    if (!f) return Promise.resolve("nolink");
    var body = new URLSearchParams();
    var note = p.CATATAN;
    ["NAMA", "KELAS", "TES", "SKOR", "CATATAN", "JAWABAN"].forEach(function (k) {
      if (f.map[k]) body.append(f.map[k], p[k]);
    });
    if (!f.map.JAWABAN && f.map.CATATAN) body.set(f.map.CATATAN, note + " | Jawaban: " + p.JAWABAN);
    return fetch(f.action, { method: "POST", mode: "no-cors", body: body }).then(function () { return "sent"; });
  }
  function flushQueue() {
    var q = LS.get("tp_queue", []);
    if (!q.length) return Promise.resolve("sent");
    if (!formInfo()) return Promise.resolve("nolink");
    var remaining = [];
    return q.reduce(function (p, item) {
      return p.then(function () { return sendOne(item).catch(function () { remaining.push(item); }); });
    }, Promise.resolve()).then(function () {
      LS.set("tp_queue", remaining);
      return remaining.length ? "failed" : "sent";
    });
  }

  function renderResult(t, r, reason, sendState, rec) {
    var st = LS.get("tp_student", null);
    var sendMsg = {
      sending: '<div class="sent no">Mengirim skor ke guru…</div>',
      sent: '<div class="sent ok">✓ Skor sudah dikirim ke guru.</div>',
      failed: '<div class="sent no">Skor belum terkirim karena internet terputus. Jangan hapus data browser. Skor akan dikirim otomatis saat halaman ini dibuka lagi dengan internet.</div>',
      nolink: '<div class="sent no">Mode uji coba: skor tidak dikirim (link Google Form belum diisi).</div>'
    }[sendState] || "";
    var body;
    if (t.showResult !== false) {
      var bars = Object.keys(r.types).map(function (k) {
        var x = r.types[k], pct = Math.round(x.c / x.n * 100);
        return '<div class="bar-row"><span>' + TP.esc(k) + '</span><div class="bar"><i style="width:' + pct + '%"></i></div><b>' + x.c + "/" + x.n + "</b></div>";
      }).join("");
      body = '<p class="muted" style="margin:0">Skor kamu</p><div class="score-big">' + r.score + "</div>" +
        '<p style="margin:0">Benar <b>' + r.correct + "</b> dari " + r.total + ' soal</p><p class="muted small">' + TP.esc(reason) + "</p>" +
        '<h3 style="font-size:16px;margin:22px 0 0">Hasil per tipe soal</h3><div class="bars">' + bars + "</div>";
    } else {
      body = "<p>Jawabanmu sudah dikumpulkan. Hasil akan diumumkan oleh guru.</p>";
    }
    app.innerHTML = topbar(st) + '<div class="page"><div class="card"><h2>' + TP.esc(t.title) + "</h2>" + body + sendMsg +
      (rec && rec.rev ? '<button class="btn ok block" id="rev">Lihat pembahasan</button><div style="height:10px"></div>' : "") +
      '<button class="btn block" id="home">Kembali ke daftar tes</button></div>' + footer() + "</div>";
    var rb = document.getElementById("rev"); if (rb) rb.onclick = function () { renderReview(t, rec); };
    var chg = document.getElementById("chg"); if (chg) chg.onclick = function (e) { e.preventDefault(); LS.del("tp_student"); renderLogin(); };
    document.getElementById("home").onclick = renderHome;
  }


  /* ---------------- review (pembahasan) after the test ---------------- */
  var inReview = false;
  function renderReview(t, rec) {
    inReview = true;
    var st = LS.get("tp_student", null), rv = rec.rev, key = TP.decodeKey(t.key, t.id), notes;
    try { notes = JSON.parse(TP.decodeText(t.rv, t.id)); } catch (e) { notes = []; }
    var secOrder = rv.secOrder || t.sections.map(function (_, i) { return i; });
    var n = 0, chips = "", items = "";
    secOrder.forEach(function (si, di) {
      var sec = t.sections[si], first = n + 1;
      var block = "";
      sec.questions.forEach(function (q, qi) {
        n++;
        var g = sec._start + qi, a = rv.answers[g], kind = kindOf(q), ok = isCorrect(t, q, a, key[g]), note = notes[g] || {};
        chips += '<a class="rchip ' + (ok ? "good" : "bad") + '" href="#rq' + n + '">' + n + "</a>";
        var body = "";
        if (kind === "table") {
          body = '<table class="qtable rtable"><tr><th>Pernyataan</th><th>Jawabanmu</th><th>Kunci</th></tr>' +
            q.rows.map(function (row, r) {
              var mine = a && a[r] != null ? q.cols[a[r]] : "—", right = q.cols[(key[g] >> r) & 1], hit = a && a[r] === ((key[g] >> r) & 1);
              return "<tr><td>" + TP.inline(row) + '</td><td class="' + (hit ? "good" : "bad") + '">' + TP.esc(mine) + "</td><td>" + TP.esc(right) + "</td></tr>";
            }).join("") + "</table>";
        } else if (kind === "short") {
          body = '<div class="ropt ' + (ok ? "mine good" : "mine bad") + '"><span class="tag">Jawabanmu</span> ' + (isAnswered(q, a) ? TP.esc(a) : "<i>(kosong)</i>") + "</div>" +
            (ok ? "" : '<div class="ropt right"><span class="tag">Kunci</span> ' + TP.esc(note.a || "") + "</div>");
        } else {
          var oo = (rv.optOrder && rv.optOrder[g]) || q.o.map(function (_, i) { return i; });
          body = oo.map(function (orig, i) {
            var cls = orig === key[g] ? "right" : (orig === a ? "mine bad" : "");
            var tag = orig === key[g] ? (orig === a ? "Jawabanmu · Kunci" : "Kunci") : (orig === a ? "Jawabanmu" : "");
            return '<div class="ropt ' + cls + '"><span class="L">' + TP.LETTERS[i] + "</span><span>" + TP.inline(q.o[orig]) + "</span>" +
              (tag ? '<span class="tag">' + tag + "</span>" : "") + "</div>";
          }).join("") + (isAnswered(q, a) ? "" : '<p class="muted small">Kamu tidak menjawab soal ini.</p>');
        }
        block += '<div class="ritem" id="rq' + n + '"><div class="rhead"><b>Soal ' + n + '</b><span class="rbadge ' + (ok ? "good" : "bad") + '">' +
          (ok ? "✓ Benar" : "✗ Salah") + "</span>" + (q.t ? '<span class="muted small">' + TP.esc(q.t) + "</span>" : "") + "</div>" +
          '<div class="qtext">' + TP.inline(q.q).replace(/\n/g, "<br>") + "</div>" + body +
          (note.e ? '<div class="rnote"><b>Pembahasan:</b> ' + TP.inline(note.e) + "</div>" : "") + "</div>";
      });
      items += '<div class="card rsec"><h3>Teks ' + (di + 1) + (first === n ? " · Soal " + n : " · Soal " + first + "–" + n) + "</h3>" +
        (sec.passage && sec.passage.trim() ? '<details class="rpass"><summary>Lihat teks</summary><div class="passage">' + TP.passageHTML(sec.passage) + "</div></details>" : "") +
        block + "</div>";
    });
    app.innerHTML = topbar(st) + '<div class="page"><div class="card"><h2>Pembahasan — ' + TP.esc(t.title) + "</h2>" +
      "<p>Skor <b>" + rec.score + "</b> · benar <b>" + rec.correct + "</b> dari " + rec.total + "</p>" +
      '<p class="muted small">Ketuk nomor untuk melompat ke soal. Hijau = benar, merah = salah. Nomor mengikuti urutan soal saat kamu mengerjakan.</p>' +
      '<div class="rchips">' + chips + "</div></div>" + items +
      '<button class="btn block" id="home">Kembali ke daftar tes</button>' + footer() + "</div>";
    window.scrollTo(0, 0);
    var chg = document.getElementById("chg"); if (chg) chg.onclick = function (e) { e.preventDefault(); LS.del("tp_student"); renderLogin(); };
    document.getElementById("home").onclick = renderHome;
  }

  /* ---------------- resume after reload ---------------- */
  function tryResume() {
    var act = LS.get("tp_active", null);
    if (!act) return false;
    var t = TESTS.filter(function (x) { return x.id === act.testId; })[0];
    var s = t && LS.get(stateKey(t.id, act), null);
    if (!t || !s || s.submitted) { LS.del("tp_active"); return false; }
    T = t; S = s;
    LS.set("tp_student", { kelas: s.kelas, name: s.name });
    if (Date.now() >= S.end) { running = true; submit("Waktu habis"); return true; }
    S.leaves.push({ at: Date.now(), r: "memuat ulang / menutup halaman" });
    save();
    if (S.leaves.length >= T.maxLeaves) { running = true; submit("Otomatis: keluar " + S.leaves.length + "x"); return true; }
    var left = T.maxLeaves - S.leaves.length;
    app.innerHTML = topbar(null) + '<div class="page"><div class="card"><h2>Tes sedang berlangsung</h2>' +
      "<p><b>" + TP.esc(S.name) + "</b> · " + TP.esc(S.kelas) + "<br>" + TP.esc(T.title) + "</p>" +
      '<div class="banner warn">Halaman tes ditutup atau dimuat ulang. Ini dihitung sebagai pelanggaran ke-' + S.leaves.length +
      " (sisa " + left + "). Waktu tetap berjalan.</div>" +
      '<button class="btn block" id="resume">Lanjutkan Tes</button></div></div>';
    document.getElementById("resume").onclick = function () { enterFs(); runTest(); };
    return true;
  }

  /* ---------------- boot ---------------- */
  loadScripts(C.tests || []).then(function () {
    flushQueue();
    if (!tryResume()) renderHome();
  });
})();
