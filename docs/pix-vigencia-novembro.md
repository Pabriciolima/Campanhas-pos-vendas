# PIX do Presidente — vigência novembro/2026

Decisão da diretoria informada em 22/10/2026: outubro/2026 permanece integralmente na política histórica; o modelo diário passa a valer em novembro/2026.

O motor seleciona política por competência, incluindo bases, faixas, acúmulo diário/semanal, NPS e penalidade. O NPS geral da filial e o cofrinho ficam restritos ao modelo novo. As metas por filial/mês continuam variáveis. A Campanha da Oficina mantém sua vigência original.

## Lançamentos existentes

A apuração histórica usa realizadoSemanal já salvo. Para registros da primeira versão diária sem esse campo, recupera a soma dos dias informados. Não transporta saldo entre semanas de outubro. Dados diários, total semanal, metas, ticket/margem e NPS são preservados; editar pelo formulário histórico não elimina o calendário ou NPS das primeiras semanas. Não há alteração em massa no banco: resultados são recalculados ao ler, inclusive pelas APIs oficiais usadas nos relatórios e pelo assistente.

Consulta somente de leitura ao Supabase confirmou 48 lançamentos de outubro: 23 S1, 22 S2, dois S3 e um S4. Todos possuíam total semanal salvo. Os 48 registros foram testados localmente com o motor corrigido e comparados com a política histórica, sem mutação. Essa verificação não certifica pagamento ou completude dos indicadores.

## Validação

13 testes passaram: comparação histórica em oito cargos/quatro semanas; limite outubro/novembro; reutilização de total/diário; edição sem perda; ausência de transporte e cofrinho em outubro; NPS mensal e O.S. históricos; política exibida conforme competência; regras de NPS geral em novembro; persistência/concorrência. Navegador confirmou as duas telas de políticas e os 48 resultados pela API oficial.

Execute `node --test tests/pix-vigencia.test.mjs tests/pix-nps-unidade.test.mjs`.
Teste de persistência opcional: forneça `NPS_TEST_DOM_MODULE` apontando para linkedom.
Verificação opcional de registros reais: forneça `PIX_LANCAMENTOS_JSON`, uma extração local com dados de entrada; nenhuma fixture real é publicada no repositório.
