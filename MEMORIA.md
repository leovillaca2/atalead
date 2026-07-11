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
PUBLICADO em producao: https://atalead.vercel.app (Vercel projeto leovillacamellos-projects/atalead). Deploy pela CLI (o GitHub e da conta leovillaca2 e a Vercel da leovillacamello, entao o conector automatico GitHub->Vercel nao liga; publicamos com `vercel --prod`). SPA fallback em vercel.json.

Tess: base REAL da API = https://tess.pareto.io/api (o api.tess.im e so o site de docs). Auth Bearer OK (/me = Augusto Mello, augusto.mello@pgmais.com.br). Geracao e por POST /agents/{id}/execute (waitExecution). FALTA definir TESS_AGENT_ID (qual agente de ata usar) pra completar a geracao. chat/completions e GET only (nao serve pra gerar).

Supabase: schema aplicado via CLI (migration 20260710000001), 5 tabelas + RLS ligado, policies para authenticated. Aplicado por CLI porque o MCP do Supabase esta em modo somente-leitura.

Pipedrive: em MODO SEGURO (PIPEDRIVE_SAFE_MODE=true no Vercel) — NAO escreve no CRM real. So cria de verdade quando setar PIPEDRIVE_SAFE_MODE=false.

Variaveis no Vercel (producao): VITE_SUPABASE_URL/ANON, SUPABASE_URL/SERVICE_ROLE, TESS_API_KEY, PIPEDRIVE_API_TOKEN, PIPEDRIVE_SAFE_MODE=true. Falta TESS_AGENT_ID e EVERNOTE_DEV_TOKEN.

ESTADO 2026-07-11 (funcional e verificado em producao):
- Login: Supabase Auth email/senha. Usuario augusto.mello@pgmais.com.br (tela aceita "augusto.mello" e completa o dominio). Senha inicial fraca (trocar depois). App todo atras do login.
- Telas ligadas ao Supabase (nao usam mais mock.js): Funil, Reuniao, Passos leem do banco; NovaReuniao grava.
- Tess LIGADA E TESTADA em producao: agente 2910 (motor GPT), model gpt-4o, temperature "0" (o campo e select, "0.2" da erro). Retorna ata em JSON (resumo/decisoes/proximos_passos/produtos/lead). Prompt no proprio codigo (api/gerar-ata.js).
- Fluxo Nova reuniao -> gerarAta (Tess) -> criarReuniaoCompleta (Supabase) -> abre a reuniao. Verificado o endpoint de geracao em prod (HTTP 200, ata estruturada).
- Pipedrive: DECIDIDO usar como CRM unico (nao fazer CRM proprio). Funil escolhido: "AUGUSTO | PROSPECAO CORTEX" (pipeline_id 25; etapas Ativacao/Qualificacao/Agenda/Hunter/Perda). PIPEDRIVE_PIPELINE_ID=25 no Vercel.
  - Aba Funil do AtaLead LE do Pipedrive (/api/pipedrive-funil, so leitura). Verificado em prod.
  - /api/enviar-pipedrive faz criar OU atualizar negocio, com CHECK DE CONFLITO por update_time: se o negocio mudou no Pipedrive depois da ultima sync, devolve {conflito:true} e o front abre um MODAL (componente Modal.jsx, nao o confirm do navegador) com "Sobrescrever" ou "Cancelar". Botao "Atualizar no Pipedrive" na tela da reuniao.
  - Vinculo guardado em reunioes: pipedrive_deal_id/org_id/person_id/update_time/synced_at (migration 20260711000001).
  - AINDA EM MODO SEGURO (PIPEDRIVE_SAFE_MODE=true): a leitura de conflito roda, mas NADA e escrito. Pra ativar de verdade: setar PIPEDRIVE_SAFE_MODE=false no Vercel (e opcional PIPEDRIVE_STAGE_ID pra etapa de entrada). Arquitetura: mao unica AtaLead->Pipedrive (escrita por clique) e Pipedrive->AtaLead (leitura). SEM sync bidirecional.

## Features adicionadas 2026-07-11 (loop autonomo)
- #6 Tess auto-preenche titulo + participantes (gerar-ata devolve tambem titulo/participantes; Nova reuniao usa se o form estiver vazio). Titulo e participantes viraram opcionais.
- #1 Editar ata (resumo) e lead na tela da reuniao antes de enviar (updateAta).
- #2 Seletor de Funil + Etapa no envio ao Pipedrive (/api/pipedrive-stages; enviar-pipedrive aceita pipelineId/stageId; default do funil no localStorage). /api/pipedrive-pipelines lista os funis.
- #4 Tela Reunioes /reunioes: historico com busca por empresa/titulo (db.listarReunioes), item no menu.
- #5 Notas por reuniao (coluna notas, migration 20260711000002; editor na tela da reuniao, db.salvarNotas).
- #9 Mini painel no topo do historico: reunioes no mes, total, valor estimado somado.
- Anexar PDF/Word/TXT na Nova reuniao (extrai texto no navegador, libs pdfjs/mammoth sob demanda via import dinamico); botao Evernote removido. Rodape mostra nome amigavel (Augusto Mello).
- #10 gravar/transcrever no proprio app (navegador MediaRecorder + agente de transcricao da Tess, ex. agente 4431) = ainda futuro.

## Google Calendar + escrita Pipedrive + esteira (estado 2026-07-11)
- GOOGLE CALENDAR conectado via OAuth. Projeto Google Cloud numa conta GMAIL PESSOAL do Augusto (a PGMais bloqueia criar projeto e login pessoal na rede; entao usamos conta pessoal, app "In production" sem verificacao). Scope calendar.events (le E escreve). Client id/secret + GOOGLE_REDIRECT_URI + GOOGLE_SCOPE no Vercel e .env.local. Token do usuario guardado em google_conta (migration 20260711000003), RLS sem policy (so service_role). Funcoes: /api/google/auth, /callback, /eventos, /criar-evento. Le a agenda "primary" da conta que autorizou (hoje = calendario pessoal; a agenda de trabalho pgmais exigiria admin).
- PIPEDRIVE ESCRITA LIGADA: PIPEDRIVE_SAFE_MODE=false no Vercel. Testado (criou+apagou negocio 15291). enviar-pipedrive faz dedup de org/pessoa (search antes de criar), cria/atualiza deal + nota (ata) + atividades (proximos passos), com check de conflito por update_time e modal de sobrescrever.
- FUNIL: em /funil. Le do Pipedrive com filtro de DONO (padrao Augusto id 1586234) e funil padrao "Novas Marcas" (id 1). Colunas em painel, scroll horizontal. Clique no card abre DETALHE do lead (empresa/contato/email/telefone/atividades/notas) via /api/pipedrive-deal.
- SEGURANCA: TODAS as /api (pipedrive-*, gerar-ata, evernote, google eventos/criar-evento/deal) exigem login (exigirLogin no server/google.js valida o JWT do Supabase). Client manda o bearer automatico (get/post em api.js). Chaves so no servidor.
- HOME = Calendario (rota "/"). Sidebar: Calendario, Funil, Reunioes, Proximos passos, Sair. "Integracoes" removido.
- ESTEIRA: Calendario (agendar/ver) -> reuniao acontece (Evernote grava/transcreve = unico passo manual) -> "Gerar ata" no evento -> Nova reuniao ja preenchida (titulo, participantes com tag time/lead por dominio pgmais.com.br, empresa+contato do lead deduzidos) -> cola/anexa transcricao -> Tess gera ata -> revisa/edita -> envia/atualiza no Pipedrive (funil+etapa) -> acompanha no Funil.
- Uploads PDF/Word/TXT lidos no navegador (pdfjs/mammoth sob demanda). Login unico (augusto.mello@pgmais.com.br). Rotacionar chaves (Tess/Pipedrive/Google secret) e trocar senha fraca quando der.

## Auditoria multi-agente + pacotes aplicados (2026-07-11)
- Rodei 4 agentes (code-review, UX, UI, features). Sem achado critico. Relatorio priorizado guardado no historico. Usuario escolheu aplicar "Seguranca+rapidos" e "UX essencial"; mobile e features ficaram pra depois.
- SEGURANCA aplicada: (1) /api/pipedrive-pipelines agora exige login (era o unico sem); (2) OAuth Google anti-CSRF: state agora e nonce aleatorio (randomBytes) amarrado ao user num cookie httpOnly/Secure/SameSite=Lax (g_oauth=nonce.userId, 10min), conferido no callback; user_id vem do COOKIE, nunca do state da URL; (3) enviar-pipedrive rele o deal apos criar nota/atividades pra guardar o update_time FINAL (matou o "conflito falso" no 1o Atualizar) + update nao descarta valor 0; (4) timeouts: fetchT no client (45s padrao, 110s gerarAta) e AbortController de 100s na chamada da Tess (504 amigavel).
- Conexao Google: Calendario faz window.location.href = googleConectarUrl() (navegacao full-page), entao o cookie do state e setado; tokens ja guardados nao quebram.
- UX aplicada: botao Voltar (arrow espelhado) em Reuniao e NovaReuniao; guarda contra perda de transcricao nao gerada (window.__ataleadDirty + beforeunload + confirm nos navitems/Nova reuniao/Sair no App.jsx); spinner (.spinner no index.css) + aviso "pode levar ~1 min" na geracao da ata; CTA "Ver negocio no funil" apos enviar; feedback "Salvo"/"Falha" nas Notas; togglePasso agora reverte visual + avisa em erro (Reuniao e Passos); icone "logout" novo (era "team" no Sair).
## Tela do lead: organizacao + nota + temperatura + LIMITE DE FUNCOES (2026-07-11)
- LIMITE VERCEL HOBBY = 12 funcoes serverless por deploy. Estouramos (13) e a nova nem subia (dava 404, nao 401). REGRA: manter /api <= 12 arquivos .js. Consolidei: pipedrive-meta.js (?tipo=pipelines|users|stages|labels) engoliu pipedrive-pipelines/users/stages; pipedrive-acao.js (POST {action:nota|label}) engoliu pipedrive-nota. Ficou em 11. api.js aponta pros novos; nomes das funcoes JS mantidos (pipelinesPipedrive/usersPipedrive/stagesPipedrive iguais).
- Tela do Negocio reorganizada: atividades separadas em PROXIMAS (hoje pra frente/sem data, ordem crescente) x ATRASADAS (venceram, em vermelho, mais recente primeiro) + contadores; datas em dd/mm/aaaa. Motivo: vinha "jogado" mostrando as mais antigas em aberto (deal com 100 atividades vencidas nunca fechadas).
- ADICIONAR NOTA na tela do lead grava DIRETO no Pipedrive (POST /notes via pipedrive-acao, escrita real; \n vira <br>); refresca a lista apos gravar.
- TEMPERATURA do lead = campo LABEL do negocio no Pipedrive (ex.: Quente/Morno/Frio). Selector no card Dados do lead com as opcoes reais da conta (dealFields key "label"), dot colorido; mudar grava via pipedrive-acao action label (PUT /deals/{id} {label}). Se a conta NAO mostrar opcoes: ou nao usa o campo Label, ou usa multi-label novo (label_ids) e ai precisa ajustar. Respeita modo seguro.

## PENDENTE (nao aplicado por escolha): mobile (nav no celular, token --faint->--text3, foco de teclado/labels, contraste --text3) e features (prazo->due_date, follow-up IA, regenerar/versionar ata, vincular a negocio existente=anti-duplicado). JWT do Supabase ainda vai na URL do /api/google/auth (medio, adiado).
- Falta: Evernote (chave no suporte, modo colar cobre); trocar a senha fraca; refinar RLS por dono se virar multiusuario; seed opcional. Rodar /api local = `vercel dev`.

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
