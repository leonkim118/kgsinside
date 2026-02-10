-- Convenience views for efficient UI queries

create or replace view public.post_summaries as
select
  p.id,
  p.author_id,
  pr.name as author_name,
  pr.username as author_username,
  p.category,
  p.title,
  p.content,
  p.is_anonymous,
  p.created_at,
  p.updated_at,
  (
    select count(*)
    from public.reactions r
    where r.post_id = p.id and r.reaction = 'like'
  )::int as likes_count,
  (
    select count(*)
    from public.reactions r
    where r.post_id = p.id and r.reaction = 'dislike'
  )::int as dislikes_count,
  (
    select count(*)
    from public.comments c
    where c.post_id = p.id
  )::int as comments_count
from public.posts p
join public.profiles pr on pr.id = p.author_id;


create or replace view public.comment_summaries as
select
  c.id,
  c.post_id,
  c.parent_comment_id,
  c.author_id,
  pr.name as author_name,
  pr.username as author_username,
  c.content,
  c.is_anonymous,
  c.created_at
from public.comments c
join public.profiles pr on pr.id = c.author_id;

