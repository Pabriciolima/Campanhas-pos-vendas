# Persistência da Central de Compras

Compras utiliza `/api/compras` para todos os cadastros, indicadores, evidências de importação e ajustes. O navegador não importa Firebase nem contém credenciais de servidor.

O estado de trabalho fica criptografado (AES-GCM, PBKDF2) em `public.campanhas_configuracoes`, registro `compras_campanha_criptografada_v1`. As quatro coleções originais mantêm IDs, campos, competências e documentos dentro desse estado. As tabelas anteriores de Compras permanecem como cópia histórica protegida por RLS; não se tornaram tabelas públicas.

Acesso do painel segue o uso existente, sem nova senha. A API exige origem do próprio sistema nas gravações, valida os lotes e usa a revisão lida (`updated_at`) para impedir sobrescrita entre computadores. Importação, substituição dos registros, evidência e remoção dos ajustes são uma única gravação atômica. Mudanças externas são consultadas a cada 15 segundos e ao retornar à janela; formulários e prévias em edição não são reconstruídos.

## Configuração de produção

- `COMPRAS_CLOUD_PASSWORD`: segredo exclusivo de Compras, somente na Vercel; não usar variáveis públicas.
- `CAMPANHAS_SUPABASE_URL` / `CAMPANHAS_SUPABASE_ANON_KEY`, com compatibilidade para os nomes já existentes `GARANTIA_SUPABASE_URL` / `GARANTIA_SUPABASE_ANON_KEY`.
- Não requer projeto, tabela, bucket ou plano novo.

## Recuperação do histórico

A cópia inicial preserva os documentos já existentes no Supabase e o último cadastro confirmado. O status `migracao` informa que o Firebase ainda precisa ser consultado para verificar os registros mais recentes. O painel tenta recuperar esse histórico ao abrir quando a última tentativa tem mais de 15 minutos; também oferece um botão no detalhe de sincronização.

A recuperação lê as quatro coleções do Firebase, incluindo páginas adicionais, antes de alterar qualquer dado. Falha ou cota excedida mantém o Supabase funcionando e não substitui coleções por listas vazias. Documentos alterados ou excluídos no Supabase têm prioridade; uma importação nova do mesmo mês/tipo não é revertida por uma fonte antiga. O Firebase não é apagado.

## Validação

`node --test tests/compras-supabase.test.mjs tests/compras-equipe.test.mjs tests/compras-imagens.test.mjs`

Verificar ainda importação real, preservação do histórico, CRUD e atualização entre duas sessões independentes. Não publicar chaves, snapshots nominais ou arquivos de backup em Git.
