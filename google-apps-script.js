// ============================================
// Google Apps Script — paste this into your
// Google Sheet's Apps Script editor
// (Extensions → Apps Script)
//
// This version:
// 1. Saves the registration to Google Sheets
// 2. Sends a confirmation email with a .ics
//    calendar invite attached
// ============================================

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);

  // Save to sheet
  sheet.appendRow([
    data.timestamp || new Date().toISOString(),
    data.firstName,
    data.lastName,
    data.email
  ]);

  // Send confirmation email with calendar invite
  try {
    sendConfirmationEmail(data.firstName, data.email);
  } catch (err) {
    Logger.log('Email error: ' + err.message);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'success' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function sendConfirmationEmail(firstName, email) {
  var meetLink = 'https://meet.google.com/tsa-shxs-knj';
  var webinarTitle = 'Build a Full AI Sales Agent System in Under 1 Hour';
  var webinarDate = 'Thursday, March 5, 2026';
  var webinarTime = '4:00 PM CET';

  // Build .ics calendar file
  // March 5, 2026 4:00 PM CET = 3:00 PM UTC = 10:00 PM Hanoi
  var icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Altitude//Webinar//EN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    'DTSTART:20260305T150000Z',
    'DTEND:20260305T160000Z',
    'SUMMARY:' + webinarTitle,
    'DESCRIPTION:Live coding with Claude Code — from zero to a working agentic outbound prospecting system.\\n\\nJoin here: ' + meetLink,
    'LOCATION:' + meetLink,
    'URL:' + meetLink,
    'STATUS:CONFIRMED',
    'ORGANIZER;CN=Amit Bendror:mailto:' + Session.getActiveUser().getEmail(),
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  var icsBlob = Utilities.newBlob(icsContent, 'text/calendar', 'webinar-invite.ics');

  // Email body (HTML)
  var htmlBody = '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', sans-serif; max-width: 520px; margin: 0 auto; color: #1a1a1a;">'
    + '<div style="padding: 32px 0; border-bottom: 1px solid #eee;">'
    + '  <span style="font-size: 18px; font-weight: 600; color: #8B7355;">Altitude</span>'
    + '</div>'
    + '<div style="padding: 40px 0;">'
    + '  <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 16px; line-height: 1.3;">You\'re registered, ' + firstName + '!</h1>'
    + '  <p style="font-size: 15px; color: #555; line-height: 1.6; margin: 0 0 28px;">You\'re all set for the live session. Here are the details:</p>'
    + '  <div style="background: #f8f7f5; border-radius: 8px; padding: 20px; margin: 0 0 28px;">'
    + '    <p style="margin: 0 0 8px; font-size: 14px;"><strong>Event:</strong> ' + webinarTitle + '</p>'
    + '    <p style="margin: 0 0 8px; font-size: 14px;"><strong>Date:</strong> ' + webinarDate + '</p>'
    + '    <p style="margin: 0 0 8px; font-size: 14px;"><strong>Time:</strong> ' + webinarTime + '</p>'
    + '    <p style="margin: 0; font-size: 14px;"><strong>Join:</strong> <a href="' + meetLink + '" style="color: #8B7355;">' + meetLink + '</a></p>'
    + '  </div>'
    + '  <p style="font-size: 14px; color: #555; line-height: 1.6; margin: 0 0 20px;">A calendar invite is attached to this email — open it to add the event to your calendar automatically.</p>'
    + '  <a href="' + meetLink + '" style="display: inline-block; background: #8B7355; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 14px; font-weight: 500;">Join on March 5 →</a>'
    + '</div>'
    + '<div style="padding: 24px 0; border-top: 1px solid #eee;">'
    + '  <p style="font-size: 12px; color: #999; margin: 0;">Altitude — Built with intention</p>'
    + '</div>'
    + '</div>';

  // Send it
  GmailApp.sendEmail(email, 'You\'re in! ' + webinarTitle,
    // Plain text fallback
    'You\'re registered, ' + firstName + '!\n\n'
    + 'Event: ' + webinarTitle + '\n'
    + 'Date: ' + webinarDate + '\n'
    + 'Time: ' + webinarTime + '\n'
    + 'Join: ' + meetLink + '\n\n'
    + 'A calendar invite is attached — open it to add the event to your calendar.',
    {
      htmlBody: htmlBody,
      attachments: [icsBlob],
      name: 'Amit Bendror — Altitude'
    }
  );
}
