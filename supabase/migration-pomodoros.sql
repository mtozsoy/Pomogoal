-- Şemayı zaten çalıştırdıysan: bu dosyayı SQL Editor'de bir kez çalıştır.
-- Kronometre/geri sayımda "20 dakika = 1 pomodoro" kuralı için sessions tablosuna sütun ekler.

alter table public.sessions
  add column if not exists pomodoros integer not null default 1 check (pomodoros between 0 and 12);

grant insert (pomodoros) on public.sessions to authenticated;

-- Arkadaşlar arasında sıralama (kendin dahil). p_period: 'week' | 'month'
create or replace function public.leaderboard_friends(p_period text)
returns table (user_id uuid, username text, pomodoros bigint, minutes bigint, rank bigint, is_me boolean)
language sql stable security definer
set search_path = public
as $$
  with since as (
    select public.period_start(p_period) as ts
  ),
  members as (
    select auth.uid() as uid
    union
    select case when f.requester = auth.uid() then f.addressee else f.requester end
    from public.friendships f
    where f.status = 'accepted' and (f.requester = auth.uid() or f.addressee = auth.uid())
  ),
  totals as (
    select m.uid,
           p.username,
           coalesce(sum(s.pomodoros), 0)::bigint as pomodoros,
           coalesce(sum(s.minutes), 0)::bigint as minutes
    from members m
    join public.profiles p on p.id = m.uid
    left join public.sessions s on s.user_id = m.uid and s.ts >= (select ts from since)
    where m.uid is not null
    group by m.uid, p.username
  )
  select t.uid,
         t.username,
         t.pomodoros,
         t.minutes,
         rank() over (order by t.minutes desc),
         t.uid = auth.uid()
  from totals t
  order by t.minutes desc, t.username;
$$;

-- Genel sıralama: yalnızca "genel sıralamada görün" diyenler, ilk 50
create or replace function public.leaderboard_global(p_period text)
returns table (user_id uuid, username text, pomodoros bigint, minutes bigint, rank bigint, is_me boolean)
language sql stable security definer
set search_path = public
as $$
  with since as (
    select public.period_start(p_period) as ts
  ),
  totals as (
    select p.id as uid,
           p.username,
           sum(s.pomodoros)::bigint as pomodoros,
           sum(s.minutes)::bigint as minutes
    from public.profiles p
    join public.sessions s on s.user_id = p.id and s.ts >= (select ts from since)
    where p.is_public and auth.uid() is not null
    group by p.id, p.username
  ),
  ranked as (
    select t.uid,
           t.username,
           t.pomodoros,
           t.minutes,
           rank() over (order by t.minutes desc) as rnk
    from totals t
  )
  select r.uid, r.username, r.pomodoros, r.minutes, r.rnk, r.uid = auth.uid()
  from ranked r
  order by r.minutes desc, r.username
  limit 50;
$$;
