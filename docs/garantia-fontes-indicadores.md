# Reconhecimento das fontes de Garantia

## Entrada e leitura

Em Lançamentos, use **Importar arquivo bruto — identificar automaticamente**. Selecione XLS/XLSX e clique em **Identificar arquivo e conferir**. A estrutura interna determina o tipo, sem depender do nome do arquivo. A prévia informa a competência, destinos, valores, origens e percentuais possíveis. Só o OK aplica dados e recalcula a bonificação.

Formatos reconhecidos: resumo mensal de recebimentos com Crédito Líquido; base ABERTAS/FECHADAS para contagem de O.S.; campanha completa com Validação e Bonificação da equipe. Arquivos não reconhecidos não são aplicados. Outros formatos continuam usando o mapeamento do cartão específico até que seus relatórios brutos sejam analisados.

## Mapa de indicadores

| Indicador | Origem confirmada / situação | Tratamento |
|---|---|---|
| Valor recebido | 02 - RECEBIMENTOS GARANTIA E REVISÃO 2026 (3).xlsx, aba do mês, Crédito Líquido | Resumo mensal por nome da filial, conferido com TOTAL. Não soma novamente o bloco semanal, não usa bruto como faturamento. |
| Faturamento em reais para recebimento | Validação da campanha, coluna B; relatório bruto financeiro ainda não identificado | Preserva a base existente. Se faltar, percentual pendente. |
| Percentual recebido | Valor recebido / faturamento em reais × 100 | Calculado com os valores do mesmo escopo e competência. Total usa soma dos valores, nunca média simples de percentuais. |
| Notas / O.S. abertas e fechadas | Base ABERTAS/FECHADAS já analisada | Conta registros de acordo com Emissão/Fatura do mês, sem somar valores monetários. |
| Inserção | Validação J ou amostras conformes/não conformes | Leitor da campanha e mapeamento disponíveis; bruto próprio ainda não identificado. |
| Malote | Validação L/M, quantidade de processos e conformidade | Quantidade e percentual distintos. Relatório bruto próprio ainda não identificado. |
| Cancelamento de notas | Estrutura O/P preservada | Atualmente não cobrado. Informativo, sem desconto na bonificação. A referência histórica de desempenho permanece separada do pagamento. |
| Devolutivas | Validação R/S/T | Base faturada, quantidade, percentual e penalidade de 30% quando >5%. |
| Frete | Validação W | Pendências elegíveis, penalidade de 20% quando houver. Exclui o mês anterior conforme regra existente. |
| Erros Sivolks | Validação Z/AA/AB/AC | Posição SG, erros brutos, erros válidos, percentual e penalidade de 30% a partir de 5%. |
| Divergência físico × fiscal | Validação AF | Percentual e referência de penalidade de 30% quando >5%. |
| Arquivamento | Validação AH/AI | Pendências NF e SG, com regras por perfil e não aplicabilidade preservadas. |

As demais fontes brutas não foram presumidas a partir do arquivo de recebimentos. Células vazias permanecem pendentes; quantidade de notas e valor faturado em reais não são intercambiáveis.

## Conferência do recebimento real de setembro/2026

Setembro!I6:I18 alimenta o recebido de 13 filiais; I19 é o total. Conferido R$ 2.680.636,00, incluindo Belém R$ 403.899,39. Os valores coincidem com a coluna C7:C19 da Validação enviada. Belém tem base R$ 489.547,00 na campanha e percentual 82,50% (arredondado). A base não foi encontrada no arquivo bruto de recebimentos e não é inferida do Crédito Bruto. O arquivo contém histórico de outros anos e BD.BI com recortes diferentes: não são usados para substituir o resumo mensal selecionado.

O parser confere ano, mês, filiais duplicadas/desconhecidas, total e, quando os cabeçalhos correspondentes estão presentes, líquido = bruto − estornos. Usa valores calculados salvos no Excel; se uma fórmula não tiver resultado válido, solicita revisão em vez de executar fórmulas arbitrárias. Valores monetários são normalizados para centavos.

## Rastreabilidade

A origem é guardada por campo, com arquivo, aba e célula. A prévia de recebimento exibe a base já cadastrada, recebido a aplicar, percentual e origem. Passe o ponteiro sobre as células preenchidas da tabela para consultar a origem. Atualizações parciais preservam as fontes dos outros campos; edição manual atualiza sua origem.

Teste com os dois anexos reais no navegador: importação isolada sem denominador, campanha completa e reimportação do recebido. As 13 filiais foram conciliadas, mantendo faturamento-base e contagens de notas. Testes adicionais cobrem reconhecimento por estrutura, formato desconhecido, divergência bruto/estornos/líquido e atualização das fontes por campo.
