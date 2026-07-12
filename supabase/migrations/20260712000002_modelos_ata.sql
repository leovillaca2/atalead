-- Modelos de ata: cada tipo de reuniao processa a transcricao de um jeito (foco/instrucoes).
-- O formato de saida (resumo/decisoes/proximos_passos/produtos/lead) continua o mesmo.
create table if not exists modelos_ata (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  instrucoes text not null default '',
  ordem int not null default 100,
  created_at timestamptz not null default now()
);

alter table modelos_ata enable row level security;
create policy "auth all modelos" on modelos_ata for all to authenticated using (true) with check (true);

insert into modelos_ata (nome, instrucoes, ordem) values
('Prospecção', 'Primeira reunião de prospecção. Foque em qualificar o lead: dores, contexto, nível de interesse, orçamento e quem decide, quando aparecerem. Preencha o lead (empresa, contato, cargo, segmento, valor estimado) com o que for dito. Os próximos passos devem mirar avançar a venda.', 10),
('Follow-up / Acompanhamento', 'Reunião de acompanhamento. Foque no que avançou desde a última conversa, nas pendências resolvidas e nas em aberto, em novas objeções e na próxima ação combinada. Atualize a temperatura do lead se der para inferir.', 20),
('Demonstração de produto', 'Demonstração de produto. Registre o que foi apresentado, as reações e objeções do cliente, as dúvidas técnicas e os requisitos levantados, além dos próximos passos comerciais. Liste no campo de produtos os recursos e produtos demonstrados.', 30),
('Reunião interna', 'Reunião interna do time, sem cliente. Foque em decisões, responsáveis e tarefas com prazos. Deixe os campos de lead vazios, pois não há prospect externo.', 40);
