-- Existing projects applied 00000000000000_initial_schema.sql, which left
-- sleep_sessions without a DELETE policy and let every authenticated user
-- read every profile. Fresh installs get the same end state from schema.sql.

drop policy if exists "Public profiles are viewable by everyone." on profiles;
drop policy if exists "Users can view their own profile." on profiles;
create policy "Users can view their own profile." on profiles
  for select using (auth.uid() = id);

drop policy if exists "Users can delete their own sleep sessions." on sleep_sessions;
create policy "Users can delete their own sleep sessions." on sleep_sessions
  for delete using (auth.uid() = user_id);
