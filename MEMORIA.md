# AtaLead - Memoria do Projeto

Atualizado em: 2026-07-10

## O que e
App web que transforma reuniao de prospeccao em ata executiva e lead no CRM, sem copia e cola manual. Substitui o fluxo atual (Evernote > Tess no navegador > Word) por um produto unico que tambem serve de historico (mini-CRM).

## Fluxo de ponta a ponta
1. Evernote grava e transcreve a reuniao (continua sendo usado).
2. O app puxa a transcricao do Evernote pela API (com colar como reserva na v1).
3. Tess API recebe a transcricao e gera a ata no formato do agente ja existente.
4. O app extrai os dados do lead da ata (nome, empresa, contato, proximos passos, produtos pra proposta).
5. Usuario confere e aprova a ata e o lead.
6. Pipedrive recebe o lead com a ata anexada e os proximos passos como atividades.
7. Supabase guarda todo o historico (reuniao, transcricao, ata, lead).

## Stack
- Front: React na Vercel
- Backend/dados/auth: Supabase (Postgres + Storage + Auth)
- IA da ata: Tess API (reaproveita o agente ja afinado; trocavel por Gemini/Claude depois, parte isolada de proposito)
- Transcricao: Evernote (nao refazemos, o Evernote pago ja faz)
- CRM: Pipedrive

## Decisoes tomadas
- Sem Microsoft 365, sem RD Station. Somente Evernote + Vercel + Supabase + Tess + Pipedrive.
- Entrada da transcricao: Evernote API (developer token da propria conta). Colar fica como fallback na v1 ate a chave sair.
- Ata gerada pela Tess (conta paga ja tem API). Custo baixo.
- Motor da ata deixado trocavel: se um dia quiser cortar a margem da Tess, troca por Gemini/Claude sem mexer no resto.

## Credenciais (onde ficam)
Todas em `.env.local` na raiz do projeto (nunca versionado).
- Tess: PREENCHIDA (TESS_API_KEY em .env.local)
- Supabase: PREENCHIDA (projeto atalead, ref fagkylsrgjhozbxthjrt, regiao Sao Paulo; URL + anon + service_role + db_password em .env.local). Org leovillacamello (mesma do gerador da Soter).
- Evernote: pendente (developer token, sujeito a aprovacao do Evernote, ate 5 dias uteis)
- Pipedrive: PREENCHIDA (PIPEDRIVE_API_TOKEN em .env.local)

ATENCAO: as chaves da Tess e do Pipedrive foram coladas no chat durante o setup. Recomendado rotacionar as duas (gerar novas) depois que o app estiver no ar, por higiene de seguranca.

## Custos das APIs
- Evernote: chave gratis (so aprovar).
- Tess: incluida na conta paga.
- Pipedrive: incluida na conta paga.
- Claude/Gemini (so se trocarmos o motor da ata): pago por uso, centavos por ata.

## Status atual (2026-07-10)
Fase 0 completa e Fase 1a PRONTA e rodando (`npm run dev`, porta 5173).
App React (Vite) + React Router com as 4 telas do design (Funil, Reuniao, Proximos passos, Nova reuniao), tema claro/escuro, dados de exemplo em src/lib/mock.js. Build passa limpo.
Design importado do Claude Design (projeto "AtaLead: UI em React", id 8b1b7e8f-cbf3-477c-9142-c6f38fc92b29) via MCP DesignSync.
Seguranca: chamadas a Tess/Evernote/Pipedrive isoladas em funcoes de servidor na pasta /api (leem process.env; nunca vao ao navegador). Cliente so usa VITE_SUPABASE_ANON_KEY.
Falta: Fase 1b (tabelas no Supabase + dados reais), Fase 1c (ligar de verdade Tess e Pipedrive nas funcoes /api; Evernote quando a chave sair). Rodar /api local exige `vercel dev`.

## Estrutura do codigo
- index.html, vite.config.js, package.json (Vite + React)
- src/main.jsx, src/App.jsx (layout/rota/tema), src/index.css (tokens do design)
- src/screens/{Funil,Reuniao,Passos,NovaReuniao}.jsx
- src/components/Icons.jsx
- src/lib/{supabase.js, api.js (fala com /api), mock.js}
- api/{gerar-ata.js (Tess), evernote-nota.js, enviar-pipedrive.js} = funcoes de servidor, chaves protegidas

## Plano em fases
- Fase 0: base (projeto Supabase, login, esqueleto na Vercel, modelo de dados). Nao precisa de chave.
- Fase 1: nucleo (cadastrar reuniao, receber transcricao por colar, gerar ata via Tess, ver/editar).
- Fase 2: lead (extrair dados do lead da ata e mostrar pra conferir/aprovar).
- Fase 3: Pipedrive (subir o lead aprovado com ata e proximos passos).
- Fase 4: Evernote automatico (puxar a nota pela API sem colar).

## Modelo de dados (rascunho)
- prospects: empresa/pessoa, status no funil, dono
- reunioes: prospect, titulo, data, id da nota Evernote, transcricao, status
- participantes: nome, empresa, papel
- mapa_speakers: Speaker N > participante
- atas: conteudo estruturado, versao, link
- proximos_passos: descricao, responsavel, prazo, feito

## Pendencias pra seguir
1. Nome/ID do agente de ata no Tess (fica no Agent Studio).
2. Confirmar se ainda queremos exportar a ata em Word (template) ou so viver no app + Pipedrive.
3. Definir regiao do Supabase e politica de retencao (LGPD, dado de prospect e de terceiro).
4. Conta na Vercel e no Supabase (confirmar se ja existem).

## LGPD
Transcricao de prospect e dado pessoal de terceiro mais estrategia comercial. Definir regiao do Supabase, retencao e tratamento antes de rodar com reuniao real. Nao replicar transcricao/ata em ferramentas externas sem necessidade.
