# Correção vigente — metas por marca

Fiat: índice atual ≤ 5,0. Diesel: índice atual ≤ 4,0. Jeep RAM mantém o limite anterior de 4,0, pois não foi incluída na alteração solicitada. Aplica-se a analistas e assistentes, por casa, sem arredondar o índice para decidir. R$ 300 rateados entre todas as casas continuam preservados. A comparação mensal é informativa. Os dados armazenados não são substituídos: a apuração e a média da liderança são recalculadas pelas novas metas.

60 testes aprovados. Navegador: importação da planilha de cobertura, meta por casa, ganhos, média de Bruno/Ricardo, sincronização e exportações verificados com banco simulado.


## Importação

Nova opção Cobertura de estoque. A identificação automática reconhece o cabeçalho Empresa/Cobertura e os meses. Localiza a coluna Cobertura dentro de cada bloco mensal; não usa Valor nem Excedente. Recusa mês ausente no arquivo. Ignora linhas Total dos núcleos e total geral, evita duplicação de empresas. Registra linha e colunas de origem, índice atual, mês anterior e competência da comparação. A importação grava somente a competência selecionada; os valores históricos do mesmo arquivo ficam como evidência de comparação, sem substituir outros meses.

No arquivo fornecido: outubro usa AD, setembro AA. São 22 casas válidas. Cuiabá tem índice ligeiramente maior que 4 e não atinge a meta, embora uma exibição arredondada possa sugerir 4,00. Cabeçalhos determinam as colunas, sem fixar posições no código.

Salvar usa a operação atômica existente no banco. Substitui apenas cobertura do mesmo mês, preservando A/B, O.S., obsolescência e demais meses. Cadastros e outras campanhas não são alterados. Prévia não grava até confirmação.

## Apresentação

Visão geral e apuração somam o bônus real de cobertura no total. Aba Cobertura na conferência por casa, com valores anterior/atual, evolução, parcela, ganho, status e origem. Excel: campos de bônus/status na apuração e aba COBERTURA POR CASA. PDF: critérios e tabela por colaborador/casa. Políticas e cartões de importação atualizados. Correções manuais dos outros indicadores preservam o bônus calculado de cobertura.

## Verificação

60 testes aprovados: limites exatos 5/4, precisão original, casas Fiat/Diesel na mesma cidade, Jeep preservado, centavos e orçamento. Teste no navegador com a planilha real em banco simulado: importação, metas por casa, bônus, liderança, Excel/PDF, sincronização e responsividade. Nenhum dado de teste foi inserido na produção.
