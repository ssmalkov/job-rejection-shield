/**
 * PROJECT: Job Rejection Shield v4.0
 * GOAL: Advanced Recruitment Intelligence with JSON Data Extraction
 */

// === CONFIGURATION ===
const scriptProperties = PropertiesService.getScriptProperties();
const SPREADSHEET_ID = scriptProperties.getProperty('SPREADSHEET_ID');
const API_KEY = scriptProperties.getProperty('GEMINI_API_KEY');
const TARGET_LABEL = 'Job Rejection Shield';

// Priority list of models to try if the primary fails
const MODEL_PRIORITY = [
//  scriptProperties.getProperty('MODEL_NAME') || 'gemini-2.0-flash-lite',
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

function main() {
  console.log("--- LOG: STARTING WORKFLOW ---");
  
  processIncomingFeedback();
  
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
          logToSheet(new Date(), analysis.company, analysis.senderName, sender, "REJECTED", analysis.cleanedBody, threadId);
          sendGhostReply(thread, body);
          thread.moveToTrash(); 
          console.log("--- LOG: REJECTED AND TRASHED: " + analysis.company);
        } 
        else if (analysis.status === "APPLIED") {
          logToSheet(new Date(), analysis.company, analysis.senderName, sender, "APPLIED", "Application Confirmed", threadId);
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

function processIncomingFeedback() {
  const myEmail = Session.getActiveUser().getEmail();
  const threads = GmailApp.search('"[ref-id:" -from:' + myEmail);
  if (threads.length === 0) return;

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
  const data = sheet.getDataRange().getValues();

  threads.forEach(thread => {
    const lastMessage = thread.getMessages().pop();
    const body = lastMessage.getPlainBody();
    const threadId = thread.getId();
    
    // Simple prompt for feedback extraction
    const feedback = callAiWithRetry("Extract Feedback", body);
    
    // Since we reuse callAiWithRetry, handle feedback carefully
    if (feedback) {
      const text = feedback.cleanedBody || (typeof feedback === 'string' ? feedback : JSON.stringify(feedback));
      for (let i = 1; i < data.length; i++) {
        if (data[i][8] === threadId) {
          sheet.getRange(i + 1, 8).setValue(text);
          thread.moveToTrash();
          break;
        }
      }
    }
  });
}

function logToSheet(date, company, name, email, status, content, threadId) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
  sheet.appendRow([date, company, name, email, status, content, 1, "", threadId]);
}

function sendGhostReply(thread, originalBody) {
  const replyHeader = "Thank you for the update. Could you please share brief feedback regarding the decision? It would help me a lot in my professional growth.\n\n[ref-id:" + thread.getId() + "]\n\n";
  const fullBody = replyHeader + "--- Original Message ---\n" + originalBody;
  thread.reply(fullBody);
}

function releaseToInbox(thread, label) {
  thread.moveToInbox();
  thread.removeLabel(label);
}