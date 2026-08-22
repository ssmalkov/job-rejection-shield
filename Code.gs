/**
 * PROJECT: Job Rejection Shield v4.0
 * FILE: Code.gs
 * GOAL: Advanced Recruitment Intelligence with JSON Data Extraction
 *
 * Configuration and feature flags live in Config.gs.
 * The optional feedback loop lives in GhostReply.gs.
 */

function main() {
  console.log("--- LOG: STARTING WORKFLOW ---");

  if (ENABLE_FEEDBACK_HARVEST) {
    processIncomingFeedback();
  }

  const label = GmailApp.getUserLabelByName(TARGET_LABEL);
  if (!label) return;

  const threads = label.getThreads();
  console.log("--- LOG: THREADS IN QUEUE: " + threads.length);
  const myEmail = Session.getActiveUser().getEmail();

  threads.forEach(thread => {
    try {
      const messages = thread.getMessages();
      const lastMessage = messages[messages.length - 1];
      const body = lastMessage.getPlainBody();
      const subject = lastMessage.getSubject();
      const sender = lastMessage.getFrom();
      const threadId = thread.getId();

      const isForwarded = body.includes("---------- Forwarded message ---------") || subject.toLowerCase().startsWith("fwd:");
      const isFromMe = sender.includes(myEmail);

      if (isFromMe && body.includes('[ref-id:') && !isForwarded) {
        thread.removeLabel(label);
        return;
      }

      // Try multiple models with retries
      const analysis = callAiWithRetry(subject, body);

      // CRITICAL: Only move/delete if AI actually replied with valid JSON
      if (analysis && analysis.status && analysis.status !== "ERROR") {
        if (analysis.status === "REJECT") {
          // Rejections are always logged, even when we stay silent: the CRM is
          // the whole point, the reply is optional.
          const ghostStatus = resolveGhostStatus(sender);
          logToSheet(new Date(), analysis.company, analysis.senderName, sender, "REJECTED", analysis.cleanedBody, threadId, ghostStatus);
          if (ghostStatus === GHOST_STATUS.SENT) {
            sendGhostReply(thread, body);
          }
          thread.moveToTrash();
          console.log("--- LOG: REJECTED AND TRASHED: " + analysis.company + " (ghost: " + ghostStatus + ")");
        }
        else if (analysis.status === "APPLIED") {
          logToSheet(new Date(), analysis.company, analysis.senderName, sender, "APPLIED", "Application Confirmed", threadId, GHOST_STATUS.NOT_APPLICABLE);
          thread.removeLabel(label);
          console.log("--- LOG: APPLIED AND ARCHIVED: " + analysis.company);
        }
        else {
          releaseToInbox(thread, label);
        }
      } else {
        console.warn("--- LOG: ALL AI ATTEMPTS FAILED. ITEM PRESERVED IN LABEL.");
      }
    } catch (e) {
      console.error("--- LOG: THREAD ERROR: " + e.toString());
    }
  });
}

/**
 * Decides what to do with the feedback request for a given sender,
 * and what to record in column G.
 * The noreply check comes first so the reason stays visible in the sheet
 * even while the feature flag is off.
 */
function resolveGhostStatus(sender) {
  if (isNoReplySender(sender)) return GHOST_STATUS.NO_REPLY_ADDRESS;
  if (!ENABLE_GHOST_REPLY) return GHOST_STATUS.DISABLED;
  return GHOST_STATUS.SENT;
}

/**
 * True for addresses that cannot receive a reply (noreply@, do-not-reply@, ...).
 * Accepts both "Name <a@b.com>" and a bare address.
 */
function isNoReplySender(sender) {
  const match = String(sender).match(/<([^>]+)>/);
  const address = (match ? match[1] : String(sender)).trim().toLowerCase();
  const localPart = address.split('@')[0];
  return NOREPLY_PATTERNS.some(pattern => pattern.test(localPart));
}

/**
 * Tries multiple models and multiple attempts per model
 */
function callAiWithRetry(subject, body) {
  // Улучшенный системный промт с правилами классификации
  const systemContext = `
    Analyze the recruitment email. Output ONLY JSON with fields: status, company, senderName, cleanedBody.
    
    STATUS RULES:
    1. 'REJECT': ONLY if it is a definitive "No" for the candidate's application (e.g., "decided not to move forward", "pursuing other candidates", "not a match at this time").
    2. 'APPLIED': ONLY for automated confirmations that an application was received.
    3. 'OTHER': For EVERYTHING ELSE, including:
       - Interview invitations or scheduling.
       - Meeting cancellations/reschedules (e.g., "Cancelled event", "mix-up", "need to reschedule").
       - Roles put "on hold" or paused (this is NOT a rejection).
       - General questions from recruiters or requests for more info.
       - Auto-responders (unmonitored inbox).
    
    CRITICAL: If the email suggests rescheduling or staying in touch because a role is paused, mark it as 'OTHER'.
  `;

  const prompt = `${systemContext}\n\nData to analyze:\nSubject: ${subject}\nBody: ${body.substring(0, 2000)}`;
  
  for (let model of MODEL_PRIORITY) {
    console.log("--- LOG: ATTEMPTING MODEL: " + model);
    
    for (let i = 0; i < 3; i++) {
      try {
        const url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + API_KEY;
        const response = UrlFetchApp.fetch(url, {
          "method": "POST",
          "contentType": "application/json",
          "payload": JSON.stringify({
            "contents": [{ "parts": [{ "text": prompt }] }],
            "generationConfig": { 
              "response_mime_type": "application/json", 
              "temperature": 0.1 // Низкая температура для стабильности
            }
          }),
          "muteHttpExceptions": true
        });

        const resCode = response.getResponseCode();
        const resText = response.getContentText();

        if (resCode === 200) {
          const json = JSON.parse(resText);
          if (json.candidates && json.candidates[0].content) {
            const raw = json.candidates[0].content.parts[0].text.replace(/```json|```/g, "").trim();
            return JSON.parse(raw);
          }
        }
        
        if (resCode === 429 || resCode === 503) {
          Utilities.sleep(2000 * (i + 1));
          continue;
        }
        break; 
      } catch (e) {
        console.error("--- LOG: FETCH EXCEPTION: " + e.toString());
        Utilities.sleep(1000);
      }
    }
  }
  return null;
}

/**
 * Appends a row to the CRM sheet.
 * A:Date B:Company C:Name D:Email E:Status F:Text G:GhostSent H:Feedback I:ThreadID
 */
function logToSheet(date, company, name, email, status, content, threadId, ghostStatus) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
  sheet.appendRow([date, company, name, email, status, content, ghostStatus, "", threadId]);
}

function releaseToInbox(thread, label) {
  thread.moveToInbox();
  thread.removeLabel(label);
}
