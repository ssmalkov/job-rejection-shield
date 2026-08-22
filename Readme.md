# 🛡️ Job Rejection Shield (JRS) v4.0
**Automate the "Sad" Part of Your Job Hunt. Protect Your Sanity. Build Your CRM.**

## 😫 The Pain: Why This Exists
Job hunting is a numbers game, but the emotional toll is real. Reading the same "Unfortunately, we decided to move forward..." message 10 times a day kills motivation. 

**Job Rejection Shield** acts as your personal buffer. It uses **Gemini** to read your mail, extract company data and log it into a Google Sheet — all before you even open the email. The script walks a priority list of Gemini models and falls back to the next one if a model is unavailable or rate-limited.

---

## 🛠️ Step 1: Prepare the CRM (Google Sheets)
1. Create a **new Google Sheet**.
2. Set the header row (A1 to I1) with these exact columns:
   `Date | Company | Sender Name | Sender Email | Status | Reject Text | Ghost Sent | Detailed Feedback | Thread ID`
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
You need a "net" to catch rejections and move them to the script.

1. Open Gmail and go to **Settings (gear icon) > See all settings**.
2. Go to the **Filters and Blocked Addresses** tab.
3. Click **Create a new filter**.
4. In the **"Has the words"** field, paste these keywords:
   `"thank you for your interest" OR "thank you for applying" OR "application" OR "hiring" OR "position" OR "unfortunately" OR "decided not to move forward" OR "moved forward with other" OR "keep your resume on file" OR "successful in your job search"`
   Or import filter from this file: mailFilters.xml (attached)
5. Activate checkboxes: Skip the Inbox (Archive it); Apply the label: Job Rejection Shield; Never send it to Spam.   
5. Click **Create filter**.
6. Check **"Apply the label"** -> Choose **New label** -> Name it: `Job Rejection Shield`.
7. Check **"Skip the Inbox (Archive it)"** if you want to be totally shielded from reading the rejection.

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

**Rejections are always logged**, whatever the flags say — the CRM is the point, the reply is optional. Column **G (Ghost Sent)** records what happened:

| Value | Meaning |
| --- | --- |
| `1` | Feedback request was sent |
| `DISABLED` | `ENABLE_GHOST_REPLY` is off |
| `NO_REPLY_ADDRESS` | Sender cannot receive replies |
| `N/A` | Row is not a rejection (e.g. `APPLIED`) |

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
   - The thread is in the Trash. You never saw it.

### Phase 2: The Noreply Sender
1. Repeat Phase 1, but send from an address containing `noreply` (or temporarily add your test address to `NOREPLY_PATTERNS`).
2. Run `main` again.
3. **Result:** the row is logged exactly as above, but **Ghost Sent** reads `NO_REPLY_ADDRESS` — the shield knows there was nobody to write back to.

### Phase 3: The Win
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
Editing code in the browser gets old fast. [clasp](https://github.com/google/clasp) syncs this repo with the live script.

```bash
# 1. Install (Node 20+)
npm install -g @google/clasp

# 2. Enable the Apps Script API once per account:
#    https://script.google.com/home/usersettings  ->  On

# 3. Log in with the account that owns the script
clasp login

# 4. Point the repo at your script
cp .clasp.json.example .clasp.json
clasp list-scripts          # find your Script ID, or copy it from Project Settings
#    paste it into .clasp.json

# 5. Sync
clasp pull                  # bring the live script down
clasp push                  # deploy your changes (a bound script picks them up immediately)
clasp create-version "..."  # snapshot the current state so you can roll back
```

Notes:
- `.clasp.json` holds your Script ID and is **gitignored** — commit `.clasp.json.example` instead.
- `.claspignore` whitelists `*.gs` and `appsscript.json`, so the README and other repo files never get uploaded to Apps Script.
- Files upload in the order set by `filePushOrder`: `Config.gs` first.

---

## 👋 About the Author
Hi, I'm **Sergei Smalkov**, a Product Manager who believes that even "No's" can be automated for growth. I built this tool to turn the negativity of job rejections into a clean, structured database of feedback.

This project is **Open Source** and open for improvements. If you have ideas (Notion integration, Telegram alerts?), feel free to contribute!

### Liked the Idea?
* ⭐ **[Star this repository](https://github.com/ssmalkov/JobShield)** — to help others find it.
* 🚀 **[Check my other projects](https://linktr.ee/ssmalkov)** — I build tools for productivity and PMs.
* 🍺 **[Buy me a beer / Tip](https://linktr.ee/ssmalkov)** — keep the updates coming!

---
**Safe hunting! May your next status be `OFFER`.**