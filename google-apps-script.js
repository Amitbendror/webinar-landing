// ============================================
// Google Apps Script — paste into Apps Script
// (Extensions → Apps Script)
//
// Features:
// 1. Saves registration to Google Sheets
// 2. Sends confirmation email + .ics invite
// 3. Notifies amit@altitudebiz.dev on each signup
// 4. Sends reminder email to all registrants
//    the day before (needs trigger — see below)
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

  // Notify Amit of new registration
  try {
    notifyAdmin(data.firstName, data.lastName, data.email);
  } catch (err) {
    Logger.log('Notification error: ' + err.message);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'success' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Confirmation email with .ics invite ──
function sendConfirmationEmail(firstName, email) {
  var meetLink = 'https://meet.google.com/tsa-shxs-knj';
  var webinarTitle = 'Build a Full AI Sales Agent System in Under 1 Hour';
  var webinarDate = 'Thursday, March 5, 2026';
  var webinarTime = '4:00 PM CET';

  var icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Altitude//Webinar//EN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    'DTSTART:20260305T150000Z',
    'DTEND:20260305T160000Z',
    'SUMMARY:' + webinarTitle,
    'DESCRIPTION:Join here: ' + meetLink,
    'LOCATION:' + meetLink,
    'URL:' + meetLink,
    'STATUS:CONFIRMED',
    'ORGANIZER;CN=Amit Bendror:mailto:' + Session.getActiveUser().getEmail(),
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  var icsBlob = Utilities.newBlob(icsContent, 'text/calendar', 'webinar-invite.ics');

  var htmlBody = '<div style="font-family:-apple-system,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a;">'
    + '<div style="padding:32px 0;border-bottom:1px solid #eee;"><span style="font-size:18px;font-weight:600;color:#8B7355;">Altitude</span></div>'
    + '<div style="padding:40px 0;">'
    + '<h1 style="font-size:22px;font-weight:600;margin:0 0 16px;">You\'re registered, ' + firstName + '!</h1>'
    + '<p style="font-size:15px;color:#555;line-height:1.6;margin:0 0 28px;">You\'re all set for the live session.</p>'
    + '<div style="background:#f8f7f5;border-radius:8px;padding:20px;margin:0 0 28px;">'
    + '<p style="margin:0 0 8px;font-size:14px;"><strong>Event:</strong> ' + webinarTitle + '</p>'
    + '<p style="margin:0 0 8px;font-size:14px;"><strong>Date:</strong> ' + webinarDate + '</p>'
    + '<p style="margin:0 0 8px;font-size:14px;"><strong>Time:</strong> ' + webinarTime + '</p>'
    + '<p style="margin:0;font-size:14px;"><strong>Join:</strong> <a href="' + meetLink + '" style="color:#8B7355;">' + meetLink + '</a></p>'
    + '</div>'
    + '<p style="font-size:14px;color:#555;margin:0 0 20px;">A calendar invite is attached — open it to add the event automatically.</p>'
    + '<a href="' + meetLink + '" style="display:inline-block;background:#8B7355;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:500;">Join on March 5 →</a>'
    + '</div>'
    + '<div style="padding:24px 0;border-top:1px solid #eee;"><p style="font-size:12px;color:#999;margin:0;">Altitude — Built with intention</p></div></div>';

  GmailApp.sendEmail(email, 'You\'re in! ' + webinarTitle,
    'You\'re registered, ' + firstName + '!\n\nEvent: ' + webinarTitle + '\nDate: ' + webinarDate + '\nTime: ' + webinarTime + '\nJoin: ' + meetLink,
    { htmlBody: htmlBody, attachments: [icsBlob], name: 'Amit Bendror — Altitude' }
  );
}

// ── Notify Amit on each registration ──
function notifyAdmin(firstName, lastName, email) {
  var ADMIN_EMAIL = 'amit@altitudebiz.dev';
  var totalRegistrants = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getLastRow() - 1;

  GmailApp.sendEmail(ADMIN_EMAIL, 'New webinar registration: ' + firstName + ' ' + lastName,
    'New registration!\n\n'
    + 'Name: ' + firstName + ' ' + lastName + '\n'
    + 'Email: ' + email + '\n'
    + 'Total registrants: ' + totalRegistrants + '\n\n'
    + 'View sheet: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl(),
    { name: 'Webinar Bot' }
  );
}

// ── Reminder email — runs day before (March 4) ──
// After pasting this code, run setupReminderTrigger() ONCE to schedule it
function setupReminderTrigger() {
  // Delete any existing reminder triggers first
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'sendReminderEmails') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // Schedule for March 4, 2026 at 9:00 AM UTC (10 AM CET)
  ScriptApp.newTrigger('sendReminderEmails')
    .timeBased()
    .at(new Date('2026-03-04T09:00:00Z'))
    .create();

  Logger.log('Reminder trigger set for March 4, 2026 at 10:00 AM CET');
}

function sendReminderEmails() {
  var meetLink = 'https://meet.google.com/tsa-shxs-knj';
  var webinarTitle = 'Build a Full AI Sales Agent System in Under 1 Hour';

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();

  // Skip header row (row 0)
  for (var i = 1; i < data.length; i++) {
    var firstName = data[i][1];
    var email = data[i][3];

    if (!email) continue;

    var htmlBody = '<div style="font-family:-apple-system,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a;">'
      + '<div style="padding:32px 0;border-bottom:1px solid #eee;"><span style="font-size:18px;font-weight:600;color:#8B7355;">Altitude</span></div>'
      + '<div style="padding:40px 0;">'
      + '<h1 style="font-size:22px;font-weight:600;margin:0 0 16px;">Tomorrow is the day, ' + firstName + '!</h1>'
      + '<p style="font-size:15px;color:#555;line-height:1.6;margin:0 0 28px;">Just a friendly reminder — the live session is happening tomorrow.</p>'
      + '<div style="background:#f8f7f5;border-radius:8px;padding:20px;margin:0 0 28px;">'
      + '<p style="margin:0 0 8px;font-size:14px;"><strong>Event:</strong> ' + webinarTitle + '</p>'
      + '<p style="margin:0 0 8px;font-size:14px;"><strong>Date:</strong> Tomorrow, Thursday March 5</p>'
      + '<p style="margin:0 0 8px;font-size:14px;"><strong>Time:</strong> 4:00 PM CET</p>'
      + '<p style="margin:0;font-size:14px;"><strong>Join:</strong> <a href="' + meetLink + '" style="color:#8B7355;">' + meetLink + '</a></p>'
      + '</div>'
      + '<a href="' + meetLink + '" style="display:inline-block;background:#8B7355;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:500;">Join tomorrow at 4 PM CET →</a>'
      + '</div>'
      + '<div style="padding:24px 0;border-top:1px solid #eee;"><p style="font-size:12px;color:#999;margin:0;">Altitude — Built with intention</p></div></div>';

    try {
      GmailApp.sendEmail(email, 'Reminder: ' + webinarTitle + ' is tomorrow!',
        'Hi ' + firstName + '!\n\nReminder: the webinar is tomorrow at 4:00 PM CET.\n\nJoin: ' + meetLink,
        { htmlBody: htmlBody, name: 'Amit Bendror — Altitude' }
      );
    } catch (err) {
      Logger.log('Reminder error for ' + email + ': ' + err.message);
    }
  }

  // Notify Amit that reminders were sent
  GmailApp.sendEmail('amit@altitudebiz.dev', 'Webinar reminders sent!',
    'Reminder emails were sent to ' + (data.length - 1) + ' registrants.',
    { name: 'Webinar Bot' }
  );
}
