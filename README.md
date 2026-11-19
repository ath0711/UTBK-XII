# UTBK Training — Literasi dalam Bahasa Inggris

A test platform for your students that looks and works like the UTBK computer-based test:
- 30-minute timer that keeps running even if the page is closed
- fullscreen mode, with every tab switch, app switch, or fullscreen exit recorded
- automatic submission on the 3rd violation
- passage on the left, question on the right, a number grid, and a **Ragu-ragu** (unsure) flag
- each student gets a different text order and option order
- students choose their class and then their name
- scores go to your Google Form/Sheet automatically

## Files
| File | What it is |
|---|---|
| `index.html` | Student page (open this link for students) |
| `config.js` | **Your settings**: Google Form link, classes, names, list of tests |
| `maker.html` | Make new tests by pasting questions |
| `tests/` | One `.js` file per test |
| `assets/` | Code and style (no need to touch) |

---

## Step 1 — Put it on GitHub Pages (once)
1. On github.com, click **+ → New repository**. Name it, for example, `UTBK-Training`, make it **Public**, then click **Create**.
2. Click **uploading an existing file**. Drag **everything inside this folder** (`index.html`, `config.js`, `maker.html`, `README.md`, and the `assets` and `tests` folders) into the page. Click **Commit changes**.
3. Go to **Settings → Pages**, set Source to **Deploy from a branch**, Branch to **main / (root)**, then click **Save**.
4. After 1–2 minutes the site is live at
   `https://ath0711.github.io/UTBK-Training/` (students)
   `https://ath0711.github.io/UTBK-Training/maker.html` (you)

## Step 2 — Connect the Google Form for scores (once)
1. Make a new Google Form with **6 short-answer questions**, in this order:
   `Nama`, `Kelas`, `Tes`, `Skor`, `Catatan`, `Jawaban`
   (Make `Catatan` and `Jawaban` "Paragraph" if you like. Don't make any of them required.)
2. Go to **Responses → Link to Sheets** so results go to a spreadsheet.
3. Click **⋮ → Get pre-filled link**. In the fields, type exactly:
   `NAMA`, `KELAS`, `TES`, `SKOR`, `CATATAN`, `JAWABAN`
   Click **Get link → Copy link**.
4. On GitHub, open `config.js` and click ✏️. Paste the link between the quotes:
   ```js
   googleFormPrefilledLink: "https://docs.google.com/forms/d/e/…/viewform?usp=pp_url&entry.123=NAMA&…",
   ```
   Click **Commit changes**.

Until you paste the link, the student page shows a **"Mode uji coba"** notice and no scores are sent.

**What you receive for each student:**
- **Skor**: 0–100
- **Catatan**: number correct, results per question type, empty answers, time used, every violation with its time and type, and the reason for submission (submitted by the student, time ran out, or auto-submitted after 3 violations)
- **Jawaban**: each answer in the original numbering, for example `1D✓ 2A✗ 3-✗` (`-` = left empty). Use this for item analysis with the answer key.

## Step 3 — Add your students (once per class)
In `config.js`, replace the example classes. Put one name per line. You can paste a column straight from Excel or Sheets:
```js
classes: {
  "XII IPA 1": `
    Ahmad Fauzi
    Nur Aisyah
  `,
  "XII IPA 2": `
    …
  `,
},
```
The **Guru (uji coba)** class lets you try any test as many times as you want. Its results arrive with the name `Fatma sari`, so you can delete them from the Sheet.

## Adding a new test (any time)
1. Open `maker.html`. Fill in the settings and paste your questions. Click **Check & preview**.
2. Click **Download test file**. Upload it to the `tests` folder on GitHub.
3. Add its line to `tests` in `config.js`, for example `"tests/practice-1.js",`
4. Keep the **answer key** and the **.txt** on your computer. Don't upload them. You can re-open the .txt in the maker later to edit the test.

## Table items, short answers and pembahasan (Paket 1 and later)
`tests/paket-1-lbe.js` uses three things the maker can't make yet. They need the updated `assets/app.js`, `assets/common.js` and `assets/style.css`:
- **Table items** (like the real UTBK): one choice per row. The item is right only if every row is right. In the Sheet's `Jawaban` column they look like `4[1221]✓` (1 = first column, 2 = second column).
- **Short answers**: students type the answer; capital letters and punctuation are ignored.
- **Tables inside a passage**: lines that start with `|` show as a table.
- **Pembahasan for students**: after submitting, students tap **Lihat pembahasan** to see each question marked Benar/Salah, their answer, the key, and a short explanation. They can open it again later with the **Pembahasan** button on the test card. Because the review shows the key, give the test to all classes in the same session.
- Question numbers are the same for every student (texts are not shuffled), but the A–E order is still shuffled. In the explain session, name the answer by its content, not only its letter.

The detailed teacher explanation is `teacher-only/pembahasan-paket-1-lbe.html`. Open it on the projector: arrow keys move between questions, **Space** shows the answer and why every option is right or wrong. Don't upload it.

## Vocab levels (vocab-l1 … vocab-l7)
Seven vocabulary quizzes for XII Paket A, C, D, KAIST, Edinburgh and Harvard (and Guru), 15 questions and 10 minutes each:
- **Locked levels**: a level opens only after the student scores **80** or more on the level before it. Guru (uji coba) sees every level open.
- **Instant feedback**: after each answer the student sees right/wrong and a short explanation; the answer can't be changed.
- **Unlimited tries**: every try is sent to your Sheet, so you can see how many attempts each student needed.
- Progress is saved on the student's device. On a new device or after clearing browser data, a student starts again from Level 1.
- To change the passing score, edit `passScore` and `requires.score` in the level files, or ask Claude to rebuild them.

## Starting a test together (access code)
1. Open `maker.html` → **Hidden access code**. Type the test ID and your code (e.g. `PAKETA1`). Copy the line it shows.
2. In `config.js` → `accessCodes`, replace the test's line with it, for example:
```js
accessCodes: {
  "diagnostic-1": "hidden:1a2b3c4d"
},
```
Students then need the code before they can start, so nobody begins early. Announce it in class when it's time. To let students take the test any time on their own, set it back to `""`.
On GitHub: open `config.js` → ✏️ → paste the line → **Commit changes**. It takes about 1 minute to update. If a student's page doesn't show the code box yet, they reload the page.

## Letting a student try again (teacher PIN)
When a student has used their attempt (for example, auto-submitted after leaving 3 times), their test card shows **Buka lagi (guru)**. Tap it on the student's device and type the teacher PIN: the student gets one more attempt. Both attempts arrive in your Sheet ("Percobaan ke-1", "ke-2").
To change the PIN: `maker.html` → **Hidden access code** → Test ID `reset` → type the new PIN → paste the line into `config.js` (`teacherResetCode`).

## Tablets and false alarms
In `config.js` → `antiCheat`:
- `ignoreShorterThanSeconds: 3` means leaving the page for less than 3 seconds isn't counted (accidental swipes, a notification).
- `maxViolations: 3` is how many leaves auto-submit the test. Raise it (e.g. 5) if tablets still trigger too often.

On tablets and phones, notifications, the keyboard, and swiping out of fullscreen are not counted. Students are only asked to go back to fullscreen. Real tab or app switches still count. The screen also stays on during the test, so auto-lock doesn't count as leaving. Ask tablet users to turn on Do Not Disturb before starting.

Other test settings:
- **Access code**: students must type a code before starting, so you control when the test opens.
- **Only for these classes**: limits a test to certain classes.
- **Attempts**: how many times a student can take the test.
- **Show score**: whether students see their score at the end.

To hide a test without deleting it, remove its line from `config.js`.

## Honest limits (good to know)
- **A website cannot physically block other tabs or apps.** What it can do is detect them: fullscreen exits, tab or app switches, and closing or reloading the page all count as violations, are recorded with the time, and the 3rd one submits the test. On iPhones, fullscreen isn't supported, but tab and app switching is still detected.
- **The one-attempt limit is stored on each device.** A student who changes device or clears browser data could start again. Every attempt still arrives in your Sheet with its time, so a second row for the same student is easy to spot.
- Answer keys in the test files are encoded, not readable as plain letters. Explanations are never uploaded.
- If the internet drops when a student submits, the score is saved on the device and sent automatically the next time the page is opened with internet.
