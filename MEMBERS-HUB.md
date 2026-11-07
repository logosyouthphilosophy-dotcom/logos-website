# Logos members hub

A members-only area of the site at `/members` for students registered with Logos:
noticeboard, key dates, workshop resources, workshop schedule, submission quick
reference, FAQ, contacts, and a question box to the team. A team-only admin page at
`/admin` manages all of it without touching code.

Content lives in Supabase (Postgres + auth). The site stays static on Netlify.

## Files

| File | What it is |
|---|---|
| `members.html`, `members.js`, `members.css` | The hub page |
| `members-admin.html`, `members-admin.js` | Team admin page |
| `members-data.js` | Data layer: Supabase, or demo data when opened with `?demo` |
| `members-config.js` | Supabase URL and anon key (fill in once) |
| `members-demo-data.js` | Sample content for previewing |
| `supabase/schema.sql` | Tables, access rules (RLS), signup trigger |
| `supabase/seed.sql` | Starter content: Fricker workshop, dates, notices, FAQ |

Preview without a database: open `members.html?demo` or `members-admin.html?demo`.

## One-time setup (about 15 minutes)

1. **Create the Supabase project.** supabase.com, sign in with the Logos Google
   account, New project. Name it `logos-hub`, pick a region near Dubai (e.g. Mumbai
   or Frankfurt), save the database password somewhere safe. Free tier is fine.
2. **Run the schema.** In the project: SQL Editor, New query, paste all of
   `supabase/schema.sql`, Run. Then do the same with `supabase/seed.sql`
   (edit the team emails at the top of seed.sql first if needed).
3. **Auth settings.** Authentication, Providers, Email: keep Email enabled and turn
   **Confirm email OFF**. Reason: Supabase's built-in email sender is limited to a
   handful of emails per hour and is meant for testing. Access is controlled by
   the approval step instead, so confirmation adds nothing. Password resets still
   send email; that is rare enough to work within the limit. If you ever want
   magic-link sign-in or higher volume, add a custom SMTP provider (Resend has a
   free tier) under Authentication, SMTP settings.
4. **Redirect URL.** Authentication, URL Configuration: set Site URL to the live
   site (e.g. `https://logosyouthphilosophy.netlify.app`) and add
   `https://<your-domain>/members.html` to Redirect URLs. This is where password
   reset links send people.
5. **Connect the site.** Project Settings, API: copy the Project URL and the
   `anon` `public` key into `members-config.js`. Commit and push. Netlify deploys.
6. **Create the team accounts.** Go to `/members`, Create account, with
   `logosyouthphilosophy@gmail.com` (pre-approved as team in seed.sql). You land in
   the hub with a "Team admin" button.

## Day to day (team)

Everything is at `/admin` (sign in at `/members` first).

- **Post a notice:** Notices, fill in title and body, pick a category, Add. Tick
  "Pin" for anything everyone must see. Set an expiry date for anything with a
  deadline so it archives itself.
- **Add a resource:** upload the file to the Logos Google Drive, set sharing to
  "Anyone with the link, Viewer", paste the link under Resources, choose the
  workshop it belongs to.
- **Announce a workshop:** Workshops, add it with a date and time. It shows as
  upcoming with its join link; after the date it moves to past and links to its
  resources.
- **Approve members:** Members shows a count of pending accounts. Check the email
  against the registration list, click Approve. To let people straight in, paste
  their emails into "Pre-approve emails" before they sign up.
- **Answer questions:** Questions shows what members have sent. Reply by email,
  mark answered. Recurring ones go into the FAQ.

## How access works

- Anyone can create an account, but they see a holding page until a team member
  approves them. Approval is matched to the registration list by hand.
- Roles: `member`, `chapter_lead`, `team`. Only `team` can open `/admin` or write
  anything. `chapter_lead` and the `chapter` field exist for the chapters
  programme; nothing uses them yet.
- All rules are enforced in the database (row-level security), not in the page,
  so the public anon key in `members-config.js` cannot read or change anything on
  its own.

## Later: chapter leads

The schema already carries `role = chapter_lead` and `chapter` on each member. The
natural next steps, when the programme launches: a chapters table (city, lead,
status), notices and resources scoped to a chapter, a chapter-lead view in the hub,
and monthly check-in records. None of that needs a migration of what exists.

## If something breaks

- Hub says "not connected to its database": `members-config.js` is empty.
- Sign-in works but hub shows "waiting for approval" for a team member: the
  email in `members` does not exactly match (case or spelling) the one used to
  sign up. Fix the row in `/admin` from another team account, or in the Supabase
  Table Editor.
- "Too many attempts": Supabase rate limit; wait a few minutes.
- Resource link opens a Drive "request access" page: the file's sharing is not
  set to anyone with the link.
