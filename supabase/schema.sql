-- ============================================================
--  Logos Youth Philosophy · Members hub · database schema
--  Run once in Supabase: SQL Editor -> New query -> paste -> Run
--  Safe to re-run: every statement is idempotent.
-- ============================================================

-- ---------- enums ----------
do $$ begin
  create type public.member_role as enum ('member', 'chapter_lead', 'team');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.member_status as enum ('pending', 'approved', 'blocked');
exception when duplicate_object then null; end $$;

-- ---------- members (the register) ----------
-- One row per person. A row can exist before the person has an account
-- (pre-approved email). role and chapter are here from day one so that
-- chapter-lead features can be added later without a migration.
create table if not exists public.members (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid unique references auth.users (id) on delete set null,
  email       text not null unique,
  name        text,
  role        public.member_role   not null default 'member',
  status      public.member_status not null default 'pending',
  chapter     text,
  school      text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists members_status_idx on public.members (status);

-- keep emails lowercase
create or replace function public.members_normalise()
returns trigger language plpgsql as $$
begin
  new.email := lower(trim(new.email));
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists members_normalise_trg on public.members;
create trigger members_normalise_trg
  before insert or update on public.members
  for each row execute function public.members_normalise();

-- When someone creates an account: link them to a pre-approved row if one
-- exists for their email, otherwise create a pending row for the team to approve.
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(trim(new.email));
  v_name  text := coalesce(new.raw_user_meta_data ->> 'name', '');
begin
  if exists (select 1 from public.members m where m.email = v_email) then
    update public.members
       set user_id = new.id,
           name    = coalesce(nullif(name, ''), nullif(v_name, ''))
     where email = v_email;
  else
    insert into public.members (user_id, email, name, status)
    values (new.id, v_email, nullif(v_name, ''), 'pending');
  end if;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ---------- access helpers (used by every policy) ----------
create or replace function public.is_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.members
    where user_id = auth.uid() and status = 'approved'
  );
$$;

create or replace function public.is_team()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.members
    where user_id = auth.uid() and status = 'approved' and role = 'team'
  );
$$;

-- ---------- content tables ----------
create table if not exists public.sessions (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  speaker         text,
  speaker_note    text,
  description     text,
  starts_at       timestamptz,
  duration_min    int,
  join_url        text,
  cancelled       boolean not null default false,
  sort            int not null default 0,
  created_at      timestamptz not null default now()
);

create table if not exists public.resources (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid references public.sessions (id) on delete set null,
  title        text not null,
  description  text,
  type         text not null default 'link'
               check (type in ('handout','slides','recording','reading','exercise','template','link')),
  url          text not null,
  start_here   boolean not null default false,
  published    boolean not null default true,
  sort         int not null default 0,
  created_at   timestamptz not null default now()
);

create table if not exists public.notices (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  body          text not null,
  category      text not null default 'general'
                check (category in ('general','deadline','workshop','journal','chapters')),
  pinned        boolean not null default false,
  published_at  timestamptz not null default now(),
  expires_on    date,
  author        text,
  created_at    timestamptz not null default now()
);
create index if not exists notices_published_idx on public.notices (published_at desc);

create table if not exists public.key_dates (
  id           uuid primary key default gen_random_uuid(),
  label        text not null,
  due_on       date not null,
  description  text,
  url          text,
  created_at   timestamptz not null default now()
);

create table if not exists public.faqs (
  id        uuid primary key default gen_random_uuid(),
  question  text not null,
  answer    text not null,
  sort      int not null default 0
);

create table if not exists public.contacts (
  id     uuid primary key default gen_random_uuid(),
  name   text not null,
  role   text,
  email  text,
  note   text,
  sort   int not null default 0
);

-- Questions from members to the team (one-way; not a forum)
create table if not exists public.questions (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid references public.members (id) on delete set null,
  email       text,
  body        text not null,
  answered    boolean not null default false,
  answer      text,
  created_at  timestamptz not null default now()
);

-- ---------- row level security ----------
alter table public.members   enable row level security;
alter table public.sessions  enable row level security;
alter table public.resources enable row level security;
alter table public.notices   enable row level security;
alter table public.key_dates enable row level security;
alter table public.faqs      enable row level security;
alter table public.contacts  enable row level security;
alter table public.questions enable row level security;

-- members: see your own row; team sees and manages everyone
drop policy if exists members_select_own  on public.members;
drop policy if exists members_team_all    on public.members;
create policy members_select_own on public.members
  for select to authenticated using (user_id = auth.uid());
create policy members_team_all on public.members
  for all to authenticated using (public.is_team()) with check (public.is_team());

-- content: approved members read, team writes
do $$
declare t text;
begin
  foreach t in array array['sessions','resources','notices','key_dates','faqs','contacts'] loop
    execute format('drop policy if exists %I_member_read on public.%I', t, t);
    execute format('drop policy if exists %I_team_all on public.%I', t, t);
    execute format(
      'create policy %I_member_read on public.%I for select to authenticated using (public.is_member())', t, t);
    execute format(
      'create policy %I_team_all on public.%I for all to authenticated using (public.is_team()) with check (public.is_team())', t, t);
  end loop;
end $$;

-- questions: members can send one and see their own; team sees all
drop policy if exists questions_member_insert on public.questions;
drop policy if exists questions_member_select on public.questions;
drop policy if exists questions_team_all      on public.questions;
create policy questions_member_insert on public.questions
  for insert to authenticated
  with check (
    public.is_member()
    and member_id = (select id from public.members where user_id = auth.uid())
  );
create policy questions_member_select on public.questions
  for select to authenticated
  using (member_id = (select id from public.members where user_id = auth.uid()));
create policy questions_team_all on public.questions
  for all to authenticated using (public.is_team()) with check (public.is_team());

-- ---------- convenience view: what the signed-in person is ----------
create or replace function public.my_membership()
returns table (id uuid, email text, name text, role public.member_role, status public.member_status, chapter text)
language sql stable security definer set search_path = public as $$
  select id, email, name, role, status, chapter
  from public.members where user_id = auth.uid();
$$;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.is_member(), public.is_team(), public.my_membership() to authenticated;
