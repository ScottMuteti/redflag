/**
 * RedFlag — Gmail report forwarder (Google Apps Script)
 *
 * Runs on the reflag.org@gmail.com mailbox. When an employee forwards a
 * suspicious email to this inbox, this script POSTs it to RedFlag's inbound
 * reporting endpoint. RedFlag resolves the employee from the forwarder's own
 * address, and — if they were sent a matching email simulation in the last
 * 14 days — records it as "Reported" on that campaign.
 *
 * SETUP (one time):
 *   1. Go to https://script.google.com, signed in as reflag.org@gmail.com,
 *      and create a new project. Paste this file in as Code.gs.
 *   2. Project Settings (gear) -> Script properties -> add:
 *        REPORT_SECRET   = <the REPORT_INBOUND_SECRET value from the repo .env>
 *        INBOUND_URL     = https://redflag.hinny-flops.ts.net/api/reports/inbound
 *      (INBOUND_URL is optional; it defaults to the value below.)
 *   3. Run `installTrigger` once and approve the Gmail/UrlFetch permissions.
 *      That schedules processReports() to run every 5 minutes.
 *
 * To process a backlog immediately, just run `processReports` from the editor.
 */

var DEFAULT_INBOUND_URL = 'https://redflag.hinny-flops.ts.net/api/reports/inbound';
var PROCESSED_LABEL = 'redflag-reported';

function config_() {
  var props = PropertiesService.getScriptProperties();
  var secret = props.getProperty('REPORT_SECRET');
  if (!secret) {
    throw new Error('Set the REPORT_SECRET script property (the REPORT_INBOUND_SECRET from .env).');
  }
  return {
    secret: secret,
    url: props.getProperty('INBOUND_URL') || DEFAULT_INBOUND_URL,
  };
}

/** Schedules processReports() to run every 5 minutes. Run once. */
function installTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'processReports') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('processReports').timeBased().everyMinutes(5).create();
}

/** Reads unprocessed forwarded mail and reports each one to RedFlag. */
function processReports() {
  var cfg = config_();
  var label = GmailApp.getUserLabelByName(PROCESSED_LABEL) || GmailApp.createLabel(PROCESSED_LABEL);

  // Inbox messages we have not handled yet. The label marks a thread done.
  var threads = GmailApp.search('in:inbox -label:' + PROCESSED_LABEL, 0, 50);
  for (var i = 0; i < threads.length; i++) {
    var thread = threads[i];
    var messages = thread.getMessages();
    for (var j = 0; j < messages.length; j++) {
      var msg = messages[j];
      try {
        reportMessage_(cfg, msg);
      } catch (err) {
        // Leave the thread unlabeled so a transient failure is retried next run.
        Logger.log('Failed on "' + msg.getSubject() + '": ' + err);
        thread = null;
        break;
      }
    }
    if (thread) thread.addLabel(label).markRead();
  }
}

/** POSTs one forwarded message to the RedFlag inbound endpoint. */
function reportMessage_(cfg, msg) {
  var reporterEmail = extractEmail_(msg.getFrom());
  if (!reporterEmail) return; // can't identify the forwarder; skip

  var body = msg.getPlainBody() || '';
  var original = parseForwarded_(body); // best-effort original sender/subject

  var payload = {
    reporterEmail: reporterEmail,
    channel: 'email',
    from: original.from || '',
    subject: original.subject || msg.getSubject() || '',
    text: body.slice(0, 4000),
  };

  var res = UrlFetchApp.fetch(cfg.url, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'X-Report-Secret': cfg.secret },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  var code = res.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error('Inbound endpoint returned ' + code + ': ' + res.getContentText());
  }
  Logger.log('Reported ' + reporterEmail + ' -> ' + res.getContentText());
}

/** Pulls the bare address out of a "Name <addr@x>" header. */
function extractEmail_(from) {
  var m = String(from || '').match(/[^\s<>]+@[^\s<>]+/);
  return m ? m[0].toLowerCase() : '';
}

/** Best-effort parse of the original From/Subject from a Gmail forward block. */
function parseForwarded_(body) {
  var from = (body.match(/^\s*From:\s*(.+)$/im) || [])[1] || '';
  var subject = (body.match(/^\s*Subject:\s*(.+)$/im) || [])[1] || '';
  return { from: extractEmail_(from) || from.trim(), subject: subject.trim() };
}
