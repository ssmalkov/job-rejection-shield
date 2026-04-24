/**
 * PROJECT: Job Rejection Shield v4.0
 * GOAL: Advanced Recruitment Intelligence with JSON Data Extraction
 */

// === CONFIGURATION ===

const scriptProperties = PropertiesService.getScriptProperties();
const SPREADSHEET_ID = scriptProperties.getProperty('SPREADSHEET_ID');
const API_KEY = scriptProperties.getProperty('GEMINI_API_KEY');
const MODEL_NAME = 'gemini-flash-lite-latest';
const TARGET_LABEL = 'Job Rejection Shield';

/**
 * Main orchestrator
 */
function main() {
  // First, process any incoming recruiter replies (feedback)
  processIncomingFeedback();
  
  const label = GmailApp.getUserLabelByName(TARGET_LABEL);
  if (!label) return;

  const threads = label.getThreads();
  threads.forEach(thread => {
    const messages = thread.getMessages();
    const lastMessage = messages[messages.length - 1];
    const body = lastMessage.getPlainBody();
    const subject = lastMessage.getSubject();
    const sender = lastMessage.getFrom();
    const threadId = thread.getId();

    // Skip if we already sent a ghost reply or it's our own message
    if (lastMessage.getFrom().includes(Session.getActiveUser().getEmail()) || body.includes('[ref-id:')) {
      thread.removeLabel(label);
      return;
    }

    // Call AI for comprehensive analysis
    const analysis = analyzeEmailWithAI(subject, body, sender);
    console.log("Analysis Result: ", analysis);

    if (analysis.status === "REJECT") {
      logToSheet(
        new Date(), 
        analysis.company, 
        analysis.senderName, 
        sender, 
        "REJECTED", 
        analysis.cleanedBody, 
        threadId
      );
      sendGhostReply(thread);
      thread.moveToTrash(); 
    } 
    else if (analysis.status === "APPLIED") {
      logToSheet(
        new Date(), 
        analysis.company, 
        analysis.senderName, 
        sender, 
        "APPLIED", 
        "Application Confirmed", 
        threadId
      );
      thread.removeLabel(label); 
    }
    else {
      releaseToInbox(thread, label);
    }
  });
}

/**
 * Single AI call to classify and extract all data points
 */
function analyzeEmailWithAI(subject, body, sender) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;
  
  const prompt = `Analyze this recruitment email and output ONLY a valid JSON object.
  
  Tasks:
  1. Classify status: REJECT (not moving forward), APPLIED (confirmation), or OTHER (interview/question).
  2. Extract company name from subject, body, or sender email domain.
  3. Extract sender's person name if available.
  4. Clean the body: Remove signatures, legal disclaimers, logos, and thread history. Keep ONLY the core message.

  Format:
  {
    "status": "REJECT" | "APPLIED" | "OTHER",
    "company": "Company Name",
    "senderName": "Person Name or 'Recruiter'",
    "cleanedBody": "The actual message content"
  }

  Email Data:
  Subject: ${subject}
  From: ${sender}
  Body: ${body.substring(0, 3000)}`;

  const options = {
    "method": "POST",
    "contentType": "application/json",
    "payload": JSON.stringify({
      "contents": [{ "parts": [{ "text": prompt }] }],
      "generationConfig": { "response_mime_type": "application/json", "temperature": 0.1 }
    }),
    "muteHttpExceptions": true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const json = JSON.parse(response.getContentText());
    return JSON.parse(json.candidates[0].content.parts[0].text);
  } catch (e) {
    console.error("AI Analysis Failed: " + e);
    return { "status": "OTHER", "company": "Unknown", "senderName": "Unknown", "cleanedBody": body };
  }
}

/**
 * Process replies and extract ONLY feedback using AI
 */
function processIncomingFeedback() {
  const threads = GmailApp.search('"[ref-id:"');
  if (threads.length === 0) return;

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
  const data = sheet.getDataRange().getValues();
  const myEmail = Session.getActiveUser().getEmail();

  threads.forEach(thread => {
    const lastMessage = thread.getMessages().pop();
    
    if (lastMessage.getFrom().indexOf(myEmail) === -1) {
      const body = lastMessage.getPlainBody();
      const threadId = thread.getId();

      // Clean the feedback using AI to remove thread history
      const cleanedFeedback = cleanFeedbackWithAI(body);

      for (let i = 1; i < data.length; i++) {
        // Thread ID is in column I (index 8)
        if (data[i][8] === threadId) {
          sheet.getRange(i + 1, 8).setValue(cleanedFeedback);
          thread.moveToTrash(); 
          break;
        }
      }
    }
  });
}

/**
 * AI call to extract pure feedback from a reply
 */
function cleanFeedbackWithAI(body) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;
  const prompt = `Extract only the recruiter's feedback/reason from this email reply. 
  Remove all thread history, previous messages, signatures, and formal greetings. 
  Output ONLY the feedback text.
  
  Reply Body: ${body.substring(0, 2000)}`;

  const options = {
    "method": "POST",
    "contentType": "application/json",
    "payload": JSON.stringify({
      "contents": [{ "parts": [{ "text": prompt }] }]
    }),
    "muteHttpExceptions": true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const json = JSON.parse(response.getContentText());
    return json.candidates[0].content.parts[0].text.trim();
  } catch (e) { return body; }
}

/**
 * Logging with 9-column structure
 */
function logToSheet(date, company, name, email, status, content, threadId) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
  // A:Date, B:Company, C:Name, D:Email, E:Status, F:CleanedText, G:GhostSent, H:Feedback, I:ThreadID
  sheet.appendRow([date, company, name, email, status, content, 1, "", threadId]);
}

function sendGhostReply(thread) {
  const body = "Thank you for the update. Could you please share brief feedback regarding the decision? It would help me a lot in my professional growth.\n\n[ref-id:" + thread.getId() + "]";
  thread.reply(body);
}

function releaseToInbox(thread, label) {
  thread.moveToInbox();
  thread.removeLabel(label);
}
