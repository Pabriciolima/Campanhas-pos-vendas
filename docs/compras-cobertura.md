# Cobertura de estoque — meta aprovada <= 4

Vigência: outubro/2026 em diante. Correção de escopo confirmada pelo usuário: o limite 4 aplica-se somente a assistentes. Assistentes têm R$ 300 por pessoa divididos entre todas as suas casas cadastradas. Cada casa recebe sua parcela quando a cobertura atual é menor ou igual a 4. Para analistas, a verba prevista permanece R$ 300, mas sua regra não foi informada: dados visíveis, bônus R$ 0 e status de regra pendente. Não se presume critério de redução nem se aplica o limite do assistente ao analista. A comparação com o mês anterior mostra evolução; não é condição adicional de redução. Estar reduzindo, mas continuar acima de 4, não gera bônus. Índice atual ausente não vira zero e não bonifica. A meta considera a precisão original, sem arredondamento. Não é percentual.

## Importação

Nova opção Cobertura de estoque. A identificação automática reconhece o cabeçalho Empresa/Cobertura e os meses. Localiza a coluna Cobertura dentro de cada bloco mensal; não usa Valor nem Excedente. Recusa mês ausente no arquivo. Ignora linhas Total dos núcleos e total geral, evita duplicação de empresas. Registra linha e colunas de origem, índice atual, mês anterior e competência da comparação. A importação grava somente a competência selecionada; os valores históricos do mesmo arquivo ficam como evidência de comparação, sem substituir outros meses.

No arquivo fornecido: outubro usa AD, setembro AA. São 22 casas válidas. Cuiabá tem índice ligeiramente maior que 4 e não atinge a meta, embora uma exibição arredondada possa sugerir 4,00. Cabeçalhos determinam as colunas, sem fixar posições no código.

Salvar usa a operação atômica existente no banco. Substitui apenas cobertura do mesmo mês, preservando A/B, O.S., obsolescência e demais meses. Cadastros e outras campanhas não são alterados. Prévia não grava até confirmação.

## Apresentação

Visão geral e apuração somam o bônus real de cobertura no total. Aba Cobertura na conferência por casa, com valores anterior/atual, evolução, parcela, ganho, status e origem. Excel: campos de bônus/status na apuração e aba COBERTURA POR CASA. PDF: critérios e tabela por colaborador/casa. Políticas e cartões de importação atualizados. Correções manuais dos outros indicadores preservam o bônus calculado de cobertura.

## Verificação

54 testes aprovados, incluindo a proporção aprovada: A/B R$ 400 para analistas e R$ 225 para assistentes; O.S. R$ 200/R$ 375; obsolescência e cobertura R$ 300 para cada pessoa. Orçamento potencial de R$ 2.100 por indicador e R$ 8.400 no total, R$ 1.200 por pessoa. Incluem meta 4, valor imediatamente acima, ausências, aumento ainda dentro da meta, redução ainda acima da meta, preservação dos outros indicadores e fechamento em R$ 1.200. Teste em navegador com a planilha real e banco simulado: 22 linhas, AA/AD, três casas na meta; bônus de R$ 85,71 para Rone e R$ 50 para João no cenário de teste; Jéssica/Gabriel e demais analistas ficam com cobertura zerada e regra pendente. Mês ausente bloqueia, gravação única, prévia, aba individual, Excel e sincronização em segundo contexto verificados. Não foram inseridos dados de teste na produção.
