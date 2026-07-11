-- Vinculo da reuniao/lead com o negocio no Pipedrive (para atualizar e checar conflito).
alter table reunioes add column if not exists pipedrive_deal_id bigint;
alter table reunioes add column if not exists pipedrive_org_id bigint;
alter table reunioes add column if not exists pipedrive_person_id bigint;
alter table reunioes add column if not exists pipedrive_update_time text;
alter table reunioes add column if not exists pipedrive_synced_at timestamptz;
