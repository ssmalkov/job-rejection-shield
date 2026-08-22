/**
 * PROJECT: Job Rejection Shield
 * FILE: Config.gs
 * GOAL: Single place for credentials, feature flags and tunables.
 *
 * Apps Script shares one global scope across all .gs files, so everything
 * declared here is visible in Code.gs and GhostReply.gs.
 */

// === CREDENTIALS (Project Settings > Script Properties) ===
const scriptProperties = PropertiesService.getScriptProperties();
const SPREADSHEET_ID = scriptProperties.getProperty('SPREADSHEET_ID');
const API_KEY = scriptProperties.getProperty('GEMINI_API_KEY');
const TARGET_LABEL = 'Job Rejection Shield';

// === FEATURE FLAGS ===

// Auto-reply that asks the recruiter for feedback on a rejection.
// OFF: in practice most rejections arrive from noreply addresses, so there is
// nobody on the other side to answer.
const ENABLE_GHOST_REPLY = false;

// Delete rejection threads permanently instead of moving them to Trash.
// The Trash is still a place a hand can wander into. Requires the advanced
// Gmail service and the https://mail.google.com/ scope (see appsscript.json).
// IRREVERSIBLE: the mail cannot be recovered from Trash or All Mail afterwards,
// which is why raw text is stored in column J before the thread is destroyed.
const PERMANENT_DELETE = true;

// Signals that a thread is part of a live conversation. Even a REJECT verdict
// never triggers a permanent delete when one of these is present — insurance
// against a misclassification (or a prompt injection) eating an invitation.
const KEEP_ALIVE_PATTERNS = [
  /meet\.google\.com/i,
  /zoom\.us/i,
  /teams\.microsoft\.com/i,
  /calendar\.google\.com/i,
  /\binterview\b/i,
  /schedule a call/i,
  /\bcalendly\b/i
];

// Harvesting recruiter answers to those requests into the sheet.
// Kept as a separate flag on purpose: it can be switched on alone to collect
// replies to requests that were sent while ENABLE_GHOST_REPLY was still true.
const ENABLE_FEEDBACK_HARVEST = false;

// === NOREPLY DETECTION ===
// Matched against the local part of the sender address (the bit before '@').
// Add patterns here rather than touching the logic in isNoReplySender().
const NOREPLY_PATTERNS = [
  /no[-_.]?reply/i,        // noreply@, no-reply@, jobs-noreply@
  /do[-_.]?not[-_.]?reply/i // donotreply@, do-not-reply@
];

// Values written to column G "Ghost Sent".
const GHOST_STATUS = {
  SENT: 1,                             // feedback request actually sent
  DISABLED: 'DISABLED',                // ENABLE_GHOST_REPLY is off
  NO_REPLY_ADDRESS: 'NO_REPLY_ADDRESS',// sender cannot receive replies
  NOT_APPLICABLE: 'N/A'                // row is not a rejection
};

// === SHEET ===
// Canonical header row. ensureHeader() writes any cell that is still empty, so
// a fresh spreadsheet needs no manual setup and an older 9-column sheet simply
// gains column J. Headers you renamed yourself are never overwritten.
const SHEET_HEADER = [
  'Date', 'Company', 'Sender Name', 'Sender Email', 'Status',
  'Reject Text', 'Ghost Sent', 'Detailed Feedback', 'Thread ID', 'Stage', 'Raw Body'
];

// Column J: how far the process got before the "no". Extracted by the model
// from the rejection text itself — the stage is almost always stated there.
const STAGE_VALUES = ['APPLICATION', 'SCREENING', 'HIRING_MANAGER', 'INTERVIEW', 'FINAL', 'UNKNOWN'];

// How much of the raw email body is preserved in column J. The thread itself is
// gone after a permanent delete, so this is the only copy of the original text.
const RAW_BODY_LIMIT = 5000;

// === AI MODELS ===
// Priority list: the first model that answers wins.
const MODEL_PRIORITY = [
  scriptProperties.getProperty('MODEL_NAME') ||
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-flash-lite-latest',
  'gemini-flash-latest',
  'gemini-pro-latest',
  'gemini-3.1-flash-lite-preview',
  'gemini-3.1-pro-preview',
  'gemini-3-flash-preview'
];
