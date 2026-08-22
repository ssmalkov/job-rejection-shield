/**
 * PROJECT: Job Rejection Shield
 * FILE: GhostReply.gs
 * GOAL: Optional feedback loop — ask a recruiter why, then harvest the answer.
 *
 * Both entry points are gated by flags in Config.gs and are inert while
 * ENABLE_GHOST_REPLY / ENABLE_FEEDBACK_HARVEST are false. The code is kept so
 * the loop can be switched back on without rewriting it.
 */

/**
 * Replies to a rejection thread with a polite request for feedback.
 * The [ref-id:] marker is what processIncomingFeedback() matches on later.
 */
function sendGhostReply(thread, originalBody) {
  const replyHeader = "Thank you for the update. Could you please share brief feedback regarding the decision? It would help me a lot in my professional growth.\n\n[ref-id:" + thread.getId() + "]\n\n";
  const fullBody = replyHeader + "--- Original Message ---\n" + originalBody;
  thread.reply(fullBody);
}

/**
 * Finds recruiter answers to our feedback requests, extracts the useful part
 * with AI and writes it into column H of the matching row.
 */
function processIncomingFeedback() {
  const myEmail = Session.getActiveUser().getEmail();
  const threads = GmailApp.search('"[ref-id:" -from:' + myEmail);
  if (threads.length === 0) return;

  const sheet = getCrmSheet();
  const data = sheet.getDataRange().getValues();

  threads.forEach(thread => {
    const lastMessage = thread.getMessages().pop();
    const body = lastMessage.getPlainBody();
    const subject = lastMessage.getSubject();
    const threadId = thread.getId();

    // Simple prompt for feedback extraction
    const feedback = callAiWithRetry("Extract Feedback", body);

    // Since we reuse callAiWithRetry, handle feedback carefully
    if (feedback) {
      const text = feedback.cleanedBody || (typeof feedback === 'string' ? feedback : JSON.stringify(feedback));
      for (let i = 1; i < data.length; i++) {
        if (data[i][8] === threadId) {
          // sanitizeCell: the recruiter wrote this text, Sheets must not run it
          sheet.getRange(i + 1, 8).setValue(sanitizeCell(text));
          destroyThread(thread, subject, body);
          break;
        }
      }
    }
  });
}
