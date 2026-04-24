# 🛡️ Job Rejection Shield (JRS) v4.0
**Automate the "Sad" Part of Your Job Hunt. Protect Your Sanity. Build Your CRM.**

## 😫 The Pain: Why This Exists
Job hunting is a numbers game, but the emotional toll is real. Reading the same "Unfortunately, we decided to move forward..." message 10 times a day kills motivation. 

**Job Rejection Shield** acts as your personal buffer. It uses **Gemini 3.1 AI** to read your mail, extract company data, log it into a Google Sheet, and ask for feedback—all before you even open the email.

---

## 🛠️ Step 1: Prepare the CRM (Google Sheets)
1. Create a **new Google Sheet**.
2. Set the header row (A1 to I1) with these exact columns:
   `Date | Company | Sender Name | Sender Email | Status | Reject Text | Ghost Sent | Detailed Feedback | Thread ID`
3. Copy the **Spreadsheet ID** from the address bar. 
   > *Example: If the URL is `docs.google.com/spreadsheets/d/1ABC_123/edit`, the ID is `1ABC_123`.*

---

## 🔑 Step 2: Get your FREE Gemini API Key
1. Go to **[Google AI Studio](https://aistudio.google.com/)**.
2. Click **"Get API key"** in the top-left sidebar.
3. Click **"Create API key in new project"**.
4. **Copy the key.** > **Note:** This is 100% free. Your data stays within the Google ecosystem, making it safer than third-party browser extensions.

---

## 📧 Step 3: Configure the Gmail Filter
You need a "net" to catch rejections and move them to the script.

1. Open Gmail and go to **Settings (gear icon) > See all settings**.
2. Go to the **Filters and Blocked Addresses** tab.
3. Click **Create a new filter**.
4. In the **"Has the words"** field, paste these keywords:
   `"thank you for your interest" OR "thank you for applying" OR "application" OR "hiring" OR "position" OR "unfortunately" OR "decided not to move forward" OR "moved forward with other" OR "keep your resume on file" OR "successful in your job search"`
   Or import filter from this file: mailFilters.xml (attached)
5. Activate checkboxes: Skip the Inbox (Archive it); Apply the label: Job Rejection Shield; Never send it to Spam.   
5. Click **Create filter**.
6. Check **"Apply the label"** -> Choose **New label** -> Name it: `Job Rejection Shield`.
7. Check **"Skip the Inbox (Archive it)"** if you want to be totally shielded from reading the rejection.

---

## 💻 Step 4: Install the Script
1. In your Google Sheet, go to **Extensions > Apps Script**.
2. Delete everything in the editor and paste the `Code.gs` from this project.
3. Paste your **Spreadsheet ID** into the variable at the top.
4. **Add your API Key securely:**
   - Click the **Project Settings (gear icon)** on the left sidebar.
   - Scroll to **Script Properties**.
   - Click **Add script property**.
   - **Property:** `GEMINI_API_KEY` | **Value:** *[Your API Key]*
   - Click **Save**.
5. Click the **Editor (code icon)** and hit **Save**.

---

## 🧪 Testing the Flow (Manual Stress Test)

Follow these steps to ensure everything is connected:

### Phase 1: The Initial Rejection
1. Send an email to yourself from another account.
   - **Subject:** `Update on your application for the Iron Throne`
   - **Body:** 
   Dear John Snow, Regarding your application for the Iron Throne.
   Unfortunately, we decided to move forward with other candidates.
   Best, Tyrion Lannister
2. In Gmail, you should see the email fall into the  `Job Rejection Shield` label.
3. If not, try manually adding this email to the label.
4. In Apps Script, click **Run** on the `main` function.
5. **Result:** - Check your Sheet: "Stark Industries" should appear with the status "REJECTED".
   - Check your test account: You should have received an automated reply asking for feedback.

### Phase 2: The Feedback Catch
1. Reply to the automated message from your test account.
   - **Body:**
   Hi John,
   Usually we don't provide feedback, but in your case Agon Targaryen, we must admit: you were simply too good for us.
   Good luck finding a place that actually deserves you!
   Beyond the wall, brother.  Beyond the wall 😁
   Yours, Brandon Stark
2. Run the `main` function again.
3. **Result:** Check the **Detailed Feedback** column in your Sheet. The "Vibranium" comment should be logged there automatically, and the email moved to Trash.

---

## 🤖 Full Automation
To make it run 24/7 without you:
1. In Apps Script, click **Triggers (clock icon)**.
2. Click **+ Add Trigger**.
3. Set: `main` | `Time-driven` | `Minutes timer` | `Every 30 minutes`.

---

## 👋 About the Author
Hi, I'm **Sergei Smalkov**, a Product Manager who believes that even "No's" can be automated for growth. I built this tool to turn the negativity of job rejections into a clean, structured database of feedback.

This project is **Open Source** and open for improvements. If you have ideas (Notion integration, Telegram alerts?), feel free to contribute!

### Liked the Idea?
* ⭐ **[Star this repository](https://github.com/ssmalkov/job-rejection-shield)** — to help others find it.
* 🚀 **[Check my other projects](https://linktr.ee/your_linktree)** — I build tools for productivity and PMs.
* 🍺 **[Buy me a beer / Tip](https://linktr.ee/your_linktree)** — keep the updates coming!

---
**Safe hunting! May your next status be `OFFER`.**