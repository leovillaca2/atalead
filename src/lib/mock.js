// Dados de exemplo da Fase 1a. Na Fase 1b sao substituidos pelo Supabase.

export const reuniaoDemo = {
  id: "r1",
  titulo: "Reunião de prospecção — Horizonte Cobranças",
  prospect: "Horizonte Cobranças",
  data: "08 jul 2026",
  duracao: "47 min",
  origem: "Evernote",
  ata: {
    resumo:
      "A Horizonte Cobranças busca uma plataforma de comunicação para régua de cobrança com WhatsApp, SMS e e-mail integrados. Hoje operam com duas ferramentas separadas e sem visão consolidada de recuperação. O time demonstrou urgência: querem reduzir custo por acionamento e melhorar a taxa de contato antes do fim do trimestre.",
    decisoes: [
      "Avançar para uma proposta comercial com foco em WhatsApp oficial e SMS.",
      "Prova de conceito de 30 dias com uma carteira piloto.",
      "Integração via API com o sistema de cobrança atual deles.",
    ],
    produtos: [
      "WhatsApp API oficial",
      "SMS em massa",
      "Régua de cobrança",
      "Dashboard de recuperação",
      "Integração via API",
    ],
  },
  tarefas: [
    { id: "t1", titulo: "Enviar proposta com escopo da PoC", sub: "até 11 jul", resp: "Augusto", feito: true },
    { id: "t2", titulo: "Agendar call técnica sobre a API", sub: "semana de 14 jul", resp: "Cristhiane", feito: false },
    { id: "t3", titulo: "Confirmar volume mensal de disparos", sub: "pendente com o cliente", resp: "Marina", feito: false },
  ],
  participantes: [
    { speaker: "Speaker 1", nome: "Marina Alves", desc: "Horizonte · Head de Operações" },
    { speaker: "Speaker 2", nome: "Augusto Mello", desc: "PGMais · Comercial" },
    { speaker: "Speaker 3", nome: "Cristhiane Garcia", desc: "PGMais · Pré-vendas" },
    { speaker: "Speaker 4", nome: "Rafael Nunes", desc: "Horizonte · TI" },
  ],
  lead: {
    empresa: "Horizonte Cobranças",
    contato: "Marina Alves",
    cargo: "Head de Operações",
    segmento: "Recuperação de crédito",
    etapa: "Proposta",
    valor: "R$ 8.400",
    periodo: "/ mês",
  },
  transcricao: [
    { ts: "00:02", quem: "Marina", texto: "A gente hoje tem dois sistemas, um pra SMS e outro pro WhatsApp, e não conversa." },
    { ts: "00:19", quem: "Augusto", texto: "Entendi. E o volume mensal de acionamentos, vocês têm esse número?" },
    { ts: "00:34", quem: "Rafael", texto: "Gira em torno de duzentos mil por mês, mas queremos crescer." },
    { ts: "00:51", quem: "Cristhiane", texto: "Perfeito, dá pra unificar isso numa régua só, com dashboard de recuperação." },
    { ts: "01:12", quem: "Marina", texto: "O que mais pesa hoje é o custo por acionamento. Precisamos disso resolvido no trimestre." },
    { ts: "01:30", quem: "Augusto", texto: "Dá pra rodar uma PoC de 30 dias com uma carteira piloto e medir a taxa de contato." },
    { ts: "01:48", quem: "Rafael", texto: "Pra nós o ponto crítico é a integração via API com o sistema de cobrança atual." },
  ],
};

export const colunas = [
  { nome: "Novo", cor: "#7E9196", cards: [
    { id: "p1", empresa: "Vega Serviços", contato: "Paula Reis", valor: "R$ 3.200", ultima: "07 jul" },
  ]},
  { nome: "Qualificado", cor: "#1D5FD1", cards: [
    { id: "p2", empresa: "Atlas Crédito", contato: "João Bastos", valor: "R$ 5.900", ultima: "05 jul" },
    { id: "p3", empresa: "Nova Rota", contato: "Bianca Lemos", valor: "R$ 2.100", ultima: "03 jul" },
  ]},
  { nome: "Proposta", cor: "#B45309", cards: [
    { id: "r1", empresa: "Horizonte Cobranças", contato: "Marina Alves", valor: "R$ 8.400", ultima: "08 jul" },
  ]},
  { nome: "Ganho", cor: "#15803D", cards: [
    { id: "p4", empresa: "Grupo Meridiano", contato: "Sergio Pinto", valor: "R$ 6.500", ultima: "01 jul" },
  ]},
  { nome: "Perdido", cor: "#B4231C", cards: [] },
];

export const tarefasAbertas = [
  { id: "t2", titulo: "Agendar call técnica sobre a API", prospect: "Horizonte Cobranças", resp: "Cristhiane", prazo: "semana de 14 jul", status: "semana" },
  { id: "t3", titulo: "Confirmar volume mensal de disparos", prospect: "Horizonte Cobranças", resp: "Marina", prazo: "pendente", status: "semana" },
  { id: "t5", titulo: "Reenviar contrato revisado", prospect: "Atlas Crédito", resp: "Augusto", prazo: "atrasado 2 dias", status: "atrasado" },
  { id: "t6", titulo: "Ligar para retomar contato", prospect: "Nova Rota", resp: "Augusto", prazo: "atrasado 5 dias", status: "atrasado" },
];
