# Pix — auditoria comparativa da fonte

## Escopo

Auditoria documental e aritmética independente da elegibilidade da campanha. Preserva os cálculos financeiros vigentes, os lançamentos existentes, as evidências originais, as políticas históricas de outubro e a vigência da regra diária em novembro.

Apuração: painel recolhido com alertas do mesmo filtro de colaboradores/filial/semana. PDF regular: página adicional com local, situação, ponto identificado, correção e fonte, antes dos anexos de evidências. Excel: aba Conferência da fonte. Impressão legada com atrasados: mesma página comparativa, preservando as competências de origem e sem ampliar os participantes do relatório.

## Fonte estruturada

O formulário de lançamento possui seção Conferência da fonte. Registra referência do relatório/arquivo/página, identidade da linha individual, competência, semana, base individual/unidade/núcleo, meta, realizado, ticket e quantidade de O.S. opcional. Cabeçalho e coluna têm semanas independentes para detectar S3/S2. Confirmação de leitura é explícita; não é inferida da existência de uma imagem.

Gerentes: fonte por núcleo, com linhas separadas dos totais de cada unidade no mesmo período. Para o núcleo Piauí, exige Teresina e Uruçuí, sem duplicar unidades ou somar colaboradores como totais de unidade. Meta e realizado do gerente são comparados com as somas da fonte. Ticket consolidado é conferido separadamente, não calculado por média simples de tickets.

A conferência fica no objeto auditoriaFonte dentro do JSON dados de pix_lancamentos, seguindo o fluxo de gravação existente, sem nova tabela ou credencial. Não grava automaticamente os valores financeiros de referência nos campos de pagamento.

## Regras e bloqueios

- Consultor/orçamentista: base individual e nome da linha compatível.
- Gerente: núcleo; demais cargos: total de unidade.
- Competência e semana da referência precisam coincidir com o lançamento.
- Meta, realizado e ticket são comparados em centavos; atingimento é conferido por realizado/meta × 100.
- Se a quantidade de O.S. for informada, confere ticket contra realizado/quantidade.
- Divergências comprovadas e núcleo de gerente não validado interrompem o salvamento antes do upsert. Pendências de fonte nos demais cargos permanecem explícitas no formulário, apuração e relatório.
- CONFERIDO significa somente que os campos estruturados coincidem; não é liberação de pagamento nem validação automática de imagem.

## Apontamentos da diretoria

As referências recebidas para outubro/2026 S3 são restritas ao mesmo período, filial e colaborador: Kharolaynne/Uruçuí (R$ 58.146,36; ticket R$ 4.845,53; referência 109,68%), Kevyn/Uruçuí (evidência total R$ 66.150,46), Danilo/Rondonópolis (meta da fonte R$ 85.706,25), gerência Piauí por Teresina+Uruçuí. O rótulo S3/S2 de Rondonópolis aparece como apontamento sobre a evidência original, até registrar a conferência dos dois rótulos corrigidos. Prêmios de R$ 600/R$ 1.100 não são aprovados ou alterados automaticamente por esses apontamentos.

## Limitação deliberada

Os prints existentes não têm leitura estruturada validada. Este recurso não faz OCR automático e não afirma que uma imagem foi lida quando isso não ocorreu. Sem fonte conferida, o relatório registra PENDENTE em vez de declarar ausência de inconsistências. Novas comparações numéricas exigem registrar e conferir os dados da referência no formulário. Documentos de origem com rótulo errado precisam ser corrigidos e reanexados; a auditoria não altera pixels dos anexos.

## Validação

22 testes aprovados, incluindo casos da diretoria, escopo, identidade, semanas, núcleo, diferença de centavos, ausência de fonte, junção dos filtros, página extra e bloqueio antes de gravar. Regressões confirmam outubro histórico, novembro diário e NPS. Três testes opcionais foram pulados por depender de fixture de dados reais ou DOM externo.

Navegador: formulário, confirmação da fonte, divergência R$ 78,16, semana de coluna errada, painel na apuração, claro/escuro e larguras 390/768/1366 sem transbordamento. PDF real criado com jsPDF/AutoTable; página de auditoria renderizada e inspecionada, textos e diferenças R$ 78,16/R$ 13,67, fontes e núcleo Piauí conferidos. Nenhuma gravação em dados reais foi usada nos testes.
