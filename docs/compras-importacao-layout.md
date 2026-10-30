# Importação de Compras — organização visual

A tela segue o padrão da Apuração: resultado principal legível e detalhes sob demanda.

## Três etapas

1. Indicador e mês: cartões de A/B, obsolescência e O.S. indicam seleção e se já existe importação salva naquela competência. O arquivo também pode ser identificado automaticamente.
2. Envio: seleção por clique, teclado ou arrastar e soltar, usando o mesmo fluxo de leitura existente. Planilhas e conjuntos de prints continuam suportados. Configuração de tipo, aba e download do modelo permanecem disponíveis em um painel recolhível.
3. Conferência: aparece somente após escolher arquivo. Mostra o nome, mês, indicador, registros, erros, avisos e prévia dos colaboradores. Nenhum dado é salvo antes da confirmação.

## Conferência

- Colunas específicas de cada indicador com títulos de leitura comum, sem campos técnicos vazios.
- Todos os registros podem ser abertos por casa; não se limita a prévia às primeiras 12 linhas.
- Prévia de A/B; comparação de obsoletos com o histórico anterior; média e cobertura das filiais de O.S.
- Erros visíveis bloqueiam o salvamento. Avisos e ranking de O.S. ficam disponíveis em painéis recolhíveis.
- Descartar seleção limpa a prévia, sem excluir os dados já importados.
- Tipo, mês e aba são bloqueados durante a gravação; o estado indica quando o arquivo ainda não foi salvo.

## Validação

41 testes automatizados de Compras. Fluxo de navegador em servidor simulado com as três planilhas reais: leitura, seleção, prévia, confirmação A/B e O.S., sincronização entre contextos e relatórios. Obsoletos conferidos por teclado sem gravar. Arquivo inválido enviado por arrastar e soltar mantém a confirmação bloqueada e não grava. Conferência em claro/escuro, 390/768/1366/1920, sem transbordamento horizontal da página.

Regras de bonificação, parsers das planilhas e persistência não foram substituídos. As verificações usam banco simulado; não alteram lançamentos reais.
