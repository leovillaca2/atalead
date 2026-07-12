-- Campo de analise da ata (nota da apresentacao, probabilidade, temperatura do lead).
alter table atas add column if not exists analise jsonb;

-- Modelo de Prospecção aprimorado com o prompt real de venda do Augusto.
update modelos_ata set instrucoes =
'Reunião de prospecção/venda da PGMais conduzida por Augusto Mello. Faça um resumo destacando e detalhando bem as partes em que o prospect descreve o que precisa e o que busca na PGMais. Destaque os próximos passos. Faça uma análise criteriosa da apresentação do Augusto, com nota de 0 a 10 e um comentário objetivo. Avalie a probabilidade de o negócio evoluir. Classifique a temperatura do lead para o Pipedrive como frio, morno ou quente. Preencha o lead (empresa, contato, cargo, segmento, valor estimado e canal de origem) com o que aparecer.'
where nome = 'Prospecção';
