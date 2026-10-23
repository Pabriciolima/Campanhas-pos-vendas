# Importação auditável de Garantia

O conjunto de arquivos é preparado em memória e aplicado somente depois da prévia. Uma falha em um dos arquivos não persiste parte do conjunto. A competência é validada no conteúdo; planilhas históricas não são somadas às bases atuais.

- A campanha validada fornece cadastro, amostra semanal de Inserção e valores históricos de referência por participante.
- O relatório completo de O.S. fornece contagem de abertas/fechadas, soma monetária sem arredondamento por registro e Chamevolks com valor positivo e responsável identificado.
- O resumo mensal de recebimentos fornece crédito líquido. Não é faturamento nem crédito bruto.
- O controle de Malote compara coleta com prazo Mônaco. Sua matriz C/NC não substitui a Inserção. DNs compartilhados requerem vínculo explícito.
- Arquivamento conta `Não` por documento/tipo, usando aliases explícitos para filiais.
- Erros preenche somente a posição bruta; validade para desconto e posição SG não são deduzidas do código ou do texto da ocorrência.
- AEG usa o resumo conferido com os movimentos retornados no mês como referência da supervisora. Não cria uma regra de calendário D+2.
- Frete, solicitações de cancelamento e ocorrências físico x fiscal ficam vinculados para conferência; não inventam elegibilidade, execução ou denominador.
- Imagens são evidências, sem OCR financeiro automático. Os dados extraídos e as evidências visuais são guardados; os arquivos XLSX originais não são publicados no repositório nem enviados a um novo bucket.

A conferência apresenta referência Excel, cálculo atual, pendências e diferenças por pessoa. Onde a referência diverge da regra, ou o final do Excel está vazio, `conferirReferencia` impede o fechamento. Essas pessoas não entram na soma calculada concluída. A marca não altera valores históricos ou autoriza pagamento.

Os dados reais são criptografados com o módulo de nuvem existente, na tabela de configurações de Campanhas. A chave é entregue separadamente ao responsável e não fica no código ou no banco. O link usa um fragmento retirado imediatamente da URL; a chave permanece somente na memória da sessão. Uma versão local diferente exige confirmação antes de abrir o mês importado. Outras competências locais são preservadas; alterações na nuvem usam controle de concorrência.

Validação: testes unitários de tipos, meses, contagens, critérios não presumidos, reversão e fechamento; conjunto real em teste privado; fluxo de prévia/aplicação no navegador; abertura e gravação da nuvem criptografada. Os arquivos privados de teste não são versionados.
