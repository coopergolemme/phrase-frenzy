-- Link word_stats and flagged_words to the words table by uuid, so admin
-- tooling (and any future reporting) can join directly instead of matching
-- on normalized text. word_stats.word / flagged_words.word stay the
-- primary key and gameplay keeps writing by text (no client change) — the
-- new word_id column is nullable because a stat/flag row can outlive the
-- words row it started as (word edited, category removed, or the text
-- never matched a live word), and set null on delete rather than cascade
-- so historical stats/flags survive a word being deleted.
alter table word_stats add column word_id uuid references words(id) on delete set null;
alter table flagged_words add column word_id uuid references words(id) on delete set null;

create index word_stats_word_id_idx on word_stats(word_id);
create index flagged_words_word_id_idx on flagged_words(word_id);

-- Backfill existing rows by case-insensitive match against current words.
update word_stats ws
set word_id = w.id
from words w
where ws.word_id is null
  and lower(trim(w.text)) = ws.word;

update flagged_words fw
set word_id = w.id
from words w
where fw.word_id is null
  and lower(trim(w.text)) = fw.word;

-- Resolve word_id at write time going forward — the only place these
-- tables are written is sync_game_results.
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
