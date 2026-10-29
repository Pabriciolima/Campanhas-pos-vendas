# Design Mônaco — revisão de 29/10/2026

Referência solicitada: https://oviniciusplyai.com/post.html?p=apple-design-prompt

O artigo orienta estudar o projeto, consultar as HIG, priorizar usabilidade, definir uma direção coerente, implementar e verificar. O sistema é uma aplicação web de apuração financeira; preserva a identidade Mônaco e os estados semânticos das campanhas.

## Direção e implementação

- `monaco-design-system.css`: fonte nativa do dispositivo, hierarquia tipográfica, espaçamento, cartões, campos, navegação, foco e estados de interação compartilhados.
- Claro: superfícies brancas sobre cinza suave; escuro: grafite, texto claro e contraste reforçado.
- Transparência somente na navegação. Tabelas e cartões de dados permanecem opacos.
- Font stack `-apple-system`, `BlinkMacSystemFont`, Segoe UI e alternativas locais. Nenhum arquivo de fonte ou símbolo proprietário Apple é redistribuído.
- Feedback de pressão, foco visível, alvos de toque de pelo menos 44px em ponteiros de toque, respeito a redução de movimento, transparência e aumento de contraste.
- A folha é carregada com `media="screen"`: a apresentação dos relatórios impressos não é alterada.
- Cores de indicadores, descontos, alertas e bonificações são mantidas. Nenhum cálculo, lançamento, API ou permissão foi modificado.

## Problemas tratados

Fontes e densidade inconsistentes entre módulos, excessos de sombras/gradientes nos controles, diferença visual entre painéis, campos com hierarquia fraca e navegação sem estados de foco uniformes. Controles e superfícies agora compartilham tokens e estados.

## Referências oficiais consultadas

- https://developer.apple.com/design/human-interface-guidelines/
- https://developer.apple.com/design/human-interface-guidelines/color
- https://developer.apple.com/design/human-interface-guidelines/materials
- https://developer.apple.com/fonts/index.html

## Verificações

- Fluxo de Compras em banco simulado: importação, apuração, atualização em outro contexto, Excel/PDF, edição e Escape; valores e regras preservados.
- Compras: claro e escuro, larguras 390, 768, 1366 e 1920, sem transbordamento horizontal da página.
- Garantia: painel, lançamentos, detalhes sob demanda, modo claro/escuro, 390 e 1366.
- PIX: 16 combinações de tema/largura, incluindo cartões responsivos e acesso às colunas congeladas de status e ações.
- 34 testes de Compras aprovados.

As verificações de interface usam dados de teste e não gravam em produção. Não equivalem a certificação integral de acessibilidade ou a teste de todos os fluxos de cada módulo.
