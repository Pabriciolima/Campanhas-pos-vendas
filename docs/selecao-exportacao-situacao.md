# Equipe por situação na exportação

O dropdown usa resultados apurados da competência selecionada, vinculados ao cadastro por funcionarioId quando disponível. Mostra habilitados, não habilitados ou todos os participantes com lançamentos compatíveis. No PIX considera também a semana da opção Habilitados S1–S4. Uma pessoa pode aparecer nas duas situações se tiver semanas com resultados diferentes; cada exportação inclui somente as linhas da situação e semana escolhidas.

A seleção reinicia ao trocar situação, mês, filial ou campanha. O filtro aplicado ao arquivo repete as condições de competência/situação/semana e as marcações nominais; não depende apenas da lista visual. Acrescentada opção Somente não habilitados nos relatórios das duas campanhas, com rótulo correspondente no arquivo. Nenhum lançamento ou regra de cálculo é alterado.

Visual refinado com linhas compactas, iniciais e destaque dos selecionados. Dois testes passaram em Chromium, incluindo habilitados/não habilitados/semana, duas marcações, todas as filiais, contexto e tamanhos 1366/768/390. Sintaxe dos arquivos modificados conferida.
