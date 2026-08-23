# Contributing to Job Rejection Shield

We love your input! We want to make contributing to Job Rejection Shield as easy and transparent as possible.

1. Fork the repo and create your branch.
2. If you've added code that should be tested, add tests.
3. Ensure the script runs smoothly.
4. Issue that pull request!

## Before you commit
Never commit real identifiers: spreadsheet IDs, script IDs, personal email addresses or API keys. Use placeholders (`you@example.com`, `PASTE_YOUR_SCRIPT_ID_HERE`). Secrets belong in Apps Script **Script Properties**, never in the code.

This repo ships a pre-commit hook that blocks the obvious cases. Enable it once:

```bash
git config core.hooksPath .githooks
```
