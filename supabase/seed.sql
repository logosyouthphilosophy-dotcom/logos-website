-- ============================================================
--  Logos Youth Philosophy · Members hub · starter content
--  Run AFTER schema.sql. Edit freely before running.
--  Everything here can also be changed later from the admin panel.
-- ============================================================

-- ---------- team accounts (pre-approved; sign up with these emails) ----------
insert into public.members (email, name, role, status) values
  ('logosyouthphilosophy@gmail.com', 'Logos team',   'team', 'approved'),
  ('aleeshadxb@gmail.com',           'Aleesha Naeem','team', 'approved')
on conflict (email) do update set role = excluded.role, status = excluded.status;
-- Add Smayan's email here once you have it:
-- insert into public.members (email, name, role, status) values ('...', 'Smayan Sethi', 'team', 'approved');

-- ---------- workshop sessions ----------
insert into public.sessions (id, title, speaker, speaker_note, description, starts_at, duration_min, sort) values
  ('11111111-1111-1111-1111-111111111101',
   'How to write philosophy',
   'Professor Lizzie Fricker',
   'Taught philosophy at Oxford for nearly thirty years · Emeritus Fellow, Magdalen College',
   'Our first writing workshop. How to choose a narrow topic, find readings, structure an essay simply, and write plainly. Recording and handout below.',
   '2026-10-03 12:30:00+00', 60, 1)
on conflict (id) do nothing;

-- ---------- resources ----------
insert into public.resources (session_id, title, description, type, url, start_here, sort) values
  ('11111111-1111-1111-1111-111111111101',
   'How to Write a Philosophy Essay (handout)',
   'Two-page notes from the workshop: choose a narrow topic, find your readings, do not skip the exegesis, work from an outline, structure it simply, write plainly, credit your sources.',
   'handout',
   'https://drive.google.com/file/d/1Sdas-YZbJeb7bxNT---VAn0RL0tc2O3C/view',
   true, 1),
  ('11111111-1111-1111-1111-111111111101',
   'Workshop recording',
   'Full one-hour recording of the session with Professor Fricker, including the Q&A at the end. Large file; stream it from Drive rather than downloading.',
   'recording',
   'https://drive.google.com/file/d/1vw8mHIkn50Gm0H0wTwrbwGAySGY-42n_/view',
   false, 2),
  ('11111111-1111-1111-1111-111111111101',
   'Stanford Encyclopedia of Philosophy',
   'Recommended in the workshop as the place to get an overview of a topic. Read a couple of the recent pieces each article cites, or the classic ones.',
   'reading',
   'https://plato.stanford.edu/',
   false, 3),
  (null,
   'Submission guidelines',
   'The full rules for the journal essay competition: eligibility, length, format, citations and the AI policy.',
   'link',
   '/submit.html',
   true, 10)
on conflict do nothing;

-- ---------- key dates ----------
insert into public.key_dates (label, due_on, description, url) values
  ('Chapter lead applications close', '2026-11-08', 'Applications for the international chapters programme close. One chapter lead is chosen per city.', null),
  ('Essay competition deadline',      '2026-12-15', 'Submissions for issue one of the journal close. 1,000 to 3,000 words, PDF, APA citations.', '/submit.html')
on conflict do nothing;

-- ---------- notices ----------
insert into public.notices (title, body, category, pinned, author, published_at) values
  ('Welcome to the members hub',
   'This is where we will post announcements, workshop recordings and resources from now on. Check back before each deadline, and use **Ask the team** at the bottom of the page if something is unclear.',
   'general', true, 'Aleesha & Smayan', now()),
  ('Workshop recording and handout are up',
   'The recording of Professor Fricker''s session and the two-page handout are now in the resources section. The handout is the one to read before you plan your essay. Please do not share either outside the programme.',
   'workshop', false, 'Logos team', now() - interval '1 day'),
  ('Essay competition closes 15 December',
   'Submissions for issue one close on **15 December 2026**. Essays are 1,000 to 3,000 words, in English, as a PDF with APA citations. Any essay containing AI-written text is disqualified automatically. Read the full guidelines on the Submit page before you send anything.',
   'deadline', false, 'Logos team', now() - interval '2 days')
on conflict do nothing;

-- ---------- FAQ ----------
insert into public.faqs (question, answer, sort) values
  ('Who is eligible to enter the competition?', 'Any student anywhere in the world who will be in high school on 15 December 2026, from Grade 9 (Year 10) to Grade 12 (Year 13). Your school does not need to teach philosophy.', 1),
  ('How long should my essay be?', 'Between 1,000 and 3,000 words, not counting your reference list.', 2),
  ('Is there a theme?', 'No. Write on any philosophical question you want to argue about. What we ask for is an argument you develop and defend yourself, not a summary of what others have said.', 3),
  ('Which citation style and format?', 'APA style, with a full reference list at the end. Submit as a PDF, in English.', 4),
  ('Can I use AI?', 'Only for early research, such as tracking down sources or checking what a term means. Any AI-written text, including AI text run through a humaniser, disqualifies the essay automatically.', 5),
  ('When is the next workshop?', 'We announce workshops here on the noticeboard first, then on Instagram (@logos_yp) and by email. Workshops are for registered students only.', 6)
on conflict do nothing;

-- ---------- contacts ----------
insert into public.contacts (name, role, email, note, sort) values
  ('Logos team inbox', 'Anything about the journal, workshops or your account', 'logosyouthphilosophy@gmail.com', 'Emails come from this address. Check spam if you are missing one.', 1),
  ('Aleesha Naeem', 'Co-Founder', 'logosyouthphilosophy@gmail.com', null, 2),
  ('Smayan Sethi',  'Co-Founder', 'logosyouthphilosophy@gmail.com', null, 3)
on conflict do nothing;
