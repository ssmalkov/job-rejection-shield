# Project Passport: Job Rejection Shield (JRS)

## Overview
A recruitment intelligence agent built on Google Apps Script and Gemini AI. It automates the "sad" part of job hunting: rejections are classified, logged into a CRM and permanently deleted before the user ever sees them, while interview invitations are pushed back to the Inbox untouched.

## Tech Stack
- **Language:** Google Apps Script (JavaScript, V8 runtime)
- **AI Engine:** Gemini via Google AI Studio API — a priority list of models (`gemini-2.5-flash-lite` first) with automatic fallback and retries on 429/503
- **Storage:** Google Sheets (CRM)
- **Integration:** Gmail API (label-based triggers)
- **Tooling:** [clasp](https://github.com/google/clasp) for pull/push between this repo and the live script

## File Structure
| File | Role |
| --- | --- |
| `Config.gs` | Script Properties, feature flags, noreply and keep-alive patterns, sheet header, model priority list |
| `Code.gs` | Orchestrator: `main()`, AI call with retries, noreply detection, `destroyThread()`, sheet logging |
| `GhostReply.gs` | Optional feedback loop: `sendGhostReply()`, `processIncomingFeedback()` |
| `appsscript.json` | Manifest: advanced Gmail service + OAuth scopes |
| `.githooks/pre-commit` | Blocks real IDs, keys and personal addresses from being committed |

## Core Logic
1. **Orchestrator:** `main()` monitors the `Job Rejection Shield` Gmail label; a time trigger runs it every 30 minutes.
2. **Analysis:** `callAiWithRetry()` sends the email to Gemini and extracts:
   - Status (REJECT / APPLIED / OTHER)
   - Company name
   - Sender name
   - Cleaned message (no noise/disclaimers)
   - Stage reached before the rejection
   Roles put on hold, reschedules and recruiter questions are deliberately classified as OTHER, not REJECT.
3. **Safety:** if every model fails, the thread stays in the label instead of being trashed. Each thread is wrapped in its own try/catch.
4. **Automation:** REJECT → log to Sheet → `destroyThread()`. APPLIED → log → unlabel. OTHER → back to the Inbox.
   `destroyThread()` deletes the thread permanently via the advanced Gmail service (`PERMANENT_DELETE`, scope `https://mail.google.com/`), because the Trash is still visible to the user. Two brakes on an irreversible action: `looksLikeInvitation()` vetoes the delete when the mail carries a call link or the word "interview", and any API failure falls back to the Trash so a thread never stays in the Inbox.
5. **Untrusted input:** email text is a stranger's input in two places. `sanitizeCell()` prefixes anything starting with `= + - @` before it reaches the sheet (Sheets would otherwise execute it — `=IMPORTXML(...)` exfiltration). The AI prompt wraps the mail in `<<<EMAIL_DATA>>>` markers with an explicit instruction that its content is data, never instructions.
6. **Feedback loop (off by default):** `ENABLE_GHOST_REPLY` sends a request for feedback, `ENABLE_FEEDBACK_HARVEST` collects the answers into column H. Both are off because most rejections come from noreply addresses.

## Data Schema (11 Columns)
1. Date | 2. Company | 3. Sender Name | 4. Sender Email | 5. Status | 6. Reject Text | 7. Ghost Sent | 8. Detailed Feedback | 9. Thread ID | 10. Stage | 11. Raw Body

`ensureHeader()` writes any missing header cell on every run, so a fresh spreadsheet needs no manual setup and a sheet from an older version gains the columns it lacks; cells you renamed are left alone.

Column J (Stage) is extracted by the same AI call — `APPLICATION`, `SCREENING`, `HIRING_MANAGER`, `INTERVIEW`, `FINAL` or `UNKNOWN`, normalised by `normalizeStage()` so an invented label cannot pollute the stats.

Column K (Raw Body) holds the original email text, up to `RAW_BODY_LIMIT` (5000) characters. After a permanent delete it is the only surviving copy — column F is the model's cleaned-up summary, and the body is truncated to 2000 characters before it is ever sent to the model.

**Ghost Sent** values: `1` (request sent), `DISABLED` (flag off), `NO_REPLY_ADDRESS` (sender cannot receive replies), `N/A` (not a rejection).
