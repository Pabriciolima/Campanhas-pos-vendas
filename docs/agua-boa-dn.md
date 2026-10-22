# Água Boa — DN 4774

Correção solicitada em 22/10/2026: Água Boa utiliza o DN 4774, compartilhado com Rondonópolis. As filiais continuam distintas pelo nome. Cuiabá mantém 4738.

Catálogos corrigidos no PIX, Oficina, importação de participantes e relatório, e resolução de DN nas evidências/exportações. Identificação por filial continua obrigatória na importação; não consolidar Água Boa e Rondonópolis apenas por DN.

Correção aplicada no Supabase somente aos registros de Água Boa: cinco participantes PIX, 49 lançamentos PIX, três participantes Oficina, dois lançamentos Oficina e três matrizes de evidências Oficina. Atualizado apenas dados.dn e, nas três matrizes, o DN incorporado na chave de busca. Não havia conflitos nas chaves de destino ou dependências externas de chave estrangeira. Consulta posterior confirmou 62 registros com 4774. Nenhum valor financeiro, meta, competência ou imagem foi alterado. Auditoria histórica permanece original.

As 53 imagens PIX encontradas em pastas 4738-agua-boa foram preservadas. O leitor reúne imagens do DN antigo e do novo na mesma filial/mês/semana, sem renomear arquivos; exportação exibe 4774 mesmo ao ler pasta histórica. Oficina também mantém a leitura das duas pastas; caminhos originais nas matrizes são preservados.

Validação: quatro testes de catálogos, resolução de DN e leitura conjunta de imagens; sintaxe dos seis arquivos JavaScript verificada. Execute `node --test tests/agua-boa-dn.test.mjs`.
