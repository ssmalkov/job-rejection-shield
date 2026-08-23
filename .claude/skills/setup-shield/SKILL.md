---
name: setup-shield
description: Set up Job Rejection Shield from a fresh clone — install clasp, create or connect the Apps Script project, deploy the code, and walk the user through the handful of steps only a human can do. Use when someone has cloned this repo and wants the shield running, or when a deploy, authorization or sync problem needs diagnosing.
---

# Setting up Job Rejection Shield

Your job is to get a cloned repo into a working state with as few manual steps for the user as possible — and to be honest about which steps you genuinely cannot do.

Read [SETUP.md](../../../SETUP.md) for the full picture and [CLAUDE.md](../../../CLAUDE.md) for the conventions in this repo. This file is the execution order plus the traps.

## Split the work first

**You can do:** install clasp, create the Apps Script project and its spreadsheet, write `.clasp.json`, push the code, cut versions, verify that repo and live script match, read logs from the local repo side, diagnose failures.

**Only the user can do** — do not pretend otherwise, and do not wait silently on any of these:

1. Enable the Apps Script API (a toggle on a settings page).
2. Complete the `clasp login` browser flow.
3. Enter Script Properties (`SPREADSHEET_ID`, `GEMINI_API_KEY`) — no API exists for these.
4. Create the Gemini API key in AI Studio.
5. Import the Gmail filter.
6. Approve the OAuth consent screen by running `main` once in the editor.
7. Create the 30-minute trigger.

Batch these into one clear list rather than dripping them out one at a time.

## Order of operations

**1. Preconditions.** Node 20+. `npm install -g @google/clasp`, confirm `clasp --version` is 3.x. Command names differ from v2: it is `clasp list-scripts`, `clasp create-script`, `clasp create-version`, `clasp open-script`, `clasp tail-logs`.

**2. Login.** Check `clasp show-authorized-user` first — they may already be logged in, possibly as the *wrong* account. `clasp login` blocks until a browser callback completes, so **start it in the background, then give the user the URL it prints**. Do not run it in the foreground and wait. Afterwards confirm the account matches the mailbox they want shielded; the wrong account produces an empty `clasp list-scripts` and a confusing hour.

**3. Project.** New user: `clasp create-script --type sheets --title "Job Rejection Shield"` creates the spreadsheet *and* a bound script in one go, and writes `.clasp.json`. Existing project: get the Script ID from `clasp list-scripts` and copy `.clasp.json.example`.

Either way `.clasp.json` must end up with `"scriptExtensions": [".gs", ".js"]` (`.gs` first, or `clasp pull` renames every file to `.js`) and `"filePushOrder": ["Config.gs", "Code.gs", "GhostReply.gs"]`. Keep the `parentId` clasp generates — **that is the spreadsheet ID** the user needs for Script Properties. Never commit `.clasp.json`; it is gitignored.

**4. Deploy.** `clasp push -f`. Then prove the sync is real: `clasp pull` followed by `git status` must come back clean. `.claspignore` whitelists `*.gs` plus `appsscript.json`, so documentation never reaches Apps Script. Cut a version with `clasp create-version "<what changed>"` — it is the rollback path.

**5. Hand off the manual list.** Give the user the seven items above with exact click paths, including the spreadsheet ID you already know from `parentId`. Tell them that when they run `main` the first time, they must select `Code.gs` in the file list first: the function dropdown only offers functions from the file currently open, and on `Config.gs` it shows "No functions".

**6. Verify.** Ask for the Execution log. A healthy run prints `STARTING WORKFLOW` then `THREADS IN QUEUE: N`. If N is 0 nothing was proven about the spreadsheet — the script never touched it. A real test needs one labelled email.

## Traps worth knowing

- **Scope changes kill the trigger.** Editing `oauthScopes` in `appsscript.json` invalidates the existing grant. Time-driven runs then fail with "authorization required" until a human runs `main` manually and re-approves. Say this loudly *before* pushing such a change, never after.
- **`clasp tail-logs` does not work here.** No GCP project is attached. Send the user to the Executions panel instead of debugging the CLI.
- **Never test destructive paths against the live mailbox.** `destroyThread()` deletes mail with no recovery. Verify pure functions locally: copy a `.gs` to `.js` (node rejects the `.gs` extension), `node --check` it, then `eval` `Config.gs` plus the function under test with stubbed Apps Script globals. `sanitizeCell`, `looksLikeInvitation`, `normalizeStage`, `isNoReplySender` and `ensureHeader` are all pure and testable this way.
- **`MODEL_NAME` is a footgun.** If the property names a model Google has retired, every email burns three retries before falling through. Recommend leaving it unset.
- **Failures are deliberately safe.** A thread whose row could not be written is *not* deleted, and a thread no model could classify stays in the label. If a user reports "mail stuck in the label", read that as the safety net working and go find the underlying error.
- **Do not sign commits.** No `Co-Authored-By: Claude`, no generated-with footers. This is spelled out in CLAUDE.md and it is not negotiable.

## Adding a feature later

The system prompt costs tokens on every single email, and there is exactly one model call per message. A new spreadsheet column is a new field in the existing JSON response plus a terse line in the prompt — never a second call, never a second prompt. Extend `SHEET_HEADER` in `Config.gs`; `ensureHeader()` writes missing headers on the next run, so nobody has to touch the spreadsheet by hand.
