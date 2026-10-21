# Revisão de segurança e privacidade - 21/10/2026

## Estado da entrega

Primeira etapa implementada. **Não é uma declaração de conformidade integral com a LGPD nem de encerramento dos riscos críticos.** O acesso anônimo aos dados de negócio e a identidade dos usuários ainda precisam ser substituídos por autenticação e autorização efetivas.

Escopo: código do Hub de Campanhas e metadados/permissões das tabelas de campanhas no Supabase. Nenhuma consulta a conteúdo pessoal foi necessária para o inventário. Outros aplicativos que compartilham o projeto não foram alterados.

## Dados identificados

- Nome do colaborador, função/cargo, filial, identificador de registro e vínculo com a competência.
- Faturamento, produtividade, eficiência, NPS, bonificação e penalidades individualizados: dados pessoais de desempenho/remuneração, que não são automaticamente dados pessoais sensíveis do art. 5º, II.
- Fotografias/evidências e campos JSON/livres: podem conter dados pessoais adicionais; não foi inspecionado seu conteúdo nem confirmado tratamento de categorias sensíveis.
- Perfil de presença, sessão, contexto de navegação e auditoria antiga com snapshots e identificação declarada pelo cliente.

## Vulnerabilidades e tratamento

| Achado | Estado | Justificativa técnica |
| --- | --- | --- |
| Políticas de negócio liberam operações sem usuário identificado | CRÍTICO, pendente | RLS habilitada com condições irrestritas não autoriza por pessoa/filial. Requer login e matriz de acesso antes da troca em produção. |
| Evidências em bucket público, com permissões anônimas | CRÍTICO, pendente | Exige bucket privado e URLs assinadas vinculadas ao usuário/filial; mudar isoladamente quebraria o fluxo atual. |
| Senhas administrativas no JavaScript | CRÍTICO, pendente | São barreiras de interface, legíveis e contornáveis pelo cliente. Precisam ser substituídas por autorização no servidor. Não foram apresentadas como proteção da API. |
| Interpolação de dados em HTML e atributos de PIX/Oficina | Corrigida nas saídas revisadas | Codificação de caracteres impede que nomes, filiais, cargos, observações e atributos tratados sejam interpretados como marcação. Não equivale a auditoria de todos os módulos. |
| Auditoria anterior depende de snapshots/identidade informada pelo cliente e permite leitura pública | Pendente | Mantida por compatibilidade; precisa de migração de acesso e minimização. Não foi apagado o histórico. |
| Ausência de trilha mínima privada complementar | Implementada | Trigger no banco em dez tabelas, com operação, horário, hash salgado do identificador, usuário autenticado quando existir e transação. Sem nomes, valores, IPs ou snapshots. |
| RPCs de trigger com EXECUTE público | Corrigida nas duas funções de auditoria das campanhas | Revogado EXECUTE de PUBLIC/anon/authenticated. Triggers continuam operando. Fixado search_path de duas funções auxiliares. |
| Perfil de presença persistente no dispositivo | Reduzido | Cópia antiga no localStorage removida; perfil passa à sessão com validade máxima de 8h. Broadcast transmite primeiro nome + inicial do último sobrenome, que continua sendo dado pessoal. |
| Ausência de CSP complementar | Reforçada parcialmente | object-src none, base-uri self, frame-ancestors none, form-action self e upgrade-insecure-requests. HSTS e headers existentes preservados. CSP não bloqueia todos os scripts: ainda há scripts inline e dependências externas. |
| Biblioteca Supabase com versão flutuante | Fixada em 2.118.0 | Evita atualização silenciosa via @2. Sem alteração de chave ou da API de negócio. Versão conferida no registro npm. |
| Credenciais do frontend | Verificadas no escopo | A chave Supabase revisada possui papel anon, não service_role. Chaves públicas Supabase/Firebase não são segredos; colocá-las em .env do frontend não as oculta. Nenhum segredo privilegiado foi movido porque não foi identificado nos arquivos de configuração revisados. Histórico Git e demais integrações não foram integralmente varridos. |

## Auditoria privada: limites e operação

Schema campanhas_private: sem USAGE para anon/authenticated; tabelas com RLS e sem permissões de leitura/escrita para o navegador. Salt aleatório permanece no banco e nunca vai ao repositório. SECURITY DEFINER usado somente na função privada de trigger para gravar na tabela restrita, com search_path vazio e nomes qualificados.

Não há administrador imutavelmente impedido de alterar o banco: o proprietário continua tendo controle. A trilha não é armazenamento WORM e não prova identidade de chamadas anônimas (actor_id fica nulo). Logs antigos permanecem distintos e expostos pelas políticas antigas até a migração de acesso.

Retenção dos novos logs: retention_days começa nulo. A função privada purge_expired_audit retorna zero nesse estado e não apaga nada. Após aprovação documentada do prazo, o administrador poderá configurar retention_days e executar/agendar a limpeza. Não há cron ativo nem expurgo de colaboradores, evidências, backups ou apurações nesta etapa.

As três migrações versionadas em supabase/migrations já foram aplicadas ao projeto atual. Não executar manualmente de novo. Em novo ambiente, aplicar pela ferramenta de migrações na ordem registrada.

## Proteções que ainda dependem da migração de acesso

1. Identificar um administrador nominal e provisionar contas por convite, sem cadastro público irrestrito. Definir administrador geral, gestores por filial e leitores, em tabela de membros privada ou app_metadata controlado pelo servidor; nunca autorizar por user_metadata editável pelo usuário.
2. Implantar login e verificar usuário/sessão em operações sensíveis. Substituir as políticas irrestritas por autorização por usuário, função e filial; testar negações entre filiais. Ativar somente depois de garantir acesso do administrador.
3. Tornar evidências privadas e migrar leitura/upload/remoção para permissões por filial e URLs assinadas curtas. Rever também a migração legada Firebase e suas regras.
4. Rate limiting efetivo: proteger a API real/Supabase, e não apenas cliques ou Vercel. Limites distribuídos por usuário/rota, tetos de payload, paginação e validação de esquema no servidor. **Não foi implementado rate limiting nesta etapa**, pois o cliente acessa diretamente o banco e não existe gateway autenticado. Um limitador apenas no JS seria contornável.
5. CORS: não foi adicionado wildcard nem tratado como autenticação. Uma futura API própria deve validar origens autorizadas e sessão. CORS/headers da Vercel não fecham o endpoint direto do Supabase.
6. Definir controlador, encarregado/canal, finalidade e base legal por operação. O tratamento trabalhista não deve ser convertido automaticamente em consentimento. Implementar registro de consentimento somente nas finalidades que realmente dependam dele, com versão, revogação e rastreabilidade.
7. Solicitações de acesso/correção/eliminação: verificar identidade e autorização, avaliar obrigações de conservação, mapear cópias e backups e registrar o atendimento. Não há exclusão automática de dados de outra pessoa pelo frontend.
8. Aprovar uma tabela de temporalidade para cadastros, lançamentos, evidências e auditorias. O prazo da sessão de presença não define o prazo legal dos históricos.
9. Completar varredura de HTML/URLs/importadores/exportações nos módulos CRM, Compras, pódio e integrações, testes negativos e revisão de dependências.

## Verificações realizadas

- Testes Node: codificação de HTML/atributos, minimização/expiração de presença e diretivas de headers; regressões do cálculo de NPS e competências históricas.
- Banco: triggers instaladas em dez tabelas; gravação de auditoria confirmada em transação revertida; permissões privadas negadas a anon/authenticated; ausência de política de retenção produz zero exclusões.
- Fluxo legado: UPDATE de teste no papel anon em transação revertida confirmou que os triggers continuam funcionando após a revogação de EXECUTE. Isso também confirma que o risco de escrita anônima de negócio ainda existe.
- Nenhum dado financeiro foi alterado de forma persistente nos testes. Sem teste completo em navegador nesta etapa.
- Advisors consultados. INFO de RLS sem policies no schema privado é intencional (deny by default); avisos de exposição das tabelas de negócio permanecem. Achados de aplicativos alheios às campanhas não foram alterados.

## Referências

- LGPD: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm
- Chaves públicas versus secretas: https://supabase.com/docs/guides/getting-started/api-keys
- RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Advisors e exposição anônima: https://supabase.com/docs/guides/database/database-linter?lint=0026_pg_graphql_anon_table_exposed
- Funções privilegiadas: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
