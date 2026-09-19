-- Add configurable foul_penalty_sec column to rooms table and room_public_state table
alter table rooms add column if not exists foul_penalty_sec int not null default 2;

alter table room_public_state add column if not exists foul_penalty_sec int not null default 2;
