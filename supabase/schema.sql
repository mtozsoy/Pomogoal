-- Pomodoro: hesap, arkadaşlık ve sıralama şeması
--
-- Kullanım: Supabase panelinde SQL Editor'ü aç, bu dosyanın tamamını yapıştır ve
-- "Run" de. Bir kez çalıştırman yeterli. Hata verirse bana hata metnini gönder.
--
-- Güvenlik özeti:
--  * Tüm tablolarda satır düzeyi güvenlik (RLS) açık. Herkes yalnızca kendi satırlarını görür.
--  * Başkalarının verisi sadece aşağıdaki fonksiyonlar üzerinden, gerekli en az bilgiyle okunur.
--  * Giriş yapmamış (anon) kullanıcıların hiçbir erişimi yok.
--
-- Hafta ve ay sınırları aşağıdaki saat dilimine göre hesaplanır (period_start fonksiyonu).

-- =========================================================================
-- 1. Profiller
-- =========================================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  -- Genel sıralamada görünsün mü? Varsayılan kapalı: kullanıcı kendisi açar.
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant insert (id, username) on public.profiles to authenticated;
grant update (is_public) on public.profiles to authenticated;

-- =========================================================================
-- 2. Odak seansları
-- =========================================================================
create table public.sessions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  ts timestamptz not null,
  minutes integer not null check (minutes between 1 and 240),
  -- Sayılan pomodoro adedi (kronometre/geri sayımda 20 dk = 1)
  pomodoros integer not null default 1 check (pomodoros between 0 and 12),
  unique (user_id, ts)
);

create index sessions_ts_idx on public.sessions (ts);

alter table public.sessions enable row level security;

create policy "sessions_select_own" on public.sessions
  for select to authenticated using (user_id = auth.uid());
create policy "sessions_insert_own" on public.sessions
  for insert to authenticated with check (user_id = auth.uid());

revoke all on public.sessions from anon, authenticated;
grant select on public.sessions to authenticated;
grant insert (user_id, ts, minutes, pomodoros) on public.sessions to authenticated;

-- Mantıksız kayıtları sessizce atlar: gelecekteki zaman veya bir güne sığmayan toplam süre.
-- (Zamanlayıcı tarayıcıda çalıştığı için bu bir tam koruma değil, sadece bariz hileleri engeller.)
create or replace function public.check_session() returns trigger
language plpgsql
set search_path = public
as $$
declare
  day_total integer;
begin
  if new.ts > now() + interval '5 minutes' then
    return null;
  end if;

  select coalesce(sum(minutes), 0) into day_total
  from public.sessions
  where user_id = new.user_id
    and (ts at time zone 'Europe/Istanbul')::date = (new.ts at time zone 'Europe/Istanbul')::date;

  if day_total + new.minutes > 1440 then
    return null;
  end if;

  return new;
end
$$;

create trigger sessions_check before insert on public.sessions
  for each row execute function public.check_session();

-- =========================================================================
-- 3. Arkadaşlıklar
-- =========================================================================
create table public.friendships (
  id bigint generated always as identity primary key,
  requester uuid not null references public.profiles (id) on delete cascade,
  addressee uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  check (requester <> addressee)
);

-- İki kişi arasında yön fark etmeksizin tek kayıt olabilir
create unique index friendships_pair_idx
  on public.friendships (least(requester, addressee), greatest(requester, addressee));

alter table public.friendships enable row level security;

create policy "friendships_select_own" on public.friendships
  for select to authenticated using (requester = auth.uid() or addressee = auth.uid());
-- İsteği yalnızca karşı taraf kabul edebilir
create policy "friendships_accept" on public.friendships
  for update to authenticated
  using (addressee = auth.uid() and status = 'pending')
  with check (addressee = auth.uid() and status = 'accepted');
-- İki taraf da isteği iptal edebilir veya arkadaşlığı bitirebilir
create policy "friendships_delete_own" on public.friendships
  for delete to authenticated using (requester = auth.uid() or addressee = auth.uid());

revoke all on public.friendships from anon, authenticated;
grant select on public.friendships to authenticated;
grant update (status) on public.friendships to authenticated;
grant delete on public.friendships to authenticated;
-- INSERT yok: istekler send_friend_request fonksiyonuyla gönderilir.

-- =========================================================================
-- 4. Fonksiyonlar
-- =========================================================================

-- Hafta (pazartesi başlar) veya ay başlangıcı
create or replace function public.period_start(p_period text) returns timestamptz
language plpgsql stable
set search_path = public
as $$
begin
  if p_period = 'week' then
    return date_trunc('week', now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul';
  elsif p_period = 'month' then
    return date_trunc('month', now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul';
  end if;
  raise exception 'bad_period';
end
$$;

-- Kullanıcı adıyla arkadaşlık isteği gönderir.
-- Dönüş: sent, accepted (karşı taraf zaten istek göndermişti), already_friends,
--        already_sent, not_found, self, no_profile, too_many
create or replace function public.send_friend_request(p_username text) returns text
language plpgsql security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  target uuid;
  existing public.friendships;
  pending_count integer;
begin
  if me is null then
    raise exception 'not_authenticated';
  end if;
  if not exists (select 1 from public.profiles where id = me) then
    return 'no_profile';
  end if;

  select id into target from public.profiles where username = lower(trim(p_username));
  if target is null then
    return 'not_found';
  end if;
  if target = me then
    return 'self';
  end if;

  select * into existing from public.friendships
  where least(requester, addressee) = least(me, target)
    and greatest(requester, addressee) = greatest(me, target);

  if found then
    if existing.status = 'accepted' then
      return 'already_friends';
    elsif existing.requester = target then
      update public.friendships set status = 'accepted' where id = existing.id;
      return 'accepted';
    else
      return 'already_sent';
    end if;
  end if;

  select count(*) into pending_count from public.friendships
  where requester = me and status = 'pending';
  if pending_count >= 30 then
    return 'too_many';
  end if;

  insert into public.friendships (requester, addressee) values (me, target);
  return 'sent';
end
$$;

-- Arkadaşlarım ve bekleyen istekler. direction: friend | incoming | outgoing
create or replace function public.my_friends()
returns table (friendship_id bigint, user_id uuid, username text, status text, direction text)
language sql stable security definer
set search_path = public
as $$
  select f.id,
         p.id,
         p.username,
         f.status,
         case
           when f.status = 'accepted' then 'friend'
           when f.requester = auth.uid() then 'outgoing'
           else 'incoming'
         end
  from public.friendships f
  join public.profiles p
    on p.id = case when f.requester = auth.uid() then f.addressee else f.requester end
  where auth.uid() is not null
    and (f.requester = auth.uid() or f.addressee = auth.uid())
  order by p.username;
$$;

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

-- Hesabı ve ona bağlı tüm verileri kalıcı olarak siler
create or replace function public.delete_my_account() returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end
$$;

-- Fonksiyonları yalnızca giriş yapmış kullanıcılar çağırabilsin
revoke all on function public.period_start(text) from public, anon, authenticated;
revoke all on function public.check_session() from public, anon, authenticated;
revoke all on function public.send_friend_request(text) from public, anon;
revoke all on function public.my_friends() from public, anon;
revoke all on function public.leaderboard_friends(text) from public, anon;
revoke all on function public.leaderboard_global(text) from public, anon;
revoke all on function public.delete_my_account() from public, anon;

grant execute on function public.send_friend_request(text) to authenticated;
grant execute on function public.my_friends() to authenticated;
grant execute on function public.leaderboard_friends(text) to authenticated;
grant execute on function public.leaderboard_global(text) to authenticated;
grant execute on function public.delete_my_account() to authenticated;
