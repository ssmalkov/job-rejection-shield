# Working on Job Rejection Shield

Rules for any AI assistant working in this repository.

## Attribution

**Never add `Co-Authored-By: Claude` (or any AI co-author trailer) to commits.** No "Generated with Claude Code" footers in commit messages, PR bodies, issues or code comments either. This is Sergei's project; the commit history carries his name only. Write the commit message about the change, then stop.

## Secrets and personal data

Everything real lives in Apps Script **Script Properties**, never in the repo:
`SPREADSHEET_ID`, `GEMINI_API_KEY`, optional `MODEL_NAME`.

Committed files use placeholders only — `you@example.com`, `PASTE_YOUR_SCRIPT_ID_HERE`. This repo is public, and a spreadsheet ID, script ID or personal address in the history means rewriting history to get it out. `.githooks/pre-commit` blocks the obvious cases; enable it after cloning:

```bash
git config core.hooksPath .githooks
```

`.clasp.json` holds the real Script ID and is gitignored. Commit `.clasp.json.example` instead.

## Deployment

The live script is a container-bound Apps Script project. Deploy with clasp from the repo root:

```bash
clasp push -f                    # goes live immediately, the 30-min trigger picks it up
clasp create-version "what changed"
clasp pull                       # then `git status` must be clean — repo and prod are one source
```

Changing `oauthScopes` in `appsscript.json` **invalidates the existing authorization**: the time trigger fails with "authorization required" until the owner runs `main` manually once and approves. Say so explicitly whenever a change touches scopes.

## Design constraints

- **One model call per email.** `callAiWithRetry()` returns a single JSON with every field. New columns are new fields in that JSON, never a second call and never a second prompt. Every line added to the system prompt costs tokens on every email — keep additions terse.
- **Untrusted input.** Email text comes from strangers. Anything reaching the sheet goes through `sanitizeCell()` (Sheets executes `= + - @`). Anything reaching the model stays inside the `<<<EMAIL_DATA>>>` markers.
- **Irreversible actions need a brake.** `destroyThread()` deletes mail permanently. `looksLikeInvitation()` vetoes it, API failures fall back to the Trash, and the sheet row is always written *before* the thread is destroyed.
- **Fail safe, not silent.** If every model fails, the thread stays in the label rather than being deleted. Never let an error path drop a message into the void.
- **Apps Script quirks:** all `.gs` files share one global scope; `filePushOrder` puts `Config.gs` first; there is no module system, no npm, no build step.

## Testing

There is no test runner in the project. Verify logic locally before pushing:

```bash
node --check <file>.js      # copy the .gs to .js first — node rejects the .gs extension
```

Pure functions (`sanitizeCell`, `looksLikeInvitation`, `normalizeStage`, `isNoReplySender`, `ensureHeader`) are testable by `eval`-ing `Config.gs` plus the function under test with stubbed Apps Script globals. Do that instead of testing against the owner's live mailbox — a wrong `destroyThread()` destroys real mail.

## Documentation

`Readme.md` is the browser-based install for users, `SETUP.md` is the clone-and-deploy path, `SECURITY.md` covers scopes and secret hygiene, `Project.md` is the technical passport, `.claude/skills/setup-shield/SKILL.md` is the setup playbook for assistants, `JRS PRD.md` is the original April 2026 brief kept as history — do not update it as if it were current docs. When behaviour changes, update the README's flag table and the column schema in the same commit.
