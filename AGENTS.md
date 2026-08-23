# Notes for AI agents

Full conventions: **[CLAUDE.md](CLAUDE.md)**. Setup walkthrough: **[SETUP.md](SETUP.md)**. Claude Code users get a step-by-step playbook in `.claude/skills/setup-shield/SKILL.md`.

The three rules that matter most, repeated here so no agent misses them:

1. **Never add AI attribution to commits.** No `Co-Authored-By: Claude`, no "Generated with …" footers, in commit messages, PR bodies or issues. The history carries the owner's name only.
2. **No real identifiers in the repo.** Spreadsheet IDs, script IDs, API keys and personal email addresses live in Apps Script Script Properties or in gitignored files. Committed files use placeholders. Run `git config core.hooksPath .githooks` to enable the guard.
3. **Irreversible actions need a brake.** This code deletes email permanently. Preserve the existing guards — the veto in `looksLikeInvitation()`, the Trash fallback on API failure, and writing the spreadsheet row *before* destroying the thread. Test pure functions locally, never against a live mailbox.

Also worth knowing before you change anything: one Gemini call per email (new columns are new fields in the same JSON, not new calls), all `.gs` files share one global scope, and editing `oauthScopes` in `appsscript.json` breaks the existing authorization until a human re-approves it in the editor.
