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
  active boolean not null default true
);

alter table categories enable row level security;
alter table words enable row level security;

create policy "public read categories" on categories
  for select using (true);

create policy "public read active words" on words
  for select using (active = true);
