# Logos website: handoff

Pick-up notes for a new session. Last updated 8 November 2026.

## What this is

`logosjournal.org` — the site for Logos Youth Philosophy. Static HTML/CSS/JS, no build
step. Repo: `logosyouthphilosophy-dotcom/logos-website`. Netlify deploys `main` on push.

Four moving parts:

- **The public site** — plain static pages at the repo root.
- **Netlify Forms** — the `register-interest` form on `register.html`. Submissions land in
  Netlify and are meant to flow into a Google Sheet.
- **Google Apps Script** (`apps-script/`) — reads that Sheet and sends the onboarding email.
- **Supabase** — Postgres + Auth + row-level security behind the members portal
  (`members.html`, `members-admin.html`). Project `vdwgixujlbrqzlrlnwam`.

## Current state

Everything in the repo is committed and live. Last three commits:

```
b576ab7  Redirect the old resources URL rather than 404
34be8cd  Hub: survive a content table that does not exist yet
a8b6168  Site redesign, registration flow, and members portal rebuild
```

### What changed in the last session

**Registration flow.** The form stays as it was, with no password field. Registering sends
the onboarding email through Apps Script. The email and `register.html` both explain the
members portal and link to it. The portal is a separate corner button in the nav, not a
heading alongside the other pages. `register.html` lists member benefits.

**Design.** `styles.css` was rewritten twice and is now about 390 lines. One accent colour
(`--accent: #8a2a2a`), near-black text, one warm off-white band (`--bg-alt: #f3f1ee`),
`border-radius: 0` everywhere, all serif (EB Garamond; `--sans` is aliased to it so older
rules still resolve). No Inter on the public site. Red rules sit above major headings via a
shared `::before` block. Section indexes use a two-column sticky layout. Scroll-reveal is
deliberately inert: `.reveal { opacity: 1; transform: none; }`, and `initReveal()` is gone
from `app.js`. Do not reinstate it — it was hiding whole sections on the live site.

Removed in that pass: all quotes (four of six were misattributed), all eyebrow headings,
decorative symbols, pills and tags, cream backgrounds, Instrument Serif, section numbering,
founder photos, and `resources.html` (now redirected to `/register.html`). The homepage
opens with a two-column hero using `hero.svg`, a placeholder essay-page graphic.

**Members portal.** Rebuilt on a deliberately different design language from the public
site — corkboard, more colour, Inter for UI, meant to feel engaging for a young audience.
`members.css` is new (404 lines). The hub is an app shell: a Discord-style sidebar
(`.mh-side`, grouped Board / Programme / Beyond Logos / Competition / Help) beside a pane
area, with hash routing in `members.js` (`openPane()`, `initPanes()`). The board itself is
ragged Padlet-style masonry using CSS columns, with pinned-poster cards rotated slightly by
`nth-child`. Below 900px the sidebar becomes a drawer. Posting is team-only for now. The
sign-in screen keeps the public site's editorial styling on purpose.

A new **Philosophy updates** tab holds curated external links (news, papers, videos) that
aren't official Logos resources. It needs a `links` table that does not exist yet — see
below.

**Chapter leads** were stripped from the site and the onboarding email because they haven't
been announced. One live database row still mentions them.

## Outstanding jobs

### 1. Create the `links` table (not done)

Until this runs, the Philosophy updates tab will be empty. Supabase → SQL Editor → run:

```sql
create table if not exists public.links (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  url         text not null,
  source      text,
  kind        text not null default 'link'
              check (kind in ('news','paper','video','essay','podcast','link')),
  note        text,
  pinned      boolean not null default false,
  posted_on   date not null default current_date,
  sort        int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists links_posted_idx on public.links (posted_on desc);

alter table public.links enable row level security;

drop policy if exists links_member_read on public.links;
drop policy if exists links_team_all    on public.links;
create policy links_member_read on public.links
  for select to authenticated using (public.is_member());
create policy links_team_all on public.links
  for all to authenticated using (public.is_team()) with check (public.is_team());
```

Safe to re-run. The same statements are in `supabase/schema.sql`, and three starter rows
are in `supabase/seed.sql`.

Commit `34be8cd` means a missing table only empties that one tab instead of breaking the
whole hub, so shipping before running this is survivable, not correct.

### 2. Delete the chapter lead key date (not done)

`logosjournal.org/admin` → Key dates → delete "Chapter lead applications close". It's a
database row, so removing it from the code did nothing.

### 3. The Netlify → Google Sheets break (not done, highest priority)

**This is the real problem.** Netlify has 258 submissions, 217 unique email addresses and
203 distinct school names. The Google Sheet has 153 rows and stopped updating on
13 October 2026. The onboarding email is driven off the Sheet, so roughly 65 people
registered and never heard anything back. The competition deadline is 15 December.

Two things to do: find out why the integration stopped, and work out exactly who was missed
so they can be emailed. Pull the real list from Netlify, not the Sheet.

### 4. Follow-up reminder emails (built, not deployed)

`apps-script/PortalReminder.gs` emails registrants who never set up a portal account.
Sheet-driven, with a Supabase lookup to check who already has an account. Registrants do
not exist in Supabase until they sign up, so the Sheet is the source of truth for who
registered.

Constants: `REMINDER_AFTER_DAYS = 4`, `MAX_PER_RUN = 40`,
`ONLY_REGISTERED_AFTER = 2026-09-01`, `SHEET_TAB = 'register-interest'`.

To deploy: paste the file into the Apps Script project, set Script Properties
(`SHEET_ID`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` — the `service_role` key, never the
`anon` one, and never in any file the browser downloads), set the timezone to Asia/Dubai,
run `previewPortalReminders()` first, then `sendPortalReminders()` by hand once, then
`installDailyTrigger()`. Setup notes are in `apps-script/README.md`.

### 5. Onboarding email copy (written, not deployed)

`ONBOARDING-EMAIL.md` holds both emails rewritten in Aleesha's own voice: plain text, no
HTML, no buttons — matching how she actually writes. The Apps Script still sends the old
copy. Two facts were corrected and must stay corrected: the word range is 1,000–3,000, and
the Fricker workshop already ran on 3 October.

### Optional

- Replace `hero.svg` with a real workshop photo.
- Remove `chapter_lead` from the schema enum, the `/admin` dropdown, and the
  "Later: chapter leads" section of `MEMBERS-HUB.md`.

## Things worth knowing before changing anything

- **The impact numbers** (200+ / 190+ / 32 / 5) come from Netlify, not the Sheet. There is
  no country field on the form, so "32 countries" is a hand-counted floor based on about
  60% of the data. Don't present it as exact.
- **Artifact previews can't serve sub-pages.** Previewing the portal means publishing
  `members.html` as its own artifact with demo mode forced.
- **Screenshot the preview before claiming a visual fix works.** The scroll-reveal bug was
  invisible in the code and obvious on screen.
- **Design reference:** royalinstitutephilosophy.org. Measured, not guessed — all Caslon
  including nav and buttons, every heading weight 400, h1 at 150px/140px with -3px
  tracking, pure black on white, one alternate band at `#f2f0ed`.
