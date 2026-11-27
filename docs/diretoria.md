# Diretoria — investimento histórico por campanha

A aba aparece para o perfil de presença Abel (ou Abel seguido do sobrenome), enquanto a sessão de oito horas estiver válida. Trocar de perfil remove a aba e desmonta o painel. O formulário de presença não é autenticação de identidade; essa regra controla a interface e não substitui autorização no servidor. As políticas RLS e as senhas de Garantia e Compras continuam vigentes.

## Critério financeiro aprovado

**Pago neste painel corresponde à bonificação apurada**, conforme orientação de Pabricio em 27/11/2026. Essa é a perspectiva padrão. A perspectiva alternativa “Pagos confirmados” exige uma confirmação explícita no registro (`pago`, `pagamentoConfirmado`, `statusPagamento` ou `pagamento.status`). Habilitado/validado não cria confirmação financeira. O módulo não grava pagamentos, cadastros ou valores financeiros.

## Estrutura

- `components/diretoria/BiInvestimentoCampanhas.tsx`: filtros, KPIs, gráficos Recharts, tabela e cobertura.
- `components/diretoria/mount.tsx`: montagem/desmontagem React.
- `diretoria/bootstrap.js`: navegação e identificação dinâmica.
- `diretoria/core.mjs`: normalização, centavos inteiros, deduplicação, filtros e consolidação pura.
- `diretoria/data.js`: consultas e adaptação às cinco campanhas; `pagination.mjs` pagina leituras acima de mil linhas.
- `diretoria/diretoria.css`: estilos isolados, responsividade e preferência por movimento reduzido.
- `assets/diretoria-bi.js`: bundle estático React/Recharts, carregado somente ao abrir o painel.

Para novos blocos (evolução, filiais, ROI), criar componentes separados e reutilizar os registros normalizados. Não somar indicadores operacionais como faturamento ao investimento em bonificações.

## Fontes e limites

Pix e Oficina consultam todo o histórico disponível no Supabase, independentemente dos filtros da tela anterior, e executam os motores oficiais; Oficina inclui gestores automáticos e Pix exclui réplicas do núcleo. CRM reconstrói competências com os cadastros disponíveis e respeita correções manuais. Cadastro atual não equivale a um snapshot histórico da equipe: alterações de cadastro/política podem alterar uma reconstrução. Garantia inclui apurações validadas; Compras usa o cálculo oficial e ajustes existentes. Ambos exigem sessão válida do módulo e não solicitam nem usam senhas padrão.

A tabela explicita indisponibilidade/proteção de cada campanha; essas fontes não são apresentadas como zero real. Primeiro registro corresponde à criação disponível, com fallback para o início da competência mais antiga, não à data comprovada de implantação da campanha. Pix conta semanas como ciclos; outras campanhas contam competências mensais.

A demonstração é opt-in, identificada como fictícia, mantida somente em memória e totalmente separada do banco e dos totais oficiais. Não são criados registros fictícios em produção.

## Build e validação

`npm ci --prefix diretoria` e `npm run --prefix diretoria build`. O site continua estático, sem exigir npm em produção. Dependências fixadas no lockfile e licenças preservadas no bundle.

`node --test tests/diretoria.test.mjs` cobre identidade, expiração, dinheiro, distinção financeira, réplicas, duplicidade de núcleo, filtros, ciclos, cobertura, demonstração e paginação. A suíte preexistente apresenta falhas também na revisão-base; não foram alteradas regras de pagamento para acomodar esses testes antigos.
