# Garantia: importação, exclusão e sincronização

O recebimento mensal e a base ABERTAS/FECHADAS são reconhecidos mesmo quando selecionados em outro cartão. O mês e o ano continuam obrigatoriamente validados. Arquivos tabulares genéricos continuam exigindo mapeamento e confirmação. Selecionar o arquivo não aplica seus dados: use Importar e preencher e confirme o OK da prévia.

Remover arquivo selecionado limpa apenas o seletor. Excluir importação desfaz as células que ainda têm o valor aplicado pelo arquivo, restaura os valores anteriores e invalida conferências. A exclusão segue ordem inversa para preservar dependências. O rastreamento começa nesta versão: importações antigas não têm reversão automática. As fontes antigas permanecem no histórico de auditoria. Edições posteriores com valores diferentes são preservadas; uma edição posterior com exatamente o mesmo valor não é distinguida da importação.

Sincronizar Supabase usa campanhas_configuracoes, registro garantia_campanha_criptografada_v1. Não cria projeto, tabela, bucket ou contratação. Apenas dados extraídos, cadastros e histórico são sincronizados; o Excel original não é enviado ao Storage. O consumo é sujeito aos limites e plano atuais do projeto, sem promessa de gratuidade ilimitada.

Na primeira conexão, defina senha forte de pelo menos 12 caracteres. Nos demais computadores e após recarregar a página, use a mesma senha e confirme a abertura da nuvem. Faça backup local antes de substituir o conteúdo local por uma cópia compartilhada. Após a abertura, as alterações são enviadas automaticamente, em ordem, enquanto a sessão permanecer aberta. O status próprio da Garantia informa se a gravação terminou ou falhou. Falhas preservam a cópia local. Não há atualização ao vivo entre computadores: reabra a nuvem para obter novas alterações.

AES-GCM 256, salt aleatório por gravação, IV aleatório de 96 bits e PBKDF2/SHA-256 com 310 mil iterações. Senha somente em memória; sem recuperação. Controle otimista por updated_at e inserção exclusiva impedem sobrescrita silenciosa entre clientes cooperativos.

Limitação de infraestrutura existente: a tabela permite leitura e escrita pública e o aplicativo não usa Supabase Auth. A criptografia evita exposição direta dos nomes e premiações, mas não impede exclusão, substituição ou repetição de um ciphertext por terceiros com acesso à API. Não equivale a autenticação nem a auditoria imutável. O endurecimento completo requer autenticação e RLS compatíveis; não se alteraram permissões dos demais módulos nesta entrega.

Validação: testes do motor, reversão, senha incorreta, adulteração e conflito de versões; fluxo no Chromium com importações reais da campanha e O.S., recebimento com fixture do layout, redirecionamento de cartão, confirmação, exclusão e sincronização com cliente de teste. Banco real: escrita/leitura/exclusão de registro temporário e verificação de permissão anon, sem importar dados pessoais nem manter registros de teste.
