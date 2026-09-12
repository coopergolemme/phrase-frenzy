-- Replace the flagged_words existence table with a flagged_count counter
-- directly on words — one row per word already, so a count column avoids
-- the separate table and the text-matching join it required.
alter table words add column flagged_count int not null default 0;

-- Backfill: flagged_words only ever recorded whether a word had been
-- flagged (not how many times), so every previously-flagged, still-linked
-- word starts at 1.
update words w
set flagged_count = 1
from flagged_words fw
where fw.word_id = w.id;

drop table flagged_words;

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
    update words w
    set flagged_count = w.flagged_count + 1
    from (select distinct w_text from unnest(p_flagged_words) as w_text) t
    where lower(trim(w.text)) = t.w_text;
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
