# Diretoria — investimento histórico por campanha

A aba aparece para o perfil de presença Abel (ou Abel seguido do sobrenome), enquanto a sessão de oito horas estiver válida. Trocar de perfil remove a aba e desmonta o painel. O formulário de presença não é autenticação de identidade; essa regra controla a interface e não substitui autorização no servidor. As políticas RLS e as senhas de Garantia e Compras continuam vigentes.

## Critério financeiro aprovado

**Pago neste painel corresponde à bonificação apurada**, conforme orientação de Pabricio em 27/11/2026. Essa é a perspectiva padrão. A perspectiva alternativa “Pagos confirmados” exige uma confirmação explícita no registro (`pago`, `pagamentoConfirmado`, `statusPagamento` ou `pagamento.status`). Habilitado/validado não cria confirmação financeira. O módulo não grava pagamentos, cadastros ou valores financeiros.

## Estrutura

- `components/diretoria/BiInvestimentoCampanhas.tsx`: filtros, KPIs, gráficos Recharts, tabela e cobertura.
- `components/diretoria/mount.tsx`: montagem/desmontagem React.
- `diretoria/bootstrap.js`: navegação e identificação dinâmica.
- `diretoria/core.mjs`: normalização, centavos inteiros, deduplicação, filtros e consolidação pura.
- `diretoria/data.js`: consultas e adaptação às cinco campanhas locais; `pagination.mjs` pagina leituras acima de mil linhas.
- `diretoria/diretoria.css`: estilos isolados, responsividade e preferência por movimento reduzido.
- `assets/diretoria-bi.js`: bundle estático React/Recharts, carregado somente ao abrir o painel.

Para novos blocos (evolução, filiais, ROI), criar componentes separados e reutilizar os registros normalizados. Não somar indicadores operacionais como faturamento ao investimento em bonificações.

## Fontes e limites

Pix e Oficina consultam todo o histórico disponível no Supabase, independentemente dos filtros da tela anterior, e executam os motores oficiais; Oficina inclui gestores automáticos e Pix exclui réplicas do núcleo. CRM reconstrói competências com os cadastros disponíveis e respeita correções manuais. Cadastro atual não equivale a um snapshot histórico da equipe: alterações de cadastro/política podem alterar uma reconstrução. Garantia inclui apurações validadas; Compras usa o cálculo oficial e ajustes existentes. Ambos exigem sessão válida do módulo e não solicitam nem usam senhas padrão.

A tabela explicita indisponibilidade/proteção de cada campanha; essas fontes não são apresentadas como zero real. Primeiro registro corresponde à criação disponível, com fallback para o início da competência mais antiga, não à data comprovada de implantação da campanha. Pix conta semanas como ciclos; outras campanhas contam competências mensais.

A demonstração é opt-in, identificada como fictícia, mantida somente em memória e totalmente separada do banco e dos totais oficiais. Não são criados registros fictícios em produção.

## Build e validação

`npm ci --prefix diretoria` e `npm run --prefix diretoria build`. O site continua estático, sem exigir npm em produção. Dependências fixadas no lockfile e licenças preservadas no bundle.

`node --test tests/diretoria.test.mjs tests/diretoria-apms.test.mjs` cobre identidade, expiração, dinheiro, distinção financeira, réplicas, duplicidade de núcleo, filtros, ciclos, cobertura, demonstração e paginação. A suíte preexistente apresenta falhas também na revisão-base; não foram alteradas regras de pagamento para acomodar esses testes antigos.


## Integração APMs automática — critério atualizado em 27/11/2026

Por instrução do usuário, APMs agora carrega sem login adicional e inclui **somente o ganho do APM**. Vendedor e gerente não entram no BI desta frente. Pago continua significando apurado, conforme critério aprovado para a Diretoria; não há confirmação de transferência bancária na origem.

### Fonte resumida e atualização

A migração `apms_diretoria_resumo_sem_login`, registrada no Supabase, criou `public.apms_diretoria_resumo`: totais por competência, APM e filial. O SQL reproduzível está em `supabase/apms_diretoria_resumo.sql`.

A tabela contém apenas identificador/nome do APM, mês, filial/UF, contagem agregada, valor APM e datas do resumo. Não contém contratos, minutas, vendedores, gerentes, clientes, chassi, usuário, caminho de PDF ou evidências. A soma usa exclusivamente `apm_amount` do sistema de origem.

A carga inicial lê o histórico já lançado. Gatilhos privados recalculam o resumo após inserção, alteração ou exclusão de contratos e atualização das filiais. A publicação é transacional e serializada por advisory lock; nenhuma atualização altera os registros de origem. O gatilho é uma função SECURITY DEFINER no schema privado `fat_private`, com search_path vazio e EXECUTE revogado de PUBLIC, anon e authenticated. Não existe RPC público com privilégio elevado.

**Modelo de acesso aprovado:** os valores agregados são intencionalmente consultáveis sem autenticação, para atender ao pedido de não solicitar acesso. RLS da tabela resumida permite SELECT a anon/authenticated, sem INSERT/UPDATE/DELETE. O menu permanece visível somente no perfil Abel, mas a presença por nome não é uma barreira de autorização para a API resumida. Contratos, cadastros privados e evidências permanecem nas permissões originais do APMs. Nenhuma senha ou chave secreta foi publicada. A consulta não depende de sessão autenticada nem de dados armazenados no navegador.

### Componentes

- `services/apmsGateway.ts`: consulta automática paginada de `apms_diretoria_resumo`, com chave pública anon e cache no-store, sem chamadas de login ou acesso aos contratos.
- `services/apmMapping.ts`: `ApmResumoRow` e `mapApmCampanhaToBi` tipados; valor já agregado não é multiplicado por quantidade de contratos ou chassis. Chave mensal/APM/filial evita duplicações.
- `services/diretoriaBiService.ts`: composição do resumo APMs com as cinco fontes locais, preservando o perfil Abel na interface.
- `components/diretoria/DetalheApmCampanha.tsx`: valores por APM, evolução mensal, média por APM e filtros por filial/APM. Não há formulário de conexão nem lista de contratos nesta visão.

Demonstração continua explicitamente fictícia e separada dos dados reais. Falha de rede/mapeamento não adiciona estimativas nem subtotal incompleto. O botão Atualizar consulta os novos totais. O painel também consulta ao abrir e a cada 60 segundos enquanto visível, sem sobrepor consultas nem atualizar a demonstração.

### Validação

O banco e o gatilho foram conferidos: dois contratos, com R$400 de ganho APM; R$400 de indicação e R$180 de gerência ficam excluídos. Foi verificado que anon pode apenas ler o resumo, não inserir nele, ler contratos ou executar a função privada. Um UPDATE sem linhas nas filiais exercitou o gatilho sem modificar cadastros, mantendo R$400 no resumo.

`npm ci --prefix diretoria`, `npm run --prefix diretoria typecheck`, `npm run --prefix diretoria build` e `node --test tests/diretoria.test.mjs tests/diretoria-apms.test.mjs tests/seguranca.test.mjs` validam tipos, valores, filtros, paginação, perfil, acesso automático e exclusão das parcelas de vendedor/gerente.


## Atualização de escopo — todas as funções

O usuário corrigiu o critério: a frente APMs deve somar APM, vendedor e gerente. A migração complementar `apms_diretoria_incluir_vendedores_gerentes` adiciona `valor_vendedor` e `valor_gerente` ao resumo e atualiza a função privada/gatilhos para recalcular as três parcelas. SQL: `supabase/apms_diretoria_todas_parcelas.sql`. O histórico foi recalculado sem modificar contratos, e os próximos lançamentos alimentam automaticamente todas as parcelas.

O escopo vigente substitui a restrição anterior de considerar somente APM. Carregamento segue sem login adicional. O resumo público permanece agregado por competência/APM responsável/filial, sem nomes de vendedores/gerentes, minutas ou PDFs. A tabela detalha ganho APM, vendedores, gerentes e total da carteira; o total da carteira não é apresentado como remuneração pessoal do APM. A campanha entra no consolidado uma vez pelo total das três parcelas, sem repetir os valores individuais.

Validação atual: R$400 APMs + R$400 vendedores + R$180 gerentes = R$980. A perspectiva de pagamentos financeiros confirmados continua sem criar confirmações bancárias inexistentes.


## BI interativo e drill-down — 27/11/2026

A tela agora oferece consolidado e navegação por campanha com breadcrumb, filtros cruzados, ranking e ficha individual. O menu continua exclusivo do perfil Abel e mantém as permissões existentes das fontes.

### Arquitetura e contratos

- `services/diretoriaAnalyticsService.ts`: modelo analítico tipado, normalização, deduplicação, filtros, comparação temporal, grupos, rankings, extrato e demonstração. Verificado também com `strict:true` por `diretoria/tsconfig.analytics.json`.
- `services/diretoriaExportService.ts`: um único recorte para CSV, XLSX real (ExcelJS já carregado sob demanda no sistema), impressão executiva e extrato individual. CSV neutraliza fórmulas; HTML escapa textos; XLSX guarda valores monetários como números.
- `components/diretoria/AnalyticsCharts.tsx`: barras/rosca/área Recharts e alternativas de clique por teclado.
- `components/diretoria/BiCampanhaDetalhe.tsx`: cruzamento de mês/semana, cargo, filial, busca, ordenação e paginação visual do ranking.
- `components/diretoria/FichaColaborador.tsx`: diálogo nativo com foco contido, fechamento por Escape e extrato nos filtros atuais ou no histórico completo da campanha.
- `components/diretoria/BiInvestimentoCampanhas.tsx`: filtros globais e orquestração, macro e micro, cobertura e exportação.

O mapeamento financeiro local agora preserva também nome, cargo e filiais, sem alterar o motor de cálculo das campanhas. Garantia usa a descrição oficial do perfil; gestores e compras preservam seus vínculos de múltiplas unidades.

### Critérios matemáticos

Dinheiro é calculado em centavos inteiros. A chave financeira original deduplica revisões antes de agrupar pagamentos. Zero não gera pessoa bonificada. Pessoas são agrupadas por nome normalizado; não se presume que IDs de cadastros diferentes tenham correspondência global. Nomes idênticos de homônimos e mudanças de nome exigem um futuro identificador corporativo único para conciliação perfeita.

Premiações/ciclos recebidos são ciclos positivos distintos por campanha e pessoa. Média por ciclo é total dividido pelos ciclos recebidos. Média mensal usa o número de meses do intervalo, incluindo lacunas, não apenas meses com pagamento. Ano atual compara os mesmos meses do ano anterior; últimos seis meses e mês específico usam a janela anterior equivalente. Com base anterior zero/ausente, a variação percentual fica sem base comparável, em vez de inventar percentual.

Filiais de núcleo ficam em categoria conjunta, sem rateio nem dupla contagem no gráfico. Filtro de uma filial inclui pagamentos associados ao seu núcleo integral, explicitado na interface. Matriz corresponde a Ananindeua e núcleos vinculados; Regionais exclui os núcleos que contêm a matriz.

### Limites explícitos das fontes

O resumo automático APMs continua somando as três parcelas (R$400 + R$400 + R$180 no histórico conferido). Para o ranking, a parcela do APM é atribuída ao APM identificado; vendedor e gerente continuam em totais agregados, sem nomes fictícios nem atribuição desses ganhos ao APM responsável. Não foram ampliadas permissões públicas para expor nomes/contratos protegidos. O investimento e o gráfico por função incluem esses totais; contagem de pessoas os exclui e ticket completo fica indisponível quando falta identidade, com ticket dos identificados apresentado separadamente.

Garantia e Compras permanecem protegidas conforme as sessões/senhas já existentes. Clicar abre a análise com indicação de cobertura; dados reais indisponíveis não são substituídos por mock. Uma campanha com dados financeiros incompatíveis é excluída inteira da consolidação, em vez de apresentar um subtotal incorreto. O serviço não grava dados operacionais ou financeiros.

### Demonstração e exportação

A opção Ver demonstração gera 72 pessoas, seis campanhas, múltiplos cargos e filiais e seis meses móveis; Pix contém quatro semanas por mês. É isolada em memória, explicitamente fictícia, sem gravações no Supabase. Exportações de demonstração levam aviso e prefixo no nome do arquivo.

CSV, Excel e PDF respeitam todos os filtros, busca e ordenação, exportando também as linhas fora da página visual de 25 registros. Totais agregados sem nomes estão separados e entram uma vez na soma. XLSX contém ranking/resumo e extrato filtrado em abas distintas. Imprimir abre relatório executivo com os filtros descritos e permite salvar em PDF pelo navegador; não baixa nem anexa evidências/PDFs antigos.

### Validação

`npm run --prefix diretoria typecheck` verifica TypeScript geral e o serviço analítico em modo estrito. `node --test tests/diretoria-analytics.test.mjs tests/diretoria.test.mjs tests/diretoria-apms.test.mjs tests/seguranca.test.mjs` cobre cálculo, filtros, períodos, comparação anual, núcleo, ranking, ficha, cobertura, dados agregados, demonstração, CSV/HTML e compatibilidade.

`scripts/diretoria-drilldown-qa.cjs` é o cenário de navegador com transporte financeiro controlado, sem escritas no banco: testa clique no SVG, seis campanhas, filtros globais/locais, semana, busca, ficha e histórico, ordenação, CSV, XLSX real com leitura dos números/ordem via ExcelJS, popup PDF, modo demonstração e largura móvel. Requer Playwright disponível no ambiente e `BI_QA_DEPS` apontando a um node_modules com @sparticuz/chromium e exceljs 4.4.0 (padrão de execução /tmp/bi-exec-qa/node_modules). Os artefatos de QA são temporários e não pertencem aos dados oficiais.

A conferência final com as consultas reais preservou R$659.370 nas fontes locais disponíveis, com 1.101 registros identificados por nome/cargo/filial. Com R$980 de APMs, o investimento conhecido permanece em R$660.350. Garantia e Compras foram corretamente sinalizadas como protegidas. Nenhuma permissão de leitura nominal de APMs foi ampliada nesta evolução. Impressão nativa do BI usa o marcador `data-native-print` para evitar download desnecessário de jsPDF/AutoTable e preservar a abertura do relatório pelo clique do usuário.
