/* ================================================================
   TEACHER SETTINGS — this is the only file you normally edit.
   ================================================================ */
window.APP_CONFIG = {

  appTitle: "UTBK Training — Literasi dalam Bahasa Inggris",
  teacher: "Fatma sari",

  /* 1) GOOGLE FORM for scores (see README, step 2).
        Paste the PRE-FILLED link here. When you make it, type these
        words in the fields: NAMA, KELAS, TES, SKOR, CATATAN, JAWABAN
        Leave it "" to test without sending scores. */
  googleFormPrefilledLink: "https://docs.google.com/forms/d/e/1FAIpQLSf7R9gVJOCGqUIe42QpUbVXvDRJv5TMXFQx4fBX-WtkOmBzew/viewform?usp=pp_url&entry.2056999298=NAMA&entry.590545369=KELAS&entry.1690637609=TES&entry.1096390773=SKOR&entry.487663220=CATATAN&entry.669231172=JAWABAN",

  /* 2) CLASSES AND STUDENT NAMES.
        One name per line. You can copy a column from Excel/Sheets
        and paste it between the ` ` marks. Add or remove classes freely. */
  classes: {
    "XII Paket A": `
      jati
      aqeel
      wiwin
      hufa
      aura
      taqia
      freya
      syifa
      reqi
      safa
      aisha
      rafli
      suratman
      irdina
      davina
      anindia
      a.balqis raihana
      naura rasyida
      salsa
      sultan
      nufa
      atsir
      ramiza
      elsa
      atun
      farras
      naufal
      gifari
      arkan
      aura fio
      rahmi
      Ainun Nurul Hanifa
    `,
    "XII Paket C": `
      fadillah sahira
      atikah Nurafi
      aqueeny alifa
      kaila
      arsyi
      ibrahim
      andi ahmad bagir
      a. muh kaisar
      a. syeikhan
      nur hafizah sahira
      falisa asalina
      arradia fathi zahra
      alpin
      nabil
      ahwalul wahid wellete
    `,
    "XII Paket D": `
      Ainun Qalbi dinnur
      triana aulia
      Ghaisan Gibran
      Annisa bella
      Rania Zahra
      Fildzah adibah Nazmi
      Sophia aluna a
      Mutiara Hermiati
      Muhammad
      Mizzi amanda
      Nurul atifa
      Nurul madina
      Habsyi
    `,
    "KAIST": `
      Ahmad Lutfy
      Ainun Qolbi Dinnur
      Andi Muh. Kaisar Ulubalang
      Anisa Bella
      Irdhina Azka Ramadhani
      Mizzi Amanda Navilah Fauzan
      Muh. Raihan Ramadhan Hasbi
      Nur Hikma Ramadani D.
      Nurfadillah Sukma
      Nurul Atifah
      Nurul Madinah
      Putri Nafisah Nufah
      Shafa Aulia
      Suratman
    `,
    "Edinburgh": `
      Ahwalul Wahid Wellete
      Alpriansyah Hariono
      Andi Muhammad Atsir Oddang
      Arsakha Naval
      Ghaisan Gibran Addin
      Muhammad Zaky Zahram
      Mutiara Hermiati
      Nurul Awwaliah Syahrir
      Raka Praditya
      Rifat Mahatma Djamal
      Triana Aulya. R
    `,
    "Harvard": `
      Aisha Zahra
      Andi Muhammad Aqeel
      Andi Syeikhan Athillah
      Arsie Jabbari Albast
      Atikah Nurafi
      Aura Lestari Yusuf
      Fadillah Zahirah Jusman
      Falisha Ashalina Rindy Putri
      Muhammad Pasha Aqeela Eryztha
      Naufal Asyam Djufri
      Nur Fitrah Ramadhani
      Rafeyfa Aulia Ilham
      Ramiza Medina Aliyah Irwan
      Sophia Aluna Azzahra
    `,
    "Guru (uji coba)": `
      Fatma sari
    `
  },

  /* Names that can take every test unlimited times (for trying tests yourself). */
  unlimitedAttemptsFor: ["Fatma sari"],

  /* 3) ACCESS CODE — to make everyone start at the same time.
        Open maker.html → "Hidden access code", type your code (e.g. PAKETA1),
        and paste the line it gives you here, e.g.  "diagnostic-1": "hidden:1a2b3c4d"
        Students must type the real code before starting; it can't be read from this file.
        (A plain code like "PAKETA1" also works, but anyone can read it here.)
        Leave it "" so students can start any time on their own. */
  accessCodes: {
    "diagnostic-1": ""
  },

  /* TEACHER PIN — lets a student take a test again (e.g. after an auto-submit).
        On the student's device, tap "Buka lagi (guru)" and type the PIN: +1 attempt.
        Current PIN: the one Claude gave you. To change it, use maker.html → "Hidden access code"
        with Test ID  reset  and paste the "hidden:…" value here. Leave "" to turn it off. */
  teacherResetCode: "hidden:86f66fc4",

  /* LEAVE DETECTION — how strict the test is.
        maxViolations: the test is submitted automatically at this number of leaves.
        ignoreShorterThanSeconds: leaving the page for less than this is not counted
        (stops false alarms from notifications or accidental swipes on tablets). */
  antiCheat: {
    maxViolations: 3,
    ignoreShorterThanSeconds: 3
  },

  /* 4) TESTS shown to students (top = first).
        To add a test: make it in maker.html, upload the .js file into
        the tests/ folder, then add its path below. */
  tests: [
    "tests/diagnostic-1.js",

    /* ---- LES SORE UTBK (only Edinburgh, Harvard, KAIST and Guru see these).
       To hide a test for now, put // in front of its line. ---- */
    "tests/lessore-m02a.js",
    "tests/lessore-m02b.js",
    "tests/lessore-m03a.js",
    "tests/lessore-m03b.js",
    "tests/lessore-m04a.js",
    "tests/lessore-m04b.js",
    "tests/lessore-m05a.js",
    "tests/lessore-m05b.js",
    "tests/lessore-m06a.js",
    "tests/lessore-m06b.js",
    "tests/lessore-m07a.js",
    "tests/lessore-m07b.js",
    "tests/lessore-m08a.js",
    "tests/lessore-m08b.js",
    "tests/lessore-m09.js",
    "tests/lessore-m10.js"
  ]
};
