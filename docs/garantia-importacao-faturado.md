# Importação de Faturado R$

O primeiro campo de importação em Lançamentos é **Faturado R$ — base do recebimento**. Selecione o arquivo OS's Faturadas por Empresa.xlsx, clique em Importar e preencher, confira a prévia e confirme o OK. A tabela permanece somente para consulta, sem campos de digitação adicionados na versão anterior.

Estrutura reconhecida: DES_NEGOCIO, DES_NUCLEO, EMPRESA - Abrev. e Total OS Encerrada. Neste relatório confirmado, Total OS Encerrada contém o valor monetário que alimenta valorFaturado, e não a quantidade de notas/O.S. Os filtros Ano e NomeMês devem identificar uma competência única e igual à selecionada no sistema. O parser não presume o período pelo nome do arquivo.

Filiais são identificadas pelo nome, com Belém normalizado para Ananindeua. Água Boa e Rondonópolis continuam distintas mesmo com DN compartilhado. Valores são arredondados para centavos; recebimento e quantidade de notas são preservados. GERAL é calculado somente quando as 13 filiais estão presentes; os analistas recebem a soma das respectivas unidades completas. Relatórios parciais mantêm os consolidados dependentes sinalizados para revisão.

O formato também é reconhecido na entrada automática. CSVs e outros layouts tabulares podem ser mapeados no mesmo cartão, com coluna competência obrigatória. Filiais desconhecidas/duplicadas, valores inválidos, ausência de período ou diferença de mês impedem a aplicação. Origem por aba/célula e exclusão de importações seguem o fluxo existente.

Validação: 45 testes do projeto aprovados e teste no navegador com o arquivo real, conferindo primeiro seletor, ausência de campos manuais, 13 filiais, centavos, preservação de recebimento/notas, recálculo percentual e viewport móvel. Dados financeiros seguem a persistência existente: localmente e, quando a sessão de sincronização estiver aberta, no registro criptografado do Supabase. Nenhum projeto, tabela ou bucket foi criado.
