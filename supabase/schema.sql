-- KGSinside / KGSCP community schema (Supabase Postgres + Auth)
-- Run this in Supabase: SQL Editor.

-- 1) Profiles (public user info)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  name text not null,
  grade int,
  class_number text,
  bio text,
  interests text[] default '{}'::text[],
  mbti text,
  toefl text,
  sat text,
  ap text,
  other_scores text,
  gpa text,
  best_subject text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles are readable by authenticated users" on public.profiles;
create policy "profiles are readable by authenticated users"
on public.profiles for select
to authenticated
using (true);

drop policy if exists "users can insert their own profile" on public.profiles;
create policy "users can insert their own profile"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "users can update their own profile" on public.profiles;
create policy "users can update their own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);


-- 2) Posts
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  title text not null,
  content text not null,
  is_anonymous boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists posts_category_idx on public.posts (category);

alter table public.posts enable row level security;

drop policy if exists "posts readable by authenticated users" on public.posts;
create policy "posts readable by authenticated users"
on public.posts for select
to authenticated
using (true);

drop policy if exists "posts insertable by authenticated users" on public.posts;
create policy "posts insertable by authenticated users"
on public.posts for insert
to authenticated
with check (auth.uid() = author_id);

drop policy if exists "posts updatable by owner" on public.posts;
create policy "posts updatable by owner"
on public.posts for update
to authenticated
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

drop policy if exists "posts deletable by owner" on public.posts;
create policy "posts deletable by owner"
on public.posts for delete
to authenticated
using (auth.uid() = author_id);


-- 3) Comments (supports nesting via parent_comment_id)
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_comment_id uuid references public.comments(id) on delete cascade,
  content text not null,
  is_anonymous boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists comments_post_id_idx on public.comments (post_id, created_at asc);
create index if not exists comments_parent_idx on public.comments (parent_comment_id);

alter table public.comments enable row level security;

drop policy if exists "comments readable by authenticated users" on public.comments;
create policy "comments readable by authenticated users"
on public.comments for select
to authenticated
using (true);

drop policy if exists "comments insertable by authenticated users" on public.comments;
create policy "comments insertable by authenticated users"
on public.comments for insert
to authenticated
with check (auth.uid() = author_id);

drop policy if exists "comments deletable by owner" on public.comments;
create policy "comments deletable by owner"
on public.comments for delete
to authenticated
using (auth.uid() = author_id);


-- 4) Reactions (like/dislike)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'reaction_type') then
    create type public.reaction_type as enum ('like', 'dislike');
  end if;
end $$;

create table if not exists public.reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction public.reaction_type not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.reactions enable row level security;

drop policy if exists "reactions readable by authenticated users" on public.reactions;
create policy "reactions readable by authenticated users"
on public.reactions for select
to authenticated
using (true);

drop policy if exists "users can upsert their own reaction" on public.reactions;
create policy "users can upsert their own reaction"
on public.reactions for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "users can update their own reaction" on public.reactions;
create policy "users can update their own reaction"
on public.reactions for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "users can delete their own reaction" on public.reactions;
create policy "users can delete their own reaction"
on public.reactions for delete
to authenticated
using (auth.uid() = user_id);


-- 5) Messages (DM)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'message_status') then
    create type public.message_status as enum ('pending', 'accepted', 'rejected', 'on_hold');
  end if;
end $$;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  content text not null,
  status public.message_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists messages_receiver_idx on public.messages (receiver_id, created_at desc);
create index if not exists messages_sender_idx on public.messages (sender_id, created_at desc);

alter table public.messages enable row level security;

drop policy if exists "messages readable by sender or receiver" on public.messages;
create policy "messages readable by sender or receiver"
on public.messages for select
to authenticated
using (auth.uid() = sender_id or auth.uid() = receiver_id);

drop policy if exists "messages insertable by sender" on public.messages;
create policy "messages insertable by sender"
on public.messages for insert
to authenticated
with check (auth.uid() = sender_id);

drop policy if exists "receiver can update status" on public.messages;
create policy "receiver can update status"
on public.messages for update
to authenticated
using (auth.uid() = receiver_id)
with check (auth.uid() = receiver_id);
