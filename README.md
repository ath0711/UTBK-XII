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
