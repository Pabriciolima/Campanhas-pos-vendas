# Seleção nominal para PDF e Excel

No PIX e na Oficina, selecionar uma filial no filtro global de exportação abre uma lista de colaboradores com nome/cargo e checkboxes. Por padrão todos vêm marcados, preservando a exportação existente. Use Limpar seleção e marque apenas os desejados. O contador informa selecionados/total.

O filtro compõe com competência, filial, habilitação e semanas do PIX, antes dos totais e da geração do arquivo. PDF e Excel usam a mesma lista filtrada. Seleção vazia gera nenhum resultado. Todas as filiais oculta o painel e restaura a exportação geral. Trocar filial, mês ou campanha reinicia a seleção, impedindo vazamento entre contextos. A chave é filial+nome+cargo normalizados, sem consolidar apenas por DN (Água Boa e Rondonópolis continuam distintas).

Dados de cadastro vêm das APIs locais do assistente, sem requisição nova ou alteração de banco. Nomes são inseridos como texto, sem HTML. Não altera lançamentos ou apuração na tela. Os anexos de evidências seguem suas regras coletivas por filial.

Verificação: teste em Chromium com três participantes de Ananindeua, marcação de dois, seleção vazia, todas as filiais, mesmo nome em filiais diferentes, troca de mês/campanha e larguras 1366,768,390 px. Dois testes passaram e sintaxe dos três JS foi conferida. O teste de navegador usa Playwright do runtime quando disponível; fora dele é opcional.
