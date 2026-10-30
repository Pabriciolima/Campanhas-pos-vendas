# Apuração de Compras — organização visual

## Referências pesquisadas

- Carbon Design System: https://www.carbondesignsystem.com/building-blocks/core/components/data-table/guidelines
- GitLab Pajamas, divulgação progressiva: https://design.gitlab.com/patterns/progressive-disclosure/

A direção prioriza resultados, comparações e detalhes acionados pelo usuário. Mantém a identidade Mônaco e o tema compartilhado existente.

## Problemas e decisões

A tabela anterior reunia dezenas de cartões de casas dentro de uma única célula, tornando cada linha muito alta. O ranking e a evolução apareciam antes do pagamento dos colaboradores. O cabeçalho compartilhado repetia os controles específicos do módulo.

A apuração agora começa pelo total do mês, quantidade com bonificação e pendências de histórico/filiais. Cada colaborador possui um resumo com o total e três indicadores separados. A conferência abre sob demanda, com abas de A/B, obsolescência e O.S. Cada aba tem somente os dados e ganhos do próprio indicador. Ranking, evolução e evidências são acessíveis em painéis recolhíveis abaixo dos resultados.

Busca por nome sem diferenciar acentos, filtros de bonificação e estado sem resultados. Na Apuração, os filtros também selecionam os colaboradores e os rankings calculados nos relatórios. Os anexos originais de evidência são mantidos. O total do mês permanece identificado como consolidado mensal; a contagem informa quantos colaboradores estão sendo exibidos.

A Visão Geral recebe o mesmo resumo por colaborador. Seu comportamento de exportação continua independente dos filtros usados na página de Apuração.

## Preservação e acessibilidade

Os valores vêm da apuração existente: não há novas regras de bônus, alteração do banco ou migração de registros. Ajustes manuais permanecem sinalizados. Abas têm relações ARIA, seleção e navegação por setas/Home/End; acordeões usam details/summary nativos. A atualização dos dados mantém a conferência aberta e a aba escolhida. Tabelas largas rolam dentro do próprio detalhe. A folha de estilo é exclusiva de tela e da apresentação de Compras.

## Verificações

- 41 testes automatizados, incluindo busca, filtros e preservação de valores.
- Importação A/B e O.S. com fonte real em servidor simulado; mesmos totais antes/depois do redesign.
- Atualização em segundo contexto de navegador.
- Busca com acentos, sem resultados, filtro sem bônus e Excel limitado ao colaborador/filiais selecionados.
- Conferência por abas, teclado, conservação da aba após atualização e modal de edição/Escape.
- Claro/escuro; 390, 768, 1366 e 1920 pixels; sem transbordamento da página.

Os testes de importação e interface não alteram dados de produção.
