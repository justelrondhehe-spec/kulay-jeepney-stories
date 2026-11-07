-- Kulay: Jeepney Stories — Supabase schema + row-level security.
-- Paste this whole file into Supabase > SQL Editor > New query > Run. Safe to run once on a fresh project.

-- ---------- tables ----------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_]{3,20}$'),
  name text not null default '',
  bio text not null default '',
  links jsonb not null default '{}',
  av int not null default 0,
  bn int not null default 0,
  is_mod boolean not null default false,
  created_at timestamptz not null default now()
);

create table posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null default 'art' check (type in ('art','story')),
  title text not null check (char_length(title) between 1 and 120),
  cat text not null default '',
  caption text not null default '' check (char_length(caption) <= 1000),
  route text not null default '',
  "when" text not null default '',
  story text not null default '' check (char_length(story) <= 8000),
  img_url text not null,
  by text not null default '',
  name_mode text not null default 'full' check (name_mode in ('full','first','anon')),
  license text not null default 'Original work',
  source text not null default '',
  created_at timestamptz not null default now()
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  text text not null check (char_length(text) between 1 and 500),
  created_at timestamptz not null default now()
);

create table likes (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  primary key (post_id, user_id)
);

create table follows (
  follower uuid not null references profiles(id) on delete cascade,
  followed uuid not null references profiles(id) on delete cascade,
  primary key (follower, followed),
  check (follower <> followed)
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  reason text not null default '' check (char_length(reason) <= 300),
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

-- ---------- helper: is the current user one of the 5 moderators? ----------
create function is_mod() returns boolean
language sql security definer stable set search_path = public as
$$ select coalesce((select is_mod from profiles where id = auth.uid()), false) $$;

-- ---------- row-level security ----------
alter table profiles enable row level security;
alter table posts    enable row level security;
alter table comments enable row level security;
alter table likes    enable row level security;
alter table follows  enable row level security;
alter table reports  enable row level security;

-- profiles: everyone reads; you create/edit only your own; nobody can make themselves a mod
create policy "profiles read"   on profiles for select using (true);
create policy "profiles insert" on profiles for insert with check (auth.uid() = id and is_mod = false);
create policy "profiles update" on profiles for update using (auth.uid() = id) with check (auth.uid() = id);
revoke update on profiles from authenticated, anon;
grant update (name, bio, links, av, bn) on profiles to authenticated;

-- posts: everyone reads; logged-in users post as themselves; owner or mod deletes; owner edits
create policy "posts read"   on posts for select using (true);
create policy "posts insert" on posts for insert with check (auth.uid() = user_id);
create policy "posts update" on posts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "posts delete" on posts for delete using (auth.uid() = user_id or is_mod());

create policy "comments read"   on comments for select using (true);
create policy "comments insert" on comments for insert with check (auth.uid() = user_id);
create policy "comments delete" on comments for delete using (auth.uid() = user_id or is_mod());

create policy "likes read"   on likes for select using (true);
create policy "likes insert" on likes for insert with check (auth.uid() = user_id);
create policy "likes delete" on likes for delete using (auth.uid() = user_id);

create policy "follows read"   on follows for select using (true);
create policy "follows insert" on follows for insert with check (auth.uid() = follower);
create policy "follows delete" on follows for delete using (auth.uid() = follower);

-- reports: any logged-in user can report; only mods can read or clear them
create policy "reports insert" on reports for insert with check (auth.uid() = user_id);
create policy "reports read"   on reports for select using (is_mod());
create policy "reports delete" on reports for delete using (is_mod());

-- ---------- storage: public bucket "posts", files stored under <user id>/<file> ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('posts', 'posts', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "posts files read"   on storage.objects for select using (bucket_id = 'posts');
create policy "posts files insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'posts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "posts files delete" on storage.objects for delete to authenticated
  using (bucket_id = 'posts' and ((storage.foldername(name))[1] = auth.uid()::text or is_mod()));

-- ====================================================================
-- UPDATE 2 (run this block ONCE in the SQL Editor on the existing project)
--   * only the owner (ryan_admin) can add or remove moderators, from the site's MODS page
--   * profile pictures: profiles.avatar_url
--   * replaces the earlier "auto-moderator" trigger, so nobody becomes a moderator by signing up with a certain name
-- ====================================================================
drop trigger if exists team_mod on profiles;
drop function if exists make_team_mod();

alter table profiles add column if not exists is_owner boolean not null default false;
alter table profiles add column if not exists avatar_url text;

-- nobody can create a profile that is already a moderator or the owner
drop policy if exists "profiles insert" on profiles;
create policy "profiles insert" on profiles for insert with check (auth.uid() = id and is_mod = false and is_owner = false);

-- users may edit only their own name, bio, links, avatar and banner (is_mod / is_owner stay locked)
revoke update on profiles from authenticated, anon;
grant update (name, bio, links, av, bn, avatar_url) on profiles to authenticated;

-- the only way to change a moderator: this function, and it checks the caller is the owner
create or replace function set_mod(target text, make boolean) returns void
language plpgsql security definer set search_path = public as
$$ begin
  if not coalesce((select is_owner from profiles where id = auth.uid()), false) then
    raise exception 'Only the owner can change moderators';
  end if;
  update profiles set is_mod = make where username = lower(target) and is_owner = false;
end $$;
revoke execute on function set_mod(text, boolean) from public, anon;
grant execute on function set_mod(text, boolean) to authenticated;

-- make ryan_admin the owner (and a moderator)
update profiles set is_owner = true, is_mod = true where username = 'ryan_admin' returning username, is_owner, is_mod;

-- ====================================================================
-- UPDATE 3 (run this block ONCE): the owner can permanently delete an account from the site's MODS page.
-- Deleting the login also deletes that person's profile, posts, comments, likes, follows and reports (cascade).
-- The site removes their uploaded image files first.
-- ====================================================================
create or replace function delete_account(target text) returns void
language plpgsql security definer set search_path = public as
$$ declare uid uuid; begin
  if not coalesce((select is_owner from profiles where id = auth.uid()), false) then
    raise exception 'Only the owner can delete accounts';
  end if;
  select id into uid from profiles where username = lower(target) and is_owner = false;
  if uid is null then raise exception 'Account not found, or it cannot be deleted'; end if;
  delete from auth.users where id = uid;
end $$;
revoke execute on function delete_account(text) from public, anon;
grant execute on function delete_account(text) to authenticated;

-- ====================================================================
-- UPDATE 4 (run this block ONCE): the Contact page. Logged-in visitors send a message to the owner or a moderator.
-- Only the person it was sent to can read, mark read, or delete it. Senders cannot read other people's messages.
-- ====================================================================
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references profiles(id) on delete cascade,
  to_user uuid not null references profiles(id) on delete cascade,
  body text not null check (char_length(body) between 10 and 1000),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table messages enable row level security;

-- send: as yourself, and only to the owner or a moderator
create policy "messages insert" on messages for insert
  with check (auth.uid() = from_user and exists (select 1 from profiles p where p.id = to_user and (p.is_mod or p.is_owner)));
-- read / mark read / delete: only the recipient
create policy "messages read"   on messages for select using (auth.uid() = to_user);
create policy "messages update" on messages for update using (auth.uid() = to_user) with check (auth.uid() = to_user);
create policy "messages delete" on messages for delete using (auth.uid() = to_user);
revoke update on messages from authenticated, anon;
grant update (is_read) on messages to authenticated;
