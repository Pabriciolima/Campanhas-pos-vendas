# Garantia e Compras — Edge Functions

Endpoint: `modulos-v2`. JWT da plataforma desativado porque a autenticação própria é verificada pela função em todas as leituras e gravações. Apenas service_role pode executar a RPC interna.

Tabelas: garantia_estado_v2, compras_estado_v2, campanhas_modulo_credenciais e campanhas_modulo_sessoes. Dados antigos e demais módulos preservados. APIs Vercel retornam 410.

Master individual armazenada com bcrypt custo 12. Primeiro acesso exige senha nova (12–72 caracteres); a master é removida atomicamente. Tokens aleatórios de 256 bits armazenados somente como SHA-256 no banco; validade fixa de oito horas. Cinco falhas bloqueiam o módulo durante 15 minutos. Bloqueio é compartilhado, portanto pode temporariamente afetar outros operadores. Sessão do navegador fica em sessionStorage.

Atualizações usam revisão e bloqueio transacional. Revisão antiga retorna 409. Nenhum retry sobrescreve silenciosamente a edição de outro operador. Importações usam operações atômicas de Compras ou estado validado da Garantia. Não existe recuperação automática do Firebase.

Verificação: transação com rollback no banco verificou troca obrigatória, leitura, gravação, edição/exclusão em Compras, revisão obsoleta e expiração. HTTP real sem sessão retornou 401. Testes locais de cálculo/importação executados. Teste visual de dois navegadores e importação de planilhas reais ainda pendente; não confundir simulação de revisão antiga com teste simultâneo em dois navegadores.

Provisionamento das masters é separado do código, sem segredos no Git. O SQL é idempotente e não apaga registros. Para reproduzir o schema, aplicar supabase/modulos-edge-auth.sql e provisionar master_hash pelo canal administrativo.
