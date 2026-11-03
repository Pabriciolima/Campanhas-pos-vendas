# Pix — impressão sob demanda e recursos limitados

## Gargalos corrigidos

A renderização da apuração iniciava OCR automaticamente. Atualizações de filtros, dados e tela podiam enfileirar leituras antes da exportação. O PDF aguardava a fila, baixava novamente cada imagem e criava canvas com a resolução integral dos anexos. Cliques repetidos também podiam abrir várias exportações simultâneas.

## Comportamento atual

- Renderizar ou navegar pelo Pix não inicia OCR nem baixa evidências para auditoria.
- A conferência continua disponível no botão Ler evidências e comparar e nas exportações. O fluxo já existente após envio de anexos permanece sob demanda da operação de upload.
- PDF/Excel compartilham uma única execução por vez, com botões temporariamente desabilitados, progresso e Cancelar exportação. A navegação permanece disponível.
- Listagens independentes das filiais são realizadas com limite de três operações concorrentes. Consultas iguais a raízes compartilhadas usam a mesma promessa durante a exportação. A lista é consultada novamente em uma nova impressão.
- Imagens são reaproveitadas entre OCR e anexos e entre impressões quando id, caminho, data de atualização, ETag e tamanho indicam a mesma versão. Sem versão confiável, o reaproveitamento fica limitado à operação atual.
- Cache de imagens limitado a 16 arquivos / 24 MiB, sem persistência em disco. Cache OCR conserva somente texto, confiança e coordenadas, descartando símbolos e alternativas pesados. Arquivos alterados são lidos novamente.
- Anexos são convertidos para JPEG com lado máximo de 2200 px, fundo branco e proporções preservadas. Canvas e bitmaps são liberados; a montagem cede tempo ao navegador entre anexos.
- A impressão tem prioridade sobre uma auditoria manual diferente em andamento. Cancelamento encerra a espera de OCR, termina o worker e não salva documento parcial nem aplica resultado incompleto na apuração.
- Há limites de espera para rede, inicialização e reconhecimento. Falhas de leitura continuam explícitas; não se inventa uma evidência conferida para acelerar o relatório.

A primeira leitura de imagens ainda depende da quantidade de anexos, conexão e computador. As otimizações eliminam trabalho repetido e processamento durante a navegação, sem prometer duração fixa. Não foram alteradas as políticas financeiras nem reintroduzida a exigência nominal que havia sido revertida.

## Verificação

Testes unitários cobrem execução única, nova tentativa após falha, concorrência limitada, ordem dos resultados, reutilização e invalidação de downloads, cache sem metadados, cancelamento e compactação do OCR. Regressões existentes cobrem comparações e retenção por divergência.

No navegador, com módulos reais e OCR determinístico: duas renderizações não iniciaram OCR nem listagem; um clique duplicado gerou somente um PDF; duas impressões da mesma versão usaram um download e um reconhecimento; a navegação permaneceu disponível; alteração de versão invalidou o cache; cancelar interrompeu a impressão e não salvou outro arquivo. PDF de três páginas verificado com resumo, auditoria e evidência preservados. Excel real gerado com abas financeiras, conferência e evidências, reaproveitando o mesmo download e OCR. Nenhuma gravação em dados reais foi usada no teste.
