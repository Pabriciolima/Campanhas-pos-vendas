# Inserção: coluna única e importação

A matriz de acompanhamento exibe somente Inserção %. As contagens C/NC são internas e continuam disponíveis para conferência e consolidação, sem acrescentar colunas à tabela. O cartão de importação chama-se Inserção %; o modelo CSV também oferece somente esse percentual, além de escopo e competência.

O arquivo Controle de Malote e Divergência FisicoxFiscal.xlsx é reconhecido pela matriz DN, datas, TOTAL DE C, TOTAL DE NC, TOTAL e %. Na aba Planilha1 recebida, os cabeçalhos de datas identificam setembro/2026. O título da outra aba, SETEMBRO 2026, não é usado para presumir o período de seus registros detalhados de malote, que incluem 2025. Essa aba não alimenta Inserção.

A importação considera somente as datas da competência selecionada. Para matriz de um único mês, compara C/NC contados, totais e percentual salvo na planilha. Para matriz com mais de um mês, calcula apenas pelas marcações C/NC das datas selecionadas. Campos ausentes, estados diferentes de C/NC, duplicidade de DN, totais ou percentuais divergentes e ausência de datas do mês impedem a aplicação. Não há execução de fórmulas arbitrárias.

DNs compartilhados exigem confirmação explícita do destino:

- 4730: Teresina ou Uruçuí, ou resultado compartilhado entre ambas.
- 4774: Rondonópolis ou Água Boa, ou resultado compartilhado entre ambas.
- 4977: Porto Velho ou Ji-Paraná, ou resultado compartilhado entre ambas.

A confirmação não assume equivalência entre duas filiais pelo DN. Os vínculos escolhidos ficam descritos nos avisos/histórico da importação. Filiais não vinculadas preservam seus dados anteriores; não recebem zero nem 100% presumido. Cadastros novos sem dados permanecem pendentes.

GERAL utiliza cada amostra de DN uma única vez. Quando o usuário autoriza compartilhar um DN, seus resultados podem aparecer nas duas filiais, mas não são duplicados no total da fonte. Analistas somam as amostras dos DNs distintos associados às unidades vinculadas, quando todas têm origem definida. Outras métricas, incluindo malote, não são alteradas.

Validação: 48 testes do projeto aprovados e teste no navegador com o arquivo real. Conferidos a coluna única, os três vínculos obrigatórios, a seleção explícita das duas filiais em cada par para o cenário de teste, 13 filiais preenchidas e GERAL com 40 conformes/0 não conformes, sem multiplicar amostras compartilhadas. O cenário de teste não configura os vínculos automaticamente para o usuário.
