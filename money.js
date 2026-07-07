/* =====================================================================
   Mission Control — money.js
   Inteligência "como ganhar dinheiro" por país (Brasil, Alemanha,
   Portugal, Espanha, Reino Unido):
     · base curada de oportunidades de negócio + ideias de produto
       (estática, editável — mesmo espírito do report.js)
     · regras determinísticas que cruzam os Google Trends AO VIVO de
       cada país com ângulos de monetização (mesmo espírito do
       PROJECT_RULES do board — sem chamada de IA externa)
   Consumido por dashboard.js (view "Mercados").
   ===================================================================== */

const MONEY_GEOS = [
  { key: "brasil",   label: "Brasil",      flag: "🇧🇷", color: "var(--green)" },
  { key: "alemanha", label: "Alemanha",    flag: "🇩🇪", color: "var(--amber)" },
  { key: "portugal", label: "Portugal",    flag: "🇵🇹", color: "var(--red)" },
  { key: "espanha",  label: "Espanha",     flag: "🇪🇸", color: "var(--magenta)" },
  { key: "uk",       label: "Reino Unido", flag: "🇬🇧", color: "var(--cyan)" },
];

/* ------------------- base curada por país -------------------
   snapshot  = leitura macro do mercado para empreender
   oportunidades = oportunidades de negócio (o "onde")
   produtos  = ideias de produto/serviço acionáveis (viram card no board)
   angulo    = como ISSO se conecta ao seu perfil (3D/Unreal/archviz,
               cursos, IA, Home Assistant, empresa de web explorer 3D)
---------------------------------------------------------------- */
const MONEY_INTEL = {
  brasil: {
    snapshot:
      "Maior mercado digital da América Latina: Pix normalizou pagamento instantâneo, a economia de infoprodutos (Hotmart/Kiwify/Eduzz) segue enorme e PMEs estão correndo atrás de IA sem saber por onde começar. Custo de aquisição baixo em português + audiência gigante = ótimo lugar para validar produto antes de exportar.",
    oportunidades: [
      { t: "IA aplicada a PMEs", d: "Comércios e escritórios querem automatizar atendimento, orçamento e conteúdo, mas não sabem operar as ferramentas. Consultoria + implantação recorrente (retainer mensal) tem demanda e pouquíssima concorrência qualificada fora das capitais." },
      { t: "Infoprodutos técnicos em PT-BR", d: "Cursos de nicho técnico (Unreal, Houdini, archviz, automação residencial) têm pouca oferta séria em português — a maioria do material bom é em inglês. Quem domina o assunto e sabe didática cobra premium." },
      { t: "Visualização para incorporadoras", d: "Lançamentos imobiliários vendem na planta e dependem de imagem: tour interativo/pixel streaming de decorado virtual é upgrade natural do render estático — e incorporadora paga por diferencial de venda." },
      { t: "Serviços produtizados para gringo", d: "Faturar em dólar/euro morando no Brasil: pacotes fechados de render, motion e assets 3D para estúdios e agências lá fora. Câmbio joga a favor da margem." },
    ],
    produtos: [
      "Curso: archviz no Unreal Engine em PT-BR",
      "Consultoria de IA para PMEs (retainer mensal)",
      "Pacote de renders para lançamento imobiliário",
      "Instalação/configuração de Home Assistant como serviço",
      "Assets 3D brasileiros (mobiliário/vegetação) para marketplaces",
    ],
    angulo:
      "Seu diferencial aqui é ser bilíngue técnico: conteúdo em PT-BR com qualidade internacional. Use o Brasil como laboratório de validação barata (curso + consultoria) enquanto a empresa de web explorer 3D mira cliente europeu.",
  },

  alemanha: {
    snapshot:
      "Maior economia da Europa, com o Mittelstand (indústrias médias, muitas familiares) atrasado em digitalização e pagando caro por quem resolve. Alemão valoriza precisão, documentação e confiabilidade — barreira de entrada alta, mas ticket alto e cliente fiel. Freelancer técnico sênior fatura €70–110/h.",
    oportunidades: [
      { t: "Digital twin industrial & imobiliário", d: "Indústria 4.0 e incorporadoras alemãs investem em gêmeos digitais e visualização interativa de plantas/empreendimentos — exatamente a tese do web explorer 3D. Feiras como a bauma/Expo Real são vitrine." },
      { t: "Visualização para energia renovável", d: "A Energiewende gera demanda por visualização de parques solares/eólicos e retrofit de edifícios (simulações, before/after, comunicação com comunidades locais)." },
      { t: "Serviço técnico em inglês", d: "Escassez crônica de talento tech: muitas empresas aceitam fornecedores operando 100% em inglês. Contratos B2B remotos a partir de Portugal/Brasil são viáveis." },
      { t: "Treinamento corporativo", d: "Empresas pagam bem por Schulungen (treinamentos) internos: workshops de Unreal/IA aplicada para equipes de engenharia e marketing técnico." },
    ],
    produtos: [
      "Tour interativo (pixel streaming) para incorporadora alemã",
      "Visualização 3D de parque solar/eólico para developer de energia",
      "Workshop remoto de Unreal para equipe de engenharia",
      "Retainer de renderização para escritório de arquitetura",
    ],
    angulo:
      "Não tente competir por preço — alemão desconfia de barato. Posicione como especialista: portfólio impecável, prazo cumprido, documentação. Um único cliente Mittelstand recorrente pode sustentar a empresa inteira.",
  },

  portugal: {
    snapshot:
      "Porta de entrada da Europa para brasileiro: idioma, acordos, custo de abertura de empresa baixo e Startup Portugal ativo (Web Summit em Lisboa). Boom imobiliário contínuo (reabilitação urbana, golden-era de promotores) e ecossistema de nômades/expats que consome serviços em inglês e português.",
    oportunidades: [
      { t: "Archviz para promotores imobiliários", d: "Lisboa/Porto/Algarve vivem ciclo forte de promoção imobiliária vendida na planta para estrangeiro — visualização de alto nível (render, filme, tour interativo) é peça central do funil de venda." },
      { t: "Base jurídica/fiscal para operar na UE", d: "Constituir a empresa em Portugal dá acesso ao mercado único europeu, faturação em euro e credibilidade para fechar com cliente alemão/inglês — além de ser o caminho natural do visto." },
      { t: "Serviços para a comunidade expat", d: "Fluxo constante de recém-chegados que pagam por descomplicação: conteúdo, consultoria e serviços produtizados de instalação (inclusive smart home para quem monta casa nova)." },
      { t: "Turismo & hospitality tech", d: "Hotelaria e alojamento local investem em diferenciais visuais: tours virtuais, vídeo institucional e presença digital são compra recorrente do setor." },
    ],
    produtos: [
      "Pacote 'lançamento na planta': renders + filme + tour 3D",
      "Tour virtual para hotéis e alojamento local",
      "Guia/consultoria: abrir empresa e operar da UE",
      "Site + identidade visual para promotores locais",
    ],
    angulo:
      "Portugal é o seu quartel-general lógico: mesma língua, empresa na UE, e o mercado imobiliário local é cliente direto do seu portfólio de archviz. Feche 2–3 promotores como clientes-piloto — é a tração que o comitê de visto de startup quer ver.",
  },

  espanha: {
    snapshot:
      "Startup Law com imposto fixo de 24% nos primeiros anos e hubs criativos fortes (Barcelona e Madrid concentram estúdios de games, VFX e arquitetura). Segundo mercado turístico do mundo e imobiliário aquecido no Mediterrâneo. Bônus: dominar espanhol abre um mercado de ~500 milhões de falantes.",
    oportunidades: [
      { t: "Games & VFX em Barcelona/Madrid", d: "Estúdios (a King contrata technical artists em Barcelona, por exemplo) e produtoras demandam artistas Unreal/Houdini — tanto CLT quanto outsourcing/freela de assets e cenários." },
      { t: "Imobiliário mediterrâneo", d: "Costa del Sol, Baleares e Valência vendem imóvel de luxo para estrangeiro — mercado clássico de archviz premium e tours interativos, com tickets altos." },
      { t: "Conteúdo em espanhol", d: "Adaptar curso/canal técnico para ES multiplica a audiência endereçável (Espanha + América hispânica) com esforço marginal — mesmo material, novo mercado." },
      { t: "Startup Law como base fiscal", d: "Para constituir a empresa, o regime de 24% + ecossistema de aceleradoras torna a Espanha alternativa séria a Portugal — vale pontuar custo × velocidade × fit." },
    ],
    produtos: [
      "Cenários/assets Unreal para estúdios de games (outsourcing)",
      "Archviz premium para imobiliárias da costa",
      "Versão em espanhol do curso de Unreal/archviz",
      "Tour interativo para hotéis resort",
    ],
    angulo:
      "Espanha é onde seu perfil híbrido (archviz + tempo real) vale dobrado: o mesmo skill serve incorporadora e estúdio de game. Espanhol é investimento de 6 meses que dobra seu mercado de conteúdo.",
  },

  uk: {
    snapshot:
      "Maior indústria criativa da Europa: Londres concentra VFX houses (Framestore, Outpost, DNEG), agências e o maior volume de vagas Unreal do continente (168 vagas ativas de Unreal Artist só no LinkedIn). Freelance técnico é caro (£300–500/dia) e contratação remota de fora do país é prática comum no setor.",
    oportunidades: [
      { t: "Freelance remoto para VFX/estúdios", d: "Estúdios londrinos contratam remote contractors para environment, lighting e realtime FX — dá para faturar em libra sem visto, como fornecedor B2B via sua empresa na UE." },
      { t: "Virtual production & realtime", d: "O Reino Unido é polo de virtual production (LED stages, Unreal na TV/cinema) — a habilidade mais bem paga do ecossistema Unreal hoje, e com escassez de gente boa." },
      { t: "Conteúdo técnico em inglês", d: "Curso/canal em inglês compete no mercado global com preço global: o mesmo curso que vale R$ 300 no Brasil vale £150 aqui. Audiência UK/US é a mais monetizável do YouTube." },
      { t: "Property marketing", d: "O mercado de off-plan sales (venda na planta) britânico usa CGI pesado — agências de property marketing terceirizam renders e filmes constantemente." },
    ],
    produtos: [
      "Day-rate freelance para VFX house (environment/realtime)",
      "Curso em inglês: 'Archviz to Unreal pipeline'",
      "Pacote CGI para agência de property marketing",
      "Demo reel de virtual production (investimento de portfólio)",
    ],
    angulo:
      "UK é o topo da cadeia de valor do seu skill: mesmo trabalho, ticket 3–4×. Estratégia: empresa em PT/ES + clientes UK remotos = custo ibérico com receita em libra. Meta do report: 3 candidaturas/semana já aponta para cá.",
  },
};

/* ------------------- radar de monetização nos trends -------------------
   Regras por palavra-chave (PT/EN/DE/ES) que transformam o que está
   estourando no Google Trends em ângulo de monetização. Determinístico,
   sem IA — mesmo padrão do PROJECT_RULES.
------------------------------------------------------------------------ */
const TREND_MONEY_RULES = [
  {
    rx: /futebol|fútbol|fußball|football|soccer|champions|premier league|la liga|bundesliga|libertadores|brasileir[ãa]o|copa|liga|fifa|uefa|match|partido|spiel|\bvs\.?\b|derby|cl[áa]ssico|escala[çc][ãa]o|golo?s?|flamengo|palmeiras|corinthians|vasco|gr[êe]mio|cruzeiro|botafogo|real madrid|bar[çc]a|atl[ée]tico|benfica|arsenal|chelsea|liverpool|manchester|tottenham|bayern|dortmund|sele[çc][ãa]o|f[óo]rmula 1|\bf1\b|gp d[eo]|moto ?gp|\bnba\b|\bufc\b|t[êe]nis|tennis|wimbledon|[a-zà-ú]+ x [a-zà-ú]+/i,
    label: "Esporte em alta",
    color: "var(--green)",
    dica: "Audiência quente e recorrente: conteúdo de segunda tela (shorts/reels de análise), artes e motion para páginas de esporte, print-on-demand rápido de memes do jogo.",
  },
  {
    rx: /netflix|série|series|film|filme|película|movie|estreia|estreno|premiere|trailer|oscar|reality|bbb|gran hermano|celebrit|cantor|singer|show|concert|tour\b/i,
    label: "Entretenimento / newsjacking",
    color: "var(--magenta)",
    dica: "Pico de busca de curta duração: vídeos de reação e explicação, artigos SEO rápidos, afiliados de streaming/ingressos. Velocidade importa mais que produção.",
  },
  {
    rx: /\bia\b|\bai\b|intelig[êe]ncia artificial|künstliche intelligenz|chatgpt|claude|gemini|openai|anthropic|llm|robô|robot/i,
    label: "Onda de IA",
    color: "var(--cyan)",
    dica: "Interesse de massa em IA = demanda por tradução prática: mini-curso, template/prompt pack, automação para PMEs, micro-SaaS embrulhando o modelo do momento.",
  },
  {
    rx: /iphone|samsung|galaxy|xiaomi|pixel\b|playstation|ps[56]|xbox|nintendo|switch|lan[çc]amento|launch|review|unboxing/i,
    label: "Lançamento de produto",
    color: "var(--violet)",
    dica: "Compra iminente: reviews e comparativos (afiliados), acessórios em marketplace, conteúdo 'vale a pena?'. Janela de ~2 semanas de tráfego barato.",
  },
  {
    rx: /bitcoin|cripto|crypto|ethereum|d[óo]lar|euro\b|bolsa|ibovespa|a[çc][õo]es|stock|invest|infla[çc][ãa]o|imposto|steuer|declara[çc][ãa]o|juros|taxa selic|banco central/i,
    label: "Dinheiro & finanças",
    color: "var(--amber)",
    dica: "Busca com intenção alta: conteúdo educativo (o formato que mais converte), planilhas/calculadoras como isca digital, afiliados de fintech e corretoras.",
  },
  {
    rx: /tempo|clima|chuva|temporal|calor|onda de calor|frio|neve|schnee|hitze|wetter|storm|hurac[áa]n|furac[ãa]o|enchente|praia/i,
    label: "Clima / sazonal",
    color: "var(--cyan)",
    dica: "Demanda sazonal instantânea: e-commerce de época (ventilador/aquecedor/guarda-chuva via marketplace), conteúdo utilitário local com SEO, serviços de manutenção.",
  },
  {
    rx: /natal|christmas|weihnacht|navidad|black friday|p[áa]scoa|easter|carnaval|halloween|dia d[aoe]s? (m[ãa]es|pais|namorados)|valentine|reyes|festa junina|ano novo|new year|sale\b|promo[çc][ãa]o/i,
    label: "Data comemorativa",
    color: "var(--red)",
    dica: "Calendário previsível de consumo: print-on-demand temático, kits digitais (convites/artes), landing pages de promoção para comércios locais.",
  },
  {
    rx: /minecraft|fortnite|roblox|gta|steam|league of legends|\blol\b|valorant|counter.?strike|cs2|elden|zelda|pok[ée]mon|game|juego|videojuego/i,
    label: "Games",
    color: "var(--violet)",
    dica: "Comunidade que paga por conteúdo: tutoriais e assets (skins/mapas/mods), lives de gameplay, cursos de criação com Unreal — ponte direta com seu skill.",
  },
  {
    rx: /vaga|emprego|concurso|enem|vestibular|arbeit|job|empleo|oposiciones|curr[íi]culo|entrevista/i,
    label: "Carreira & educação",
    color: "var(--green)",
    dica: "Dor cara de resolver: cursos preparatórios, mentoria, revisão de currículo/portfólio como serviço produtizado, conteúdo 'como conseguir X'.",
  },
  {
    rx: /viagem|voo|vuelo|flug|passagen|passagem|hotel|airbnb|f[ée]rias|urlaub|vacaciones|holiday|turismo|tourist/i,
    label: "Viagem & turismo",
    color: "var(--amber)",
    dica: "Setor que compra visual: tours virtuais e vídeo para hotéis/pousadas, afiliados de reserva, guias locais monetizados — encaixa no seu portfólio 3D/vídeo.",
  },
];

/* Cruza os itens de trends de UM país com as regras acima.
   Retorna [{label, dica, color, hits:[títulos]}], no máx. `max` ângulos. */
function matchTrendOpportunities(items, max = 4) {
  const out = [];
  for (const rule of TREND_MONEY_RULES) {
    const hits = (items || [])
      .filter((it) => rule.rx.test(it.title || ""))
      .map((it) => it.title);
    if (hits.length > 0)
      out.push({ label: rule.label, dica: rule.dica, color: rule.color, hits });
    if (out.length >= max) break;
  }
  return out;
}
