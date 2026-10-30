# Compras — terceiro indicador: O.S. aguardando Central de Compras

## Fonte e contagem

Importação de `ANÁLISE DE O.S.xlsx`, aba selecionada pelo usuário:

- A / EMPRESA: filial.
- C / NRO_OS: identificador da O.S.
- J / JUSTIFICATIVA: motivo atual.

Cada O.S. é contada uma vez por filial. Uma O.S. com o mesmo número em outra filial é independente. Duplicações idênticas são unificadas; justificativas divergentes para a mesma O.S./filial bloqueiam a importação. Totais e notas de filtros são ignorados. Justificativa vazia entra no total como NÃO INFORMADA.

Motivos reconhecidos para o indicador: AGUARDANDO PEÇAS - DEPTO COMPRAS, AGUARDANDO CENTRAL DE COMPRAS e AGUARDANDO COMPRAS. Estoque, Garantia e outros setores não entram no numerador de Compras.

Somente os totais e motivos agregados são persistidos: dados de clientes, consultores e valores das ordens não são enviados pelo novo importador.

## Regra

`Percentual da filial = aguardando Compras / total de O.S. abertas da filial × 100`.

`Média do colaborador = soma dos percentuais das suas filiais / quantidade de filiais cadastradas`.

É uma média simples, sem ponderação pelo volume de O.S. Bônus de R$ 300,00, uma única vez por colaborador no mês, quando todas as filiais estão informadas e a média é menor ou igual a 10%. Percentuais completos são usados na decisão; o arredondamento é apenas visual.

Filial ausente não vira 0%. Exibe a média parcial e a cobertura, mas mantém a bonificação pendente. O resumo global legado não substitui a apuração por filial.

## Interface e relatórios

- Prévia antes de salvar, ranking na Visão Geral e Apuração.
- Filtros por colaborador e filial, quantidade e percentual de todos os motivos, com destaque para Central de Compras.
- Detalhamento dos denominadores por filial e média/cobertura na apuração individual.
- Excel: RANKING JUSTIFICATIVAS e OS POR FILIAL, além da apuração.
- PDF: detalhamento por filial e ranking de motivos.
- Reimportar a mesma métrica/mês substitui somente O.S.; A/B e obsolescência são preservados.
- A planilha não informa a competência do levantamento; o usuário deve selecionar o mês correto antes de confirmar.

## Validação

40 testes automatizados de Compras; parser, nomes das filiais, justificativas, limites, média simples, dados ausentes e duplicidades. Fluxo de navegador com a planilha real em servidor simulado: prévia, salvamento atômico, apuração, sincronização entre dois contextos, Excel/PDF e larguras 390/1366. Nenhum dado de teste foi lançado em produção.
