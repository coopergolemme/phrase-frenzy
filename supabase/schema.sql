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

create table word_stats (
  word text primary key,
  correct int not null default 0,
  skipped int not null default 0
);

create table flagged_words (
  word text primary key,
  flagged_at timestamptz not null default now()
);

alter table match_history enable row level security;
alter table word_stats enable row level security;
alter table flagged_words enable row level security;

create or replace function sync_game_results(
  p_match jsonb,
  p_word_deltas jsonb,
  p_flagged_words text[]
) returns void
language plpgsql
security definer
set search_path = public
as $$
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
    );
  end if;

  if p_word_deltas is not null then
    insert into word_stats (word, correct, skipped)
    select d->>'word', (d->>'correct')::int, (d->>'skipped')::int
    from jsonb_array_elements(p_word_deltas) d
    on conflict (word) do update
      set correct = word_stats.correct + excluded.correct,
          skipped = word_stats.skipped + excluded.skipped;
  end if;

  if p_flagged_words is not null and array_length(p_flagged_words, 1) > 0 then
    insert into flagged_words (word)
    select distinct unnest(p_flagged_words)
    on conflict (word) do nothing;
  end if;
end;
$$;

grant execute on function sync_game_results(jsonb, jsonb, text[]) to anon;
