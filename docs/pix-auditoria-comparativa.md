# Pix — comparação dos lançamentos com as imagens

## Fluxo atual

No PDF regular, as imagens anexadas à competência, semana e filial dos colaboradores selecionados são lidas automaticamente antes da geração da página de divergências. A tabela contém somente campos diferentes: colaborador, período, valor lançado, valor lido, diferença, arquivo e linha da leitura. Não imprime linhas coincidentes, referências fixas da diretoria ou a lista de todos os colaboradores. A contagem de leituras inconclusivas aparece separadamente; os motivos detalhados ficam recolhidos em “Leituras a revisar” na tela. Excel: divergências e leituras inconclusivas em abas separadas.

Na apuração, “Ler evidências e comparar” executa a mesma comparação com os filtros atuais. Após upload de uma evidência, os lançamentos da mesma filial/competência/semana são conferidos em segundo plano, quando disponíveis na tela. O upload permanece salvo mesmo se a leitura falhar.

## Leitura das imagens

Tesseract.js 6.0.1 com modelo português/inglês, executado no navegador, sem serviço pago ou chave de IA. Bibliotecas e modelos são carregados sob demanda. A imagem é lida localmente; não é enviada a um serviço externo de reconhecimento. Cache em memória por SHA-256 do conteúdo, limitado a 30 imagens: exclusão ou substituição não reaproveita uma leitura antiga de outro arquivo. A lista de anexos é consultada novamente em cada conferência. Não cria tabela nem altera permissões, dados financeiros ou evidências no Supabase.

O leitor reconstrói linhas pela posição dos textos, identifica colunas e associa valores ao nome individual ou total da unidade. Números de baixa confiança, nomes ambíguos, arquivos conflitantes e valores ausentes não viram divergências confirmadas nem coincidências. Não corrige letras para fabricar números. Datas incompatíveis e semanas divergentes são tratadas separadamente. Imagens mensais legadas sem semana identificável exigem revisão.

Relatórios Apollo: usa Vlr. Total e Ticket Médio da seção O.S. Faturadas, excluindo a tabela O.S. Abertas do faturamento. Reconhece cortes no começo do nome somente com sufixo longo de três ou mais palavras e associação única entre os participantes selecionados. Totais sem rótulo só são reconhecidos se o valor impresso coincide com a soma das linhas da mesma tabela; a comparação usa o valor do total impresso, sem inventar um total inexistente.

Gerência Piauí: exige totais de Teresina e Uruçuí no mesmo período para comparar metas e realizados consolidados. Outros núcleos usam as unidades configuradas na conferência de fonte. Ticket do núcleo só pode ser calculado com faturamento e quantidade de O.S. válidos de todas as unidades; não usa média simples de tickets.

## Limites

OCR é probabilístico. Prints pequenos, escuros, cortados, cabeçalhos desconhecidos ou campos sem evidência podem exigir revisão. Ausência de divergência não certifica os campos que não foram lidos. Não há alteração automática de lançamentos, elegibilidade ou valores a pagar. A seção manual “Conferência da fonte” permanece disponível para registros estruturados e validações de salvamento da implementação anterior; o novo relatório de imagens não usa essas referências fixas como substituto da evidência.

A impressão legada com atrasados mantém seu fluxo anterior de fonte estruturada. A leitura automática descrita aqui está integrada aos botões regulares PDF/Excel do Pix e à apuração.

## Verificação

Testes de identidade, colunas, centavos, confiança, conflitos entre imagens, isolamento de mês/semana/filial, núcleo e relatório somente de divergências, além das regressões históricas de outubro, novembro e NPS.

OCR real no navegador com uma imagem já anexada de outubro/S3/Uruçuí: extraiu realizado individual 58.146,36 e ticket 4.845,53, separadamente do total 66.150,46 e ticket 4.725,03 da unidade. A meta não presente nessa imagem foi sinalizada como leitura incompleta. Nenhuma gravação em dados reais foi feita para testar.

## Pendências na apuração

Divergências confirmadas pela leitura passam a bloquear a habilitação do colaborador naquele mês, semana e filial. A linha, o nome e o status ficam vermelhos, com a mensagem **CORRIGIR PENDÊNCIA** e o motivo. O total disponível é retido (zero) enquanto a divergência persistir; o valor calculado pela política é preservado em `bonusFinalAntesAuditoria`, sem mudar os dados gravados. Cartões e filtros usam o mesmo status: não entra nos habilitados; entra nos não habilitados.

A comparação é agendada ao renderizar a apuração ativa. A impressão também confere as fontes antes de montar totais e linhas; divergentes não entram na lista financeira de “Somente habilitados”. A página comparativa ainda mostra as diferenças encontradas na conferência dessa exportação. Campos bloqueados só são liberados quando uma nova leitura conclusiva os compara sem diferença. Falha de rede, imagem ilegível ou correção apenas parcial não apaga as outras pendências. Leituras iniciadas antes de uma edição não sobrescrevem o resultado atual. O estado é derivado no navegador e recalculado pelas evidências ao abrir a apuração; não cria nova tabela nem grava sobre os lançamentos.
