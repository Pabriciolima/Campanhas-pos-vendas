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


## Integração APMs — 27/11/2026

A sexta frente, Campanhas APMs, consulta a campanha ativa do Fatura APMS no mesmo projeto Supabase, nas tabelas `apms_campaign_claims`, `apms_campaign_branches` e `apms_campaign_members`. Não consulta faturamento/propostas como investimento e não copia evidências/PDFs.

- `services/diretoriaBiService.ts`: composição assíncrona das fontes locais e APMs e demonstração isolada.
- `services/apmMapping.ts`: contrato de dados tipado, `mapApmCampanhaToBi`, deduplicação, filtros e métricas por período/filial/pessoa.
- `services/apmsGateway.ts`: cliente Supabase isolado, autenticação APMs e leitura paginada de colunas explícitas. Chave exclusivamente pública anon em `apmsConfig.ts`.
- `components/diretoria/DetalheApmCampanha.tsx`: evolução mensal, distribuição por filial, KPIs, bonificações por função e contratos, mantendo as três parcelas de cada contrato.

**Acesso:** no perfil Abel, clicar em Detalhar APMs → Conectar APMs e usar uma conta administrativa já existente do sistema APMs. A identificação de presença Abel controla a interface, mas não concede privilégios na base APMs. A identidade é confirmada com `auth.getUser()` e o vínculo administrativo é consultado na tabela sob RLS. Contas regionais são recusadas para impedir um consolidado incompleto apresentado como total. Não são criados usuários nem alteradas permissões/RLS.

O cliente não reutiliza nem altera a sessão dos outros módulos: `persistSession:false`, `autoRefreshToken:false`, refresh quando necessário antes da consulta. A senha não é guardada; a sessão fica em memória da página até desconexão, troca de perfil ou recarregamento. Desconectar apaga imediatamente APMs dos totais na tela, mesmo se outra fonte demorar para atualizar. Nenhuma credencial é adicionada a localStorage/sessionStorage.

**Cálculo:** usa os valores gerados pela base: `apm_amount + seller_amount + manager_amount`, uma vez por contrato, sem multiplicar pelos chassis. A chave normaliza a minuta e a competência; o banco de origem já exige minuta única. Mapeamento incompleto, falha de consulta ou de vínculo exclui a fonte inteira do consolidado em vez de adicionar um subtotal ou valores fictícios. Registros cancelados/excluídos, se recebidos por versões futuras da fonte, são desconsiderados pelo mapeador.

As pessoas são contadas por nome normalizado da fonte; a origem não possui identificadores de beneficiário distintos dos nomes. Homônimos podem exigir futura integração ao cadastro de pessoas. O ticket por pessoa divide o total do período/filial selecionados pelas pessoas únicas contempladas. Uma pessoa em vários contratos é contada uma vez, mantendo todas as suas bonificações. Ciclos APMs são competências mensais.

A base atual registra apurações, não transferências bancárias. O padrão aprovado continua sendo pago = apurado. A perspectiva financeira confirmada não cria confirmações inexistentes. Evolução mensal apresenta a apuração e, quando há confirmação explicitamente fornecida pelo mapeamento, a respectiva série financeira.

**Verificação:** estrutura e total lidos diretamente no banco: 2 contratos de novembro/2026, R$400 APMs + R$400 indicações + R$180 gerência = R$980. Testes cobrem permissões, duplicidade, chassis, falhas e separação dos dados fictícios. Teste de navegador com transporte controlado cobre conexão administrativa, recusa de operador, filtros, gráficos, logout e layout móvel. Sem credenciais de usuário, não se presume uma sessão administrativa real no navegador de teste.

Build: `npm ci --prefix diretoria`, `npm run --prefix diretoria typecheck` e `npm run --prefix diretoria build`. A verificação TypeScript inclui o serviço e os componentes da Diretoria. Novos blocos devem reutilizar a camada normalizada sem somar novamente as parcelas APM, vendedor e gerente ao investimento já consolidado por contrato.
