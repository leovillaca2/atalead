-- Sincronizacao com o Google Calendar: amarra o evento do Google ao registro da reuniao.
-- status usados: 'agendada' (veio do calendario, sem ata), 'ata_gerada', 'cancelada'.
alter table reunioes add column if not exists google_event_id text;
create index if not exists reunioes_google_event_id_idx on reunioes(google_event_id);
