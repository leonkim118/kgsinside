-- Promote one account to admin role.
-- Replace the email below with your real admin email, then run in Supabase SQL Editor.

update public.profiles p
set role = 'admin',
    updated_at = now()
from auth.users u
where p.id = u.id
  and u.email = 'your-admin-email@example.com';

-- Verify admin accounts
select u.email, p.id, p.name, p.role
from public.profiles p
join auth.users u on u.id = p.id
where p.role = 'admin'
order by u.email;
