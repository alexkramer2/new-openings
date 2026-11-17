-- Applied tracking: each saved job gets a status and the date you applied.
-- Run once in Supabase → SQL Editor.

alter table public.saved_jobs
  add column if not exists status text not null default 'saved'
    check (status in ('saved', 'applied')),
  add column if not exists applied_at timestamptz;

-- Lets you change the status of your own saved jobs (and nobody else's).
create policy "Update own saved jobs" on public.saved_jobs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
