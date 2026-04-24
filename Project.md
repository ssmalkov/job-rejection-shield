# Project Passport: Job Rejection Shield (JRS)

## Overview
A recruitment intelligence agent built on Google Apps Script and Gemini AI. It automates the "sad" part of job hunting by filtering rejections, logging them into a CRM, and politely asking for feedback while the user focuses on productive tasks.

## Tech Stack
- **Language:** Google Apps Script (JavaScript)
- **AI Engine:** Gemini 3.1 Flash Lite (via Google AI Studio API)
- **Storage:** Google Sheets (CRM)
- **Integration:** Gmail API (Label-based triggers)

## Core Logic
1. **Orchestrator:** Monitors the `Job Rejection Shield` Gmail label.
2. **Analysis:** Sends email content to Gemini to extract:
   - Status (REJECT/APPLIED/OTHER)
   - Company Name
   - Sender Name
   - Cleaned message (no noise/disclaimers)
3. **Automation:** If REJECT, logs to Sheet -> Sends "Ghost Reply" -> Moves to Trash.
4. **Feedback Loop:** Scans replies for `[ref-id:]` and updates the existing row in the Sheet with cleaned feedback.

## Data Schema (9 Columns)
1. Date | 2. Company | 3. Sender Name | 4. Sender Email | 5. Status | 6. Reject Text | 7. Ghost Sent | 8. Detailed Feedback | 9. Thread ID