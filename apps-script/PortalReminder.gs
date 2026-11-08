/**
 * Logos Youth Philosophy · portal reminder job
 * ---------------------------------------------------------------------------
 * Once a day, look at the registrations sheet, find anyone who registered a
 * few days ago and never created a members portal account, and send them one
 * nudge. Stamp the sheet so nobody is ever nudged twice.
 *
 * Why it reads two places: registrations live in the Google Sheet (the Netlify
 * form writes there), but whether someone has an account lives in Supabase.
 * Neither one knows about the other, so this job joins them on email address.
 *
 * Setup is in apps-script/README.md. Run previewPortalReminders() first.
 */

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

/** Wait this many days after registering before nudging. */
var REMINDER_AFTER_DAYS = 4;

/** Never send more than this in one run. Protects the Gmail daily quota. */
var MAX_PER_RUN = 40;

/** Ignore registrations before this date, so you control the backfill.
 *  Set to a date you are happy to email. 'null' means no limit. */
var ONLY_REGISTERED_AFTER = new Date('2026-09-01T00:00:00Z');

/** Shown as the sender name. */
var FROM_NAME = 'Logos Youth Philosophy';

/** The live site as it should read in an email, no scheme, no trailing slash.
 *  Mail clients link this on their own and it does not wrap awkwardly. */
var SITE = 'logosjournal.org';

/** Sheet tab holding the registrations. */
var SHEET_TAB = 'register-interest';

/** Column headers. First match wins, so list the likely spellings. */
var COLS = {
  name:  ['Name', 'name', 'Full name', 'full_name'],
  email: ['Email', 'email', 'Email address', 'email_address'],
  date:  ['Timestamp', 'Date', 'timestamp', 'Created at', 'created_at', 'Submitted at']
};

/** Columns this script writes. Created automatically if missing. */
var COL_REMINDED = 'Portal reminder sent';
var COL_HAS_ACCOUNT = 'Portal account found';

// ---------------------------------------------------------------------------
// Entry points
// ---------------------------------------------------------------------------

/** Dry run. Logs exactly who would be emailed and sends nothing. */
function previewPortalReminders() {
  run_(true);
}

/** The real thing. This is what the daily trigger calls. */
function sendPortalReminders() {
  run_(false);
}

/** Run once by hand to create the daily trigger. Safe to re-run. */
function installDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'sendPortalReminders') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sendPortalReminders')
    .timeBased().everyDays(1).atHour(10).create();
  Logger.log('Daily trigger installed for ~10:00 in the script timezone.');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function run_(dryRun) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30 * 1000)) {
    Logger.log('Another run is in progress. Stopping.');
    return;
  }

  try {
    var cfg = getConfig_();
    var sheet = SpreadsheetApp.openById(cfg.sheetId).getSheetByName(SHEET_TAB);
    if (!sheet) throw new Error('No sheet tab named "' + SHEET_TAB + '".');

    var values = sheet.getDataRange().getValues();
    if (values.length < 2) { Logger.log('Sheet is empty.'); return; }

    var headers = values[0].map(function (h) { return String(h).trim(); });
    var iName  = findColumn_(headers, COLS.name,  'name');
    var iEmail = findColumn_(headers, COLS.email, 'email');
    var iDate  = findColumn_(headers, COLS.date,  'date');

    var iReminded    = ensureColumn_(sheet, headers, COL_REMINDED);
    var iHasAccount  = ensureColumn_(sheet, headers, COL_HAS_ACCOUNT);

    var withAccounts = fetchEmailsWithAccounts_(cfg);
    Logger.log('Supabase reports %s accounts linked to a member row.', withAccounts.size);

    var cutoff = new Date(Date.now() - REMINDER_AFTER_DAYS * 86400000);
    var quota = MailApp.getRemainingDailyQuota();
    var budget = Math.min(MAX_PER_RUN, Math.max(0, quota - 5)); // leave 5 spare
    Logger.log('Gmail quota left today: %s. Sending at most %s.', quota, budget);

    var seen = {}, sent = 0, stats = { noEmail: 0, tooNew: 0, tooOld: 0, already: 0, hasAccount: 0, dupe: 0 };
    var writes = [];

    for (var r = 1; r < values.length; r++) {
      var row = values[r];
      var email = String(row[iEmail] || '').trim().toLowerCase();
      if (!email || email.indexOf('@') === -1) { stats.noEmail++; continue; }

      if (seen[email]) { stats.dupe++; continue; }
      seen[email] = true;

      // Already has an account: record it and move on. This is your
      // conversion number, visible in the sheet.
      if (withAccounts.has(email)) {
        stats.hasAccount++;
        if (!row[iHasAccount]) writes.push({ row: r + 1, col: iHasAccount + 1, value: new Date() });
        continue;
      }

      if (row[iReminded]) { stats.already++; continue; }

      var registered = toDate_(row[iDate]);
      if (!registered) { stats.tooNew++; continue; }
      if (registered > cutoff) { stats.tooNew++; continue; }
      if (ONLY_REGISTERED_AFTER && registered < ONLY_REGISTERED_AFTER) { stats.tooOld++; continue; }

      if (sent >= budget) {
        Logger.log('Hit the send budget. The rest will go on the next run.');
        break;
      }

      var name = firstName_(row[iName]);

      if (dryRun) {
        Logger.log('WOULD SEND to %s (%s), registered %s', email, name, registered);
      } else {
        GmailApp.sendEmail(email, reminderSubject_(), reminderBody_(name), {
          name: FROM_NAME,
          replyTo: 'logosyouthphilosophy@gmail.com'
        });
        writes.push({ row: r + 1, col: iReminded + 1, value: new Date() });
      }
      sent++;
    }

    writes.forEach(function (w) { sheet.getRange(w.row, w.col).setValue(w.value); });

    Logger.log(
      '%s %s reminder(s). Skipped: %s already have accounts, %s already nudged, ' +
      '%s not due yet, %s before the backfill cutoff, %s duplicate rows, %s rows with no email.',
      dryRun ? 'Would have sent' : 'Sent', sent,
      stats.hasAccount, stats.already, stats.tooNew, stats.tooOld, stats.dupe, stats.noEmail
    );
  } finally {
    lock.releaseLock();
  }
}

// ---------------------------------------------------------------------------
// Supabase
// ---------------------------------------------------------------------------

/**
 * Every email that already has a portal account, as a lowercase Set.
 * One request, not one per registrant.
 */
function fetchEmailsWithAccounts_(cfg) {
  var url = cfg.supabaseUrl.replace(/\/+$/, '') +
    '/rest/v1/members?select=email&user_id=not.is.null&limit=10000';

  var res = UrlFetchApp.fetch(url, {
    method: 'get',
    muteHttpExceptions: true,
    headers: {
      'apikey': cfg.supabaseKey,
      'Authorization': 'Bearer ' + cfg.supabaseKey,
      'Accept': 'application/json'
    }
  });

  var code = res.getResponseCode();
  if (code !== 200) {
    throw new Error('Supabase returned ' + code + ': ' + res.getContentText().slice(0, 300));
  }

  var set = new Set();
  JSON.parse(res.getContentText()).forEach(function (m) {
    if (m.email) set.add(String(m.email).trim().toLowerCase());
  });
  return set;
}

// ---------------------------------------------------------------------------
// Email copy · see ONBOARDING-EMAIL.md, keep the two in step
// ---------------------------------------------------------------------------

function reminderSubject_() {
  return "Your Logos portal account isn't set up yet";
}

function reminderBody_(name) {
  return [
    'Hi ' + name + ',',
    '',
    "You registered with Logos a few days ago but haven't set up your members portal",
    'account yet, so this is a nudge.',
    '',
    'It takes no more than thirty seconds. Go to ' + SITE + '/members, choose',
    '"Create account" and use this same email address, the one we\'re writing to, so',
    'we can match your account to your membership.',
    '',
    'The portal is where all member opportunities are managed: workshop recordings',
    'and handouts, reading lists, and a noticeboard with announcements and deadlines.',
    "Professor Fricker's one-hour session on how to write philosophically is in there",
    'now, with her two-page handout, and the handout is the one to read before you',
    'plan your essay.',
    '',
    'The competition deadline is December 15, and the full guidelines are at',
    SITE + '/submit.',
    '',
    "If something went wrong when you tried to sign up, or you'd rather we just set",
    "the account up for you, reply to this and we'll sort it.",
    '',
    'Aleesha & Smayan',
    'Logos',
    '',
    '--',
    'Logos Youth Philosophy, Arabian Ranches, Dubai, United Arab Emirates',
    "Don't want these emails? Just reply with the word unsubscribe."
  ].join('\n');
}


// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function getConfig_() {
  var p = PropertiesService.getScriptProperties();
  var cfg = {
    sheetId:     p.getProperty('SHEET_ID'),
    supabaseUrl: p.getProperty('SUPABASE_URL'),
    supabaseKey: p.getProperty('SUPABASE_SERVICE_KEY')
  };
  ['sheetId', 'supabaseUrl', 'supabaseKey'].forEach(function (k) {
    if (!cfg[k]) throw new Error('Missing script property for ' + k + '. See apps-script/README.md.');
  });
  return cfg;
}

function findColumn_(headers, candidates, label) {
  for (var i = 0; i < candidates.length; i++) {
    var at = headers.indexOf(candidates[i]);
    if (at !== -1) return at;
  }
  throw new Error(
    'Could not find the ' + label + ' column. Looked for: ' + candidates.join(', ') +
    '. The sheet has: ' + headers.join(', ') + '. Add the right header to COLS.' + label + '.'
  );
}

/** Index of a column this script owns, appending it to the sheet if absent. */
function ensureColumn_(sheet, headers, title) {
  var at = headers.indexOf(title);
  if (at !== -1) return at;
  var col = headers.length + 1;
  sheet.getRange(1, col).setValue(title);
  headers.push(title);
  return col - 1;
}

function toDate_(v) {
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  if (!v) return null;
  var d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

/** "Aleesha Naeem" -> "Aleesha". Falls back to something that reads fine. */
function firstName_(v) {
  var s = String(v || '').trim();
  if (!s) return 'there';
  return s.split(/\s+/)[0];
}
