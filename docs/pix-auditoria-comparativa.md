# Pix — evidência nominal obrigatória antes do pagamento

## Regra vigente

Todo lançamento começa com pagamento pendente, antes de qualquer OCR. O valor calculado pela política permanece preservado, mas o total disponível a pagar é zero e o status é **PENDENTE DE PAGAMENTO**. O motivo orienta a anexar evidência com o nome completo do colaborador. Uma confirmação digitada no formulário, o nome do arquivo ou um total genérico de unidade não liberam valores.

A liberação exige evidência legível na mesma competência, semana e filial, identificação do nome completo no conteúdo reconhecido e comparação dos indicadores utilizados. A semana 4 também exige comprovação de NPS e O.S. em aberto quando aplicáveis, inclusive quando o prêmio decorre apenas do NPS. A existência de uma evidência não torna automaticamente elegível quem não cumpriu a política.

Os cálculos originais são preservados em `bonusFinalAntesAuditoria` e `statusAntesAuditoria`. Se a conferência é válida, a política original volta a determinar o pagamento. Divergências confirmadas mostram **CORRIGIR PENDÊNCIA**. Ausência, nome diferente, imagem ilegível ou indicadores incompletos mostram **PENDENTE DE PAGAMENTO**. Ambos ficam vermelhos e fora dos habilitados, com total disponível zero.

## Identidade e escopo

O nome completo deve aparecer no texto da imagem. Um nome cortado em uma linha só pode ser associado se o documento também permitir reconhecer o nome completo e a correspondência da linha for única. Para gestores, o documento também deve identificá-los nominalmente, além de conter os totais da unidade/núcleo que fundamentam sua apuração. O núcleo Piauí exige Teresina e Uruçuí no mesmo período. Não se somam linhas de consultores como totais de unidade, nem percentuais de NPS como se fossem valores monetários.

O motor lê Tesseract.js 6.0.1 em português/inglês no próprio navegador. Reconstrói linhas e colunas pela geometria, compara valores em centavos e não troca letras por números para inventar valores. Relatórios Apollo usam O.S. Faturadas para faturamento; O.S. Abertas não vira faturamento. Campos ausentes ou de baixa confiança não são presumidos corretos.

## Apuração e relatórios

A apuração ativa confere as evidências independentemente do filtro Habilitado/Não habilitado; assim um filtro inicialmente vazio não impede a auditoria de avaliar e liberar candidatos. Os filtros de filial, semana, cargo e seleção de colaboradores continuam delimitando a consulta.

PDF e Excel capturam os candidatos calculados antes da trava documental, conferem as imagens e só então montam os totais e a lista final de habilitados. Isso impede que snapshots da tela ou a inexistência de linhas visíveis dispensem a validação. A página comparativa lista somente divergências e pendências de pagamento, com colaborador, período e orientação. Imagens ausentes não geram páginas vazias de anexos. O relatório de Todos mantém o colaborador pendente com total zero e motivo explícito.

## Alterações e falhas

Editar indicadores invalida a aprovação da versão anterior. Resultados atrasados de OCR não liberam uma versão nova. Nova leitura inconclusiva revoga uma aprovação anterior. Excluir ou substituir anexos pela interface invalida a aprovação antes de nova leitura; ausência de imagem sempre bloqueia. O cache OCR é por SHA-256 do conteúdo, não pelo nome do arquivo.

O estado de pagamento é derivado no navegador, sem nova tabela ou credencial. Ao recarregar, inicia pendente e é conferido novamente. A exportação sempre refaz a listagem e a conferência das evidências. Os dados financeiros lançados não são apagados ou sobrescritos. Não foram feitos pagamentos ou alterações em registros reais durante os testes.

## Validação

Testes cobrem o caso Pabricio com prêmio de NPS calculado e sem evidência, nome de terceiro com números idênticos, nome apenas no arquivo, declaração manual sem imagem, prova nominal válida, erro de competência/semana/filial, mudança de indicadores, exclusão, leitura inconclusiva e divergência confirmada. As regressões dos cálculos de outubro/novembro e NPS executam o motor financeiro isolado da trava documental; testes específicos verificam a trava completa.

Teste de navegador com os módulos reais e OCR determinístico: ausência de imagem e documento de outra pessoa retêm o pagamento; documento nominal com todos os indicadores de semana 4 permite que a política original volte a calcular; exclusão invalida novamente.
