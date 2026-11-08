# Portal reminder job

One Apps Script file that chases registrants who never created a members portal
account. Runs daily, sends each person at most one nudge, and records the result
in the registrations sheet.

## Why it works this way

Registrations and accounts live in different places:

- The **Google Sheet** is the register. The Netlify form writes there.
- **Supabase** knows who has an account. A `members` row only gets a `user_id`
  when someone actually signs up at `/members.html`.

Nothing joins them, so this job does, on email address. Each run it pulls every
email in Supabase that has an account, then walks the sheet and nudges anyone
who registered more than four days ago, has no account, and has not been nudged
before.

It also stamps **Portal account found** on rows that do have accounts. That
column is the point: after a couple of weeks it tells you your real conversion
rate from registration to account, which is the number that decides whether any
of this is worth keeping.

## Setup, about ten minutes

1. **Open the script.** It is the same Apps Script project that already sends
   the onboarding email. Extensions, Apps Script from the registrations sheet,
   or script.google.com. Add a new file and paste in `PortalReminder.gs`.

2. **Set the script timezone** to Asia/Dubai. Project Settings, Time zone.
   The trigger fires at 10:00 in whatever this is set to.

3. **Get the Supabase service role key.** Supabase, Project Settings, API,
   under Project API keys, the `service_role` `secret` one. Not the `anon` key:
   row-level security blocks the anon key from reading other people's member
   rows, which is the whole point of it.

   > **This key bypasses every access rule in your database.** It belongs in
   > Apps Script properties and nowhere else. Never put it in
   > `members-config.js`, any file in the website repo, or anything a browser
   > downloads. If it ever leaks, rotate it in Supabase immediately.

4. **Add three script properties.** Project Settings, Script Properties:

   | Property | Value |
   |---|---|
   | `SHEET_ID` | the registrations spreadsheet ID, from its URL |
   | `SUPABASE_URL` | `https://vdwgixujlbrqzlrlnwam.supabase.co` |
   | `SUPABASE_SERVICE_KEY` | the `service_role` secret from step 3 |

5. **Check `SHEET_TAB`** at the top of `PortalReminder.gs` matches the tab name
   holding registrations. `SITE` is already set to `https://logosjournal.org`.

6. **Dry run.** Select `previewPortalReminders` and Run. It sends nothing and
   logs exactly who it would email. Read that list before going further. If it
   complains it cannot find the name, email or date column, add your sheet's
   actual header to the matching list in `COLS` at the top of the file.

7. **Send for real, once, by hand.** Run `sendPortalReminders`. Check the sheet
   got stamped and that the email looks right in your own inbox.

8. **Install the trigger.** Run `installDailyTrigger` once.

## Settings worth knowing

At the top of `PortalReminder.gs`:

- `REMINDER_AFTER_DAYS` (4). How long to wait after registering.
- `MAX_PER_RUN` (40). The ceiling per run. A consumer Gmail account can send
  to roughly 100 recipients a day through `GmailApp`, and the onboarding emails
  come out of the same allowance. The job checks the remaining quota and keeps
  five in reserve, so it will never spend your whole day's sending on nudges.
- `ONLY_REGISTERED_AFTER` (1 September 2026). Registrations older than this are
  skipped. This is your backfill control. On the first real run the job will
  look at everyone who registered since that date, which may be most of your
  120 registrants, and will work through them over several days because of
  `MAX_PER_RUN`. If you would rather only nudge people from here on, set it to
  today's date before the first run.

## Decisions baked in, and why

**One reminder, ever.** Not a sequence. A second nudge about a free account
reads as nagging, and the deliverability cost of being marked as spam by
teenagers is worse than the handful of extra accounts a second email would win.

**Four days, not one.** Someone who registers on a Saturday and signs up on
Tuesday should never get chased. Four days clears the normal lag.

**Keyed on account existence, not on sign-in.** Someone who made an account and
never came back is left alone. Getting them to use the portal is a content
problem, not an email problem.

## What this does not handle

If someone registers with one email and creates their account with another, the
job cannot tell and will nudge them. The emails all say to use the same address,
which is the cheap fix. The expensive fix is a lookup at signup, which is not
worth building for what will be a handful of people.
