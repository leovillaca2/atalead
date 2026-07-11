-- Schema do AtaLead: prospects, reunioes, participantes, atas, proximos_passos.
create table if not exists prospects (
  id uuid primary key default gen_random_uuid(),
  empresa text not null,
  contato text,
  cargo text,
  segmento text,
  etapa text not null default 'novo',
  valor_estimado numeric,
  created_at timestamptz not null default now()
);

create table if not exists reunioes (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid references prospects(id) on delete cascade,
  titulo text not null,
  data date,
  duracao_min int,
  origem text default 'colar',
  transcricao text,
  status text not null default 'nova',
  evernote_note_id text,
  created_at timestamptz not null default now()
);

create table if not exists participantes (
  id uuid primary key default gen_random_uuid(),
  reuniao_id uuid references reunioes(id) on delete cascade,
  speaker text,
  nome text,
  empresa text,
  papel text
);

create table if not exists atas (
  id uuid primary key default gen_random_uuid(),
  reuniao_id uuid references reunioes(id) on delete cascade,
  resumo text,
  decisoes jsonb not null default '[]'::jsonb,
  produtos jsonb not null default '[]'::jsonb,
  lead jsonb,
  versao int not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists proximos_passos (
  id uuid primary key default gen_random_uuid(),
  reuniao_id uuid references reunioes(id) on delete cascade,
  prospect_id uuid references prospects(id) on delete cascade,
  titulo text not null,
  responsavel text,
  prazo text,
  feito boolean not null default false,
  created_at timestamptz not null default now()
);

-- RLS ligado em tudo (dado de prospect e sensivel / LGPD).
alter table prospects enable row level security;
alter table reunioes enable row level security;
alter table participantes enable row level security;
alter table atas enable row level security;
alter table proximos_passos enable row level security;

-- Ferramenta de um time so: qualquer usuario autenticado acessa. Refinar por dono depois.
create policy "auth all prospects" on prospects for all to authenticated using (true) with check (true);
create policy "auth all reunioes" on reunioes for all to authenticated using (true) with check (true);
create policy "auth all participantes" on participantes for all to authenticated using (true) with check (true);
create policy "auth all atas" on atas for all to authenticated using (true) with check (true);
create policy "auth all passos" on proximos_passos for all to authenticated using (true) with check (true);
