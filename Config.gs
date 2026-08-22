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
