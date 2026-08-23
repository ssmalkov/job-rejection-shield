# Setup from a clone

This is the developer path: clone the repo, deploy the code with [clasp](https://github.com/google/clasp), never paste a file into the browser editor again. If you would rather set everything up by hand in the Apps Script UI, follow [Readme.md](Readme.md) instead — same result, more clicking.

**Working with an AI assistant?** Point it at [`.claude/skills/setup-shield/SKILL.md`](.claude/skills/setup-shield/SKILL.md). It tells the assistant exactly which of these steps it can run for you and which ones only you can do.

Nothing here costs money. The Gemini API key is free-tier, Apps Script is free, and Google Sheets is your storage.

---

## What you end up with

A script running on Google's servers every 30 minutes that reads a Gmail label, decides what each email is, logs rejections into a spreadsheet, and deletes them permanently before you see them. Interview invitations go back to your Inbox untouched.

Five things have to exist for that to work:

| Thing | Who creates it |
| --- | --- |
| A spreadsheet (the CRM) | `clasp` can create it for you, together with the script |
| An Apps Script project holding the code | `clasp` |
| A Gemini API key | you, in AI Studio |
| Two Script Properties (`SPREADSHEET_ID`, `GEMINI_API_KEY`) | you, in the Apps Script UI — there is no API for this |
| A Gmail filter and a 30-minute trigger | you, in Gmail and Apps Script |

---

## 1. Install clasp and log in

You need Node 20 or newer.

```bash
npm install -g @google/clasp
clasp --version          # expect 3.x
```

Turn the Apps Script API on for your account — once, ever: open https://script.google.com/home/usersettings and flip **Google Apps Script API** to **On**. Without it every `clasp push` fails with a 403.

```bash
clasp login
```

A browser window opens and asks you to approve. **Log in with the account whose mailbox you want shielded** — if you have several Google accounts, this is the one mistake that costs you an hour later. Verify:

```bash
clasp show-authorized-user
```

The token lands in `~/.clasprc.json` with `0600` permissions, outside the repo. It is never committed.

> **Running this through an AI assistant?** `clasp login` blocks waiting for a browser callback, so an agent should start it in the background and hand you the URL it prints, rather than waiting for it to finish.

---

## 2. Create the project

```bash
git clone https://github.com/ssmalkov/job-rejection-shield.git
cd job-rejection-shield
```

**If you are starting fresh** — this creates a new spreadsheet *and* a script bound to it in one command:

```bash
clasp create-script --type sheets --title "Job Rejection Shield"
```

clasp writes `.clasp.json` for you. Open it and make it look like this, keeping the `scriptId` (and `parentId`, if clasp added one) it generated:

```json
{
  "scriptId": "…",
  "parentId": "…",
  "rootDir": ".",
  "scriptExtensions": [".gs", ".js"],
  "filePushOrder": ["Config.gs", "Code.gs", "GhostReply.gs"]
}
```

- `scriptExtensions` with `.gs` first stops `clasp pull` from renaming the files to `.js`.
- `filePushOrder` puts `Config.gs` first, where all the configuration lives.
- `parentId` **is your spreadsheet ID** — keep it, you need it in step 4.

**If you already have a spreadsheet with a script in it**, skip `create-script`: copy `.clasp.json.example` to `.clasp.json` and paste your Script ID (Apps Script → ⚙️ Project Settings → Script ID, or run `clasp list-scripts`).

`.clasp.json` is gitignored on purpose. It identifies *your* project; only the example file belongs in git.

---

## 3. Deploy the code

```bash
clasp push -f
```

That uploads `Config.gs`, `Code.gs`, `GhostReply.gs` and `appsscript.json` — and nothing else, because `.claspignore` whitelists exactly those. Your README and notes never end up in Apps Script.

Two habits worth keeping:

```bash
clasp create-version "what changed"   # a snapshot you can roll back to
clasp pull && git status              # must come back clean: repo and live script are one source of truth
```

There is no separate "deploy" step. The script is container-bound, so `clasp push` *is* the deployment — the next trigger run uses the new code.

---

## 4. Get a Gemini key and fill in the two properties

1. Go to [Google AI Studio](https://aistudio.google.com/) → **Get API key** → **Create API key in new project** → copy it.
2. Open your script: `clasp open-script`
3. ⚙️ **Project Settings** → **Script Properties** → **Add script property**:

| Property | Value |
| --- | --- |
| `SPREADSHEET_ID` | the spreadsheet ID (`parentId` from `.clasp.json`, or the part of the sheet URL between `/d/` and `/edit`) |
| `GEMINI_API_KEY` | the key you just copied |
| `MODEL_NAME` | *leave this out* — see the warning below |

Script Properties cannot be set from the command line or by any API. This step is manual, and it is the only reason a fully hands-off setup is impossible.

> ⚠️ **Do not pin `MODEL_NAME` unless you have a reason.** Google retires models from AI Studio regularly. If the property names a model that no longer exists, every single email burns three retries before falling through to the next model in `MODEL_PRIORITY`. Leaving it empty means the script starts at the top of a list that is designed to survive retirements.

The spreadsheet needs no preparation: on the first run the script writes any header cell that is empty, and leaves alone any header you renamed yourself.

---

## 5. Catch the mail

Gmail → **Settings → Filters and Blocked Addresses → Import filters** → upload `mailFilters.xml` from this repo → **Open file** → **Create filters**.

That gives you a filter that labels matching mail `Job Rejection Shield`, archives it out of your Inbox, and keeps it out of Spam. To build it by hand instead, see Step 3 of the [README](Readme.md#-step-3-configure-the-gmail-filter).

The keyword net is deliberately wide — `application`, `hiring` and `position` catch plenty of ordinary work mail. That is fine: everything the AI does not recognise as a rejection is pushed back to your Inbox. If you would rather it caught less, drop those three words.

---

## 6. Authorize, then automate

**Authorize.** In the Apps Script editor, open `Code.gs` in the file list (the function dropdown only shows functions from the file you have open), pick **`main`**, click **Run**.

Google will ask for permissions and warn that the app is not verified — expected for a personal script you just wrote. **Advanced → Go to … (unsafe) → Allow**. One of the permissions reads *"Read, compose, send and permanently delete all your email"*. That is the price of deleting mail for good; `gmail.modify` can only reach the Trash. If that is too much for you, set `PERMANENT_DELETE = false` in `Config.gs` before you push, and the script will use the Trash instead.

**Automate.** In the editor sidebar click **Triggers** (the alarm clock) → **+ Add Trigger** → function `main`, event source **Time-driven**, **Minutes timer**, **Every 30 minutes** → **Save**.

**Check.** The **Executions** panel (the list icon, or https://script.google.com/home/executions) shows every run. A healthy automatic run looks like:

```
Time-driven   main   Completed
--- LOG: STARTING WORKFLOW ---
--- LOG: THREADS IN QUEUE: 0
```

---

## Changing scopes later

If you ever edit `oauthScopes` in `appsscript.json`, the existing authorization dies. The trigger starts failing with **"authorization required"** and keeps failing silently until a human opens the editor and runs `main` once by hand to approve the new set. Whenever a change touches scopes, plan for that step.

---

## When something looks wrong

| What you see | What it means |
| --- | --- |
| `THREAD ERROR` in the log, and the email is still there | Usually a bad `SPREADSHEET_ID`. The row is written *before* the thread is destroyed, so a failed write stops the whole chain — your mail is safe. |
| `authorization required` on time-driven runs | Scopes changed. Run `main` manually once and approve. |
| `ALL AI ATTEMPTS FAILED. ITEM PRESERVED IN LABEL` | Every model in the list refused or timed out. The thread deliberately stays in the label so nothing is lost — check your API key and quota. |
| Several `ATTEMPTING MODEL` lines before one works | Normal fallback. If the *first* one always fails, your `MODEL_NAME` property points at a retired model. |
| `LIVE-CONVERSATION SIGNAL, KEPT IN TRASH` | The safety net fired: the mail looked like a live conversation (a Meet/Zoom link, the word *interview*), so it went to the Trash instead of being destroyed. |
| `clasp push` returns 403 | The Apps Script API toggle is off: https://script.google.com/home/usersettings |
| `clasp list-scripts` shows nothing | You are logged into the wrong Google account. `clasp show-authorized-user`, then `clasp logout` and log in again. |
| `clasp tail-logs` says "GCP project ID is not set" | Expected — no Cloud project is attached. Read logs in the Executions panel instead. |

---

## Contributing to the repo itself

Turn on the commit guard once per clone:

```bash
git config core.hooksPath .githooks
```

It refuses commits containing spreadsheet IDs, script IDs, API keys or personal email addresses. Hooks are local config, so run that once per clone. See [SECURITY.md](SECURITY.md) for the rest of the hygiene rules, including which of GitHub's own scanners are worth turning on for a project with no dependencies, and [CLAUDE.md](CLAUDE.md) for the conventions an AI assistant should follow here.
