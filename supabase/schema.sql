create table categories (
  id text primary key,
  label text not null,
  emoji text not null,
  sort_order int not null default 0
);

create table words (
  id uuid primary key default gen_random_uuid(),
  category_id text not null references categories(id) on delete cascade,
  text text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table categories enable row level security;
alter table words enable row level security;

create policy "public read categories" on categories
  for select using (true);

create policy "public read active words" on words
  for select using (active = true);

-- Game telemetry: match results, per-word stats, and flagged words are
-- synced from the client at the end of each game via the sync_game_results
-- RPC below. RLS stays on with no policies on these tables, so anon clients
-- can only write through that SECURITY DEFINER function — never directly.
create table match_history (
  id uuid primary key default gen_random_uuid(),
  played_at timestamptz not null default now(),
  rounds_per_team int not null,
  teams jsonb not null,
  winner_names text[] not null
);

-- word_id links back to the live words row (nullable — a stat/flag row can
-- outlive the words row it started as: word edited, category removed, or
-- the text never matched a live word; set null on delete so history
-- survives a word being deleted). word/word_id stay independent — text is
-- what gameplay writes by, word_id is resolved case-insensitively inside
-- sync_game_results below for joins/admin tooling.
create table word_stats (
  word text primary key,
  correct int not null default 0,
  skipped int not null default 0,
  word_id uuid references words(id) on delete set null
);

create table flagged_words (
  word text primary key,
  flagged_at timestamptz not null default now(),
  word_id uuid references words(id) on delete set null
);

create index word_stats_word_id_idx on word_stats(word_id);
create index flagged_words_word_id_idx on flagged_words(word_id);

-- Roster of people who have ever been entered as a team member, deduped by
-- a normalized (trimmed/lowercased) name — there's no login, so name is the
-- only identity we have. match_players links each roster entry to the
-- matches/teams they played in, one row per person per match.
create table players (
  id uuid primary key default gen_random_uuid(),
  normalized_name text not null unique,
  name text not null,
  first_seen_at timestamptz not null default now(),
  last_played_at timestamptz not null default now(),
  games_played int not null default 0
);

create table match_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references match_history(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  team_name text not null,
  team_score int not null,
  is_winner boolean not null,
  unique (match_id, player_id)
);

alter table match_history enable row level security;
alter table word_stats enable row level security;
alter table flagged_words enable row level security;
alter table match_players enable row level security;
alter table players enable row level security;

-- Player names are harmless to read and power the "known players"
-- autocomplete in team setup; writes still only happen through the RPC.
create policy "public read players" on players
  for select using (true);

create or replace function sync_game_results(
  p_match jsonb,
  p_word_deltas jsonb,
  p_flagged_words text[],
  p_team_members jsonb default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match_id uuid;
  v_member jsonb;
  v_normalized_name text;
  v_player_id uuid;
begin
  if p_match is not null then
    insert into match_history (played_at, rounds_per_team, teams, winner_names)
    values (
      coalesce((p_match->>'playedAt')::timestamptz, now()),
      (p_match->>'roundsPerTeam')::int,
      p_match->'teams',
      coalesce(
        (select array_agg(value) from jsonb_array_elements_text(p_match->'winnerNames')),
        '{}'
      )
    )
    returning id into v_match_id;
  end if;

  if p_word_deltas is not null then
    insert into word_stats (word, correct, skipped, word_id)
    select
      d->>'word',
      (d->>'correct')::int,
      (d->>'skipped')::int,
      (select w.id from words w where lower(trim(w.text)) = d->>'word' limit 1)
    from jsonb_array_elements(p_word_deltas) d
    on conflict (word) do update
      set correct = word_stats.correct + excluded.correct,
          skipped = word_stats.skipped + excluded.skipped,
          word_id = coalesce(word_stats.word_id, excluded.word_id);
  end if;

  if p_flagged_words is not null and array_length(p_flagged_words, 1) > 0 then
    insert into flagged_words (word, word_id)
    select distinct
      w_text,
      (select w.id from words w where lower(trim(w.text)) = w_text limit 1)
    from unnest(p_flagged_words) as w_text
    on conflict (word) do update
      set word_id = coalesce(flagged_words.word_id, excluded.word_id);
  end if;

  if v_match_id is not null and p_team_members is not null then
    for v_member in select * from jsonb_array_elements(p_team_members)
    loop
      v_normalized_name := lower(trim(v_member->>'name'));
      if v_normalized_name = '' then
        continue;
      end if;

      insert into players (normalized_name, name, games_played)
      values (v_normalized_name, trim(v_member->>'name'), 1)
      on conflict (normalized_name) do update
        set name = excluded.name,
            last_played_at = now(),
            games_played = players.games_played + 1
      returning id into v_player_id;

      insert into match_players (match_id, player_id, team_name, team_score, is_winner)
      values (
        v_match_id,
        v_player_id,
        v_member->>'teamName',
        (v_member->>'teamScore')::int,
        (v_member->>'isWinner')::boolean
      )
      on conflict (match_id, player_id) do nothing;
    end loop;
  end if;
end;
$$;

grant execute on function sync_game_results(jsonb, jsonb, text[], jsonb) to anon;
