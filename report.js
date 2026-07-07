/* =====================================================================
   Mission Control — relatório de novidades (pré-carregado)
   Gerado em 06/07/2026. Você pode substituir colando um novo relatório
   dentro do modal de Novidades (fica salvo no navegador).
   ===================================================================== */

const DEFAULT_REPORT = {
  date: "2026-07-06",
  sections: [
    {
      icon: "◆",
      title: "IA — Modelos & Lançamentos",
      items: [
        {
          title: "Claude Sonnet 5 lançado (Anthropic)",
          source: "aitoolsrecap.com",
          summary: "Lançado em 30 de junho, o Sonnet 5 chega com desempenho próximo ao Opus 4.8 por US$ 2/M tokens de entrada (preço introdutório até 31 de agosto) e janela de contexto de 1M tokens. Virou o modelo padrão dos planos Free e Pro. No benchmark de coding agêntico marcou 63,2%, contra 58,1% do Sonnet 4.6. Ótimo gancho de conteúdo: comparativo de custo-benefício entre os modelos de ponta para quem produz cursos e posts."
        },
        {
          title: "GPT-5.6 Sol em preview (OpenAI)",
          source: "openai.com",
          summary: "A OpenAI apresentou em 26 de junho a família GPT-5.6 — modelos Sol, Terra e Luna — em preview limitado para parceiros verificados, com foco em raciocínio, coding e cibersegurança, acompanhada de system card de segurança. O rollout será em fases antes da disponibilidade ampla. Vale acompanhar para conteúdo comparando a estratégia de lançamento gradual da OpenAI com a cadência acelerada da Anthropic."
        },
        {
          title: "Gemini 3.5 Pro atrasa de novo (Google)",
          source: "buildfastwithai.com",
          summary: "O Gemini 3.5 Pro começa a semana ainda em preview restrito no Vertex AI, sem data de GA, benchmarks publicados nem preço confirmado — já são dois prazos perdidos. O Google alega necessidade de otimizar o consumo excessivo de tokens em tarefas agênticas longas. Enquanto isso, três concorrentes lançaram desde o I/O. Pauta quente para vídeo/post: 'por que o Google está atrasando?'."
        },
        {
          title: "Claude Fable 5 restaurado globalmente",
          source: "jiscinvolve.org",
          summary: "Após pausa causada por restrições de exportação dos EUA, o Claude Fable 5 voltou a operar mundialmente em 1º de julho com medidas extras de segurança contra riscos de cibersegurança. A Anthropic também está pressionando por padrões compartilhados contra jailbreaks entre os grandes laboratórios. Bom tema para explicar a relação entre geopolítica e acesso a modelos de IA."
        },
        {
          title: "Gemma 4 12B: agente local no seu laptop",
          source: "blog.google",
          summary: "O Google liberou o Gemma 4 12B, modelo aberto que roda localmente com apenas 16 GB de memória, unindo visão e voz nativa numa arquitetura unificada. Também entrou em preview o Gemini Omni Flash para workflows de vídeo via API. Para quem cria cursos, é o momento ideal de conteúdo sobre 'IA rodando offline no seu PC' — tema com altíssima procura."
        }
      ]
    },
    {
      icon: "◈",
      title: "IA — Mercado & Regulação",
      items: [
        {
          title: "China desliga agentes 'humanizados' em 15/07",
          source: "buildfastwithai.com",
          summary: "ByteDance (Doubao) e Alibaba (Qwen) vão desativar seus agentes de IA com personalidade humana para cumprir a nova lei chinesa de interação antropomórfica, afetando 345 milhões de usuários. Ambas concluíram que reconstruir do zero era mais viável que adaptar. A regra exige até mecanismo de 'saída instantânea' da IA. Excelente pauta sobre o futuro dos companheiros de IA."
        },
        {
          title: "Tesla Robotaxi sem monitor em Miami",
          source: "The Information",
          summary: "A Tesla expandiu o Robotaxi para Miami — quinta cidade, depois de Austin, Houston, Dallas e Phoenix — agora sem monitor de segurança a bordo, mirando uma dúzia de estados americanos até o fim de 2026. Marco importante da autonomia real em produção e ótimo gancho para discutir percepção pública de risco em IA embarcada."
        },
        {
          title: "ONU abre hoje o Diálogo Global de Governança de IA",
          source: "news.un.org",
          summary: "Começa hoje (06/07) em Genebra a reunião de Estados-membros da ONU sobre governança internacional de IA. O painel científico independente alerta que a janela para criar regras eficazes 'está aberta, mas pode não permanecer', citando riscos de desinformação, crime, impacto ambiental e concentração de poder. A Casa Branca também deve anunciar padrões voluntários para modelos nesta semana."
        },
        {
          title: "Microsoft cria divisão de 6.000 pessoas para adoção de IA",
          source: "Bloomberg",
          summary: "A Microsoft montou uma organização com 6.000 funcionários — engenheiros, treinadores corporativos e especialistas setoriais — dedicada a ajudar empresas a implantar IA na prática. Sinal claro de que o gargalo do mercado migrou do modelo para a implementação. Oportunidade de posicionamento: consultoria e treinamento de IA aplicada a arquitetura/3D é um nicho aberto."
        }
      ]
    },
    {
      icon: "◇",
      title: "Vagas — Unreal, 3D & Houdini na Europa",
      items: [
        {
          title: "Room 8 Studio: Cinematic Unreal Artist (remoto UE)",
          source: "remotegamejobs.com",
          summary: "A Room 8, outsourcing que atende Activision, Nintendo, Ubisoft e EA, contrata Cinematic Unreal Engine Artist (UE4/UE5) remoto a partir de Portugal, Espanha, Polônia, Tchéquia, Romênia e outros países europeus. Pedem shading, lighting, sequencer, VFX real-time e domínio de fotorrealismo — perfil muito próximo do seu de archviz. A vaga listada expirou, mas a empresa republica com frequência; vale cadastrar alerta."
        },
        {
          title: "Reino Unido concentra 168 vagas de Unreal Artist",
          source: "LinkedIn UK",
          summary: "O LinkedIn britânico lista 168 vagas ativas de Unreal Engine Artist e 463 vagas gerais de Unreal, incluindo Lighting/VFX Artist remoto para toda a Europa (base Londres). Na Alemanha, o Glassdoor mostra 68 vagas, com destaques em visualização (Unlimited Visions) e até no centro aeroespacial DLR preparando modelos 3D para Unreal. Sugestão de meta: 3 candidaturas por semana com portfólio Datasmith/arquitetura."
        },
        {
          title: "Houdini + Unreal: Goodbye Kansas e VFX houses",
          source: "animationandvfxjobs.com / rebelway.net",
          summary: "A Goodbye Kansas Studios abriu vaga freelance remota de Realtime FX Artist (Houdini + Unreal, Europa). Em Londres, Framestore busca Previs Artist e Outpost VFX procura Senior Environment Artist com Maya/Houdini. A King contrata Technical Artists em Barcelona, Londres e Estocolmo, e a Platige Image (Varsóvia) busca FX Artist. Estudar Houdini 30 min/dia abre essa porta dupla VFX + archviz procedural."
        },
        {
          title: "Archviz remoto: estúdios contratando na Europa",
          source: "cgaward.com",
          summary: "No CG Award há vagas abertas de visualizadores: Parallel (Holanda, full/part-time), Visense Studio (Reino Unido, remoto, salário conforme portfólio) e ARGGRAPH (Polônia, remoto/freelance). O salário médio de 3D artist remoto na Europa gira em torno de €28 mil/ano segundo levantamento de 430 vagas — mas seniores de archviz com Unreal ficam bem acima disso. Freelas de imagem variam de US$ 300–500 por render."
        }
      ]
    },
    {
      icon: "◉",
      title: "Empreender na Europa — Oportunidades",
      items: [
        {
          title: "13 países da UE com visto de startup em 2026",
          source: "blog.mean.ceo",
          summary: "O panorama de julho/2026 confirma 13 países da União Europeia com rotas de visto para fundadores não-europeus. Os mais fortes: Holanda (aprovação rápida, modelo de facilitador local), Estônia (digital-first, casa com e-Residency, análise em 2–3 meses), França (French Tech Visa de 4 anos, ecossistema forte em IA) e Finlândia. A recomendação dos analistas: escolher 3 países, pontuar por custo, velocidade e fit — não pelo mais famoso."
        },
        {
          title: "Portugal e Espanha: as portas de menor atrito",
          source: "editorialge.com",
          summary: "Portugal segue como entrada de menor custo: sem investimento mínimo fixo no negócio, exigindo ~€10.440 de fundos pessoais comprovados em 2026, com forte apoio do Startup Portugal e vitrine do Web Summit em Lisboa. A Espanha atrai com a Startup Law: imposto fixo de 24% nos primeiros seis anos. Para brasileiro (idioma + acordos), Portugal é o caminho natural para registrar sua empresa de visualização/web explorer."
        },
        {
          title: "Sua ideia de 'web explorer' 3D: timing favorável",
          source: "análise",
          summary: "Experiências web imersivas de exploração 3D estão em alta: o boom de digital twins (a americana Imerza, por exemplo, contrata em cima de Unreal exatamente nisso) mostra demanda real de incorporadoras e cidades por navegação interativa de empreendimentos. Combine seu domínio de Corona/Datasmith/Unreal com pixel streaming ou WebGPU e valide com 2–3 clientes de arquitetura antes de constituir a empresa — é o tipo de tração que os comitês de visto de startup exigem."
        },
        {
          title: "Estônia e-Residency: empresa na UE sem sair de casa",
          source: "e-resident.gov.ee",
          summary: "Tallinn foi eleita pela Monocle a melhor cidade do mundo para startups, e o programa e-Residency permite abrir e administrar uma empresa estoniana 100% online de qualquer lugar — inclusive do Brasil — antes de decidir migrar. É uma forma de faturar em euro com clientes europeus de visualização enquanto você prepara o visto de fundador. O Startup Visa estoniano é separado e serve como caminho de residência depois."
        }
      ]
    }
  ]
};
