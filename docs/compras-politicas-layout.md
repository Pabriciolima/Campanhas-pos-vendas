# Políticas de Compras — organização visual

Cartões comparáveis com meta, valor, forma de rateio, benefício e condição de não pagamento. Potencial mensal de R$ 1.200 condicionado ao cumprimento das quatro verbas de R$ 300 (A, B, obsolescência e O.S.). Consequências destacadas em vermelho, sem criar multas nem alterar cálculos. Exemplos, critérios de casas e origens dos arquivos ficam em detalhes nativos recolhidos.

Referências consultadas em 30/10/2026:
- https://design-system.service.gov.uk/components/summary-list/ — listas de fatos organizadas em cartões comparáveis.
- https://design-system.service.gov.uk/components/warning-text/ — destacar consequências importantes com rótulo e ícone, sem depender apenas da cor.
- https://design.gitlab.com/patterns/progressive-disclosure/ — conteúdo essencial visível e detalhes adicionais sob demanda.

Implementação em HTML semântico e CSS exclusivo da tela. Sem bibliotecas, fontes ou requisições externas adicionais. Cabeçalho global duplicado oculto somente na página de políticas. Políticas aplicadas à base de responsáveis sem fixar nomes na descrição.

Validação: 41 testes de Compras aprovados; fluxo completo em navegador com API/banco simulado, totais e exportações preservados; quatro cartões, quatro benefícios e quatro bloqueios visíveis; potencial de R$ 1.200; detalhes fechados por padrão e abertura pelo teclado; oito combinações claro/escuro e 390/768/1366/1920 pixels sem transbordamento horizontal. Capturas claro/escuro inspecionadas visualmente.
