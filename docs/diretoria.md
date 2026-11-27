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
