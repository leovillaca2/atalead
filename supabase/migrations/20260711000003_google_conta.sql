-- Guarda o refresh token do Google por usuario. SO o servidor (service_role) acessa.
create table if not exists google_conta (
  user_id uuid primary key references auth.users(id) on delete cascade,
  refresh_token text,
  email text,
  atualizado_em timestamptz not null default now()
);
alter table google_conta enable row level security;
-- Sem policies de propósito: o navegador (anon/authenticated) NUNCA le o refresh_token.
-- As funcoes /api usam a service_role, que ignora RLS.
