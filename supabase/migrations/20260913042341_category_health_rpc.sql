-- Per-category rollup for the admin Category Health dashboard. Aggregates
-- entirely in SQL rather than fetching every words/word_stats row into the
-- edge function — the words table alone is already past PostgREST's
-- default 1000-row page size, so an unpaginated `select` there silently
-- truncates and drops whole categories from the result.
create or replace function category_health()
returns table (
  category_id text,
  category_label text,
  category_emoji text,
  total_words bigint,
  active_words bigint,
  flagged_words bigint,
  correct bigint,
  skipped bigint
)
language sql
stable
set search_path = public
as $$
  select
    c.id,
    c.label,
    c.emoji,
    count(w.id) as total_words,
    count(w.id) filter (where w.active) as active_words,
    count(w.id) filter (where w.flagged_count > 0) as flagged_words,
    coalesce(sum(ws.correct), 0) as correct,
    coalesce(sum(ws.skipped), 0) as skipped
  from categories c
  left join words w on w.category_id = c.id
  left join word_stats ws on ws.word_id = w.id
  group by c.id, c.label, c.emoji, c.sort_order
  order by c.sort_order;
$$;

grant execute on function category_health() to service_role;
