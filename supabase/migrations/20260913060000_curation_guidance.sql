-- Durable record of admin curation taste: every Approve/Reject in the
-- generate-review flow and every Deactivate(+reason) becomes a row here,
-- so it survives past the current browser session. Read back by the
-- "refine-guidance" admin action to (re)write category_guidance below.
create table curation_decisions (
  id uuid primary key default gen_random_uuid(),
  category_id text not null references categories(id) on delete cascade,
  word_text text not null,
  decision text not null check (decision in ('approved', 'rejected', 'deactivated')),
  reason text,
  created_at timestamptz not null default now()
);

create index curation_decisions_category_id_idx on curation_decisions(category_id);

-- One evolving "house style" rubric per category, synthesized by Gemini
-- from curation_decisions and folded into every future word-generation
-- prompt for that category (see buildPrompt in the admin-words function).
-- Refining again revises this text rather than starting over each time.
create table category_guidance (
  category_id text primary key references categories(id) on delete cascade,
  guidance text not null,
  updated_at timestamptz not null default now()
);

alter table curation_decisions enable row level security;
alter table category_guidance enable row level security;
-- No public policies — both tables are written and read only by the
-- admin-words edge function via the service-role key, same posture as
-- word_stats/match_history.

-- Extends category_health() with the current guidance and how many
-- decisions have accumulated since it was last refined, so the Category
-- Health dashboard can show both without a second round trip per category.
-- Postgres won't let `create or replace` change a function's OUT
-- parameters/return columns, so the old signature has to be dropped first.
drop function if exists category_health();

create or replace function category_health()
returns table (
  category_id text,
  category_label text,
  category_emoji text,
  total_words bigint,
  active_words bigint,
  flagged_words bigint,
  correct bigint,
  skipped bigint,
  guidance text,
  guidance_updated_at timestamptz,
  decisions_since_guidance bigint
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
    coalesce(sum(ws.skipped), 0) as skipped,
    g.guidance,
    g.updated_at as guidance_updated_at,
    (
      select count(*)
      from curation_decisions cd
      where cd.category_id = c.id
        and cd.created_at > coalesce(g.updated_at, '-infinity'::timestamptz)
    ) as decisions_since_guidance
  from categories c
  left join words w on w.category_id = c.id
  left join word_stats ws on ws.word_id = w.id
  left join category_guidance g on g.category_id = c.id
  group by c.id, c.label, c.emoji, c.sort_order, g.guidance, g.updated_at
  order by c.sort_order;
$$;

grant execute on function category_health() to service_role;
