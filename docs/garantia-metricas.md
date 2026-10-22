# Campanha de Garantia — operação e rastreabilidade

## Fontes e decisões

Fonte principal: `CAMPANHA DE GARANTIA_ SETEMBRO 2026 - GERAL - Copia.xlsx`, sete abas; cotejada com `GARANTIA METRICAS.xlsx`. Por solicitação explícita do responsável, a base inicial inclui nomes, perfis e vínculos de filial da aba BONIFICAÇÃO DA EQUIPE. Remunerações, índices, férias e datas de experiência não compõem esse cadastro de referência. Os indicadores e resultados continuam dependendo da importação pelo responsável.

Definições confirmadas em 22/10/2026:

- Central de AEG: dois status independentes, Aguardando preenchimento e Correção, R$200 por status com não conformidade <5%, considerando D+2; teto fixo dos assistentes da Central R$900, mais Chamevolks individual de R$25/processo faturado.
- Erros na Central: a partir de 5%, desconto de 30% sobre o bônus habilitado.
- Local: atingidos os mínimos de 80% de faturamento e 75% de malote, usar o percentual real de faturamento limitado a 100%, conforme fórmulas da planilha; abaixo dos mínimos não habilita.
- Devolutivas locais acima de 5%: desconto de 30%, substituindo os 10% do texto antigo.
- Desempenho dos analistas: cancelamento abaixo de 0,5% é conforme, prevalecendo sobre a anotação que citava 0,8%.

## Estrutura analisada

| Aba | Utilização |
|---|---|
| Métricas Garantia Local | Base por volume/função, gatilhos e penalidades |
| Métricas Analistas Central | Faixas R$600 + R$300 + R$300, extra e destaque |
| Métricas Assistentes Central | Três faixas, Chamevolks e AEG por status |
| Métricas Líder de Garantia | Quatro indicadores de até R$600 e extra por recebimento |
| VALIDAÇÃO INDICADORES | Entradas por filial, GERAL, grupos dos analistas e amostras |
| BONIFICAÇÃO DA EQUIPE | Cadastro mensal, vínculos, AEG/Chamevolks e referências dos pagamentos |
| Planilha1 | Auxiliar com outra composição de analistas; não substitui cadastros oficiais |

## Mapeamento do modelo original

`VALIDAÇÃO INDICADORES`, linhas 7–19: filiais; linha 20: GERAL.

| Coluna | Campo / unidade |
|---|---|
| A | Empresa; Belém → ANANINDEUA; São Luís → SÃO LUIS; Ji Paraná → JIPARANÁ |
| B / C | Valor faturado / recebido, em R$ |
| F / G | O.S. abertas / fechadas; faturamento percentual = G/F |
| J | Inserção percentual declarado |
| L / M | Quantidade de processos / conformidade do malote |
| O | Quantidade de cancelamentos |
| R / S / T | O.S. faturadas / devolutivas / percentual informado |
| W | Pendências de frete elegíveis; a política exclui o mês anterior |
| Z / AA / AB / AC | Posição SG / erros brutos / válidos / percentual informado |
| AF | Divergência físico × fiscal em percentual |
| AH / AI | Pendências de arquivamento NF / SG |

Amostra de inserção: P33:P45 = filial; R = conformes, S = não conformes. Quando os dois quantitativos estão presentes, o percentual é C/(C+NC). Percentual novo sem amostra limpa a amostra antiga para não ocultar a atualização.

Analistas: linhas 24–28. A = nome; B = unidades; F/G = valores faturado/recebido; L/M = O.S. abertas/fechadas; R/S = amostra de inserção; Z/AA/AB = posição SG/erros brutos/válidos; AH/AI = cancelamentos/percentual; AL = performance original apenas para comparação. O ranking calculado reproduz `(recebimento + faturamento + inserção + fator de erros + fator de cancelamentos)/5`; erros <5% geram fator 100, caso contrário 70; cancelamentos <0,5% geram 100, caso contrário zero. O prêmio de R$300 requer indicação nominal justificada, sem atribuição automática.

`BONIFICAÇÃO DA EQUIPE`:

- Linhas 4–25: 22 colaboradores locais. A/B/C = filial/nome/função; T = referência original. NA explícito em K:O registra penalidade não aplicável por pessoa, visível no detalhamento e editável com justificativa; não preenche o campo numérico com zero.
- Linhas 29–30: dois assistentes da Central; C = Chamevolks; D/E = índices AEG individuais; R = referência original.
- Linhas 34–38: referências de cinco analistas. Linha 39 tem números sem nome e é ignorada para impedir um participante fantasma.
- Linhas 44–45: líder e supervisora, K = referência original.

Total identificado: 31 participantes. O importador usa valores armazenados no XLSX (`v`), nunca executa fórmulas. Célula com erro não vira número. Percentuais do modelo original são frações e são convertidos para a escala 0–100. Dinheiro e quantidades não sofrem essa conversão.

## Divergências identificadas

1. `VALIDAÇÃO INDICADORES!L30` contém `#REF!`. O aviso aparece na prévia.
2. Local: política e fórmulas divergiam sobre devolutivas (10% × 30%) e percentual real × faixas. As definições acima foram confirmadas pelo responsável.
3. Há premiações históricas locais abaixo do mínimo de 80% de faturamento. O motor atual aplica o gatilho da política, mostra a diferença e preserva o valor original como referência.
4. A inserção GERAL em J20 é 100% digitado; as amostras das filiais correspondem a 50/52 = 96,1538%. A importação preserva o consolidado informado e exibe a inconsistência para conferência; não altera esse valor sem decisão humana.
5. Algumas fórmulas de erros usavam `>5%`, outras `>=5%`. Usa-se o limite confirmado `>=5%`.
6. Na divergência físico × fiscal aplica-se a política `>5%`, em vez de punir qualquer valor diferente de zero.
7. Há bônus habilitados em branco e anotações de férias/fim de experiência. O sistema não presume desligamento nem autoriza pagamento: guarda a observação e exige conferência individual justificada.
8. Fórmulas do extra de analistas usavam totais agregados. O motor exige todas as unidades vinculadas >=100% nos três indicadores, conforme a política, e inabilita o extra quando erros >=5%.
9. `Planilha1` apresenta outra carteira de analistas. É auxiliar, não uma substituição automática da aba principal.

## Importação e operação

Abra Garantia → Lançamentos, selecione **2026-09** e carregue o XLSX original. Revise a prévia e aplique. Nada é gravado antes da aplicação. O importador verifica a competência em A4 e a estrutura esperada das abas; arquivos com outra disposição devem usar mapeamento.

Para atualizar apenas uma informação, use o cartão do indicador. Aceita XLSX/XLS/CSV, seleção de aba, linha do cabeçalho, mapeamento de colunas e escala dos percentuais. Percentuais formatados no Excel são convertidos automaticamente. Colunas duplicadas são identificadas por posição. Modelos CSV usam cabeçalhos técnicos e competência ISO `AAAA-MM`.

Escopos: filial normalizada, `GERAL`, `ANALISTA:` seguido do nome normalizado ou `PESSOA:` seguido da chave nominal exibida na tela. Chamevolks/AEG pertencem ao escopo individual, enquanto os indicadores coletivos usam o escopo correspondente. Não somar linhas de percentuais: escopo duplicado na mesma importação é rejeitado. Importação parcial preserva os campos não mapeados. Campos vazios mapeados substituem o valor por pendência explícita.

Qualquer alteração invalida todas as conferências da competência. Alterar uma filial marca os consolidados GERAL e de analistas envolvidos como desatualizados, exceto quando esses consolidados também são atualizados no mesmo lote. Não há dupla contagem de filiais por pessoa na apuração.

Apuração contém total calculado, referência, situação, pendências e detalhamento. Conferir exige justificativa. CSV exportado separa os valores e a situação; exportação não efetua pagamento. Suspensão e destaque são decisões nominais com justificativa. Alteração de NA também exige justificativa.

## Persistência e limite operacional

Esta entrega salva no `localStorage` sob `monaco_garantia_v2`. Há histórico de importações/alterações, backup JSON e restauração revisada. Falha de armazenamento é informada e não é apresentada como salvamento bem-sucedido. Arquivo de backup não é garantia de autoria: conferências são reiniciadas ao restaurar.

**Não há sincronização corporativa ou gravação no Supabase nesta versão.** O site existente não tem autenticação autorizativa suficiente para expor cadastros e remunerações novos com segurança. Nenhuma tabela, política RLS, chave ou dado de outro módulo foi alterado. Definir autenticação/perfis e permissões é necessário antes de disponibilizar esse conjunto nominal como dados compartilhados. O usuário foi informado desse limite na entrega.

## Verificação

`node --test tests/garantia-core.test.mjs tests/garantia-dados.test.mjs`

O teste opcional do arquivo real aceita `GARANTIA_WORKBOOK_JSON`, com extração local fornecida no ambiente; dados nominais não são fixtures públicas. Foram verificados 15 testes de cálculos/validação e, em navegador, XLSX real, 31 participantes, conferência, atualização parcial CSV, persistência, isolamento mensal, texto seguro e 25 combinações de tela/largura (1366, 1024, 768, 390 e 360 px). Totais dos assistentes da Central reproduzidos: R$920 e R$845; liderança R$2.100 por pessoa, antes de qualquer alteração de dados.

## Cadastro inicial automático — 22/10/2026

O arquivo `garantia-participantes-base.js` preenche 31 participantes (22 locais, dois assistentes da Central, cinco analistas e dois da gestão) ao abrir uma competência a partir de setembro/2026. A versão de referência é aplicada uma vez por competência, preserva cadastros encontrados, conferências, observações e indicadores, e não insere valores financeiros. Competências anteriores não são preenchidas automaticamente.

Nomes e cargos locais vêm de B/C4:25; assistentes centrais de A/B29:30; analistas de A34:38 com unidades em B; gestão de A44:45. Os dois cargos específicos de gestão não estão discriminados por pessoa na aba, por isso a apresentação informa “Gestão da Garantia — cargo específico a confirmar”. Os perfis de cálculo existentes são preservados, pois compartilham as mesmas regras financeiras.

Anotações entre parênteses não são parte do cadastro nominal inicial. A reimportação do arquivo original reconhece o mesmo nome com anotação para não criar duplicidades. Cadastro por referência não afirma vigência empregatícia nem habilita pagamento. Alterações nominais devem continuar sendo feitas na tela de participantes.

Teste: `node --test tests/garantia-participantes.test.mjs`.
