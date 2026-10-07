-- Users created before on_auth_user_created existed have no profiles row,
-- so inserts into sleep_sessions fail the user_id foreign key (HTTP 409).
-- Backfill them, and install the signup trigger only where it is missing:
-- an existing handle_new_user may be owned by another role (e.g. supabase_admin)
-- and must not be replaced.

insert into public.profiles (id)
select u.id
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

do $$
begin
  if not exists (
    select 1 from pg_proc
    where proname = 'handle_new_user'
      and pronamespace = 'public'::regnamespace
  ) then
    create function public.handle_new_user()
    returns trigger as $fn$
    begin
      insert into public.profiles (id)
      values (new.id);
      return new;
    end;
    $fn$ language plpgsql security definer;
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'on_auth_user_created'
      and tgrelid = 'auth.users'::regclass
  ) then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute procedure public.handle_new_user();
  end if;
end;
$$;
