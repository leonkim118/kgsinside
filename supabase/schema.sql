-- KGSinside / KGSCP community schema (Supabase Postgres + Auth)
-- Run this in Supabase: SQL Editor.

-- 1) Profiles (public user info)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user',
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

alter table public.profiles add column if not exists role text not null default 'user';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_role_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_role_check
      check (role in ('user', 'admin'));
  end if;
end $$;

create or replace function public.is_admin(user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = user_id
      and p.role = 'admin'
  );
$$;

grant execute on function public.is_admin(uuid) to authenticated;

create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- SQL Editor / service role updates have no auth.uid(); allow those admin operations.
  if auth.uid() is null then
    return new;
  end if;

  if old.role is distinct from new.role and not public.is_admin(auth.uid()) then
    raise exception 'Only admins can change profile roles';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_profile_role_change on public.profiles;
create trigger prevent_profile_role_change
before update on public.profiles
for each row execute procedure public.prevent_profile_role_change();

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
with check (auth.uid() = id and role = 'user');

drop policy if exists "users can update their own profile" on public.profiles;
create policy "users can update their own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "admins can update any profile" on public.profiles;
create policy "admins can update any profile"
on public.profiles for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));


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
using (auth.uid() = author_id or public.is_admin(auth.uid()))
with check (auth.uid() = author_id or public.is_admin(auth.uid()));

drop policy if exists "posts deletable by owner" on public.posts;
create policy "posts deletable by owner"
on public.posts for delete
to authenticated
using (auth.uid() = author_id or public.is_admin(auth.uid()));


-- 3) Post attachments (images/files)
create table if not exists public.post_attachments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  uploader_id uuid not null references public.profiles(id) on delete cascade,
  bucket text not null default 'post-images',
  file_path text not null,
  file_name text,
  mime_type text,
  size_bytes bigint,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (post_id, file_path)
);

create index if not exists post_attachments_post_idx on public.post_attachments (post_id, sort_order asc);

alter table public.post_attachments enable row level security;

drop policy if exists "attachments readable by authenticated users" on public.post_attachments;
create policy "attachments readable by authenticated users"
on public.post_attachments for select
to authenticated
using (true);

drop policy if exists "attachments insertable by uploader" on public.post_attachments;
create policy "attachments insertable by uploader"
on public.post_attachments for insert
to authenticated
with check (auth.uid() = uploader_id);

drop policy if exists "attachments deletable by uploader or admin" on public.post_attachments;
create policy "attachments deletable by uploader or admin"
on public.post_attachments for delete
to authenticated
using (auth.uid() = uploader_id or public.is_admin(auth.uid()));


-- Storage bucket/policies for post images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-images',
  'post-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

drop policy if exists "post images are readable" on storage.objects;
create policy "post images are readable"
on storage.objects for select
to authenticated
using (bucket_id = 'post-images');

drop policy if exists "users can upload own post images" on storage.objects;
create policy "users can upload own post images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'post-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "users can delete own post images or admins" on storage.objects;
create policy "users can delete own post images or admins"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'post-images'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or public.is_admin(auth.uid())
  )
);


-- 4) Comments (supports nesting via parent_comment_id)
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
using (auth.uid() = author_id or public.is_admin(auth.uid()));


-- 5) Reactions (like/dislike)
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


-- 6) Messages (DM)
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
